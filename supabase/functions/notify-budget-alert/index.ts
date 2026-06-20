import { serve }        from 'https://deno.land/std@0.168.0/http/server.ts'
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

/* ── Category name resolver (mirrors frontend resolveCategory) ── */
const SYSTEM_CATS: Record<string, string> = {
  food:          'Comida',
  transport:     'Transporte',
  health:        'Salud',
  home:          'Hogar',
  entertainment: 'Entretenimiento',
}

const SKIP_CATS = new Set(['credit_payment', 'initial_balance', 'exchange'])

function catName(categoryId: string, userCategories: any[]): string {
  if (SYSTEM_CATS[categoryId]) return SYSTEM_CATS[categoryId]
  return userCategories.find((c: any) => c.id === categoryId)?.name ?? categoryId
}

function fmt(n: number): string {
  return n.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  PEN: 'S/', USD: '$', EUR: '€', GBP: '£', MXN: '$', COP: '$', CLP: '$',
  ARS: '$', BRL: 'R$', BOB: 'Bs', PYG: '₲', UYU: '$', VES: 'Bs',
}
function sym(code: string): string {
  return CURRENCY_SYMBOLS[code] ?? code
}

/* ── Main handler — triggered by Database Webhook on expenses INSERT ── */
serve(async (req) => {
  const payload = await req.json()
  const record  = payload.record

  if (!record?.user_id) return new Response('skip: no user_id', { status: 200 })

  // Skip non-expense types
  if (record.type === 'ingreso')            return new Response('skip: ingreso', { status: 200 })
  if (SKIP_CATS.has(record.category ?? '')) return new Response('skip: category', { status: 200 })

  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const userId = record.user_id

  // Fetch user's budgets
  const { data: budgets } = await sb
    .from('budgets')
    .select('*')
    .eq('user_id', userId)

  if (!budgets?.length) return new Response('skip: no budgets', { status: 200 })

  // Current month range
  const now         = new Date()
  const year        = now.getFullYear()
  const month       = now.getMonth() + 1  // 1-indexed
  const monthStart  = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const monthEnd    = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString()

  // Fetch current month expenses (gastos only)
  const { data: monthExpenses } = await sb
    .from('expenses')
    .select('category, amount, currency')
    .eq('user_id', userId)
    .gte('date', monthStart)
    .lte('date', monthEnd)
    .neq('type', 'ingreso')
    .not('category', 'in', `(${[...SKIP_CATS].join(',')})`)

  // Fetch user categories for subcategory resolution
  const { data: userCategories } = await sb
    .from('user_categories')
    .select('id, name, parent_id')
    .eq('user_id', userId)

  const cats = userCategories ?? []

  // Fetch push token
  const { data: tokenRow } = await sb
    .from('push_tokens')
    .select('token')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!tokenRow?.token) return new Response('skip: no push token', { status: 200 })

  const at          = await fcmToken()
  let   notifSent   = false

  for (const budget of budgets) {
    // Subcategory budgets use exact match; parent budgets include all children
    const isSub = cats.some((c: any) =>
      c.id === budget.category_id && c.parent_id && c.parent_id !== '__override__'
    )

    const catExpenses = (monthExpenses ?? []).filter((e: any) => {
      if (e.currency !== budget.currency) return false
      if (isSub) return e.category === budget.category_id
      if (e.category === budget.category_id) return true
      const sub = cats.find((c: any) => c.id === e.category)
      return sub?.parent_id === budget.category_id
    })

    const spent = catExpenses.reduce((s: number, e: any) => s + Number(e.amount), 0)
    const pct   = budget.amount > 0 ? (spent / Number(budget.amount)) * 100 : 0

    // Determine which thresholds to check
    const thresholds: number[] = []
    if (pct >= budget.alert_percentage) thresholds.push(budget.alert_percentage)
    if (pct >= 100)                     thresholds.push(100)

    for (const threshold of thresholds) {
      // Check if already sent this month
      const { data: existing } = await sb
        .from('budget_alerts_sent')
        .select('id')
        .eq('user_id', userId)
        .eq('budget_id', budget.id)
        .eq('year', year)
        .eq('month', month)
        .eq('threshold', threshold)
        .maybeSingle()

      if (existing) continue

      // Record alert as sent
      await sb.from('budget_alerts_sent').insert({
        user_id:   userId,
        budget_id: budget.id,
        year,
        month,
        threshold,
      })

      const name    = catName(budget.category_id, cats)
      const rounded = Math.round(pct)
      const s       = sym(budget.currency)
      const title   = threshold >= 100
        ? `🚨 ${name}: presupuesto superado`
        : `⚠️ ${name} al ${rounded}% del presupuesto`
      const body    = threshold >= 100
        ? `Gastaste ${s} ${fmt(spent)} de ${s} ${fmt(Number(budget.amount))} este mes.`
        : `Llevas ${s} ${fmt(spent)} de ${s} ${fmt(Number(budget.amount))} este mes.`

      await push(at, tokenRow.token, title, body)
      notifSent = true
    }
  }

  return new Response(JSON.stringify({ notifSent }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
