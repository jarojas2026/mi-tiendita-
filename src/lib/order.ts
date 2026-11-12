import { config, type Zona } from '../config'
import { cantidad, colones, fechaLarga, isoDate } from './format'
import { fmtKm, gmapsLink } from './geo'
import type { CartItem, Order, Product } from '../types'

export function lineas(cart: CartItem[], byId: Record<string, Product>) {
  return cart.map((c) => ({ item: c, p: byId[c.id] })).filter((x) => x.p)
}

export function totales(cart: CartItem[], byId: Record<string, Product>, zona?: Zona, tarifaDistancia?: number | null) {
  const ls = lineas(cart, byId)
  const subtotal = ls.reduce((s, { item, p }) => s + (p.precio ?? 0) * item.qty, 0)
  const bajoPedido = ls.filter(({ p }) => p.disponibilidad === 'Bajo pedido')
  const subBajo = bajoPedido.reduce((s, { item, p }) => s + (p.precio ?? 0) * item.qty, 0)
  const envio = zona ? (tarifaDistancia !== undefined && !('retiro' in zona && zona.retiro) ? tarifaDistancia : zona.tarifa) : 0
  const adelanto = Math.round((subBajo * config.adelantoPct) / 100)
  const hayPrecioPorConfirmar = ls.some(({ p }) => p.precio == null || p.precioPorConfirmar)
  return { lineas: ls, subtotal, envio, total: subtotal + (envio ?? 0), adelanto, hayBajoPedido: bajoPedido.length > 0, hayPrecioPorConfirmar }
}

/** Fechas disponibles para una zona según sus días de ruta. */
export function fechasDisponibles(zona: Zona | undefined, hayBajoPedido: boolean, desde = new Date()) {
  if (!zona) return []
  const out: string[] = []
  const start = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate())
  const minOffset = hayBajoPedido ? config.diasMinBajoPedido : 1 // mínimo: mañana
  for (let i = minOffset; i <= config.diasAgenda + minOffset; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i)
    if (zona.diasRuta.includes(d.getDay())) out.push(isoDate(d))
  }
  return out
}

/** Mensaje de notificación del pedido (WhatsApp / copiar y pegar). */
export function mensajeWhatsApp(o: Order) {
  const L: string[] = []
  const retiro = o.entrega === 'retiro' || o.zonaId === 'retiro'
  const pago = o.pago === 'sinpe' ? `SINPE Móvil al ${config.sinpe.numero} (${config.sinpe.nombre})${o.sinpeRef ? ` · comprobante ${o.sinpeRef}` : ' · envío el comprobante por aquí'}` : retiro ? 'Efectivo al retirar' : 'Efectivo contra entrega'
  L.push(`🛒 *NUEVO PEDIDO ${o.codigo}* — ${config.storeName}`)
  L.push(`👤 ${o.cliente.nombre} · ${o.cliente.telefono}`)
  L.push('')
  L.push(retiro ? '🏡 *Retiro en tienda* (Palmital de Rivas)' : `🛵 *Entrega a domicilio* · ${o.zonaNombre}`)
  if (o.direccion && !retiro) L.push(`🏠 *Dirección:* ${o.direccion}`)
  if (o.ubicacion) L.push(`🗺️ *Ubicación:* ${gmapsLink(o.ubicacion)}${o.distanciaKm != null ? ` (${fmtKm(o.distanciaKm)} de la tienda)` : ''}`)
  L.push(`📅 *${retiro ? 'Retiro' : 'Entrega'}:* ${fechaLarga(o.fecha)} · ${o.franja}`)
  L.push('')
  L.push('*Productos:*')
  o.items.forEach((i) => {
    const precio = i.precio == null ? 'consultar precio' : colones(i.precio * i.qty)
    const unit = i.venta === 'kg' && i.precio != null ? ` (${colones(i.precio)}/kg)` : ''
    L.push(`• ${cantidad(i.qty, i.venta)} ${i.nombre}${unit} — ${precio}${i.disponibilidad === 'Bajo pedido' ? ' _(bajo pedido)_' : ''}`)
  })
  L.push('')
  L.push(`Subtotal: ${colones(o.subtotal)}`)
  L.push(`Envío: ${o.envio == null ? 'por cotizar' : o.envio === 0 ? 'gratis' : colones(o.envio)}`)
  L.push(`*TOTAL: ${colones(o.total)}*${o.envio == null ? ' + envío' : ''}`)
  if (o.hayBajoPedido) L.push(`📦 *Adelanto (${config.adelantoPct}% de lo bajo pedido): ${colones(o.adelanto)}* · plazo ${config.plazoBajoPedido}`)
  else L.push('📦 Adelanto: no requiere')
  L.push(`💳 *Pago:* ${pago}`)
  if (o.hayPrecioPorConfirmar) L.push('⚠️ Hay productos con precio por confirmar.')
  if (o.notas) L.push(`📝 ${o.notas}`)
  L.push('')
  L.push(`🔎 Seguimiento: ${linkSeguimiento(o)}`)
  return L.join('\n')
}

/** Ruta interna de seguimiento (con token secreto si existe) */
export const rutaSeguimiento = (o: Pick<Order, 'id' | 'trackToken'>) => `/pedido/${o.id}${o.trackToken ? `?t=${o.trackToken}` : ''}`
/** Enlace público de seguimiento: funciona en cualquier dispositivo */
export const linkSeguimiento = (o: Pick<Order, 'id' | 'trackToken'>) => `${config.baseUrl}/#${rutaSeguimiento(o)}`

export const waLink = (o: Order) => `https://wa.me/${config.whatsapp}?text=${encodeURIComponent(mensajeWhatsApp(o))}`
