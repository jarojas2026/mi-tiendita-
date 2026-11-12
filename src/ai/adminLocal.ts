// Asistente del ADMIN en modo local: resume pedidos, sugiere reabastecer y redacta publicaciones.
// Funciona sin servidor ni IA externa. Con el proxy activo, el panel ofrece "Mejorar con IA".
import { config } from '../config'
import { cantidad, colones, fechaLarga, isoDate, norm } from '../lib/format'
import type { Order, Product } from '../types'

const activos = (os: Order[]) => os.filter((o) => o.estado !== 'cancelado' && o.estado !== 'entregado')
const diaLocal = (iso: string) => isoDate(new Date(iso))

function agrupar(os: Order[], filtro: (i: Order['items'][number]) => boolean) {
  const m = new Map<string, { id: string; nombre: string; qty: number; venta?: string; pedidos: Set<string>; monto: number }>()
  os.forEach((o) => o.items.filter(filtro).forEach((i) => {
    const x = m.get(i.id) ?? { id: i.id, nombre: i.nombre, qty: 0, venta: i.venta, pedidos: new Set<string>(), monto: 0 }
    x.qty += i.qty; x.pedidos.add(o.codigo); x.monto += (i.precio ?? 0) * i.qty; m.set(i.id, x)
  }))
  return [...m.values()].sort((a, b) => b.qty - a.qty)
}

/** KPIs del día (los usa el Resumen del admin y el asistente). */
export function kpis(orders: Order[], hoy = isoDate(new Date())) {
  const validos = orders.filter((o) => o.estado !== 'cancelado')
  const deHoy = validos.filter((o) => diaLocal(o.creado) === hoy)
  const hace7 = new Date(); hace7.setDate(hace7.getDate() - 6)
  const semana = validos.filter((o) => diaLocal(o.creado) >= isoDate(hace7))
  const top = agrupar(semana, () => true).slice(0, 5)
  return {
    pedidosHoy: deHoy.length,
    ventasHoy: deHoy.reduce((s, o) => s + o.total, 0),
    ventasSemana: semana.reduce((s, o) => s + o.total, 0),
    pedidosSemana: semana.length,
    ticketPromedio: semana.length ? Math.round(semana.reduce((s, o) => s + o.total, 0) / semana.length) : 0,
    nuevos: orders.filter((o) => o.estado === 'nuevo').length,
    pendientesEntrega: orders.filter((o) => o.estado === 'confirmado' || o.estado === 'en camino').length,
    entregasHoy: activos(orders).filter((o) => o.fecha === hoy).length,
    top,
  }
}

/** Resumen del día en texto (para leer o mandar por WhatsApp). */
export function resumenDia(orders: Order[]) {
  const hoy = isoDate(new Date())
  const k = kpis(orders, hoy)
  const ent = activos(orders).filter((o) => o.fecha === hoy)
  const finca = agrupar(activos(orders), (i) => i.vendorId === 'finca')
  const L = [`📊 **Resumen de hoy** · ${fechaLarga(hoy)}`,
    `• Pedidos nuevos hoy: ${k.pedidosHoy} por ${colones(k.ventasHoy)}`,
    `• Por confirmar: ${k.nuevos} · Por entregar (confirmados / en camino): ${k.pendientesEntrega}`,
    `• Entregas programadas hoy: ${ent.length}`,
    `• Últimos 7 días: ${k.pedidosSemana} pedidos, ${colones(k.ventasSemana)} (promedio ${colones(k.ticketPromedio)})`]
  if (k.top.length) L.push('', '🏆 **Lo más vendido (7 días):**', ...k.top.map((x, i) => `${i + 1}. ${x.nombre} — ${cantidad(x.qty, x.venta)}`))
  if (finca.length) L.push('', '🥚 **Alistar de la finca:**', ...finca.map((x) => `• ${cantidad(x.qty, x.venta)} ${x.nombre}`))
  if (ent.length) L.push('', '🚚 **Entregas de hoy:**', ...ent.map((o) => `• ${o.franja} · ${o.cliente.nombre} · ${o.zonaNombre} · ${colones(o.total)}`))
  if (!orders.length) L.push('', 'Todavía no hay pedidos registrados.')
  return L.join('\n')
}

