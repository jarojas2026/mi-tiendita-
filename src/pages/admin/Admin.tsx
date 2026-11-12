import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { config } from '../../config'
import { cantidad, colones, fechaLarga, isoDate, norm } from '../../lib/format'
import { exportMetaCsv, exportPedidosCsv } from '../../lib/exports'
import { imgUrl, useStore } from '../../store'
import { Card } from '../../components/ui'
import { EstadoChip } from '../Account'
import { fmtKm, gmapsDir, wazeLink } from '../../lib/geo'
import { ESTADOS, type Disponibilidad, type EstadoPedido, type Order, type Product } from '../../types'
import { cambiarEstado, escucharPedidos, todosPedidos } from '../../services/orders'
import { rutaSeguimiento } from '../../lib/order'
import { waCliente } from '../../lib/whatsapp'

import { Lineatiempo, type OnEstado } from './comun'

const MapaTab = lazy(() => import('./MapaTab'))
const Clientes = lazy(() => import('./Clientes'))
const Reportes = lazy(() => import('./Reportes'))
const AsistenteAdmin = lazy(() => import('./AsistenteAdmin'))
const Resumen = lazy(() => import('./Resumen'))
const Tablero = lazy(() => import('./Tablero'))
const Ajustes = lazy(() => import('./Ajustes'))

export default function Admin() {
  const { user, authReady, api, recargarOverrides } = useStore()
  type Tab = 'resumen' | 'tablero' | 'pedidos' | 'mapa' | 'ruta' | 'clientes' | 'reportes' | 'asistente' | 'productos' | 'ajustes'
  const [tab, setTab] = useState<Tab>('resumen')
  const [orders, setOrders] = useState<Order[]>([])
  const [vivo, setVivo] = useState(false)
  const [errorDatos, setErrorDatos] = useState('')
  const [aviso, setAviso] = useState('')
  const esAdmin = Boolean(user?.isAdmin)
  // Pedidos EN VIVO (Firestore onSnapshot; en demo relee cada 5 s)
  useEffect(() => {
    if (!api || !esAdmin) return
    return escucharPedidos((os) => { setOrders(os); setVivo(true); setErrorDatos('') }, (e) => { setVivo(false); setErrorDatos(e.message) })
  }, [api, esAdmin])
  const reload = () => { todosPedidos().then((os) => { setOrders(os); setErrorDatos('') }).catch((e) => setErrorDatos((e as Error).message)) }
  const onEstado: OnEstado = async (o, e) => {
    try {
      const r = await cambiarEstado(o.id, e)
      if (r.stockDescontado) { recargarOverrides(); setAviso(`📦 Stock descontado de ${r.stockDescontado} producto(s) del pedido ${o.codigo}.`) }
      if (api?.modo === 'demo') reload()
    } catch (err) { setAviso(`⚠️ ${(err as Error).message}`) }
  }
  if (!authReady) return null
  if (!user) return <Navigate to="/entrar?next=/admin" replace />
  if (!user.isAdmin) return <p className="p-6 text-center">No tenés permisos de administrador.</p>
  const t = (k: Tab, l: string) => (
    <button role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`shrink-0 rounded-xl px-3.5 py-2 text-sm font-bold transition ${tab === k ? 'bg-surface text-brand-600 dark:text-brand-300 shadow dark:text-brand-200' : 'text-muted'}`}>{l}</button>
  )
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div><h1 className="text-2xl font-bold">Panel de {config.storeName}</h1><p className="text-xs text-muted">{fechaLarga(isoDate(new Date()))} · modo {api?.modo === 'demo' ? 'demo (datos en este navegador)' : 'Firebase'}{vivo && <span className="ml-1 font-bold text-green-700 dark:text-green-400">● en vivo</span>}</p></div>
        <button onClick={() => reload()} className="rounded-full bg-surface px-3 py-1.5 text-xs font-bold ring-1 ring-line">↻ Actualizar</button>
      </div>
      {errorDatos && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-100">⚠️ No se pudieron leer los pedidos: {errorDatos} {api?.modo === 'firebase' && 'Revisá que las reglas de firestore.rules estén publicadas y que entraste con un correo admin.'}</p>}
      {aviso && <p role="status" onClick={() => setAviso('')} className="cursor-pointer rounded-xl bg-blue-50 p-2 text-sm text-blue-900 dark:bg-blue-900/30 dark:text-blue-100">{aviso} <span className="text-xs">(tocar para cerrar)</span></p>}
      <div role="tablist" className="no-scrollbar flex gap-1 overflow-x-auto rounded-2xl bg-surface-2 p-1 ring-1 ring-line">{t('resumen', '📊 Resumen')}{t('tablero', '🗂️ Tablero')}{t('pedidos', 'Lista')}{t('mapa', '🗺️ Mapa')}{t('ruta', 'Ruta del día')}{t('clientes', 'Clientes')}{t('reportes', 'Reportes')}{t('asistente', '🤖 Asistente')}{t('productos', '🏷️ Productos')}{t('ajustes', '⚙️ Ajustes')}</div>
      <Suspense fallback={<div className="skeleton h-64 rounded-2xl" />}>
        {tab === 'resumen' && <Resumen orders={orders} irA={setTab} />}
        {tab === 'ajustes' && <Ajustes />}
        {tab === 'tablero' && <Tablero orders={orders} onEstado={onEstado} />}
        {tab === 'pedidos' && <Pedidos orders={orders} onEstado={onEstado} />}
        {tab === 'mapa' && <MapaTab orders={orders} />}
        {tab === 'ruta' && <Ruta orders={orders} />}
        {tab === 'clientes' && <Clientes orders={orders} />}
        {tab === 'reportes' && <Reportes orders={orders} />}
        {tab === 'asistente' && <AsistenteAdmin orders={orders} />}
        {tab === 'productos' && <Productos />}
      </Suspense>
    </div>
  )
}

