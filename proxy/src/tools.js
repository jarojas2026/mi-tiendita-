// Herramientas del agente de WhatsApp. Todo se valida contra el catálogo: nada de precios ni productos inventados.
import { buscar, colones, lineaProducto, porId } from './kb.js'
import { guardarPedido } from './store.js'

export function toolBuscar(kb, indice, args) {
  const ps = buscar(indice, String(args?.consulta || '').slice(0, 120), 6)
  if (!ps.length) return `Sin resultados para "${args?.consulta}". Decile que consulte con nosotros o que vea la web ${kb.tienda.baseUrl}.`
  return ps.map((p) => lineaProducto(kb, p)).join('\n')
}

const codigo = (ahora) => 'WA-' + new Date(ahora).toISOString().slice(2, 10).replace(/-/g, '') + '-' + Math.random().toString(36).slice(2, 6).toUpperCase()

/**
 * Valida y guarda el pedido. Devuelve { ok, resumen, pedido } o { ok:false, error } (el error vuelve al LLM).
 * No confirma stock: queda "pendiente" hasta que Gabriel lo revise.
 */
export async function toolPedido(kb, indice, kv, conv, args, ahora = Date.now()) {
  const t = kb.tienda
  const crudos = Array.isArray(args?.items) ? args.items.slice(0, 20) : []
  if (!crudos.length) return { ok: false, error: 'Faltan los productos. Usá buscar_productos para conseguir los ids.' }
  const items = [], malos = []
  for (const it of crudos) {
    const p = porId(indice, String(it?.id || ''))
    if (!p) { malos.push(String(it?.id || '?')); continue }
    const porKg = /por kg/.test(p.nombre)
    let q = Number(it?.cantidad) || 1
    q = porKg ? Math.max(0.5, Math.round(q * 2) / 2) : Math.max(1, Math.round(q))
    q = Math.min(q, 50)
    items.push({ id: p.id, nombre: p.nombre, cantidad: q, precio: p.precio, disp: p.disp })
  }
  if (malos.length) return { ok: false, error: `Estos ids no existen en el catálogo: ${malos.join(', ')}. Usá buscar_productos y no inventés ids.` }
  const nombre = String(args?.nombre || conv.nombre || '').trim().slice(0, 60)
  const zona = String(args?.zona || '').trim().slice(0, 80)
  const direccion = String(args?.direccion || '').trim().slice(0, 200)
  const pago = /sinpe/i.test(String(args?.pago)) ? 'sinpe' : /efectivo|cash/i.test(String(args?.pago)) ? 'efectivo' : ''
  const faltan = [!nombre && 'nombre', !zona && 'zona', !direccion && 'dirección', !pago && 'método de pago (SINPE o efectivo)'].filter(Boolean)
  if (faltan.length) return { ok: false, error: `Falta: ${faltan.join(', ')}. Pedíselo al cliente.` }

  // Mismo pedido repetido en los últimos 15 min → no duplicar
  const firma = JSON.stringify(items.map((i) => [i.id, i.cantidad]))
  const previo = conv.pedidos.find((x) => x.firma === firma && ahora - x.fecha < 15 * 60_000)
  if (previo) return { ok: true, repetido: true, resumen: `Tu pedido *${previo.id}* ya quedó registrado 👍. Gabriel te confirma por aquí.` }

  const sinPrecio = items.some((i) => i.precio == null)
  const total = items.reduce((s, i) => s + (i.precio ?? 0) * i.cantidad, 0)
  const bajoPedido = items.filter((i) => i.disp === 'Bajo pedido')
  const adelanto = Math.ceil((bajoPedido.reduce((s, i) => s + (i.precio ?? 0) * i.cantidad, 0) * t.adelantoPct) / 100 / 50) * 50
  const pedido = { id: codigo(ahora), wa: conv.wa, nombre, zona, direccion, pago, items, total, sinPrecio, adelanto, estado: 'pendiente', fecha: ahora, canal: 'whatsapp' }
  await guardarPedido(kv, pedido)
  conv.pedidos = [...conv.pedidos, { id: pedido.id, fecha: ahora, firma }].slice(-10)
  conv.atencion = true // que Gabriel lo vea en la bandeja

  const lineas = items.map((i) => `• ${i.cantidad} × ${i.nombre} — ${i.precio == null ? 'precio por confirmar' : colones(i.precio * i.cantidad)}${i.disp === 'Bajo pedido' ? ' _(bajo pedido)_' : ''}`)
  const pagoTxt = []
  if (pago === 'sinpe') {
    const monto = bajoPedido.length ? `${colones(total)} (o como mínimo el adelanto del ${t.adelantoPct}% de lo bajo pedido: ${colones(adelanto)})` : colones(total)
    pagoTxt.push(`*Pago por SINPE Móvil:* al ${t.sinpe || 'número por confirmar'}, por ${sinPrecio ? 'el monto que te confirmemos' : monto}. Poné *${pedido.id}* en el detalle y mandanos el comprobante por aquí.`)
  } else {
    pagoTxt.push('*Pago:* en efectivo al recibir.')
    if (bajoPedido.length) pagoTxt.push(`Lo *bajo pedido* necesita un adelanto del ${t.adelantoPct}% (${colones(adelanto)}) por SINPE Móvil al ${t.sinpe}, con *${pedido.id}* en el detalle.`)
  }
  const resumen = [
    `¡Listo, ${nombre.split(' ')[0]}! 🛍️ Recibimos tu pedido *${pedido.id}*:`,
    ...lineas,
    `*Total productos:* ${colones(total)}${sinPrecio ? ' + lo que está por confirmar' : ''}`,
    t.envioGratis ? '*Envío:* gratis por promoción de lanzamiento 🎉' : '*Envío:* según la zona (te lo confirmamos).',
    `*Entrega:* ${zona} — ${direccion}.${t.diasEntrega.length ? ` Entregamos ${t.diasEntrega.join(' y ')}.` : ''}`,
    bajoPedido.length ? `Lo bajo pedido tarda ${t.plazoBajoPedido}.` : '',
    ...pagoTxt,
    'Gabriel revisa la disponibilidad y te confirma el pedido y la fecha por este chat. ¡Gracias! 🙌',
  ].filter(Boolean).join('\n')
  return { ok: true, resumen, pedido }
}

export function toolHumano(kb, conv, args) {
  conv.estado = 'humano'
  conv.motivo = String(args?.motivo || 'el cliente lo pidió').slice(0, 120)
  conv.atencion = true
  return `Listo 🙋‍♂️ Le paso tu mensaje a Gabriel y te responde por aquí apenas pueda (${kb.tienda.horario}).`
}

