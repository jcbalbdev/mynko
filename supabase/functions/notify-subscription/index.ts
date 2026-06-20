/**
 * notify-subscription
 * Handles all subscription notification types:
 *  - 3 days before monthly/yearly charge
 *  - 1 day before monthly/yearly charge
 *  - Same day as charge (confirmation that it was registered)
 *  - Annual milestone: 3 months and 6 months since last charge
 *  - Annual expiry warnings: 3 months, 1 month, 1 week, 3 days, 1 day before renewal
 * Schedule: run daily via Supabase cron.
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

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000)
}

serve(async () => {
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const todayStr = new Date().toISOString().split('T')[0]

  const { data: subs } = await sb
    .from('recurring_expenses')
    .select('*')
    .eq('entry_type', 'subscription')
    .eq('is_active', true)

  const { data: settings } = await sb
    .from('notification_settings')
    .select('user_id, subscription_before_3days, subscription_before_1day, subscription_charged, subscription_annual_milestone, subscription_annual_expiry')

  const settingsMap: Record<string, any> = {}
  for (const s of (settings ?? [])) settingsMap[s.user_id] = s

  const messages: Record<string, { title: string; body: string }[]> = {}

  const addMsg = (userId: string, title: string, body: string) => {
    if (!messages[userId]) messages[userId] = []
    messages[userId].push({ title, body })
  }

  for (const sub of (subs ?? [])) {
    const cfg = settingsMap[sub.user_id] ?? {}
    const dueDate    = sub.next_due_date
    const lastCharge = sub.last_triggered_at ? sub.last_triggered_at.split('T')[0] : null
    if (!dueDate) continue

    const daysUntilDue = daysBetween(todayStr, dueDate)

    // ── 3 days before charge ──
    if (daysUntilDue === 3 && cfg.subscription_before_3days !== false) {
      addMsg(sub.user_id,
        `📅 ${sub.description || 'Suscripción'} en 3 días`,
        `Tu ${sub.frequency === 'yearly' ? 'suscripción anual' : 'suscripción'} de ${sub.amount} ${sub.currency} se cobrará el ${dueDate}.`
      )
    }

    // ── 1 day before charge ──
    if (daysUntilDue === 1 && cfg.subscription_before_1day !== false) {
      addMsg(sub.user_id,
        `⏰ ${sub.description || 'Suscripción'} mañana`,
        `Mañana se cobra ${sub.amount} ${sub.currency}. Asegúrate de tener saldo suficiente.`
      )
    }

    // ── Same day: charge was registered automatically ──
    if (daysUntilDue === 0 && cfg.subscription_charged !== false) {
      addMsg(sub.user_id,
        `✅ ${sub.description || 'Suscripción'} registrada`,
        `Tu pago de ${sub.amount} ${sub.currency} fue registrado hoy automáticamente.`
      )
    }

    // ── Annual milestone & expiry notifications ──
    if (sub.frequency === 'yearly' && lastCharge) {
      const daysSinceCharge = daysBetween(lastCharge, todayStr)

      // Milestone: 3 months (≈90 days) after annual charge
      if (daysSinceCharge === 90 && cfg.subscription_annual_milestone !== false) {
        addMsg(sub.user_id,
          `📊 ${sub.description || 'Suscripción'}: 3 meses`,
          `Ya llevas 3 meses de tu suscripción anual.`
        )
      }

      // Milestone: 6 months (≈180 days) after annual charge
      if (daysSinceCharge === 180 && cfg.subscription_annual_milestone !== false) {
        addMsg(sub.user_id,
          `📊 ${sub.description || 'Suscripción'}: 6 meses`,
          `Llevas medio año. La renovación anual se acerca.`
        )
      }

      // Expiry warnings: 3 months, 1 month, 1 week, 3 days, 1 day before renewal
      const expiryDays = [90, 30, 7, 3, 1]
      const expiryLabels: Record<number, string> = {
        90: '3 meses',
        30: '1 mes',
        7:  '1 semana',
        3:  '3 días',
        1:  '1 día',
      }
      if (expiryDays.includes(daysUntilDue) && cfg.subscription_annual_expiry !== false) {
        addMsg(sub.user_id,
          `🔔 ${sub.description || 'Suscripción'} vence en ${expiryLabels[daysUntilDue]}`,
          `Tu suscripción anual se renueva en ${expiryLabels[daysUntilDue]} por ${sub.amount} ${sub.currency}.`
        )
      }
    }
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
