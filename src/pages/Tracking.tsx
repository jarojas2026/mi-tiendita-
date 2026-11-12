// v5 — Seguimiento del pedido (#/pedido/:id?t=token): lee Firestore, funciona en cualquier dispositivo con el enlace.
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { config } from '../config'
import { cantidad, colones, fechaLarga } from '../lib/format'
import { linkSeguimiento, waLink } from '../lib/order'
import { fmtKm, gmapsDir, wazeLink } from '../lib/geo'
import { useStore } from '../store'
import { Card, Empty } from '../components/ui'
import { EstadoChip, MensajePedido, RepetirBtn } from './Account'
import { ESTADO_INFO, FLUJO, type Order } from '../types'
import { getSeguimiento, type Seguimiento } from '../services/orders'

const hora = (iso?: string) => (iso ? new Date(iso).toLocaleString('es-CR', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '')

export default function Tracking() {
  const { id = '' } = useParams()
  const [sp] = useSearchParams()
  const nuevo = Boolean(sp.get('nuevo'))
  const token = sp.get('t') ?? undefined
  const { api, user } = useStore()
  const [o, setO] = useState<Seguimiento | null | undefined>(undefined)
  const [copiado, setCopiado] = useState(false)
  const cargar = useCallback(() => { if (api) getSeguimiento(id, token).then(setO).catch(() => setO(null)) }, [api, id, token])
  useEffect(() => { cargar() }, [cargar])
  const cerrado = o?.estado === 'entregado' || o?.estado === 'cancelado'
  useEffect(() => {
    if (cerrado) return
    const t = setInterval(() => { if (document.visibilityState === 'visible') cargar() }, 30000)
    return () => clearInterval(t)
  }, [cargar, cerrado]) // se refresca cada 30 s mientras el pedido esté abierto

  if (o === undefined) return <div className="space-y-3 pt-2"><div className="skeleton h-24 rounded-3xl" /><div className="skeleton h-64 rounded-3xl" /></div>
  if (o === null) return (
    <Empty tipo="caja" titulo="No encontramos ese pedido" texto={api?.modo === 'demo' ? 'En modo demo, el seguimiento solo se ve en el mismo teléfono o navegador donde se hizo el pedido.' : 'Revisá que el enlace esté completo (incluye ?t=…) o escribinos por WhatsApp con tu código de pedido.'}>
      <a href={`https://wa.me/${config.whatsapp}`} target="_blank" rel="noreferrer" className="rounded-full bg-[#25D366] px-5 py-2 font-bold text-white">Escribir por WhatsApp</a>
    </Empty>
  )

  const completo = Array.isArray(o.items) && Boolean(o.cliente)
  const cancelado = o.estado === 'cancelado'
  const idx = FLUJO.indexOf(o.estado)
  const cuando = (e: string) => [...(o.historial ?? [])].reverse().find((h) => h.estado === e)?.at
  const info = ESTADO_INFO[o.estado]
  const link = linkSeguimiento(o)
  const compartir = async () => {
    const data = { title: `Pedido ${o.codigo}`, text: `Seguimiento de mi pedido ${o.codigo} en ${config.storeName}`, url: link }
    try { if (navigator.share) { await navigator.share(data); return } await navigator.clipboard.writeText(link) } catch { /* cancelado */ }
    setCopiado(true); setTimeout(() => setCopiado(false), 1500)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-3" data-testid="tracking">
      {nuevo && completo && (
        <Card className="space-y-2 bg-green-50 text-sm text-green-900 dark:bg-green-900/30 dark:text-green-100">
          <p className="text-base">✅ <b>¡Pedido {o.codigo} guardado!</b></p>
          <p>Si WhatsApp no se abrió, tocá el botón para enviarnos el resumen. Guardá esta página para ver el estado de tu pedido.</p>
          <a href={waLink(o as Order)} target="_blank" rel="noreferrer" className="block rounded-xl bg-[#25D366] py-2.5 text-center font-bold text-white">Enviar pedido por WhatsApp</a>
          {o.pago === 'sinpe' && !o.sinpeRef && <p className="text-xs">📱 Pago por SINPE Móvil al <b>{config.sinpe.numero}</b> ({config.sinpe.nombre}). Mandanos la captura del comprobante por WhatsApp.</p>}
        </Card>
      )}

      {o.local && (
        <Card className="bg-amber-50 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">
          ⚠️ No pudimos guardar el pedido en línea (sin conexión). Quedó en este teléfono: <b>envialo por WhatsApp</b> para que lo recibamos.
        </Card>
      )}

      <section className="overflow-hidden rounded-3xl text-white shadow-lift" style={{ background: `linear-gradient(135deg, ${info.color}, #0f3d22)` }}>
        <div className="flex items-center gap-4 p-5">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-4xl" aria-hidden="true">{info.icono}</span>
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-wide text-white/80 uppercase">Pedido {o.codigo}</p>
            <h1 className="text-2xl leading-tight font-bold" data-testid="tracking-estado">{info.titulo}</h1>
            <p className="text-sm text-white/85">{info.texto}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 bg-black/15 px-5 py-2.5 text-xs">
          <span>📅 {o.entrega === 'retiro' ? 'Retiro' : 'Entrega'}: {fechaLarga(o.fecha)} · {o.franja}</span>
          <span className="ml-auto">Total {colones(o.total)}</span>
        </div>
      </section>

      <Card>
        <h2 className="mb-3 font-bold">Estado del pedido</h2>
        <ol className="relative space-y-0" data-testid="timeline">
          {FLUJO.map((e, i) => {
            const hecho = !cancelado && i <= idx
            const actual = !cancelado && i === idx
            const ts = cuando(e)
            const nombre = e === 'en camino' && o.entrega === 'retiro' ? 'Listo para retirar' : ESTADO_INFO[e].titulo
            return (
              <li key={e} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ring-4 ${hecho ? 'bg-brand-600 text-white ring-brand-100 dark:ring-brand-900' : 'bg-surface-2 text-muted ring-transparent'} ${actual ? 'animate-pulse' : ''}`}>{hecho ? '✓' : i + 1}</span>
                  {i < FLUJO.length - 1 && <span className={`w-0.5 flex-1 ${!cancelado && i < idx ? 'bg-brand-600' : 'bg-line'}`} style={{ minHeight: 28 }} />}
                </div>
                <div className="pb-4">
                  <p className={`text-sm font-bold ${hecho ? '' : 'text-muted'}`}>{ESTADO_INFO[e].icono} {nombre}</p>
                  <p className="text-xs text-muted">{ts ? hora(ts) : actual ? 'Ahora' : 'Pendiente'}</p>
                </div>
              </li>
            )
          })}
        </ol>
        {cancelado && <p className="rounded-xl bg-gray-100 p-3 text-sm dark:bg-gray-800">✖️ Pedido cancelado {hora(cuando('cancelado'))}. Si fue un error, escribinos.</p>}
        <p className="mt-1 text-[11px] text-muted">Esta página se actualiza sola cada 30 segundos.</p>
      </Card>

      {Array.isArray(o.items) && (
        <Card className="space-y-1 text-sm">
          <div className="mb-1 flex items-center justify-between"><h2 className="font-bold">Productos</h2><EstadoChip e={o.estado} /></div>
          {o.items!.map((i) => (
            <div key={i.id} className="flex justify-between gap-2"><span>{cantidad(i.qty, i.venta)} {i.nombre}{i.disponibilidad === 'Bajo pedido' && <em className="text-amber-700"> (bajo pedido)</em>}</span><span className="whitespace-nowrap">{colones(i.precio == null ? null : i.precio * i.qty)}</span></div>
          ))}
          <hr className="my-1 border-line" />
          <div className="flex justify-between"><span>Envío</span><span>{o.envio == null ? 'Por cotizar' : o.envio === 0 ? 'Gratis' : colones(o.envio)}</span></div>
          <div className="flex justify-between text-base font-extrabold"><span>Total</span><span>{colones(o.total)}</span></div>
          {o.hayBajoPedido && <div className="flex justify-between text-amber-800"><span>Adelanto ({config.adelantoPct}%)</span><b>{colones(o.adelanto ?? 0)}</b></div>}
          <hr className="my-1 border-line" />
          <p>📍 {o.zonaNombre}{o.direccion ? ` — ${o.direccion}` : ''}</p>
          {o.ubicacion && (
            <div className="flex flex-wrap items-center gap-2 pt-1" data-testid="links-navegacion">
              <span className="text-xs text-muted">🗺️ Pin a {fmtKm(o.distanciaKm ?? 0)} de la tienda</span>
              <a href={wazeLink(o.ubicacion)} target="_blank" rel="noreferrer" className="rounded-full bg-[#33ccff] px-3 py-1 text-xs font-extrabold text-[#06243a]">Waze</a>
              <a href={gmapsDir(o.ubicacion)} target="_blank" rel="noreferrer" className="rounded-full bg-surface-2 px-3 py-1 text-xs font-extrabold ring-1 ring-line">Google Maps</a>
            </div>
          )}
          <p>💳 {!o.pago ? '' : o.pago === 'sinpe' ? `SINPE Móvil ${config.sinpe.numero}${o.sinpeRef ? ` · comprobante ${o.sinpeRef}` : ''}` : 'Efectivo'}</p>
          {o.notas && <p>📝 {o.notas}</p>}
          {user && o.userId === user.uid && !nuevo && <div className="pt-2"><RepetirBtn o={o as Order} /></div>}
        </Card>
      )}

      {nuevo && completo && <MensajePedido o={o as Order} />}

      <div className="grid grid-cols-2 gap-2">
        <a href={`https://wa.me/${config.whatsapp}?text=${encodeURIComponent(`Hola, consulto por mi pedido ${o.codigo}`)}`} target="_blank" rel="noreferrer" className="rounded-xl bg-[#25D366] py-2.5 text-center text-sm font-bold text-white">💬 Consultar por WhatsApp</a>
        <button onClick={compartir} className="rounded-xl bg-surface py-2.5 text-sm font-bold ring-1 ring-line">{copiado ? 'Enlace copiado ✓' : '🔗 Compartir seguimiento'}</button>
      </div>
      {user && <p className="text-center text-sm"><Link to="/cuenta/pedidos" className="font-semibold text-brand-600 dark:text-brand-300">Ver todos mis pedidos ›</Link></p>}
    </div>
  )
}
