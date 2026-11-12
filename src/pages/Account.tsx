import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { config, sinpeTexto } from '../config'
import { cantidad, colones, fechaLarga, uid } from '../lib/format'
import { mensajeWhatsApp, waLink } from '../lib/order'
import { useStore } from '../store'
import { misPedidos } from '../services/orders'
import { Btn, Card, Empty, Input } from '../components/ui'
import { Icon } from '../components/icons'
import { fmtKm, gmapsDir, wazeLink } from '../lib/geo'
import { ESTADOS, type Order, type Perfil } from '../types'

export function Login() {
  const { api, user } = useStore()
  const [sp] = useSearchParams()
  const nav = useNavigate()
  const next = sp.get('next') || '/cuenta'
  const demo = api?.modo === 'demo'
  const [modo, setModo] = useState<'entrar' | 'registro'>(sp.get('registro') ? 'registro' : 'entrar')
  const [verCorreo, setVerCorreo] = useState(false)
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [nombre, setNombre] = useState('')
  const [tel, setTel] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (user) nav(next, { replace: true }) }, [user]) // eslint-disable-line

  const go = async (fn: () => Promise<void>) => {
    setError(''); setBusy(true)
    try { await fn() } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  const correo = (
    <>
      <div className="flex rounded-xl bg-surface-2 p-1 text-sm font-semibold">
        <button type="button" className={`flex-1 rounded-lg py-2 ${modo === 'entrar' ? 'bg-surface shadow' : ''}`} onClick={() => setModo('entrar')}>Iniciar sesión</button>
        <button type="button" className={`flex-1 rounded-lg py-2 ${modo === 'registro' ? 'bg-surface shadow' : ''}`} onClick={() => setModo('registro')}>Crear cuenta</button>
      </div>
      <form className="space-y-3" data-testid="form-correo" onSubmit={(e) => {
        e.preventDefault()
        go(() => (modo === 'entrar' ? api!.entrar(email, pass) : api!.registrar(email, pass, nombre.trim() || email.split('@')[0])))
      }}>
        {modo === 'registro' && <Input label="Nombre completo" name="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />}
        <Input label="Correo" type="email" name="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input label="Contraseña" type="password" name="password" autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'} value={pass} onChange={(e) => setPass(e.target.value)} required minLength={6} />
        <Btn className="w-full" disabled={busy || !api}>{modo === 'entrar' ? 'Entrar' : 'Crear cuenta'}</Btn>
      </form>
    </>
  )
  return (
    <div className="mx-auto max-w-sm space-y-3">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Tu cuenta en {config.storeName}</h1>
        <p className="text-sm text-muted">Guardá tus direcciones, mirá tus pedidos y repetilos con un toque.</p>
      </div>
      <Card className="space-y-3">
        {!demo && (
          <>
          <button disabled={busy || !api} onClick={() => go(() => api!.entrarGoogle())} data-testid="btn-google" className="flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface py-3 font-bold shadow-sm">
            <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
            Entrar con Google
          </button>
            <p className="text-center text-[11px] text-muted">Con Google ves tus pedidos desde cualquier teléfono o computadora.</p>
            <div className="flex items-center gap-2 text-xs text-muted"><hr className="flex-1 border-line" />o comprá sin cuenta<hr className="flex-1 border-line" /></div>
          </>
        )}
          <form className="space-y-3" data-testid="form-telefono" onSubmit={(e) => { e.preventDefault(); go(() => api!.entrarTelefono(tel, nombre)) }}>
            <p className="font-bold">📱 Entrar con tu número</p>
            <Input label="Teléfono / WhatsApp" name="telefono" inputMode="tel" autoComplete="tel" placeholder="8888-8888" value={tel} onChange={(e) => setTel(e.target.value)} required />
            <Input label="Tu nombre" name="nombre" autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej.: María Solís" />
            <Btn className="w-full" disabled={busy || !api}>Continuar</Btn>
            <p className="text-[11px] text-muted">Sin contraseña: tu perfil y tu historial se guardan en este teléfono. El enlace de seguimiento de cada pedido funciona en cualquier dispositivo.</p>
          </form>
        <div className="flex items-center gap-2 text-xs text-muted"><hr className="flex-1 border-line" />o<hr className="flex-1 border-line" /></div>
        {verCorreo ? correo : (
          <button type="button" onClick={() => setVerCorreo(true)} className="w-full text-sm font-semibold text-brand-600 dark:text-brand-300">Entrar con correo y contraseña</button>
        )}
        {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700" role="alert">{error}</p>}
        {demo && (
          <p className="rounded-lg bg-amber-50 p-2 text-[11px] text-amber-900">
            Modo demo: los datos quedan solo en este navegador. "Entrar con Google" se activa al conectar Firebase. Admin de prueba: <b>{config.demoAdmin.email}</b> / <b>{config.demoAdmin.password}</b>
          </p>
        )}
      </Card>
    </div>
  )
}

export function RepetirBtn({ o, className = '' }: { o: Order; className?: string }) {
  const { repetirPedido } = useStore()
  const nav = useNavigate()
  return (
    <button onClick={(e) => { e.preventDefault(); const n = repetirPedido(o); if (n) nav('/carrito') }} className={`inline-flex items-center gap-1 rounded-full bg-accent-400 px-3 py-1.5 text-xs font-extrabold text-earth-900 hover:bg-accent-300 ${className}`}>
      <Icon name="repeat" size={14} /> Repetir pedido
    </button>
  )
}

export function EstadoChip({ e }: { e: string }) {
  const c: Record<string, string> = {
    nuevo: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200', confirmado: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200',
    'en camino': 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200', entregado: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200', cancelado: 'bg-gray-200 text-ink dark:bg-gray-800 dark:text-gray-300',
  }
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${c[e] ?? ''}`}>{e}</span>
}

export function Profile() {
  const { api, user, authReady, zonas } = useStore()
  const [p, setP] = useState<Perfil | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [msg, setMsg] = useState('')
  useEffect(() => {
    if (!api || !user) return
    api.getPerfil(user.uid).then((x) => setP(x ?? { uid: user.uid, email: user.email, nombre: user.nombre, telefono: '', direcciones: [] }))
    misPedidos(user).then(setOrders)
  }, [api, user])
  if (!authReady) return null
  if (!user) return <Navigate to="/entrar" replace />
  if (!p) return <p className="p-6 text-center text-muted">Cargando…</p>

  const save = async () => { await api!.savePerfil(p); setMsg('Guardado ✓'); setTimeout(() => setMsg(''), 1500) }
  const setDir = (id: string, k: 'etiqueta' | 'zonaId' | 'detalle', v: string) =>
    setP({ ...p, direcciones: p.direcciones.map((d) => (d.id === id ? { ...d, [k]: v } : d)) })

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Hola, {p.nombre.split(' ')[0] || 'vecino'} 👋</h1>
        <button onClick={() => api!.salir()} className="text-sm text-red-600">Cerrar sesión</button>
      </div>

      <Card className="space-y-3">
        <div className="flex items-center justify-between"><h2 className="font-bold">Mis pedidos</h2><span className="flex gap-3 text-sm font-semibold"><Link className="text-brand-600 dark:text-brand-300" to="/favoritos">♥ Favoritos</Link><Link className="text-brand-600 dark:text-brand-300" to="/cuenta/pedidos">Ver todos ›</Link></span></div>
        {orders.length === 0 ? <p className="text-sm text-muted">Todavía no tenés pedidos.</p> : (
          <ul className="divide-y" data-testid="mis-pedidos">
            {orders.slice(0, 5).map((o) => (
              <li key={o.id}><Link to={`/cuenta/pedidos/${o.id}`} className="flex items-center justify-between py-2 text-sm">
                <span><b>{o.codigo}</b><br /><span className="text-muted">{fechaLarga(o.fecha)} · {colones(o.total)}</span></span><span className="flex flex-col items-end gap-1"><EstadoChip e={o.estado} /><RepetirBtn o={o} /></span>
              </Link></li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="space-y-3">
        <h2 className="font-bold">Mis datos</h2>
        <Input label="Nombre" value={p.nombre} onChange={(e) => setP({ ...p, nombre: e.target.value })} />
        <Input label="Teléfono" value={p.telefono} inputMode="tel" onChange={(e) => setP({ ...p, telefono: e.target.value })} />
        {p.email && !p.email.endsWith('@tel.mitiendita') ? <p className="text-xs text-muted">Correo: {p.email}</p> : <p className="text-xs text-muted">Perfil por número de teléfono.</p>}
      </Card>

      <Card className="space-y-3">
        <h2 className="font-bold">Direcciones guardadas</h2>
        {p.direcciones.map((d) => (
          <div key={d.id} className="space-y-2 rounded-lg border p-2">
            <div className="flex gap-2">
              <input className="flex-1 rounded-lg border border-line bg-surface px-2 py-1 text-sm" value={d.etiqueta} onChange={(e) => setDir(d.id, 'etiqueta', e.target.value)} />
              <button className="text-xs text-red-600" onClick={() => setP({ ...p, direcciones: p.direcciones.filter((x) => x.id !== d.id) })}>Borrar</button>
            </div>
            <select className="w-full rounded-lg border border-line bg-surface px-2 py-1 text-sm" value={d.zonaId} onChange={(e) => setDir(d.id, 'zonaId', e.target.value)}>
              {zonas.filter((z) => !z.retiro).map((z) => <option key={z.id} value={z.id}>{z.nombre}</option>)}
            </select>
            <textarea className="w-full rounded-lg border border-line bg-surface px-2 py-1 text-sm" rows={2} value={d.detalle} onChange={(e) => setDir(d.id, 'detalle', e.target.value)} />
            {d.lat != null && d.lng != null ? <p className="text-[11px] text-brand-600 dark:text-brand-300">📍 Con ubicación en el mapa ({d.lat.toFixed(4)}, {d.lng.toFixed(4)})</p> : <p className="text-[11px] text-muted">Sin pin: marcalo en tu próximo pedido.</p>}
          </div>
        ))}
        <button className="text-sm font-semibold text-brand-600 dark:text-brand-300" onClick={() => setP({ ...p, direcciones: [...p.direcciones, { id: uid(), etiqueta: 'Casa', zonaId: zonas[0]?.id ?? '', detalle: '' }] })}>+ Agregar dirección</button>
      </Card>
      <Btn className="w-full" onClick={save}>{msg || 'Guardar cambios'}</Btn>
    </div>
  )
}

export function MyOrders() {
  const { api, user, authReady } = useStore()
  const [orders, setOrders] = useState<Order[] | null>(null)
  useEffect(() => { if (api && user) misPedidos(user).then(setOrders) }, [api, user])
  if (!authReady) return null
  if (!user) return <Navigate to="/entrar" replace />
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold">Historial de pedidos</h1>
      {!orders ? <p className="text-muted">Cargando…</p> : orders.length === 0 ? <Empty tipo="caja" titulo="Sin pedidos todavía" texto="Cuando hagás tu primer pedido, aquí vas a ver su estado y podrás repetirlo con un toque."><Link to="/catalogo" className="rounded-full bg-brand-600 px-5 py-2 font-bold text-white">Empezar a comprar</Link></Empty> :
        orders.map((o) => (
          <Link key={o.id} to={`/cuenta/pedidos/${o.id}`} className="block"><Card className="flex items-center justify-between gap-2 text-sm">
            <span><b>{o.codigo}</b> · {o.items.length} productos<br /><span className="text-muted">{fechaLarga(o.fecha)} · {o.zonaNombre.split(' — ')[0]} · {colones(o.total)}</span></span>
            <span className="flex flex-col items-end gap-1.5"><EstadoChip e={o.estado} /><RepetirBtn o={o} /></span>
          </Card></Link>
        ))}
    </div>
  )
}

export function OrderDetail() {
  const { id } = useParams()
  const [sp] = useSearchParams()
  const { api, user, authReady } = useStore()
  const [o, setO] = useState<Order | null | undefined>(undefined)
  useEffect(() => {
    if (!api || !user) return
    ;(user.isAdmin ? api.todosPedidos() : misPedidos(user)).then((l) => setO(l.find((x) => x.id === id) ?? null))
  }, [api, user, id])
  if (!authReady) return null
  if (!user) return <Navigate to="/entrar" replace />
  if (o === undefined) return <p className="p-6 text-center text-muted">Cargando…</p>
  if (o === null) return <p className="p-6 text-center text-muted">Pedido no encontrado.</p>
  const idx = ESTADOS.indexOf(o.estado)
  return (
    <div className="space-y-3">
      {sp.get('nuevo') && (
        <Card className="bg-green-50 text-sm text-green-900">
          ✅ <b>¡Pedido guardado!</b> Si WhatsApp no se abrió, tocá el botón para enviarnos el resumen.
          <a href={waLink(o)} target="_blank" rel="noreferrer" className="mt-2 block rounded-xl bg-[#25D366] py-2 text-center font-bold text-white">Enviar por WhatsApp</a>
        </Card>
      )}
      {sp.get('nuevo') && <MensajePedido o={o} />}
      <div className="flex items-center justify-between gap-2"><h1 className="text-2xl font-bold">Pedido {o.codigo}</h1><EstadoChip e={o.estado} /></div>
      {!sp.get('nuevo') && o.userId === user.uid && <RepetirBtn o={o} />}
      {o.estado !== 'cancelado' && (
        <ol className="flex justify-between text-[10px] text-muted">
          {ESTADOS.filter((e) => e !== 'cancelado').map((e, i) => (
            <li key={e} className="flex flex-1 flex-col items-center text-center capitalize">
              <span className={`mb-1 h-2 w-full ${i <= idx ? 'bg-brand-600' : 'bg-gray-200'}`} />{e}
            </li>
          ))}
        </ol>
      )}
      <Card className="space-y-1 text-sm">
        {o.items.map((i) => (
          <div key={i.id} className="flex justify-between gap-2"><span>{cantidad(i.qty, i.venta)} {i.nombre}{i.disponibilidad === 'Bajo pedido' && <em className="text-amber-700"> (bajo pedido)</em>}</span><span className="whitespace-nowrap">{colones(i.precio == null ? null : i.precio * i.qty)}</span></div>
        ))}
        <hr className="my-1" />
        <div className="flex justify-between"><span>Envío</span><span>{o.envio == null ? 'Por cotizar' : o.envio === 0 ? 'Gratis' : colones(o.envio)}</span></div>
        <div className="flex justify-between text-base font-extrabold"><span>Total</span><span>{colones(o.total)}</span></div>
        {o.hayBajoPedido && <div className="flex justify-between text-amber-800"><span>Adelanto ({config.adelantoPct}%)</span><b>{colones(o.adelanto)}</b></div>}
      </Card>
      <Card className="space-y-1 text-sm">
        <p>📍 {o.zonaNombre} — {o.direccion}</p>
        {o.ubicacion && (
          <div className="flex flex-wrap items-center gap-2 pt-1" data-testid="links-navegacion">
            <span className="text-xs text-muted">🗺️ Pin a {fmtKm(o.distanciaKm ?? 0)} de la tienda</span>
            <a href={wazeLink(o.ubicacion)} target="_blank" rel="noreferrer" className="rounded-full bg-[#33ccff] px-3 py-1 text-xs font-extrabold text-[#06243a]">Abrir en Waze</a>
            <a href={gmapsDir(o.ubicacion)} target="_blank" rel="noreferrer" className="rounded-full bg-surface-2 px-3 py-1 text-xs font-extrabold ring-1 ring-line">Abrir en Google Maps</a>
          </div>
        )}
        <p>📅 {fechaLarga(o.fecha)} · {o.franja}</p>
        <p>💳 {o.pago === 'sinpe' ? sinpeTexto() : 'Efectivo contra entrega'}</p>
        {o.notas && <p>📝 {o.notas}</p>}
      </Card>
      <Card className="text-xs text-muted">
        {o.historial.map((h, i) => <p key={i} className="capitalize">{new Date(h.at).toLocaleString('es-CR')} — {h.estado}</p>)}
      </Card>
    </div>
  )
}

/** Vista previa del mensaje del pedido con botón para copiarlo. */
export function MensajePedido({ o }: { o: Order }) {
  const [ok, setOk] = useState(false)
  const msg = mensajeWhatsApp(o)
  const copiar = async () => {
    try { await navigator.clipboard.writeText(msg) } catch {
      const t = document.createElement('textarea'); t.value = msg; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove()
    }
    setOk(true); setTimeout(() => setOk(false), 1500)
  }
  return (
    <Card className="space-y-2">
      <div className="flex items-center justify-between"><h2 className="text-sm font-bold">Mensaje del pedido</h2>
        <button onClick={copiar} className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold">{ok ? 'Copiado ✓' : '📋 Copiar'}</button></div>
      <pre data-testid="mensaje-pedido" className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-surface-2 p-2 font-sans text-xs text-ink">{msg}</pre>
      <p className="text-[11px] text-muted">Se envía al WhatsApp de la tienda ({config.whatsappVisible}).</p>
    </Card>
  )
}
