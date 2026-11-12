import { lazy, Suspense, useMemo, useState } from 'react'
import { cantidad, colones, fechaLarga, isoDate } from '../../lib/format'
import { fmtKm, gmapsDir, gmapsRuta, rutaVecinoCercano, tienda, wazeLink } from '../../lib/geo'
import { Card } from '../../components/ui'
import { EstadoChip } from '../Account'
import type { Order } from '../../types'
import type { Punto } from '../../map/OrdersMap'

const OrdersMap = lazy(() => import('../../map/OrdersMap'))

export const COLOR_ESTADO: Record<string, string> = {
  nuevo: '#2563eb', confirmado: '#4f46e5', 'en camino': '#9333ea', entregado: '#16a34a', cancelado: '#6b7280',
}
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

export default function MapaTab({ orders }: { orders: Order[] }) {
  const [dia, setDia] = useState(isoDate(new Date()))
  const delDia = useMemo(() => orders.filter((o) => o.fecha === dia && o.estado !== 'cancelado'), [orders, dia])
  const { orden, sinUbicacion, totalKm } = useMemo(() => rutaVecinoCercano(delDia.filter((o) => o.estado !== 'entregado')), [delDia])
  const puntos: Punto[] = useMemo(() => {
    const n = new Map(orden.map((x, i) => [x.item.id, i + 1]))
    return delDia.filter((o) => o.ubicacion).map((o) => ({
      id: o.id, lat: o.ubicacion!.lat, lng: o.ubicacion!.lng, color: COLOR_ESTADO[o.estado] ?? '#1c562d', label: n.has(o.id) ? String(n.get(o.id)) : '✓',
      popup: `<b>${esc(o.cliente.nombre)}</b><br>${esc(o.codigo)} · ${esc(o.estado)}<br>${esc(o.franja)}<br>${colones(o.total)}<br><a href="${wazeLink(o.ubicacion!)}" target="_blank">Waze</a> · <a href="${gmapsDir(o.ubicacion!)}" target="_blank">Google Maps</a>`,
    }))
  }, [delDia, orden])
  const ruta = useMemo(() => (orden.length ? [[tienda.lat, tienda.lng] as [number, number], ...orden.map((x) => [x.item.ubicacion!.lat, x.item.ubicacion!.lng] as [number, number])] : undefined), [orden])
  return (
    <div className="space-y-3">
      <Card className="flex flex-wrap items-center gap-2">
        <label className="text-sm font-semibold" htmlFor="dia-mapa">Día</label>
        <input id="dia-mapa" type="date" className="rounded-lg border border-line bg-surface px-2 py-1.5" value={dia} onChange={(e) => setDia(e.target.value)} />
        <span className="text-sm text-muted" data-testid="mapa-resumen">{fechaLarga(dia)} · {delDia.length} pedidos · {puntos.length} con pin</span>
      </Card>
      <div className="flex flex-wrap gap-2 text-[11px]">
        {Object.entries(COLOR_ESTADO).filter(([e]) => e !== 'cancelado').map(([e, c]) => <span key={e} className="flex items-center gap-1 capitalize"><span className="h-3 w-3 rounded-full" style={{ background: c }} />{e}</span>)}
        <span>🏪 tienda</span>
      </div>
      <Suspense fallback={<div className="skeleton h-80 rounded-2xl" />}>
        <OrdersMap puntos={puntos} ruta={ruta} testId="mapa-admin" />
      </Suspense>
      <Card className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold">🧭 Ruta sugerida por cercanía <span className="font-normal text-muted">({orden.length} paradas · ~{fmtKm(totalKm)} en línea recta)</span></h3>
          {orden.length > 0 && <a href={gmapsRuta(orden.map((x) => x.item.ubicacion!))} target="_blank" rel="noreferrer" className="rounded-full bg-brand-600 px-3 py-1.5 text-xs font-bold text-white" data-testid="ruta-gmaps">Abrir ruta completa en Google Maps</a>}
        </div>
        <ol className="space-y-2" data-testid="ruta-orden">
          {orden.map(({ item: o, km }, i) => (
            <li key={o.id} className="flex gap-3 rounded-xl bg-surface-2 p-2.5 text-sm">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-extrabold text-white" style={{ background: COLOR_ESTADO[o.estado] }}>{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1"><b>{o.cliente.nombre}</b> · {o.franja} <EstadoChip e={o.estado} /></p>
                <p className="text-muted">{o.direccion} · +{fmtKm(km)}</p>
                <p className="text-muted">{o.items.map((x) => `${cantidad(x.qty, x.venta)} ${x.nombre}`).join(', ')}</p>
                <p className="mt-1 flex flex-wrap gap-2">
                  <a href={wazeLink(o.ubicacion!)} target="_blank" rel="noreferrer" className="rounded-full bg-[#33ccff] px-2.5 py-0.5 text-xs font-extrabold text-[#06243a]">Waze</a>
                  <a href={gmapsDir(o.ubicacion!)} target="_blank" rel="noreferrer" className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-extrabold ring-1 ring-line">Google Maps</a>
                  <a href={`tel:${o.cliente.telefono.replace(/\D/g, '')}`} className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-extrabold ring-1 ring-line">Llamar</a>
                  <b className="ml-auto">Cobrar {colones(o.pago === 'efectivo' ? o.total - (o.hayBajoPedido ? o.adelanto : 0) : 0)}</b>
                </p>
              </div>
            </li>
          ))}
        </ol>
        {sinUbicacion.length > 0 && <p className="text-xs text-muted">Sin pin ({sinUbicacion.length}): {sinUbicacion.map((o) => `${o.cliente.nombre} (${o.zonaNombre})`).join(', ')}</p>}
        {!orden.length && !sinUbicacion.length && <p className="text-sm text-muted">No hay entregas pendientes ese día.</p>}
      </Card>
    </div>
  )
}