/** Sugerencia de reabastecimiento: stock bajo, lo que más se mueve y lo bajo pedido sin encargar. */
export function reabastecer(orders: Order[], products: Product[]) {
  const hace14 = new Date(); hace14.setDate(hace14.getDate() - 13)
  const vend = agrupar(orders.filter((o) => o.estado !== 'cancelado' && diaLocal(o.creado) >= isoDate(hace14)), () => true)
  const byId = new Map(products.map((p) => [p.id, p]))
  const bajos = products.filter((p) => !p.oculto && p.stock != null && p.stock <= 3).sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0))
  const pend = orders.filter((o) => o.estado === 'nuevo' || o.estado === 'confirmado')
  const encargar = agrupar(pend, (i) => i.disponibilidad === 'Bajo pedido')
  const L = ['📦 **Sugerencia de reabastecimiento**']
  if (bajos.length) L.push('', '⚠️ Stock bajo (≤ 3):', ...bajos.slice(0, 15).map((p) => `• ${p.nombre}: quedan ${p.stock}${p.stock === 0 ? ' (AGOTADO)' : ''}`))
  if (vend.length) {
    L.push('', '🔁 Más movidos en 14 días (sugerido para 2 semanas):')
    vend.slice(0, 10).forEach((x) => {
      const st = byId.get(x.id)?.stock
      const falta = st == null ? null : Math.max(0, Math.ceil(x.qty) - st)
      L.push(`• ${x.nombre}: vendidos ${cantidad(x.qty, x.venta)}${st != null ? ` · stock ${st} · pedir ${falta}` : ''}`)
    })
  }
  if (encargar.length) L.push('', '🧾 Bajo pedido por encargar al proveedor:', ...encargar.map((x) => `• ${cantidad(x.qty, x.venta)} ${x.nombre} — ${[...x.pedidos].join(', ')}`))
  if (L.length === 1) L.push('', 'Sin datos todavía: cuando haya pedidos o cargués existencias en Productos, aquí te digo qué reponer.')
  L.push('', '💡 Tip: cargá existencias en la pestaña Productos (campo Stock) para que el cálculo sea exacto.')
  return L.join('\n')
}

const HASHTAGS = '#PérezZeledón #SanIsidroDeElGeneral #MiTienditaDigital #HechoEnCostaRica'

/** Borradores de publicaciones para Facebook/Instagram/WhatsApp a partir de productos. */
export function borradoresRedes(products: Product[], orders: Order[]) {
  const vis = products.filter((p) => !p.oculto && p.precio != null && p.disponibilidad !== 'Agotado')
  const huevos = vis.filter((p) => p.finca && /huevo/i.test(p.nombre))
  const lacteos = vis.filter((p) => p.finca && !/huevo/i.test(p.nombre))
  const ofertas = vis.filter((p) => p.oferta)
  const top = kpis(orders).top.map((t) => vis.find((p) => p.id === t.id)).filter((p): p is Product => !!p)
  const dia = Math.floor(Date.now() / 86400000)
  const bazar = vis.filter((p) => !p.finca && p.miniatura)
  const pick = (arr: Product[], n: number) => [...arr].sort((a, b) => ((a.id.length * 31 + dia) % 7) - ((b.id.length * 31 + dia) % 7)).slice(0, n)
  const url = config.baseUrl + '/'
  const posts: { titulo: string; texto: string; productos: Product[] }[] = []
  if (huevos.length) posts.push({
    titulo: '🥚 Huevos Palmital',
    productos: huevos,
    texto: `🥚 ¡Huevos frescos de nuestra granja en Palmital!\n\n${huevos.map((p) => `✅ ${p.nombre}: ${colones(p.precio)}`).join('\n')}\n\nRecogidos cada día por nuestra familia 🐔. Envío GRATIS en San Isidro de El General centro 🚚\n📲 Pedí por WhatsApp al ${config.whatsappVisible} o en ${url}\n💳 SINPE Móvil ${config.sinpe.numero} o efectivo\n\n${HASHTAGS} #HuevosFrescos`,
  })
  if (lacteos.length) posts.push({
    titulo: '🧀 Lácteos de la finca',
    productos: lacteos,
    texto: `🧀 Del corral a tu mesa: lácteos frescos de la finca\n\n${lacteos.map((p) => `• ${p.nombre}: ${colones(p.precio)}${p.venta === 'kg' ? ' el kilo' : ''}`).join('\n')}\n\nPedidos por WhatsApp ${config.whatsappVisible} · ${url}\n\n${HASHTAGS} #QuesoTierno`,
  })
  const destacados = (ofertas.length ? ofertas : top.length ? top : pick(bazar, 4)).slice(0, 4)
  if (destacados.length) posts.push({
    titulo: ofertas.length ? '🔥 Ofertas' : top.length ? '🏆 Lo más pedido' : '🛍️ Del bazar',
    productos: destacados,
    texto: `${ofertas.length ? '🔥 ¡Ofertas de la semana!' : top.length ? '🏆 Lo que más están pidiendo los vecinos' : '🛍️ Novedades en el bazar'}\n\n${destacados.map((p) => `👉 ${p.nombre} — ${colones(p.precio)}`).join('\n')}\n\n🎁 Ideales para regalar esta temporada. ${destacados.some((p) => p.disponibilidad === 'Bajo pedido') ? 'Algunos son bajo pedido (3 a 5 días hábiles). ' : ''}\n📲 ${config.whatsappVisible} · ${url}\n\n${HASHTAGS} #Regalos`,
  })
  return posts
}

