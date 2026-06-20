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

const MONTHS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
function fmt(n: number) { return n.toLocaleString('es-MX', { maximumFractionDigits: 0 }) }

const BUILT_IN_LABELS: Record<string, string> = {
  food: 'Restaurantes', services: 'Servicios', entertainment: 'Entretenimiento',
  family: 'Familia', education: 'Educación', work: 'Trabajo', technology: 'Tecnología',
  transport: 'Transporte', savings: 'Finanzas', home: 'Hogar', donations: 'Mascotas',
  travel: 'Viajes', health: 'Salud', unexpected: 'Imprevistos', shopping: 'Compras',
  clothing: 'Vestimenta', exchange: 'Cambio', credit_payment: 'Pago de Tarjeta',
  initial_balance: 'Saldo inicial',
}

function resolveCategoryLabel(id: string, userCats: any[]): string {
  if (BUILT_IN_LABELS[id]) return BUILT_IN_LABELS[id]
  return userCats.find((c: any) => c.id === id)?.name ?? id
}

serve(async () => {
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  // Runs on day 1 — last month vs month before
  const now = new Date()
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 2, 1)
  const prevMonthEnd   = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59, 999)
  const lastMonthName  = MONTHS[lastMonthStart.getMonth()]

  const { data: settings } = await sb.from('notification_settings').select('user_id').eq('month_close', true)
  const ids = settings?.map((s: any) => s.user_id) ?? []
  if (!ids.length) return new Response('no users')

  const { data: tokens } = await sb.from('push_tokens').select('user_id, token').in('user_id', ids)
  if (!tokens?.length) return new Response('no tokens')

  const at = await fcmToken()

  for (const userId of ids) {
    const userTokens = (tokens as any[]).filter(t => t.user_id === userId)
    if (!userTokens.length) continue

    const { data: lastExp } = await sb
      .from('expenses').select('amount, category').eq('user_id', userId).neq('type', 'ingreso')
      .gte('date', lastMonthStart.toISOString()).lte('date', lastMonthEnd.toISOString())

    const { data: prevExp } = await sb
      .from('expenses').select('amount').eq('user_id', userId).neq('type', 'ingreso')
      .gte('date', prevMonthStart.toISOString()).lte('date', prevMonthEnd.toISOString())

    const lastTotal = (lastExp ?? []).reduce((s: number, e: any) => s + Number(e.amount), 0)
    const prevTotal = (prevExp ?? []).reduce((s: number, e: any) => s + Number(e.amount), 0)
    if (!lastTotal) continue

    // Top category
    const cats: Record<string, number> = {}
    for (const e of lastExp ?? []) cats[e.category] = (cats[e.category] ?? 0) + Number(e.amount)
    const topCatId = Object.entries(cats).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''

    const { data: userCats } = await sb.from('user_categories').select('id, name').eq('user_id', userId)
    const topCat = topCatId ? resolveCategoryLabel(topCatId, userCats ?? []) : ''

    let bodyText = `Gastaste S/ ${fmt(lastTotal)}`
    if (prevTotal > 0) {
      const diff = Math.abs(lastTotal - prevTotal)
      bodyText += lastTotal < prevTotal
        ? ` — S/ ${fmt(diff)} menos que el mes anterior.`
        : ` — S/ ${fmt(diff)} más que el mes anterior.`
    }
    if (topCat) bodyText += ` Tu categoría más alta: ${topCat}.`

    for (const { token } of userTokens) {
      try { await push(at, token, `🗓️ Así cerró ${lastMonthName}`, bodyText) } catch (_) {}
    }
  }

  return new Response('ok')
})
