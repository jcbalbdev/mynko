/**
 * notify-recurring
 * Sends a reminder to users who have recurring expenses due today
 * and a follow-up for those that were not confirmed yesterday.
 * Schedule: run daily (e.g. 08:00 local time via Supabase cron).
 */
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

  const todayStr     = new Date().toISOString().split('T')[0]
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  // Recurring expenses due today
  const { data: dueToday } = await sb
    .from('recurring_expenses')
    .select('user_id, description, amount, currency')
    .eq('entry_type', 'recurring')
    .eq('is_active', true)
    .eq('next_due_date', todayStr)

  // Recurring expenses that were due yesterday and still not confirmed
  const { data: overdue } = await sb
    .from('recurring_expenses')
    .select('user_id, description, amount, currency, last_triggered_at')
    .eq('entry_type', 'recurring')
    .eq('is_active', true)
    .eq('next_due_date', yesterdayStr)

  // Check which settings have recurring_reminder enabled
  const { data: settings } = await sb
    .from('notification_settings')
    .select('user_id')
    .eq('recurring_reminder', true)

  const enabledUsers = new Set((settings ?? []).map((s: any) => s.user_id))

  // Collect messages per user
  const messages: Record<string, { title: string; body: string }[]> = {}

  for (const rec of (dueToday ?? [])) {
    if (!enabledUsers.has(rec.user_id)) continue
    if (!messages[rec.user_id]) messages[rec.user_id] = []
    messages[rec.user_id].push({
      title: `💸 Hoy toca: ${rec.description || 'gasto recurrente'}`,
      body:  `Recuerda registrar tu pago de ${rec.amount} ${rec.currency}.`,
    })
  }

  for (const rec of (overdue ?? [])) {
    if (!enabledUsers.has(rec.user_id)) continue
    // Only notify if it wasn't confirmed yesterday
    const confirmed = rec.last_triggered_at && rec.last_triggered_at.startsWith(yesterdayStr)
    if (confirmed) continue
    if (!messages[rec.user_id]) messages[rec.user_id] = []
    messages[rec.user_id].push({
      title: `⚠️ Pago pendiente: ${rec.description || 'gasto recurrente'}`,
      body:  `No registraste tu pago de ${rec.amount} ${rec.currency}. Puedes confirmarlo o editar la fecha.`,
    })
  }

  if (!Object.keys(messages).length) return new Response('nothing to send')

  const userIds = Object.keys(messages)
  const { data: tokens } = await sb
    .from('push_tokens')
    .select('user_id, token')
    .in('user_id', userIds)

  const at = await fcmToken()
  let sent = 0

  for (const { user_id, token } of (tokens ?? [])) {
    for (const msg of (messages[user_id] ?? [])) {
      try { await push(at, token, msg.title, msg.body); sent++ } catch (_) { /* skip */ }
    }
  }

  return new Response(JSON.stringify({ sent }), { headers: { 'Content-Type': 'application/json' } })
})
