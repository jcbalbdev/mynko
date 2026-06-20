import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/* ── FCM helpers (same pattern as other notify functions) ── */
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

/* ── Main handler — triggered by Database Webhook on expenses INSERT/UPDATE ── */
serve(async (req) => {
  const payload = await req.json()
  const record  = payload.record

  // Only process expense types that affect account balance
  if (!record?.account_id || !record?.user_id) return new Response('skip: no account', { status: 200 })
  if (!['personal', 'compartido', 'ingreso'].includes(record.type)) return new Response('skip: type', { status: 200 })

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  // Fetch account config
  const { data: account } = await sb
    .from('accounts')
    .select('id, name, currency, balance, min_balance_enabled, min_balance_threshold, min_balance_notified')
    .eq('id', record.account_id)
    .single()

  if (!account?.min_balance_enabled || account.min_balance_threshold == null) {
    return new Response('skip: alert not configured', { status: 200 })
  }

  // Compute real balance: base + all linked expense deltas
  const { data: expenses } = await sb
    .from('expenses')
    .select('type, amount')
    .eq('account_id', record.account_id)

  const delta = (expenses ?? []).reduce((sum: number, e: any) => {
    if (e.type === 'ingreso')                             return sum + Number(e.amount)
    if (e.type === 'personal' || e.type === 'compartido') return sum - Number(e.amount)
    return sum
  }, 0)

  const realBalance = Number(account.balance) + delta
  const threshold   = Number(account.min_balance_threshold)
  const isAt        = realBalance <= threshold
  const isNear      = !isAt && realBalance <= threshold * 1.10

  // If balance recovered above the buffer zone, reset the notified flag so future drops re-alert
  if (!isAt && !isNear && account.min_balance_notified) {
    await sb.from('accounts').update({ min_balance_notified: false }).eq('id', account.id)
    return new Response('reset notified flag', { status: 200 })
  }

  if (!isAt && !isNear) return new Response('balance ok', { status: 200 })

  // Anti-spam: only notify once per threshold crossing (reset when balance recovers)
  if (account.min_balance_notified) return new Response('skip: already notified', { status: 200 })

  // Fetch push token
  const { data: tokenRow } = await sb
    .from('push_tokens')
    .select('token')
    .eq('user_id', record.user_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!tokenRow?.token) return new Response('skip: no push token', { status: 200 })

  // Build notification text
  const fmt   = (n: number) => n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const sym   = account.currency
  const title = isAt ? `¡Alerta de saldo! — ${account.name}` : `Saldo bajo — ${account.name}`
  const body  = isAt
    ? `Tu saldo es ${sym} ${fmt(realBalance)}, ha llegado al mínimo que configuraste (${sym} ${fmt(threshold)})`
    : `Tu saldo es ${sym} ${fmt(realBalance)}, cerca del mínimo que configuraste (${sym} ${fmt(threshold)})`

  // Send push and mark as notified
  const at = await fcmToken()
  await push(at, tokenRow.token, title, body)
  await sb.from('accounts').update({ min_balance_notified: true }).eq('id', account.id)

  return new Response(JSON.stringify({ sent: true, isAt, balance: realBalance, threshold }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
