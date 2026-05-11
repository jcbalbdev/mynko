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

function fmt(n: number) { return n.toLocaleString('es-MX', { maximumFractionDigits: 0 }) }

serve(async () => {
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  // Runs Monday — compare last week (Mon-Sun) vs week before
  const now = new Date()
  const lastWeekEnd   = new Date(now); lastWeekEnd.setDate(now.getDate() - 1); lastWeekEnd.setHours(23, 59, 59, 999)
  const lastWeekStart = new Date(now); lastWeekStart.setDate(now.getDate() - 7); lastWeekStart.setHours(0, 0, 0, 0)
  const prevWeekEnd   = new Date(lastWeekStart); prevWeekEnd.setMilliseconds(-1)
  const prevWeekStart = new Date(lastWeekStart); prevWeekStart.setDate(lastWeekStart.getDate() - 7)

  // Users with any weekly notification enabled
  const { data: settings } = await sb
    .from('notification_settings')
    .select('user_id, weekly_compare, weekly_summary')
    .or('weekly_compare.eq.true,weekly_summary.eq.true')

  const ids = settings?.map((s: any) => s.user_id) ?? []
  if (!ids.length) return new Response('no users')

  const { data: tokens } = await sb.from('push_tokens').select('user_id, token').in('user_id', ids)
  if (!tokens?.length) return new Response('no tokens')

  const at = await fcmToken()

  for (const setting of settings ?? []) {
    const userTokens = (tokens as any[]).filter(t => t.user_id === setting.user_id)
    if (!userTokens.length) continue

    // Fetch last week expenses
    const { data: lastWeekExp } = await sb
      .from('expenses')
      .select('amount, category')
      .eq('user_id', setting.user_id)
      .neq('type', 'ingreso')
      .gte('date', lastWeekStart.toISOString())
      .lte('date', lastWeekEnd.toISOString())

    const lastWeekTotal = (lastWeekExp ?? []).reduce((s: number, e: any) => s + Number(e.amount), 0)

    // Fetch prev week expenses
    const { data: prevWeekExp } = await sb
      .from('expenses')
      .select('amount')
      .eq('user_id', setting.user_id)
      .neq('type', 'ingreso')
      .gte('date', prevWeekStart.toISOString())
      .lte('date', prevWeekEnd.toISOString())

    const prevWeekTotal = (prevWeekExp ?? []).reduce((s: number, e: any) => s + Number(e.amount), 0)

    // Top category last week
    const categoryTotals: Record<string, number> = {}
    for (const e of lastWeekExp ?? []) {
      categoryTotals[e.category] = (categoryTotals[e.category] ?? 0) + Number(e.amount)
    }
    const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''

    for (const { token } of userTokens) {
      // Weekly compare
      if (setting.weekly_compare && prevWeekTotal > 0 && lastWeekTotal > 0) {
        const pct = Math.round(Math.abs((lastWeekTotal - prevWeekTotal) / prevWeekTotal) * 100)
        if (lastWeekTotal > prevWeekTotal) {
          try { await push(at, token, '📈 Semana un poco cara', `Gastaste ${pct}% más que la semana pasada. Tu mayor diferencia: ${topCategory}.`) } catch (_) {}
        } else {
          try { await push(at, token, '💪 Buena semana', `Gastaste ${pct}% menos que la semana pasada. Así se hace.`) } catch (_) {}
        }
      }

      // Weekly summary
      if (setting.weekly_summary && lastWeekTotal > 0) {
        const summaryBody = topCategory
          ? `Gastaste $${fmt(lastWeekTotal)} · Mayor categoría: ${topCategory}. ¿Cómo va el mes?`
          : `Gastaste $${fmt(lastWeekTotal)} esta semana. ¿Cómo va el mes?`
        try { await push(at, token, '📊 Tu semana en números', summaryBody) } catch (_) {}
      }
    }
  }

  return new Response('ok', { headers: { 'Content-Type': 'application/json' } })
})
