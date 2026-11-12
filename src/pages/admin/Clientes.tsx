import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../../store'
import { colones, fechaLarga, norm } from '../../lib/format'
import { fmtKm, gmapsLink, kmDesdeTienda } from '../../lib/geo'
import { Btn, Card } from '../../components/ui'
import { EstadoChip } from '../Account'
import type { LatLng, NotaCliente, Order, Perfil } from '../../types'
import type { Punto } from '../../map/OrdersMap'

const OrdersMap = lazy(() => import('../../map/OrdersMap'))

export interface Cliente {
  uid: string; nombre: string; email: string; telefono: string
  pedidos: Order[]; gastado: number; ultimo?: Order; ubicacion?: LatLng; ubicacionFuente?: string
}

export function armarClientes(orders: Order[], perfiles: Perfil[]): Cliente[] {
  const m = new Map<string, Cliente>()
  perfiles.forEach((p) => {
    if (p.uid === 'admin-demo') return
    const dir = p.direcciones?.find((d) => d.lat != null && d.lng != null)
    m.set(p.uid, { uid: p.uid, nombre: p.nombre, email: p.email, telefono: p.telefono, pedidos: [], gastado: 0, ...(dir ? { ubicacion: { lat: dir.lat!, lng: dir.lng! }, ubicacionFuente: `dirección "${dir.etiqueta}"` } : {}) })
  })
  ;[...orders].sort((a, b) => b.creado.localeCompare(a.creado)).forEach((o) => {
    const c = m.get(o.userId) ?? { uid: o.userId, nombre: o.cliente.nombre, email: o.email, telefono: o.cliente.telefono, pedidos: [], gastado: 0 }
    c.pedidos.push(o)
    if (o.estado !== 'cancelado') c.gastado += o.total
    if (!c.ultimo) { c.ultimo = o; c.nombre = o.cliente.nombre || c.nombre; c.telefono = o.cliente.telefono || c.telefono }
    if (o.ubicacion && c.ubicacionFuente !== 'último pedido') { c.ubicacion = o.ubicacion; c.ubicacionFuente = 'último pedido' }
    m.set(o.userId, c)
  })
  return [...m.values()].sort((a, b) => b.gastado - a.gastado)
}

export default function Clientes({ orders }: { orders: Order[] }) {
  const { api } = useStore()
  const [perfiles, setPerfiles] = useState<Perfil[]>([])
  const [notas, setNotas] = useState<Record<string, NotaCliente>>({})
  const [sel, setSel] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [verMapa, setVerMapa] = useState(false)
  useEffect(() => {
    api?.todosPerfiles().then(setPerfiles).catch(() => {})
    api?.getNotas().then(setNotas).catch(() => {})
  }, [api])
  const clientes = useMemo(() => armarClientes(orders, perfiles), [orders, perfiles])
  const lista = clientes.filter((c) => !q || norm(`${c.nombre} ${c.telefono} ${c.email}`).includes(norm(q)))
  const c = clientes.find((x) => x.uid === sel)
  const puntos: Punto[] = clientes.filter((x) => x.ubicacion).map((x) => ({ id: x.uid, lat: x.ubicacion!.lat, lng: x.ubicacion!.lng, color: '#1c562d', label: String(x.pedidos.length), popup: `<b>${x.nombre.replace(/</g, '')}</b><br>${x.pedidos.length} pedidos · ${colones(x.gastado)}` }))

  if (c) return <Ficha c={c} nota={notas[c.uid]?.nota ?? ''} onBack={() => setSel(null)} onSave={async (n) => { await api!.saveNota(c.uid, n); setNotas({ ...notas, [c.uid]: { uid: c.uid, nota: n, actualizado: new Date().toISOString() } }) }} />

  return (
    <div className="space-y-3">
      <Card className="flex flex-wrap items-center gap-2">
        <input placeholder="Buscar cliente por nombre, teléfono o correo…" className="min-w-48 flex-1 rounded-lg border border-line bg-surface px-2 py-1.5" value={q} onChange={(e) => setQ(e.target.value)} />
        <button onClick={() => setVerMapa(!verMapa)} className="rounded-full bg-surface-2 px-3 py-1.5 text-sm font-bold ring-1 ring-line">{verMapa ? 'Ocultar mapa' : '🗺️ Mapa de clientes'}</button>
      </Card>
      {verMapa && <Suspense fallback={<div className="skeleton h-80 rounded-2xl" />}><OrdersMap puntos={puntos} testId="mapa-clientes" /></Suspense>}
      <p className="text-xs text-muted" data-testid="clientes-count">{clientes.length} clientes · {puntos.length} con ubicación</p>
      <div className="space-y-2" data-testid="clientes-lista">
        {lista.map((x) => (
          <button key={x.uid} onClick={() => setSel(x.uid)} className="w-full text-left">
            <Card className="flex items-center gap-3 text-sm transition hover:ring-brand-400">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 font-extrabold text-brand-800 dark:bg-brand-900 dark:text-brand-200">{(x.nombre || '?')[0].toUpperCase()}</span>
              <span className="min-w-0 flex-1"><b>{x.nombre || x.email}</b><br /><span className="text-muted">{x.telefono || 'sin teléfono'} · {x.pedidos.length} pedidos{x.ultimo ? ` · último ${fechaLarga(x.ultimo.creado.slice(0, 10))}` : ''}</span></span>
              <b className="whitespace-nowrap">{colones(x.gastado)}</b>
            </Card>
          </button>
        ))}
      </div>
    </div>
  )
}

