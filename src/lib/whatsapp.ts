// v5 — Plantillas de WhatsApp del admin para avisar al cliente en cada estado del pedido.
import { config } from '../config'
import { colones, fechaLarga } from './format'
import { linkSeguimiento } from './order'
import type { EstadoPedido, Order } from '../types'

const nombre = (o: Order) => (o.cliente?.nombre || 'cliente').split(' ')[0]
const retiro = (o: Order) => o.entrega === 'retiro' || o.zonaId === 'retiro'

export const PLANTILLAS: Record<EstadoPedido, { titulo: string; texto: (o: Order) => string }> = {
  nuevo: {
    titulo: 'Pedido recibido',
    texto: (o) => `¡Hola ${nombre(o)}! 👋 Recibimos tu pedido ${o.codigo} en ${config.storeName} por ${colones(o.total)}${o.envio == null ? ' + envío' : ''}. Lo estamos revisando y en un ratito te confirmamos.${o.pago === 'sinpe' && !o.sinpeRef ? ` Podés pagar por SINPE Móvil al ${config.sinpe.numero} (${config.sinpe.nombre}) y mandarnos el comprobante por aquí.` : ''} Seguimiento: ${linkSeguimiento(o)}`,
  },
  confirmado: {
    titulo: 'Confirmado',
    texto: (o) => `¡Hola ${nombre(o)}! ✅ Confirmamos tu pedido ${o.codigo} por ${colones(o.total)}. ${retiro(o) ? `Te avisamos cuando esté listo para retirar (${fechaLarga(o.fecha)}).` : `Entrega: ${fechaLarga(o.fecha)}, ${o.franja}.`}${o.hayBajoPedido ? ` Recordá el adelanto de ${colones(o.adelanto)} para lo bajo pedido.` : ''} Seguimiento: ${linkSeguimiento(o)}`,
  },
  'en camino': {
    titulo: 'En camino / listo',
    texto: (o) => retiro(o)
      ? `¡Hola ${nombre(o)}! 🏡 Tu pedido ${o.codigo} ya está listo para retirar en la tienda (Palmital de Rivas). ¡Te esperamos!`
      : `¡Hola ${nombre(o)}! 🛵 Tu pedido ${o.codigo} va en camino.${o.pago === 'efectivo' ? ` Total a pagar: ${colones(o.total - (o.hayBajoPedido ? o.adelanto : 0))} en efectivo.` : ''} Seguimiento: ${linkSeguimiento(o)}`,
  },
  entregado: {
    titulo: 'Entregado',
    texto: (o) => `¡Gracias por tu compra, ${nombre(o)}! 🎉 Pedido ${o.codigo} entregado. Cuando querás repetirlo, entrá a ${config.baseUrl}/#/cuenta/pedidos. ¡Pura vida!`,
  },
  cancelado: {
    titulo: 'Cancelado',
    texto: (o) => `Hola ${nombre(o)}, tu pedido ${o.codigo} quedó cancelado. Si fue un error o querés cambiar algo, respondenos por aquí y con gusto lo arreglamos. 🙏`,
  },
}

/** Enlace wa.me al cliente con el aviso del estado indicado (o el actual) */
export const waCliente = (o: Order, estado: EstadoPedido = o.estado) =>
  `https://wa.me/506${(o.cliente?.telefono ?? '').replace(/\D/g, '').slice(-8)}?text=${encodeURIComponent(PLANTILLAS[estado].texto(o))}`

/** Enlace wa.me con un texto libre (sin número: WhatsApp pide elegir el contacto) */
export const waTexto = (texto: string, numero = '') => `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`
