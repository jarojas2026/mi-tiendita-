// WhatsApp Cloud API: verificación del webhook, firma X-Hub-Signature-256, parseo y envío.

/** GET /whatsapp: Meta manda hub.mode=subscribe, hub.verify_token y hub.challenge. */
export function verificarWebhook(url, env) {
  const p = url.searchParams
  if (p.get('hub.mode') === 'subscribe' && env.WA_VERIFY_TOKEN && iguales(p.get('hub.verify_token') || '', env.WA_VERIFY_TOKEN)) {
    return new Response(p.get('hub.challenge') || '', { status: 200, headers: { 'Content-Type': 'text/plain' } })
  }
  return new Response('Prohibido', { status: 403 })
}

/** Comparación en tiempo constante (evita ataques de tiempo). */
export function iguales(a, b) {
  const x = new TextEncoder().encode(String(a)), y = new TextEncoder().encode(String(b))
  let d = x.length ^ y.length
  for (let i = 0; i < Math.max(x.length, y.length); i++) d |= (x[i] ?? 0) ^ (y[i] ?? 0)
  return d === 0
}

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')

/** Valida X-Hub-Signature-256 = "sha256=" + HMAC-SHA256(cuerpo crudo, WA_APP_SECRET). */
export async function firmaValida(crudo, encabezado, secreto) {
  if (!secreto || !encabezado || !encabezado.startsWith('sha256=')) return false
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secreto), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const firma = await crypto.subtle.sign('HMAC', key, crudo)
  return iguales('sha256=' + hex(firma), encabezado.trim().toLowerCase())
}

const MAX_TEXTO = 1000

/**
 * Saca los mensajes entrantes del payload de Meta.
 * Devuelve [{ id, de, nombre, tipo, texto, ts }]. tipo: 'texto' | 'media' | 'otro'.
 * Ignora los "statuses" (entregado/leído) y los mensajes de otro número (phone_number_id distinto).
 */
export function parsearMensajes(body, phoneNumberId) {
  const out = []
  if (body?.object !== 'whatsapp_business_account') return out
  for (const entry of body.entry || []) {
    for (const ch of entry.changes || []) {
      const v = ch.value || {}
      if (ch.field !== 'messages' || !Array.isArray(v.messages)) continue
      if (phoneNumberId && v.metadata?.phone_number_id && v.metadata.phone_number_id !== phoneNumberId) continue
      const nombres = Object.fromEntries((v.contacts || []).map((c) => [c.wa_id, c.profile?.name || '']))
      for (const m of v.messages) {
        if (!m?.id || !m?.from) continue
        let tipo = 'otro', texto = ''
        if (m.type === 'text') { tipo = 'texto'; texto = m.text?.body || '' }
        else if (m.type === 'button') { tipo = 'texto'; texto = m.button?.text || '' }
        else if (m.type === 'interactive') { tipo = 'texto'; texto = m.interactive?.button_reply?.title || m.interactive?.list_reply?.title || '' }
        else if (['image', 'audio', 'video', 'document', 'sticker'].includes(m.type)) { tipo = 'media'; texto = m[m.type]?.caption || '' }
        out.push({ id: String(m.id), de: String(m.from).replace(/\D/g, ''), nombre: (nombres[m.from] || '').slice(0, 60), tipo, media: tipo === 'media' ? m.type : undefined, texto: String(texto).slice(0, MAX_TEXTO), ts: Number(m.timestamp) * 1000 || Date.now() })
      }
    }
  }
  return out
}

/** Envía un texto por la Graph API. Lanza si Meta responde error. */
export async function enviarTexto(env, to, texto, fetchFn = fetch) {
  if (!env.WA_TOKEN || !env.WA_PHONE_NUMBER_ID) throw new Error('Faltan WA_TOKEN o WA_PHONE_NUMBER_ID')
  const url = `${env.GRAPH_BASE || 'https://graph.facebook.com'}/${env.GRAPH_VERSION || 'v23.0'}/${env.WA_PHONE_NUMBER_ID}/messages`
  const r = await fetchFn(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.WA_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to, type: 'text', text: { preview_url: true, body: String(texto).slice(0, 4000) } }),
  })
  if (!r.ok) {
    let det = ''
    try { det = (await r.json())?.error?.message || '' } catch { /* sin cuerpo */ }
    throw new Error(`Meta respondió ${r.status}${det ? ': ' + det : ''}`)
  }
  return r.json()
}
