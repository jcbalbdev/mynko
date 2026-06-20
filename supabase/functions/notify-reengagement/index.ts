import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

function b64url(buf: ArrayBuffer | string): string {
  const s = typeof buf === 'string' ? buf : String.fromCharCode(...new Uint8Array(buf as ArrayBuffer))
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}
async function fcmToken(): Promise<string> {
  const email  = Deno.env.get('FIREBASE_CLIENT_EMAIL')!
  const rawKey = Deno.env.get('FIREBASE_PRIVATE_KEY')!.replace(/\\n/g, '\n')
  const now    = Math.floor(Date.now() / 1000)
  const hdr = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const pld = b64url(JSON.stringify({ iss: email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }))
  const pem = rawKey.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, '')
  const ck  = await crypto.subtle.importKey('pkcs8', Uint8Array.from(atob(pem), c => c.charCodeAt(0)), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', ck, new TextEncoder().encode(`${hdr}.${pld}`))
  const jwt = `${hdr}.${pld}.${b64url(sig)}`
  const r   = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}` })
  return (await r.json()).access_token
}
async function push(at: string, token: string, title: string, body: string) {
  const pid = Deno.env.get('FIREBASE_PROJECT_ID')!
  await fetch(`https://fcm.googleapis.com/v1/projects/${pid}/messages:send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${at}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: { token, notification: { title, body }, android: { notification: { icon: 'ic_launcher_cat' } } } }),
  })
}

serve(async () => {
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data: settings } = await sb.from('notification_settings').select('user_id').eq('re_engagement', true)
  const ids = settings?.map((s: any) => s.user_id) ?? []
  if (!ids.length) return new Response('no users')

  const { data: tokens } = await sb.from('push_tokens').select('user_id, token').in('user_id', ids)
  if (!tokens?.length) return new Response('no tokens')

  // 72 hours ago
  const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000)

  const at = await fcmToken()

  for (const userId of ids) {
    const userTokens = (tokens as any[]).filter(t => t.user_id === userId)
    if (!userTokens.length) continue

    // Get most recent expense
    const { data: recent } = await sb
      .from('expenses').select('date').eq('user_id', userId)
      .order('date', { ascending: false }).limit(1)

    if (!recent?.length) continue
    const lastDate = new Date(recent[0].date)

    // Only notify if last activity was more than 72h ago
    if (lastDate > cutoff) continue

    for (const { token } of userTokens) {
      try { await push(at, token, '👋 ¿Todo bien por allá?', 'Llevas 3 días sin registrar. Tus finanzas te esperan.') } catch (_) {}
    }
  }

  return new Response('ok')
})