export function responderAdmin(q: string, orders: Order[], products: Product[] = []): string {
  const t = norm(q)
  const hoy = isoDate(new Date())
  if (/(publica|post|redes|facebook|instagram|anuncio)/.test(t)) {
    const ps = borradoresRedes(products, orders)
    return ps.length ? ps.map((p) => `**${p.titulo}**\n${p.texto}`).join('\n\n———\n\n') : 'No hay productos con precio para publicar.'
  }
  if (/(reabastec|reponer|stock|existencia|inventario|pedir|comprar|encargar|proveedor|s&f|syf|s y f)/.test(t)) return reabastecer(orders, products)
  if (/(finca|huevo|queso|natilla|leche|alistar|preparar)/.test(t)) {
    const lista = agrupar(activos(orders), (i) => i.vendorId === 'finca')
    if (!lista.length) return '🥚 No hay productos de la finca en pedidos activos.'
    return '🥚 **Alistar de la finca** (pedidos activos):\n' + lista.map((x) => `• ${cantidad(x.qty, x.venta)} ${x.nombre} (${x.pedidos.size} pedidos)`).join('\n')
  }
  if (/(entrega|ruta|repartir|llevar|camino)/.test(t)) {
    const os = activos(orders).filter((o) => o.fecha === hoy)
    if (!os.length) return `🚚 No hay entregas programadas para hoy (${fechaLarga(hoy)}).`
    const conPin = os.filter((o) => o.ubicacion).length
    return `🚚 **Entregas de hoy** (${os.length}, ${conPin} con pin):\n` + os.map((o) => `• ${o.franja} · ${o.cliente.nombre} · ${o.zonaNombre} · ${colones(o.total)} · ${o.estado}`).join('\n') + '\n\nAbrí la pestaña "Mapa" para la ruta ordenada por cercanía.'
  }
  if (/(pendiente|confirmar|nuevo|sin atender)/.test(t)) {
    const p = orders.filter((o) => o.estado === 'nuevo')
    if (!p.length) return '👌 No hay pedidos nuevos por confirmar.'
    return `⏳ **Por confirmar** (${p.length}):\n` + p.map((o) => `• ${o.codigo} · ${o.cliente.nombre} · ${o.cliente.telefono} · ${colones(o.total)}`).join('\n')
  }
  if (/(vend|venta|ingreso|cuanto|caja|resumen|hoy|dia)/.test(t)) return resumenDia(orders)
  return 'Puedo ayudarte con: “resumen del día”, “¿qué hay que reabastecer?”, “publicaciones para redes”, “¿qué alisto de la finca?”, “entregas de hoy”, “pedidos por confirmar”.'
}

export const SUGERENCIAS_ADMIN = ['📊 Resumen del día', '📦 ¿Qué reabastecer?', '📣 Publicaciones para redes', '🥚 ¿Qué alisto de la finca?', '🚚 Entregas de hoy', '⏳ Pedidos por confirmar']

export const SISTEMA_ADMIN = `Sos el asistente interno de ${config.storeName}, pulpería y bazar digital de Pérez Zeledón (Costa Rica).
Ayudás a Gabriel, el dueño. Español de Costa Rica con voseo, claro y breve. Usá SOLO los datos que te paso; no inventes cifras ni productos.
WhatsApp ${config.whatsappVisible}, SINPE Móvil ${config.sinpe.numero}, envío gratis en San Isidro de El General centro.`