function Pedidos({ orders, onEstado }: { orders: Order[]; onEstado: OnEstado }) {
  const { ajustes } = useStore()
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [zona, setZona] = useState('')
  const [estado, setEstado] = useState('')
  const list = orders.filter((o) => (!desde || o.fecha >= desde) && (!hasta || o.fecha <= hasta) && (!zona || o.zonaId === zona) && (!estado || o.estado === estado))
  const sel = 'w-full rounded-lg border border-line bg-surface px-2 py-1.5 text-sm'
  
  return (
    <>
      <Card className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <label className="text-xs font-semibold">Entrega desde<input type="date" className={sel} value={desde} onChange={(e) => setDesde(e.target.value)} /></label>
        <label className="text-xs font-semibold">hasta<input type="date" className={sel} value={hasta} onChange={(e) => setHasta(e.target.value)} /></label>
        <label className="text-xs font-semibold">Zona<select className={sel} value={zona} onChange={(e) => setZona(e.target.value)}><option value="">Todas</option>{ajustes.zonas.map((z) => <option key={z.id} value={z.id}>{z.nombre}</option>)}</select></label>
        <label className="text-xs font-semibold">Estado<select className={sel} value={estado} onChange={(e) => setEstado(e.target.value)}><option value="">Todos</option>{ESTADOS.map((e) => <option key={e}>{e}</option>)}</select></label>
        <button onClick={() => exportPedidosCsv(list)} className="col-span-2 self-end rounded-lg bg-brand-600 px-3 py-2 text-sm font-bold text-white sm:col-span-1">⬇️ Exportar CSV</button>
      </Card>
      <p className="text-sm text-muted" data-testid="admin-count">{list.length} pedidos · {colones(list.filter((o) => o.estado !== 'cancelado').reduce((s, o) => s + o.total, 0))}</p>
      <div className="space-y-2" data-testid="admin-orders">
        {list.map((o) => (
          <Card key={o.id} className="space-y-1 text-sm">
            <div className="flex items-center justify-between gap-2">
              <Link to={rutaSeguimiento(o)} className="font-bold text-brand-600 dark:text-brand-300">{o.codigo}</Link>
              <span className="flex items-center gap-1">{o.guest && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold">sin cuenta</span>}<EstadoChip e={o.estado} /></span>
            </div>
            <p>{o.cliente.nombre} · <a className="text-brand-600 dark:text-brand-300" href={`https://wa.me/506${o.cliente.telefono.replace(/\D/g, '').slice(-8)}`} target="_blank" rel="noreferrer">{o.cliente.telefono}</a></p>
            <p className="text-muted">📅 {fechaLarga(o.fecha)} · {o.franja} · {o.zonaNombre.split(' — ')[0]}</p>
            {o.ubicacion && <p className="flex flex-wrap items-center gap-2 text-xs"><span className="text-muted">📍 {fmtKm(o.distanciaKm ?? 0)} de la tienda</span><a className="font-bold text-brand-600 underline" href={wazeLink(o.ubicacion)} target="_blank" rel="noreferrer">Waze</a><a className="font-bold text-brand-600 underline" href={gmapsDir(o.ubicacion)} target="_blank" rel="noreferrer">Google Maps</a></p>}
            <p className="text-muted">{o.items.map((i) => `${cantidad(i.qty, i.venta)} ${i.nombre}`).join(', ')}</p>
            <Lineatiempo o={o} />
            <div className="flex items-center justify-between gap-2">
              <b>{colones(o.total)}{o.hayBajoPedido ? ` · adelanto ${colones(o.adelanto)}` : ''}</b>
              <select aria-label="Cambiar estado" className="rounded-lg border border-line bg-surface px-2 py-1 text-sm capitalize" value={o.estado} onChange={(e) => onEstado(o, e.target.value as EstadoPedido)}>
                {ESTADOS.map((e) => <option key={e}>{e}</option>)}
              </select>
              <a href={waCliente(o)} target="_blank" rel="noreferrer" aria-label="Avisar al cliente por WhatsApp" title="Aviso por WhatsApp según el estado" className="rounded-lg bg-[#25D366] px-2.5 py-1 text-xs font-bold text-white">💬</a>
            </div>
          </Card>
        ))}
      </div>
    </>
  )
}

function Ruta({ orders }: { orders: Order[] }) {
  const { ajustes } = useStore()
  const [dia, setDia] = useState(isoDate(new Date()))
  const delDia = orders.filter((o) => o.fecha === dia && o.estado !== 'cancelado')
  const grupos = ajustes.zonas.map((z) => ({ z, os: delDia.filter((o) => o.zonaId === z.id).sort((a, b) => a.franja.localeCompare(b.franja)) })).filter((g) => g.os.length)
  return (
    <>
      <Card className="flex items-center gap-2">
        <label className="text-sm font-semibold">Día</label>
        <input type="date" className="rounded-lg border border-line bg-surface px-2 py-1.5" value={dia} onChange={(e) => setDia(e.target.value)} />
        <span className="text-sm text-muted">{fechaLarga(dia)} · {delDia.length} entregas</span>
      </Card>
      {grupos.length === 0 && <p className="text-sm text-muted">No hay entregas para ese día.</p>}
      {grupos.map(({ z, os }) => (
        <Card key={z.id} className="space-y-2">
          <h3 className="font-bold">📍 {z.nombre} <span className="font-normal text-muted">({os.length})</span></h3>
          {os.map((o) => (
            <div key={o.id} className="rounded-lg bg-surface-2 p-2 text-sm">
              <p><b>{o.franja}</b> · {o.cliente.nombre} · {o.cliente.telefono} <EstadoChip e={o.estado} /></p>
              <p className="text-muted">{o.direccion}</p>
              <p className="text-muted">{o.items.map((i) => `${cantidad(i.qty, i.venta)} ${i.nombre}`).join(', ')}</p>
              <p>Cobrar: <b>{colones(o.pago === 'efectivo' ? o.total - (o.hayBajoPedido ? o.adelanto : 0) : 0)}</b> {o.pago === 'sinpe' ? '(SINPE)' : '(efectivo)'}</p>
            </div>
          ))}
        </Card>
      ))}
    </>
  )
}

function Productos() {
  const { products, saveOverride, categorias, ajustes } = useStore()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [vis, setVis] = useState<'' | 'visibles' | 'ocultos' | 'stock-bajo'>('')
  const [n, setN] = useState(40)
  const [metaMsg, setMetaMsg] = useState('')
  const ocultos = products.filter((p) => p.oculto).length
  const all = useMemo(() => {
    const w = norm(q)
    return products.filter((p) => (!cat || p.categoriaId === cat) && (!w || norm(p.nombre).includes(w))
      && (!vis || (vis === 'ocultos' ? p.oculto : vis === 'stock-bajo' ? p.stock != null && p.stock <= ajustes.stockBajo : !p.oculto)))
  }, [products, q, cat, vis])
  const list = all.slice(0, n)
  return (
    <>
      <Card className="flex flex-wrap gap-2">
        <input placeholder="Buscar producto…" className="min-w-40 flex-1 rounded-lg border border-line bg-surface px-2 py-1.5" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">Todas</option><option value="finca">Productos de finca</option>
          {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          <option value="coleccionables">Coleccionables (oculta)</option><option value="cuadros-diamante">Cuadros diamante (oculta)</option>
        </select>
        <select aria-label="Visibilidad" className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm" value={vis} onChange={(e) => setVis(e.target.value as typeof vis)}>
          <option value="">Visibles y ocultos</option><option value="visibles">Solo visibles</option><option value="ocultos">Solo ocultos</option><option value="stock-bajo">Stock bajo (≤ {ajustes.stockBajo})</option>
        </select>
        <button onClick={async () => { const r = await exportMetaCsv(products); setMetaMsg(`Catálogo Meta: ${r.incluidos} productos (omitidos ${r.omitidos} sin foto JPG, precio u ocultos).`) }} data-testid="export-meta" className="rounded-lg bg-[#1877F2] px-3 py-1.5 text-sm font-bold text-white">⬇️ CSV para Meta</button>
      </Card>
      <p className="text-xs text-muted" data-testid="admin-prod-count">{products.length - ocultos} visibles · {ocultos} ocultos. Mostrando {list.length} de {all.length}. Stock vacío = sin control; 0 = Agotado automático.</p>
      {metaMsg && <p className="rounded-lg bg-blue-50 p-2 text-xs text-blue-900 dark:bg-blue-900/30 dark:text-blue-100" role="status">{metaMsg} Subilo en Meta Commerce Manager › Catálogo › Orígenes de datos › Subir archivo.</p>}
      <div className="space-y-2">{list.map((p) => <FilaProducto key={p.id} p={p} save={saveOverride} />)}</div>
      {all.length > n && <button onClick={() => setN((x) => x + 40)} className="w-full rounded-xl bg-surface py-2 text-sm font-bold ring-1 ring-line">Ver 40 más ({all.length - n} restantes)</button>}
    </>
  )
}

function FilaProducto({ p, save }: { p: Product; save: (id: string, o: object) => Promise<void> }) {
  const [nombre, setNombre] = useState(p.nombre)
  const [precio, setPrecio] = useState(p.precio == null ? '' : String(p.precio))
  const [antes, setAntes] = useState(p.precioAntes ? String(p.precioAntes) : '')
  const [disp, setDisp] = useState<Disponibilidad>(p.disponibilidad)
  const [oferta, setOferta] = useState(!!p.oferta)
  const [oculto, setOculto] = useState(!!p.oculto)
  const [stock, setStock] = useState(p.stock == null ? '' : String(p.stock))
  const [ok, setOk] = useState(false)
  const i = 'rounded-lg border border-line bg-surface px-2 py-1 text-sm'
  return (
    <Card className="flex flex-wrap items-center gap-2 text-sm">
      {p.miniatura ? <img src={imgUrl(p.miniatura)} alt="" loading="lazy" className="h-11 w-11 rounded-lg object-cover" /> : <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-surface-2 text-xl">{p.icono ?? '📦'}</span>}
      <input className={`${i} min-w-48 flex-1`} value={nombre} onChange={(e) => setNombre(e.target.value)} />
      <input className={`${i} w-24`} placeholder="Precio ₡" inputMode="numeric" value={precio} onChange={(e) => setPrecio(e.target.value.replace(/\D/g, ''))} />
      <input className={`${i} w-20`} placeholder="Stock" aria-label="Stock" inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value.replace(/\D/g, ''))} />
      <input className={`${i} w-24`} placeholder="Antes ₡" inputMode="numeric" value={antes} onChange={(e) => setAntes(e.target.value.replace(/\D/g, ''))} />
      <select className={i} value={disp} onChange={(e) => setDisp(e.target.value as Disponibilidad)}><option>En tienda</option><option>Bajo pedido</option><option>Agotado</option></select>
      <label className="flex items-center gap-1"><input type="checkbox" checked={oferta} onChange={(e) => setOferta(e.target.checked)} />Oferta</label>
      <label className="flex items-center gap-1"><input type="checkbox" checked={oculto} onChange={(e) => setOculto(e.target.checked)} />Ocultar</label>
      <button className="rounded bg-brand-600 px-3 py-1 font-bold text-white" onClick={async () => {
        await save(p.id, { nombre, precio: precio === '' ? null : Number(precio), precioAntes: antes === '' ? null : Number(antes), disponibilidad: disp, oferta, oculto, stock: stock === '' ? null : Number(stock) })
        setOk(true); setTimeout(() => setOk(false), 1200)
      }}>{ok ? '✓' : 'Guardar'}</button>
      <span className="w-full text-[11px] text-muted">{p.categoria} · base foto: {colones(p.precioBase)} · {p.vendorId}{p.motivoOculto ? ` · oculto por: ${p.motivoOculto}` : ''}</span>
    </Card>
  )
}
