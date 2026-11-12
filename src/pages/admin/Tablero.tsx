// v4 — Tablero de pedidos por estado: nuevo → confirmado → en camino → entregado / cancelado.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { cantidad, colones, fechaLarga } from '../../lib/format'
import { gmapsDir, wazeLink } from '../../lib/geo'
import { rutaSeguimiento } from '../../lib/order'
import { PLANTILLAS, waCliente } from '../../lib/whatsapp'
import { ESTADO_INFO, ESTADOS, FLUJO, type EstadoPedido, type Order } from '../../types'
import { Lineatiempo, type OnEstado } from './comun'

export default function Tablero({ orders, onEstado }: { orders: Order[]; onEstado: OnEstado }) {
  const [verCerrados, setVerCerrados] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const cols: EstadoPedido[] = verCerrados ? [...ESTADOS] : ['nuevo', 'confirmado', 'en camino']
  const mover = async (o: Order, e: EstadoPedido) => {
    setBusy(o.id)
    try { await onEstado(o, e) } finally { setBusy(null) }
  }
  return (
    <div className="space-y-2" data-testid="tablero">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted">Tocá <b>Avanzar</b> para mover el pedido (se guarda la hora). 💬 abre WhatsApp con el aviso del estado listo para el cliente. Al pasar a <b>entregado</b> se descuenta el stock.</p>
        <label className="flex shrink-0 items-center gap-1 text-xs font-semibold"><input type="checkbox" checked={verCerrados} onChange={(e) => setVerCerrados(e.target.checked)} /> Ver entregados y cancelados</label>
      </div>
      <div className="no-scrollbar -mx-3 flex snap-x gap-3 overflow-x-auto px-3 pb-2">
        {cols.map((c) => {
          const lista = orders.filter((o) => o.estado === c).sort((a, b) => (a.fecha + a.franja).localeCompare(b.fecha + b.franja))
          const info = ESTADO_INFO[c]
          return (
            <section key={c} data-testid={`col-${c}`} className="w-[82vw] max-w-[320px] shrink-0 snap-start rounded-2xl bg-surface-2 p-2 ring-1 ring-line">
              <h3 className="mb-2 flex items-center justify-between px-1 text-sm font-bold"><span>{info.icono} {info.titulo}</span><span className="rounded-full px-2 text-xs text-white" style={{ background: info.color }}>{lista.length}</span></h3>
              <div className="max-h-[65vh] space-y-2 overflow-y-auto">
                {lista.length === 0 && <p className="px-1 py-4 text-center text-xs text-muted">Sin pedidos</p>}
                {lista.map((o) => {
                  const i = FLUJO.indexOf(o.estado)
                  const sig = i >= 0 && i < FLUJO.length - 1 ? FLUJO[i + 1] : null
                                    return (
                    <article key={o.id} className="space-y-1.5 rounded-xl bg-surface p-2.5 text-sm shadow-card">
                      <div className="flex items-center justify-between gap-2">
                        <Link to={rutaSeguimiento(o)} className="font-bold text-brand-600 dark:text-brand-300">{o.codigo}</Link>
                        <b>{colones(o.total)}</b>
                      </div>
                      <p className="leading-tight">{o.cliente.nombre} · <span className="text-muted">{o.cliente.telefono}</span></p>
                      <p className="text-xs text-muted">{o.entrega === 'retiro' ? '🏡 Retiro' : `🛵 ${o.zonaNombre}`} · {fechaLarga(o.fecha)} · {o.franja}</p>
                      <p className="line-clamp-2 text-xs text-muted">{o.items.map((x) => `${cantidad(x.qty, x.venta)} ${x.nombre}`).join(', ')}</p>
                      <p className="text-xs">{o.pago === 'sinpe' ? `📱 SINPE${o.sinpeRef ? ` · ${o.sinpeRef}` : ' · sin comprobante'}` : '💵 Efectivo'}</p>
                      <Lineatiempo o={o} />
                      {o.ubicacion && <p className="flex gap-2 text-xs"><a className="font-bold text-brand-600 underline" href={wazeLink(o.ubicacion)} target="_blank" rel="noreferrer">Waze</a><a className="font-bold text-brand-600 underline" href={gmapsDir(o.ubicacion)} target="_blank" rel="noreferrer">Maps</a></p>}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {sig && <button disabled={busy === o.id} onClick={() => mover(o, sig)} data-testid="avanzar" className="flex-1 rounded-lg bg-brand-600 px-2 py-1.5 text-xs font-bold text-white disabled:opacity-50">Avanzar → {sig}</button>}
                        {<a href={waCliente(o)} target="_blank" rel="noreferrer" title={`Aviso WhatsApp: ${PLANTILLAS[o.estado].titulo}`} aria-label="Avisar al cliente por WhatsApp" className="rounded-lg bg-[#25D366] px-2.5 py-1.5 text-xs font-bold text-white">💬</a>}
                        {o.estado !== 'cancelado' && o.estado !== 'entregado' && <button disabled={busy === o.id} onClick={() => { if (confirm(`¿Cancelar el pedido ${o.codigo}?`)) mover(o, 'cancelado') }} className="rounded-lg bg-surface-2 px-2 py-1.5 text-xs font-semibold text-red-600 ring-1 ring-line">Cancelar</button>}
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
