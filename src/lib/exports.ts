// v4 — Exportaciones CSV del admin (pedidos y catálogo para Meta Commerce Manager).
import { config } from '../config'
import { linkSeguimiento } from './order'
import { cantidad, isoDate } from './format'
import type { Order, Product } from '../types'

const csvCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
export function descargarCsv(nombre: string, filas: unknown[][]) {
  const csv = '\ufeff' + filas.map((r) => r.map(csvCell).join(',')).join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  a.download = nombre
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

export function exportPedidosCsv(orders: Order[]) {
  const head = ['codigo', 'creado', 'estado', 'cliente', 'telefono', 'email', 'entrega', 'zona', 'direccion', 'fecha_entrega', 'franja', 'lat', 'lng', 'mapa', 'distancia_km', 'pago', 'comprobante_sinpe', 'articulos', 'subtotal', 'envio', 'total', 'adelanto', 'notas', 'seguimiento']
  const rows = orders.map((o) => [
    o.codigo, o.creado, o.estado, o.cliente.nombre, o.cliente.telefono, o.email, o.entrega ?? 'domicilio', o.zonaNombre, o.direccion, o.fecha, o.franja,
    o.ubicacion?.lat ?? '', o.ubicacion?.lng ?? '', o.ubicacion ? `https://www.google.com/maps/search/?api=1&query=${o.ubicacion.lat},${o.ubicacion.lng}` : '', o.distanciaKm ?? '',
    o.pago, o.sinpeRef ?? '', o.items.map((i) => `${cantidad(i.qty, i.venta)} ${i.nombre}`).join(' | '), o.subtotal, o.envio ?? 'cotizar', o.total, o.adelanto, o.notas,
    linkSeguimiento(o),
  ])
  descargarCsv(`pedidos-${isoDate(new Date())}.csv`, [head, ...rows])
}

/**
 * Catálogo para Meta Commerce Manager (Facebook / Instagram / WhatsApp Business).
 * Columnas: id,title,description,availability,condition,price,link,image_link,brand
 * image_link usa JPG públicos en GitHub Pages (Meta no acepta WebP de forma confiable).
 */
export async function exportMetaCsv(products: Product[]) {
  const base = config.baseUrl + '/'
  let conJpg = new Set<string>()
  try { conJpg = new Set((await (await fetch(import.meta.env.BASE_URL + 'data/meta-jpg.json')).json()) as string[]) } catch { /* sin lista */ }
  const fincaJpg = new Map(config.finca.filter((f) => f.imagenJpg).map((f) => [f.id, f.imagenJpg!]))
  const head = ['id', 'title', 'description', 'availability', 'condition', 'price', 'link', 'image_link', 'brand']
  let omitidos = 0
  const rows: unknown[][] = []
  for (const p of products) {
    if (p.oculto || p.precio == null || p.precioPorConfirmar) { omitidos++; continue }
    const img = fincaJpg.get(p.id) ?? (conJpg.has(p.id) ? `img/jpg/${p.id}.jpg` : null)
    if (!img) { omitidos++; continue }
    const bajo = p.disponibilidad === 'Bajo pedido'
    const desc = p.finca
      ? `${p.nombre}. ${p.nota ?? 'Producto de nuestra finca en Pérez Zeledón.'} Envío gratis en San Isidro de El General centro. Pago por SINPE Móvil ${config.sinpe.numero} o efectivo.`
      : `${p.nombre}. Categoría: ${p.categoria}. ${bajo ? `Bajo pedido: llega en ${config.plazoBajoPedido}, requiere ${config.adelantoPct}% de adelanto.` : 'Disponible en tienda.'} Entrega en Pérez Zeledón (gratis en San Isidro de El General centro) o retiro en Palmital. Pago por SINPE Móvil ${config.sinpe.numero} o efectivo.`
    rows.push([p.id, p.nombre.slice(0, 200), desc, p.disponibilidad === 'Agotado' ? 'out of stock' : 'in stock', 'new', `${Math.round(p.precio)} CRC`, `${base}#/p/${p.id}`, base + img, config.storeName])
  }
  descargarCsv(`catalogo-meta-${isoDate(new Date())}.csv`, [head, ...rows])
  return { incluidos: rows.length, omitidos }
}
