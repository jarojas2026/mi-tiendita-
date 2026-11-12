// Reportes simples con gráficos SVG propios (sin librerías pesadas).
import { useMemo, useState } from 'react'
import { colones, fechaLarga, isoDate } from '../../lib/format'
import { Card } from '../../components/ui'
import type { Order } from '../../types'

function Barras({ datos, titulo, testId }: { datos: { k: string; v: number; etiqueta: string }[]; titulo: string; testId: string }) {
  const max = Math.max(1, ...datos.map((d) => d.v))
  const W = 340, H = 160, bw = W / Math.max(datos.length, 1)
  return (
    <figure data-testid={testId}>
      <svg viewBox={`0 0 ${W} ${H + 24}`} className="w-full" role="img" aria-label={titulo}>
        {[0.25, 0.5, 0.75, 1].map((f) => <line key={f} x1="0" x2={W} y1={H - H * f} y2={H - H * f} className="stroke-line" strokeDasharray="3 4" />)}
        {datos.map((d, i) => {
          const h = (d.v / max) * (H - 14)
          return (
            <g key={d.k}>
              <rect x={i * bw + bw * 0.18} y={H - h} width={bw * 0.64} height={Math.max(h, d.v ? 2 : 0)} rx="4" className="fill-brand-500" />
              {d.v > 0 && datos.length <= 14 && <text x={i * bw + bw / 2} y={H - h - 4} textAnchor="middle" className="fill-muted" fontSize="8">{d.v >= 1000 ? `${Math.round(d.v / 1000)}k` : d.v}</text>}
              <text x={i * bw + bw / 2} y={H + 14} textAnchor="middle" className="fill-muted" fontSize="8.5">{d.etiqueta}</text>
            </g>
          )
        })}
      </svg>
      <figcaption className="sr-only">{titulo}</figcaption>
    </figure>
  )
}

function Horizontal({ datos, testId, fmt = (n: number) => String(n) }: { datos: { k: string; v: number; extra?: string }[]; testId: string; fmt?: (n: number) => string }) {
  const max = Math.max(1, ...datos.map((d) => d.v))
  return (
    <ul className="space-y-2" data-testid={testId}>
      {datos.map((d) => (
        <li key={d.k} className="text-sm">
          <div className="flex justify-between gap-2"><span className="line-clamp-1">{d.k}</span><b className="whitespace-nowrap">{fmt(d.v)}{d.extra ? ` · ${d.extra}` : ''}</b></div>
          <div className="mt-1 h-2 rounded-full bg-surface-2"><div className="h-2 rounded-full bg-gradient-to-r from-brand-500 to-accent-400" style={{ width: `${(d.v / max) * 100}%` }} /></div>
        </li>
      ))}
      {!datos.length && <li className="text-sm text-muted">Sin datos todavía.</li>}
    </ul>
  )
}

export default function Reportes({ orders }: { orders: Order[] }) {
  const [dias, setDias] = useState(14)
  const validos = orders.filter((o) => o.estado !== 'cancelado')
  const porDia = useMemo(() => {
    const hoy = new Date()
    return Array.from({ length: dias }, (_, i) => {
      const d = new Date(hoy); d.setDate(hoy.getDate() - (dias - 1 - i))
      const k = isoDate(d)
      const v = validos.filter((o) => isoDate(new Date(o.creado)) === k).reduce((s, o) => s + o.total, 0)
      return { k, v, etiqueta: String(d.getDate()) }
    })
  }, [validos, dias])
  const enRango = validos.filter((o) => isoDate(new Date(o.creado)) >= porDia[0].k)
  const total = enRango.reduce((s, o) => s + o.total, 0)
  const top = useMemo(() => {
    const m = new Map<string, { k: string; v: number; monto: number }>()
    enRango.forEach((o) => o.items.forEach((i) => { const x = m.get(i.id) ?? { k: i.nombre, v: 0, monto: 0 }; x.v += i.qty; x.monto += (i.precio ?? 0) * i.qty; m.set(i.id, x) }))
    return [...m.values()].sort((a, b) => b.monto - a.monto).slice(0, 8).map((x) => ({ k: x.k, v: x.monto, extra: `${x.v} u.` }))
  }, [enRango])
  const zonas = useMemo(() => {
    const m = new Map<string, { k: string; v: number; n: number }>()
    enRango.forEach((o) => { const x = m.get(o.zonaId) ?? { k: o.zonaNombre, v: 0, n: 0 }; x.v += o.total; x.n++; m.set(o.zonaId, x) })
    return [...m.values()].sort((a, b) => b.v - a.v).map((x) => ({ k: x.k, v: x.v, extra: `${x.n} pedidos` }))
  }, [enRango])
  return (
    <div className="space-y-3" data-testid="reportes">
      <div className="flex gap-2">{[7, 14, 30].map((d) => <button key={d} onClick={() => setDias(d)} className={`rounded-full px-3 py-1.5 text-sm font-bold ${dias === d ? 'bg-brand-600 text-white' : 'bg-surface ring-1 ring-line'}`}>{d} días</button>)}</div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <Card><b className="block text-lg" data-testid="rep-total">{colones(total)}</b><span className="text-[11px] text-muted">ventas</span></Card>
        <Card><b className="block text-lg">{enRango.length}</b><span className="text-[11px] text-muted">pedidos</span></Card>
        <Card><b className="block text-lg">{colones(enRango.length ? total / enRango.length : 0)}</b><span className="text-[11px] text-muted">ticket prom.</span></Card>
      </div>
      <Card><h3 className="mb-1 font-bold">Ventas por día</h3><p className="text-xs text-muted">{fechaLarga(porDia[0].k)} – {fechaLarga(porDia[porDia.length - 1].k)}</p><Barras datos={porDia} titulo="Ventas por día" testId="rep-dias" /></Card>
      <div className="grid gap-3 md:grid-cols-2">
        <Card><h3 className="mb-2 font-bold">Productos top</h3><Horizontal datos={top} testId="rep-productos" fmt={colones} /></Card>
        <Card><h3 className="mb-2 font-bold">Zonas top</h3><Horizontal datos={zonas} testId="rep-zonas" fmt={colones} /></Card>
      </div>
    </div>
  )
}