function Ficha({ c, nota, onBack, onSave }: { c: Cliente; nota: string; onBack: () => void; onSave: (n: string) => Promise<void> }) {
  const [n, setN] = useState(nota)
  const [ok, setOk] = useState(false)
  const ticket = c.pedidos.length ? c.gastado / c.pedidos.filter((o) => o.estado !== 'cancelado').length || 0 : 0
  const top = useMemo(() => {
    const m = new Map<string, { nombre: string; qty: number }>()
    c.pedidos.forEach((o) => o.items.forEach((i) => { const x = m.get(i.id) ?? { nombre: i.nombre, qty: 0 }; x.qty += i.qty; m.set(i.id, x) }))
    return [...m.values()].sort((a, b) => b.qty - a.qty).slice(0, 5)
  }, [c])
  return (
    <div className="space-y-3" data-testid="ficha-cliente">
      <button onClick={onBack} className="text-sm font-semibold text-brand-600 dark:text-brand-300">‹ Todos los clientes</button>
      <Card className="space-y-1">
        <h2 className="text-xl font-bold">{c.nombre || c.email}</h2>
        <p className="text-sm text-muted">{c.email} · {c.telefono ? <a className="font-semibold text-brand-600" href={`https://wa.me/506${c.telefono.replace(/\D/g, '').slice(-8)}`} target="_blank" rel="noreferrer">{c.telefono}</a> : 'sin teléfono'}</p>
        <div className="grid grid-cols-3 gap-2 pt-2 text-center">
          <div className="rounded-xl bg-surface-2 p-2"><b className="block text-lg">{c.pedidos.length}</b><span className="text-[11px] text-muted">pedidos</span></div>
          <div className="rounded-xl bg-surface-2 p-2"><b className="block text-lg" data-testid="total-gastado">{colones(c.gastado)}</b><span className="text-[11px] text-muted">total gastado</span></div>
          <div className="rounded-xl bg-surface-2 p-2"><b className="block text-lg">{colones(ticket)}</b><span className="text-[11px] text-muted">ticket promedio</span></div>
        </div>
        {c.ubicacion ? (
          <p className="pt-2 text-sm">📍 Última ubicación ({c.ubicacionFuente}): <a className="font-semibold text-brand-600 underline" href={gmapsLink(c.ubicacion)} target="_blank" rel="noreferrer">{c.ubicacion.lat.toFixed(5)}, {c.ubicacion.lng.toFixed(5)}</a> · {fmtKm(kmDesdeTienda(c.ubicacion))} de la tienda</p>
        ) : <p className="pt-2 text-sm text-muted">Sin ubicación guardada.</p>}
        {top.length > 0 && <p className="text-sm">⭐ Lo que más compra: {top.map((x) => x.nombre).join(', ')}</p>}
      </Card>
      <Card className="space-y-2">
        <h3 className="font-bold">Notas privadas</h3>
        <textarea value={n} onChange={(e) => setN(e.target.value)} rows={3} maxLength={1000} placeholder="Ej.: prefiere entrega en la tarde; casa con perro; pide factura." className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm" aria-label="Notas del cliente" />
        <Btn className="py-2 text-sm" onClick={async () => { await onSave(n); setOk(true); setTimeout(() => setOk(false), 1300) }}>{ok ? 'Guardado ✓' : 'Guardar nota'}</Btn>
      </Card>
      <Card className="space-y-2">
        <h3 className="font-bold">Pedidos</h3>
        {c.pedidos.map((o) => (
          <Link key={o.id} to={`/cuenta/pedidos/${o.id}`} className="flex items-center justify-between gap-2 rounded-xl bg-surface-2 p-2 text-sm">
            <span><b>{o.codigo}</b> · {fechaLarga(o.fecha)}<br /><span className="text-muted">{o.items.length} productos · {o.zonaNombre}</span></span>
            <span className="text-right"><EstadoChip e={o.estado} /><br /><b>{colones(o.total)}</b></span>
          </Link>
        ))}
        {!c.pedidos.length && <p className="text-sm text-muted">Sin pedidos todavía.</p>}
      </Card>
    </div>
  )
}
