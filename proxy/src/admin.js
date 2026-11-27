// Bandeja de Gabriel: /admin/api/* protegido con el secreto ADMIN_KEY (Authorization: Bearer <clave>).
import { agregarMsg, guardarConv, guardarPedido, leerConv, listar } from './store.js'
import { enviarTexto, iguales } from './wa.js'

const VENTANA_24H = 24 * 3600 * 1000
const soloNum = (s) => String(s || '').replace(/\D/g, '').slice(0, 20)

export function autorizado(request, env) {
  const k = env.ADMIN_KEY || ''
  if (k.length < 16) return false // clave corta = bandeja apagada
  const h = request.headers.get('Authorization') || ''
  return iguales(h.replace(/^Bearer\s+/i, ''), k)
}

/** Devuelve [status, datos]. */
export async function rutaAdmin(request, env, url, fetchFn = fetch) {
  const kv = env.CHATS
  const ruta = url.pathname.replace(/^\/admin\/api/, '')
  const leerJson = async () => { const t = await request.text(); if (t.length > 8000) throw new Error('Muy grande'); return JSON.parse(t || '{}') }

  if (request.method === 'GET' && ruta === '/convs') {
    const cs = await listar(kv, 'conv:')
    return [200, { convs: cs.sort((a, b) => (b.u || 0) - (a.u || 0)) }]
  }
  if (request.method === 'GET' && ruta === '/conv') {
    const wa = soloNum(url.searchParams.get('wa'))
    const c = await kv.get('conv:' + wa, 'json')
    if (!c) return [404, { error: 'No existe' }]
    const { ids: _ids, rl: _rl, ...vista } = c
    return [200, { conv: { ...vista, ventanaAbierta: Date.now() - (c.ultimoCliente || 0) < VENTANA_24H } }]
  }
  if (request.method === 'POST' && ruta === '/responder') {
    const b = await leerJson()
    const wa = soloNum(b.wa), texto = String(b.texto || '').trim().slice(0, 3500)
    if (!wa || !texto) return [400, { error: 'Faltan wa o texto' }]
    const conv = await leerConv(kv, wa)
    if (Date.now() - (conv.ultimoCliente || 0) >= VENTANA_24H) return [409, { error: 'Pasaron más de 24 h desde el último mensaje del cliente. WhatsApp solo permite responder con una plantilla aprobada; escribile desde otro número o esperá a que te escriba.' }]
    await enviarTexto(env, wa, texto, fetchFn)
    agregarMsg(conv, 'assistant', texto, Date.now(), true)
    conv.atencion = false
    if (conv.estado !== 'humano') { conv.estado = 'humano'; conv.motivo = 'Gabriel respondió' } // si Gabriel entra, el bot se calla
    await guardarConv(kv, conv)
    return [200, { ok: true }]
  }
  if (request.method === 'POST' && ruta === '/estado') {
    const b = await leerJson()
    const wa = soloNum(b.wa)
    if (!wa || !['bot', 'humano'].includes(b.estado)) return [400, { error: 'estado debe ser bot o humano' }]
    const conv = await leerConv(kv, wa)
    conv.estado = b.estado
    conv.motivo = b.estado === 'humano' ? 'Gabriel la tomó' : ''
    conv.atencion = false
    await guardarConv(kv, conv)
    return [200, { ok: true, estado: conv.estado }]
  }
  if (request.method === 'GET' && ruta === '/pedidos') {
    const ps = await listar(kv, 'pedido:')
    return [200, { pedidos: ps.sort((a, b) => (b.f || 0) - (a.f || 0)) }]
  }
  if (request.method === 'GET' && ruta === '/pedido') {
    const p = await kv.get('pedido:' + String(url.searchParams.get('id') || '').slice(0, 40), 'json')
    return p ? [200, { pedido: p }] : [404, { error: 'No existe' }]
  }
  if (request.method === 'POST' && ruta === '/pedido-estado') {
    const b = await leerJson()
    const p = await kv.get('pedido:' + String(b.id || '').slice(0, 40), 'json')
    if (!p) return [404, { error: 'No existe' }]
    if (!['pendiente', 'confirmado', 'entregado', 'cancelado'].includes(b.estado)) return [400, { error: 'Estado inválido' }]
    p.estado = b.estado
    await guardarPedido(kv, p)
    return [200, { ok: true }]
  }
  return [404, { error: 'Ruta desconocida' }]
}
