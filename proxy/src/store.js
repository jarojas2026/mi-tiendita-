// Memoria en Cloudflare KV (binding CHATS). Plan gratis: 1.000 escrituras/día, así que
// cada mensaje entrante hace UNA sola escritura (la conversación, con la dedup y el rate-limit adentro).
export const TTL_CONV = 7 * 24 * 3600 // 7 días
export const TTL_PEDIDO = 90 * 24 * 3600 // 90 días
export const MAX_HIST = 12 // mensajes que se guardan por conversación
const MAX_IDS = 40 // ids de mensajes ya procesados (dedup)

export const nuevaConv = (wa) => ({ wa, nombre: '', estado: 'bot', motivo: '', msgs: [], ids: [], rl: [], pedidos: [], atencion: false, ultimoCliente: 0, actualizado: 0 })

export async function leerConv(kv, wa) {
  const c = await kv.get('conv:' + wa, 'json')
  return c ? { ...nuevaConv(wa), ...c } : nuevaConv(wa)
}

/** Agrega un mensaje al historial (r: 'user' | 'assistant'; h = escrito por Gabriel). */
export function agregarMsg(conv, r, t, ts = Date.now(), h = false) {
  conv.msgs.push({ r, t: String(t).slice(0, 1500), ts, ...(h ? { h: 1 } : {}) })
  conv.msgs = conv.msgs.slice(-MAX_HIST)
}

export function marcarVisto(conv, id) {
  if (conv.ids.includes(id)) return false
  conv.ids = [...conv.ids, id].slice(-MAX_IDS)
  return true
}

export async function guardarConv(kv, conv, ahora = Date.now()) {
  conv.actualizado = ahora
  const ult = conv.msgs[conv.msgs.length - 1]
  // La metadata viaja en kv.list(): la bandeja lista sin leer cada conversación (≤ 1 KB)
  const metadata = { n: conv.nombre.slice(0, 40), e: conv.estado, u: ahora, a: conv.atencion ? 1 : 0, c: conv.ultimoCliente, p: ult ? `${ult.r === 'user' ? '' : ult.h ? 'Gabriel: ' : 'Bot: '}${ult.t}`.slice(0, 90) : '' }
  await kv.put('conv:' + conv.wa, JSON.stringify(conv), { expirationTtl: TTL_CONV, metadata })
}

export async function guardarPedido(kv, pedido) {
  const metadata = { n: pedido.nombre.slice(0, 40), w: pedido.wa, t: pedido.total, f: pedido.fecha, s: pedido.estado }
  await kv.put('pedido:' + pedido.id, JSON.stringify(pedido), { expirationTtl: TTL_PEDIDO, metadata })
}

/** Lista claves con su metadata (hasta 1000; plan gratis: 1.000 list/día). */
export async function listar(kv, prefijo, limite = 200) {
  const r = await kv.list({ prefix: prefijo, limit: Math.min(limite, 1000) })
  return r.keys.map((k) => ({ id: k.name.slice(prefijo.length), ...(k.metadata || {}) }))
}
