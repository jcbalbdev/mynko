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

function toDateStr(d: Date) { return d.toISOString().split('T')[0] }

function calcStreak(dates: string[]): number {
  if (!dates.length) return 0
  const unique = [...new Set(dates)].sort().reverse() // most recent first
  const today  = toDateStr(new Date())
  const yesterday = toDateStr(new Date(Date.now() - 86400000))

  // Streak must include today or yesterday to be active
  if (unique[0] !== today && unique[0] !== yesterday) return 0

  let streak = 1
  for (let i = 1; i < unique.length; i++) {
    const prev = new Date(unique[i - 1])
    const curr = new Date(unique[i])
    const diff = Math.round((prev.getTime() - curr.getTime()) / 86400000)
    if (diff === 1) streak++
    else break
  }
  return streak
}

const MILESTONES = [7, 14, 30]

serve(async () => {
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data: settings } = await sb.from('notification_settings').select('user_id').eq('streak', true)
  const ids = settings?.map((s: any) => s.user_id) ?? []
  if (!ids.length) return new Response('no users')

  const { data: tokens } = await sb.from('push_tokens').select('user_id, token').in('user_id', ids)
  if (!tokens?.length) return new Response('no tokens')

  const at = await fcmToken()

  for (const userId of ids) {
    const userTokens = (tokens as any[]).filter(t => t.user_id === userId)
    if (!userTokens.length) continue

    // Get last 35 days of activity dates
    const since = new Date(Date.now() - 35 * 86400000)
    const { data: rows } = await sb
      .from('expenses').select('date').eq('user_id', userId).gte('date', since.toISOString())

    const datestrs = (rows ?? []).map((r: any) => toDateStr(new Date(r.date)))
    const streak   = calcStreak(datestrs)

    if (!MILESTONES.includes(streak)) continue

    const title = `🔥 ${streak} días seguidos registrando`
    const body  = streak >= 30
      ? 'Pocos llegan aquí. Tu control financiero es real.'
      : 'Tu historial ya empieza a contar la historia de tus finanzas.'

    for (const { token } of userTokens) {
      try { await push(at, token, title, body) } catch (_) {}
    }
  }

  return new Response('ok')
})
