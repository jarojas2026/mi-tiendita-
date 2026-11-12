import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { config } from '../config'
import { cantidad, codigoPedido, colones, fechaLarga, uid } from '../lib/format'
import { fechasDisponibles, rutaSeguimiento, totales, waLink } from '../lib/order'
import { crearPedido, type NuevoPedido } from '../services/orders'
import { useStore } from '../store'
import { Btn, Card, Input } from '../components/ui'
import { Icon } from '../components/icons'
import { fmtKm, gmapsLink, miUbicacion, sugerirEnvio } from '../lib/geo'
import type { LatLng, Perfil } from '../types'

const MapPicker = lazy(() => import('../map/MapPicker'))

export default function Checkout() {
  const { cart, byId, user, authReady, api, clearCart, loading, refreshPedidos, zonas, ajustes } = useStore()
  const nav = useNavigate()
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [zonaId, setZonaId] = useState('')
  const [dirSel, setDirSel] = useState('nueva')
  const [direccion, setDireccion] = useState('')
  const [guardarDir, setGuardarDir] = useState(true)
  const [fecha, setFecha] = useState('')
  const [franja, setFranja] = useState('')
  const [pago, setPago] = useState<'sinpe' | 'efectivo'>('sinpe')
  const [entrega, setEntrega] = useState<'domicilio' | 'retiro'>('domicilio')
  const [sinpeRef, setSinpeRef] = useState('')
  const [copiado, setCopiado] = useState(false)
  const [notas, setNotas] = useState('')
  const [error, setError] = useState('')
  const [ubic, setUbic] = useState<(LatLng & { precision?: number }) | null>(null)
  const [verMapa, setVerMapa] = useState(false)
  const [geoMsg, setGeoMsg] = useState('')
  const [buscandoGeo, setBuscandoGeo] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const hecho = useRef(false) // evita que al vaciar el carrito se redirija a /carrito en vez de al pedido

  useEffect(() => {
    if (!user || !api) return
    api.getPerfil(user.uid).then((p) => {
      setPerfil(p)
      // No pisar lo que el cliente ya escribió mientras cargaba el perfil
      setNombre((x) => x || p?.nombre || user.nombre)
      setTelefono((x) => x || p?.telefono || '')
      if (p?.direcciones?.length) {
        const d = p.direcciones[0]
        setDirSel(d.id); setZonaId((z) => z || d.zonaId); setDireccion((x) => x || d.detalle)
        if (d.lat != null && d.lng != null) { setUbic((u) => u ?? { lat: d.lat!, lng: d.lng! }); setVerMapa(true) }
      }
    })
  }, [user, api])

  const zona = zonas.find((z) => z.id === zonaId)
  const sug = ubic ? sugerirEnvio(ubic, zonas) : null
  const tarifaDist = sug && sug.zona?.id === zonaId && sug.tramo.tarifa !== undefined ? sug.tramo.tarifa : undefined
  const t = totales(cart, byId, zona, tarifaDist)
  const moverPin = (p: LatLng & { precision?: number }) => {
    setUbic(p)
    const s2 = sugerirEnvio(p, zonas)
    if (s2.zona && s2.zona.id !== 'retiro') { setZonaId(s2.zona.id); setEntrega('domicilio') }
  }
  const usarUbicacion = async () => {
    setGeoMsg(''); setBuscandoGeo(true); setVerMapa(true)
    try { const p = await miUbicacion(); moverPin(p); setGeoMsg(`Ubicación encontrada (±${p.precision} m). Ajustá el pin si hace falta.`) }
    catch (e) { setGeoMsg((e as Error).message) } finally { setBuscandoGeo(false) }
  }
  const fechas = useMemo(() => fechasDisponibles(zona, t.hayBajoPedido), [zonaId, t.hayBajoPedido]) // eslint-disable-line
  useEffect(() => { if (fecha && !fechas.includes(fecha)) setFecha('') }, [fechas, fecha])

  if (!authReady || loading) return <p className="p-6 text-center text-muted">Cargando…</p>
  if (!user) return <Navigate to="/entrar?next=/checkout" replace />
  if (t.lineas.length === 0) return hecho.current ? null : <Navigate to="/carrito" replace />

  const esRetiro = entrega === 'retiro'

  const confirmar = async () => {
    setError('')
    if (!nombre.trim() || !/^\+?[\d\s-]{8,}$/.test(telefono.trim())) return setError('Revisá tu nombre y un teléfono válido (8 dígitos).')
    if (!zona) return setError(esRetiro ? 'Elegí retiro en tienda.' : 'Elegí la zona de entrega.')
    if (!esRetiro && !direccion.trim()) return setError('Escribí la dirección o señas de entrega.')
    if (!fecha) return setError('Elegí la fecha de entrega.')
    if (!franja) return setError('Elegí la franja horaria.')
    if (!api) return
    setEnviando(true)
    try {
      const now = new Date().toISOString()
      const o: NuevoPedido = {
        codigo: codigoPedido(),
        cliente: { nombre: nombre.trim(), telefono: telefono.trim() },
        items: t.lineas.map(({ item, p }) => ({ id: p.id, nombre: p.nombre, precio: p.precio, qty: item.qty, disponibilidad: p.disponibilidad, vendorId: p.vendorId, ...(p.venta ? { venta: p.venta } : {}), ...(p.unidad ? { unidad: p.unidad } : {}) })),
        subtotal: t.subtotal, envio: t.envio, total: t.total, adelanto: t.adelanto,
        hayBajoPedido: t.hayBajoPedido, hayPrecioPorConfirmar: t.hayPrecioPorConfirmar,
        zonaId: zona.id, zonaNombre: zona.nombre, direccion: esRetiro ? 'Retiro en tienda (Palmital)' : direccion.trim(),
        ...(!esRetiro && ubic ? { ubicacion: { lat: +ubic.lat.toFixed(6), lng: +ubic.lng.toFixed(6), ...(ubic.precision ? { precision: ubic.precision } : {}) }, distanciaKm: sugerirEnvio(ubic, zonas).km } : {}),
        fecha, franja, pago, entrega, ...(pago === 'sinpe' && sinpeRef.trim() ? { sinpeRef: sinpeRef.trim() } : {}), notas: notas.trim(), estado: 'nuevo', historial: [{ estado: 'nuevo', at: now }], creado: now,
      }
      const order = await crearPedido(o, user)
      // Guardar teléfono/dirección en el perfil
      const p: Perfil = perfil ?? { uid: user.uid, email: user.email, nombre: '', telefono: '', direcciones: [] }
      const nuevo: Perfil = { ...p, nombre: nombre.trim(), telefono: telefono.trim() }
      if (!esRetiro && dirSel === 'nueva' && guardarDir) {
        nuevo.direcciones = [...(p.direcciones ?? []), { id: uid(), etiqueta: `Dirección ${(p.direcciones?.length ?? 0) + 1}`, zonaId: zona.id, detalle: direccion.trim(), ...(ubic ? { lat: +ubic.lat.toFixed(6), lng: +ubic.lng.toFixed(6) } : {}) }]
      }
      await api.savePerfil(nuevo).catch(() => {})
      refreshPedidos()
      hecho.current = true
      window.open(waLink(order), '_blank', 'noopener')
      nav(`${rutaSeguimiento(order)}${order.trackToken ? '&' : '?'}nuevo=1`, { replace: true })
      clearCart()
    } catch (e) {
      setError((e as Error).message || 'No se pudo guardar el pedido.')
    } finally { setEnviando(false) }
  }

  const radio = (on: boolean) => `flex items-center gap-2 rounded-xl border p-3 text-sm transition ${on ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500 dark:bg-brand-900/40' : 'border-line bg-surface'}`

  return (
    <div className="grid grid-cols-1 gap-3 pb-4 md:grid-cols-3">
      <div className="min-w-0 space-y-3 md:col-span-2">
        <h1 className="text-2xl font-bold">Finalizar pedido</h1>

        <Card className="space-y-3">
          <h2 className="font-bold">1. Tus datos</h2>
          <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} name="nombre" />
          <Input label="Teléfono / WhatsApp" value={telefono} onChange={(e) => setTelefono(e.target.value)} inputMode="tel" placeholder="8888-8888" name="telefono" />
        </Card>

        <Card className="space-y-3">
          <h2 className="font-bold">2. Entrega</h2>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de entrega" data-testid="tipo-entrega">
            {([['domicilio', '🛵', 'Entrega a domicilio', 'Gratis en San Isidro centro'], ['retiro', '🏡', 'Retiro en tienda', 'Gratis · Palmital de Rivas']] as const).map(([v, i, t, sub]) => (
              <button key={v} type="button" role="radio" aria-checked={entrega === v} data-testid={`entrega-${v}`}
                onClick={() => { setEntrega(v); if (v === 'retiro') setZonaId('retiro'); else if (zonaId === 'retiro') setZonaId(sug?.zona && sug.zona.id !== 'retiro' ? sug.zona.id : '') }}
                className={`rounded-2xl border p-3 text-left transition ${entrega === v ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500 dark:bg-brand-900/40' : 'border-line bg-surface'}`}>
                <span className="text-2xl" aria-hidden="true">{i}</span><b className="block text-sm">{t}</b><span className="text-[11px] text-muted">{sub}</span>
              </button>
            ))}
          </div>
          {!esRetiro && <>
          {perfil?.direcciones?.length ? (
            <label className="block text-sm"><span className="mb-1 block font-semibold">Dirección guardada</span>
              <select className="w-full rounded-lg border border-line bg-surface px-2 py-2" value={dirSel}
                onChange={(e) => {
                  setDirSel(e.target.value)
                  const d = perfil.direcciones.find((x) => x.id === e.target.value)
                  if (d) { setZonaId(d.zonaId); setDireccion(d.detalle); setUbic(d.lat != null && d.lng != null ? { lat: d.lat, lng: d.lng } : null) } else { setDireccion(''); setUbic(null) }
                }}>
                {perfil.direcciones.map((d) => <option key={d.id} value={d.id}>{d.etiqueta} — {d.detalle.slice(0, 40)}</option>)}
                <option value="nueva">+ Otra dirección</option>
              </select>
            </label>
          ) : null}
          <div className="space-y-2 rounded-2xl bg-surface-2 p-3" data-testid="geo-box">
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={usarUbicacion} disabled={buscandoGeo} className="flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
                <Icon name="navigation" size={16} /> {buscandoGeo ? 'Buscando…' : 'Usar mi ubicación'}
              </button>
              {!verMapa && <button type="button" onClick={() => setVerMapa(true)} className="flex items-center gap-1.5 rounded-full bg-surface px-4 py-2 text-sm font-bold ring-1 ring-line"><Icon name="map" size={16} /> Marcar en el mapa</button>}
            </div>
            {geoMsg && <p className="text-xs text-muted" role="status">{geoMsg}</p>}
            {verMapa && (
              <Suspense fallback={<div className="skeleton h-64 rounded-2xl" />}>
                <MapPicker value={ubic} onChange={moverPin} />
              </Suspense>
            )}
            {sug && (
              <div data-testid="sugerencia-envio" className={`rounded-xl p-2.5 text-sm ${sug.gratis ? 'bg-brand-50 text-brand-900 ring-1 ring-brand-200 dark:bg-brand-900/50 dark:text-brand-100 dark:ring-brand-800' : 'bg-surface ring-1 ring-line'}`}>
                <b>{sug.gratis ? '🎉 ' : '📍 '}{fmtKm(sug.km)} de la tienda</b> · {sug.tramo.texto}
                <br />Zona sugerida: <b>{sug.zona?.nombre ?? '—'}</b> · Envío: <b>{sug.tarifa == null ? 'por cotizar' : sug.tarifa === 0 ? 'GRATIS' : colones(sug.tarifa)}</b>
                <a href={gmapsLink(ubic!)} target="_blank" rel="noreferrer" className="ml-1 text-xs font-semibold text-brand-600 underline dark:text-brand-300">ver pin</a>
              </div>
            )}
          </div>
          <label className="block text-sm"><span className="mb-1 block font-semibold">Zona / distrito</span>
            <select name="zona" data-testid="zona-select" value={zonaId === 'retiro' ? '' : zonaId} onChange={(e) => setZonaId(e.target.value)} className="w-full rounded-lg border border-line bg-surface px-2 py-2.5">
              <option value="">Elegí tu zona…</option>
              {zonas.filter((z) => !z.retiro).map((z) => (
                <option key={z.id} value={z.id}>{z.nombre} — {z.tarifa == null ? 'envío por cotizar' : z.tarifa === 0 ? 'envío GRATIS' : `envío ${colones(z.tarifa)}${'provisional' in z && z.provisional ? ' (aprox.)' : ''}`}</option>
              ))}
            </select>
            {zona && 'provisional' in zona && zona.provisional && <span className="mt-1 block text-[11px] text-amber-700 dark:text-amber-300">Tarifa aproximada: te confirmamos el envío por WhatsApp antes de salir.</span>}
          </label>
          {!esRetiro && (
            <>
              <label className="block text-sm"><span className="mb-1 block font-semibold">Dirección / señas</span>
                <textarea name="direccion" value={direccion} onChange={(e) => { setDireccion(e.target.value); if (dirSel !== 'nueva') setDirSel('nueva') }}
                  rows={3} placeholder="Ej.: 200 m al este de la escuela, casa verde con portón negro"
                  className="block min-h-20 w-full rounded-lg border border-line bg-surface px-3 py-2" />
              </label>
              {dirSel === 'nueva' && (
                <label className="relative flex items-center gap-2 pt-1 text-sm"><input type="checkbox" checked={guardarDir} onChange={(e) => setGuardarDir(e.target.checked)} /> Guardar esta dirección en mi perfil</label>
              )}
            </>
          )}
          </>}
          {esRetiro && <p className="rounded-xl bg-surface-2 p-3 text-sm">🏡 Retirás en la tienda en <b>Palmital de Rivas</b>. Te avisamos por WhatsApp cuando esté listo. <a className="font-semibold text-brand-600 underline dark:text-brand-300" href={`https://www.google.com/maps/search/?api=1&query=${config.tienda.lat},${config.tienda.lng}`} target="_blank" rel="noreferrer">Ver en el mapa</a></p>}
        </Card>

        <Card className="space-y-3">
          <h2 className="font-bold">3. Fecha y hora</h2>
          {!zona ? <p className="text-sm text-muted">Elegí primero la zona para ver los días de ruta.</p> : (
            <>
              <p className="text-xs text-muted">Días de ruta para {zona.nombre.split(' — ')[0]}.{t.hayBajoPedido && ` Por los productos bajo pedido, la primera fecha es en ${config.diasMinBajoPedido} días.`}</p>
              <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1" data-testid="fechas">
                {fechas.map((f) => (
                  <button key={f} type="button" onClick={() => setFecha(f)}
                    className={`shrink-0 rounded-xl border px-3 py-2 text-sm ${fecha === f ? 'border-brand-600 bg-brand-50 font-bold' : 'border-line bg-surface'}`}>{fechaLarga(f)}</button>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {ajustes.franjas.map((fr) => (
                  <label key={fr} className={radio(franja === fr)}>
                    <input type="radio" name="franja" checked={franja === fr} onChange={() => setFranja(fr)} /> {fr}
                  </label>
                ))}
              </div>
            </>
          )}
        </Card>

        <Card className="space-y-3">
          <h2 className="font-bold">4. Pago</h2>
          <label className={radio(pago === 'sinpe')}><input type="radio" name="pago" checked={pago === 'sinpe'} onChange={() => setPago('sinpe')} /> <span className="flex-1"><b>SINPE Móvil</b> <span className="text-muted">· al {config.sinpe.numero}</span></span><span aria-hidden="true">📱</span></label>
          {pago === 'sinpe' && (
            <div className="space-y-2 rounded-2xl bg-brand-50 p-3 text-sm ring-1 ring-brand-200 dark:bg-brand-900/40 dark:ring-brand-800" data-testid="sinpe-box">
              <p className="font-bold">Cómo pagar por SINPE Móvil</p>
              <ol className="list-decimal space-y-0.5 pl-5 text-[13px]">
                <li>Abrí la app de tu banco › SINPE Móvil.</li>
                <li>Enviá <b>{colones(t.hayBajoPedido ? t.adelanto : t.total)}</b>{t.hayBajoPedido ? ' (adelanto)' : ''}{zona && t.envio == null ? ' + el envío que te confirmemos' : ''} al <b>{config.sinpe.numero}</b> a nombre de <b>{config.sinpe.nombre}</b>.</li>
                <li>En el detalle poné tu nombre. Guardá el comprobante.</li>
              </ol>
              <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(config.sinpe.numeroIntl) } catch { /* sin portapapeles */ } setCopiado(true); setTimeout(() => setCopiado(false), 1500) }}
                className="rounded-full bg-brand-600 px-3 py-1.5 text-xs font-bold text-white">{copiado ? 'Número copiado ✓' : `📋 Copiar ${config.sinpe.numero}`}</button>
              <Input label="N.º de comprobante SINPE (opcional)" name="sinpeRef" value={sinpeRef} onChange={(e) => setSinpeRef(e.target.value)} placeholder="Ej.: 2026110612345678" inputMode="numeric" />
              <p className="text-[11px] text-muted">Si ya pagaste, escribí el número del comprobante. También podés mandarnos la captura por WhatsApp después de enviar el pedido. Podés pagar al recibir la confirmación.</p>
            </div>
          )}
          <label className={radio(pago === 'efectivo')}><input type="radio" name="pago" checked={pago === 'efectivo'} onChange={() => setPago('efectivo')} /> <span className="flex-1"><b>Efectivo</b> <span className="text-muted">· {esRetiro ? 'al retirar' : 'contra entrega'}</span></span><span aria-hidden="true">💵</span></label>
          {t.hayBajoPedido && <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900">📦 Los productos bajo pedido requieren un adelanto de {colones(t.adelanto)} ({config.adelantoPct}%) por SINPE antes de pedirlos al proveedor. Plazo estimado: {config.plazoBajoPedido}.</p>}
          <label className="block text-sm"><span className="mb-1 block font-semibold">Notas (opcional)</span>
            <textarea name="notas" value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} className="block w-full rounded-lg border border-line bg-surface px-3 py-2" placeholder="Ej.: llamar al llegar, traer cambio de ₡10.000" />
          </label>
        </Card>
      </div>

      <Card className="relative z-0 h-fit space-y-2 md:sticky md:top-36">
        <h2 className="font-bold">Resumen</h2>
        <ul className="max-h-56 space-y-1 overflow-y-auto text-sm">
          {t.lineas.map(({ item, p }) => (
            <li key={p.id} className="flex justify-between gap-2"><span className="line-clamp-1">{cantidad(item.qty, p.venta)} {p.nombre}</span><span className="whitespace-nowrap">{colones(p.precio == null ? null : p.precio * item.qty)}</span></li>
          ))}
        </ul>
        <hr />
        <div className="flex justify-between text-sm"><span>Subtotal</span><span>{colones(t.subtotal)}</span></div>
        <div className="flex justify-between text-sm"><span>Envío</span><span>{!zona ? '—' : t.envio == null ? 'Por cotizar' : t.envio === 0 ? 'Gratis' : colones(t.envio)}</span></div>
        <div className="flex justify-between text-lg font-extrabold"><span>Total</span><span data-testid="total">{colones(t.total)}</span></div>
        {t.hayBajoPedido && <div className="flex justify-between text-sm text-amber-800"><span>Adelanto a pagar</span><b>{colones(t.adelanto)}</b></div>}
        {fecha && franja && <p className="text-xs text-muted">📅 {fechaLarga(fecha)} · {franja}</p>}
        {ubic && !esRetiro && <p className="text-xs text-muted" data-testid="resumen-ubicacion">🗺️ Pin guardado · {fmtKm(sugerirEnvio(ubic).km)} de la tienda</p>}
        {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700" role="alert">{error}</p>}
        <Btn className="w-full bg-[#25D366] text-white" onClick={confirmar} disabled={enviando}>{enviando ? 'Guardando…' : 'Confirmar y enviar por WhatsApp'}</Btn>
        <p className="text-[11px] text-muted">Al confirmar se guarda tu pedido y se abre WhatsApp con el resumen para enviárnoslo.</p>
      </Card>
    </div>
  )
}
