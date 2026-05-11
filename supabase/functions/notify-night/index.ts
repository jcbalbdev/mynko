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
    body: JSON.stringify({ message: { token, notification: { title, body } } }),
  })
}

serve(async () => {
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  // Users with night reminder enabled
  const { data: settings } = await sb.from('notification_settings').select('user_id').eq('daily_night', true)
  const ids = settings?.map((s: any) => s.user_id) ?? []
  if (!ids.length) return new Response('no users')

  // Today's date range (UTC-5 / Colombia)
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  // Find users who DID register something today
  const { data: activeToday } = await sb
    .from('expenses')
    .select('user_id')
    .in('user_id', ids)
    .gte('date', todayStart.toISOString())
    .lte('date', todayEnd.toISOString())

  const activeIds = new Set((activeToday ?? []).map((r: any) => r.user_id))

  // Only notify users who did NOT register anything today
  const silentIds = ids.filter((id: string) => !activeIds.has(id))
  if (!silentIds.length) return new Response('everyone registered today')

  const { data: tokens } = await sb.from('push_tokens').select('token').in('user_id', silentIds)
  if (!tokens?.length) return new Response('no tokens')

  const at = await fcmToken()
  for (const { token } of tokens) {
    try { await push(at, token, '🌙 ¿Tuviste gastos hoy?', 'No se te vaya a escapar ninguno. Registrar toma 10 segundos.') } catch (_) { /* skip */ }
  }

  return new Response(JSON.stringify({ sent: tokens.length }), { headers: { 'Content-Type': 'application/json' } })
})
