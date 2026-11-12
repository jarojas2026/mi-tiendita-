// v4 — Resumen del admin: KPIs del día, lo más vendido, entregas pendientes y mapa de pedidos activos.
import { lazy, Suspense, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../../components/ui'
import { colones, cantidad, fechaLarga } from '../../lib/format'
import { kpis, resumenDia } from '../../ai/adminLocal'
import { rutaSeguimiento } from '../../lib/order'
import { waTexto } from '../../lib/whatsapp'
import { stockBajo } from '../../services/products'
import { useStore } from '../../store'
import { gmapsDir } from '../../lib/geo'
import { EstadoChip } from '../Account'
import { COLOR_ESTADO } from './MapaTab'
import type { Order } from '../../types'
import type { Punto } from '../../map/OrdersMap'

const OrdersMap = lazy(() => import('../../map/OrdersMap'))
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

function Kpi({ icono, titulo, valor, sub, tono = 'bg-surface' }: { icono: string; titulo: string; valor: string; sub?: string; tono?: string }) {
  return (
    <div className={`rounded-2xl p-3.5 shadow-card ring-1 ring-line ${tono}`}>
      <p className="flex items-center gap-1.5 text-xs font-semibold text-muted"><span aria-hidden="true">{icono}</span>{titulo}</p>
      <p className="mt-1 font-display text-2xl font-bold">{valor}</p>
      {sub && <p className="text-[11px] text-muted">{sub}</p>}
    </div>
  )
}

export default function Resumen({ orders, irA }: { orders: Order[]; irA: (tab: 'tablero' | 'mapa' | 'asistente' | 'productos') => void }) {
  const { products, ajustes } = useStore()
  const k = useMemo(() => kpis(orders), [orders])
  const bajos = useMemo(() => stockBajo(products, ajustes.stockBajo), [products, ajustes.stockBajo])
  const resumen = useMemo(() => resumenDia(orders), [orders])
  const [verResumen, setVerResumen] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const textoWa = resumen.replace(/\*\*/g, '*')
  const copiar = async () => { try { await navigator.clipboard.writeText(textoWa); setCopiado(true); setTimeout(() => setCopiado(false), 1500) } catch { /* sin permiso */ } }
  const pendientes = useMemo(() => orders.filter((o) => o.estado === 'nuevo' || o.estado === 'confirmado' || o.estado === 'en camino')
    .sort((a, b) => (a.fecha + a.franja).localeCompare(b.fecha + b.franja)), [orders])
  const puntos: Punto[] = useMemo(() => pendientes.filter((o) => o.ubicacion).map((o) => ({
    id: o.id, lat: o.ubicacion!.lat, lng: o.ubicacion!.lng, color: COLOR_ESTADO[o.estado] ?? '#1c562d', label: o.estado === 'nuevo' ? 'N' : o.estado === 'confirmado' ? 'C' : '→',
    popup: `<b>${esc(o.cliente.nombre)}</b><br>${esc(o.codigo)} · ${esc(o.estado)}<br>${esc(o.fecha)} ${esc(o.franja)}<br>${colones(o.total)}<br><a href="${gmapsDir(o.ubicacion!)}" target="_blank">Cómo llegar</a>`,
  })), [pendientes])
  const maxTop = Math.max(1, ...k.top.map((t) => t.qty))
  return (
    <div className="space-y-3" data-testid="admin-resumen">
      {bajos.length > 0 && (
        <div role="alert" data-testid="alerta-stock" className="rounded-2xl bg-red-50 p-3 text-sm text-red-900 ring-1 ring-red-200 dark:bg-red-900/30 dark:text-red-100 dark:ring-red-800">
          <div className="flex items-center justify-between gap-2"><b>📦 Stock bajo ({bajos.length})</b><button onClick={() => irA('productos')} className="text-xs font-bold underline">Ver productos ›</button></div>
          <p className="mt-1 text-xs">{bajos.slice(0, 8).map((p) => `${p.nombre} (${p.stock === 0 ? 'AGOTADO' : p.stock})`).join(' · ')}{bajos.length > 8 ? ` y ${bajos.length - 8} más` : ''}</p>
        </div>
      )}
      <Card className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold">📋 Resumen del día</h3>
          <div className="flex gap-1.5">
            <button onClick={() => setVerResumen((v) => !v)} className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold ring-1 ring-line">{verResumen ? 'Ocultar' : 'Ver'}</button>
            <button onClick={copiar} className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold ring-1 ring-line">{copiado ? 'Copiado ✓' : '📋 Copiar'}</button>
            <a href={waTexto(textoWa)} target="_blank" rel="noreferrer" className="rounded-full bg-[#25D366] px-3 py-1 text-xs font-bold text-white">💬 WhatsApp</a>
          </div>
        </div>
        {verResumen && <pre data-testid="resumen-dia" className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-surface-2 p-2 font-sans text-xs">{resumen.replace(/\*\*/g, '')}</pre>}
      </Card>
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Kpi icono="🧾" titulo="Pedidos hoy" valor={String(k.pedidosHoy)} sub={`${k.nuevos} por confirmar`} tono="bg-blue-50 dark:bg-blue-900/30" />
        <Kpi icono="💰" titulo="Ventas hoy" valor={colones(k.ventasHoy)} sub={`7 días: ${colones(k.ventasSemana)}`} tono="bg-brand-50 dark:bg-brand-900/30" />
        <Kpi icono="🚚" titulo="Entregas pendientes" valor={String(k.pendientesEntrega + k.nuevos)} sub={`${k.entregasHoy} programadas hoy`} tono="bg-purple-50 dark:bg-purple-900/30" />
        <Kpi icono="🛒" titulo="Ticket promedio" valor={colones(k.ticketPromedio)} sub={`${k.pedidosSemana} pedidos en 7 días`} tono="bg-accent-50 dark:bg-accent-700/20" />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card className="space-y-2">
          <div className="flex items-center justify-between"><h3 className="font-bold">🏆 Lo más vendido (7 días)</h3><button onClick={() => irA('asistente')} className="text-xs font-semibold text-brand-600 dark:text-brand-300">¿Qué reabastecer? ›</button></div>
          {k.top.length === 0 ? <p className="text-sm text-muted">Aún no hay ventas esta semana.</p> : k.top.map((t) => (
            <div key={t.id} className="text-sm">
              <div className="flex justify-between gap-2"><span className="line-clamp-1">{t.nombre}</span><b className="whitespace-nowrap">{cantidad(t.qty, t.venta)}</b></div>
              <div className="mt-1 h-2 rounded-full bg-surface-2"><div className="h-2 rounded-full bg-brand-600" style={{ width: `${(t.qty / maxTop) * 100}%` }} /></div>
            </div>
          ))}
        </Card>
        <Card className="space-y-2">
          <div className="flex items-center justify-between"><h3 className="font-bold">⏳ Por atender ({pendientes.length})</h3><button onClick={() => irA('tablero')} className="text-xs font-semibold text-brand-600 dark:text-brand-300">Abrir tablero ›</button></div>
          {pendientes.length === 0 ? <p className="text-sm text-muted">Todo al día 🎉</p> : (
            <ul className="max-h-64 divide-y divide-line overflow-y-auto">
              {pendientes.slice(0, 12).map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                  <Link to={rutaSeguimiento(o)} className="min-w-0"><b className="text-brand-600 dark:text-brand-300">{o.codigo}</b> · {o.cliente.nombre}<br /><span className="text-xs text-muted">{fechaLarga(o.fecha)} · {o.franja} · {o.entrega === 'retiro' ? 'Retiro' : o.zonaNombre}</span></Link>
                  <span className="flex flex-col items-end gap-1"><EstadoChip e={o.estado} /><b className="text-xs">{colones(o.total)}</b></span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="space-y-2">
        <div className="flex items-center justify-between"><h3 className="font-bold">🗺️ Pedidos activos en el mapa ({puntos.length})</h3><button onClick={() => irA('mapa')} className="text-xs font-semibold text-brand-600 dark:text-brand-300">Ruta del día ›</button></div>
        <Suspense fallback={<div className="skeleton h-80 rounded-2xl" />}><OrdersMap puntos={puntos} testId="mapa-resumen" /></Suspense>
        <p className="text-[11px] text-muted">N = nuevo · C = confirmado · → = en camino. Solo pedidos con pin.</p>
      </Card>
    </div>
  )
}
