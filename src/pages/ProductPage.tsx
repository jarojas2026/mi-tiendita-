import { Link, useNavigate, useParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { config } from '../config'
import { useStore } from '../store'
import { Badge, Btn, Empty, FavButton, Insignias, Precio, ProductCard, ProductImage, QtyStepper, Rail, Section, SkeletonGrid } from '../components/ui'
import { Icon } from '../components/icons'
import { compradosJuntos, marcarVisto, useVistos } from '../lib/memory'
import { colones } from '../lib/format'
import { useSeo } from '../lib/seo'
import type { Product } from '../types'

/** Divide la descripción en párrafos (por saltos de línea, o en dos bloques si es larga). */
function parrafos(txt: string): string[] {
  const porLinea = txt.split(/\n+/).map((x) => x.trim()).filter(Boolean)
  if (porLinea.length > 1) return porLinea
  const oraciones = txt.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g)?.map((x) => x.trim()).filter(Boolean) ?? [txt]
  if (oraciones.length < 3) return [txt.trim()]
  return [oraciones[0], oraciones.slice(1).join(' ')]
}

export default function ProductPage() {
  const { id } = useParams()
  // key: al cambiar de producto se reinicia la cantidad sin efectos extra
  return <Ficha key={id} id={id} />
}

function Ficha({ id }: { id?: string }) {
  const { byId, products, addToCart, loading, misPedidos } = useStore()
  const nav = useNavigate()
  const [qty, setQty] = useState(1)
  const vistosIds = useVistos()
  const p = id ? byId[id] : undefined
  const pid = p?.id
  useEffect(() => { if (pid) marcarVisto(pid) }, [pid])
  useSeo(p?.nombre ?? (loading ? undefined : 'Producto no encontrado'), p ? `${p.nombre}${p.precio != null ? ` a ${colones(p.precio)}` : ''}. ${p.descripcion ?? ''}`.trim() : undefined)
  const juntos = useMemo(() => (p ? compradosJuntos(p, misPedidos, products, 8) : []), [p, misPedidos, products])
  const vistos = vistosIds.filter((x) => x !== id).map((x) => byId[x]).filter((x): x is Product => !!x && !x.oculto).slice(0, 10)

  if (!p) return loading ? <SkeletonGrid n={2} /> : <Empty tipo="lupa" titulo="Producto no encontrado" texto="Puede que ya no esté disponible."><Link to="/catalogo" className="rounded-full bg-brand-600 px-5 py-2 font-bold text-white">Ver catálogo</Link></Empty>
  const bajoPedido = p.disponibilidad === 'Bajo pedido'
  const waText = encodeURIComponent(`Hola, quiero consultar por: ${p.nombre}`)
  const cant = p.venta === 'kg' ? `${qty.toLocaleString('es-CR')} kg` : String(qty)
  const waPedido = encodeURIComponent(`¡Hola! Quiero pedir ${cant} × ${p.nombre}${p.precio != null ? ` (${colones(p.precio)}${p.venta === 'kg' ? '/kg' : ''})` : ''}.\n${location.href}`)
  const agotado = p.disponibilidad === 'Agotado'

  return (
    <div className="animate-fade-up">
      <nav aria-label="Ruta de navegación" className="flex min-w-0 items-center gap-1 text-sm text-muted">
        <Link to="/" className="shrink-0 rounded hover:text-brand-600">Inicio</Link><Icon name="chevron" size={14} className="shrink-0" />
        <Link to={`/catalogo?cat=${p.categoriaId}`} className="shrink-0 rounded font-semibold text-brand-600 hover:underline dark:text-brand-300">{p.categoria}</Link>
        <Icon name="chevron" size={14} className="hidden shrink-0 sm:block" />
        <span aria-current="page" className="hidden truncate sm:inline">{p.nombre}</span>
      </nav>
      <div className="mt-3 grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-8">
        <div className="relative self-start overflow-hidden rounded-3xl bg-surface shadow-card ring-1 ring-line md:sticky md:top-32">
          <ProductImage p={p} />
          <Insignias p={p} />
          <FavButton id={p.id} className="absolute top-3 right-3 p-2.5" />
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <h1 className="text-[26px] leading-tight font-bold text-balance sm:text-3xl">{p.nombre}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
              <Badge p={p} />{p.unidad && <span>{p.unidad}</span>}
            </div>
          </div>
          <Precio p={p} big />
          {bajoPedido && (
            <div className="flex gap-2 rounded-2xl bg-accent-50 p-3 text-sm text-accent-700 ring-1 ring-accent-200 dark:bg-accent-700/20 dark:text-accent-100 dark:ring-accent-700">
              <Icon name="box" className="shrink-0" /><span><b>Bajo pedido:</b> llega en {config.plazoBajoPedido}. Requiere {config.adelantoPct}% de adelanto por SINPE al confirmar.</span>
            </div>
          )}
          {p.precio == null && (
            <div className="rounded-2xl bg-surface-2 p-3 text-sm">
              Este producto no tiene precio publicado. Agregalo al carrito y te lo confirmamos por WhatsApp, o{' '}
              <a className="font-bold text-brand-600" href={`https://wa.me/${config.whatsapp}?text=${waText}`} target="_blank" rel="noreferrer">consultá ahora</a>.
            </div>
          )}
          {p.nota && <p className="rounded-2xl bg-brand-50 p-3 text-sm text-brand-900 dark:bg-brand-900/40 dark:text-brand-100">ℹ️ {p.nota}</p>}
          {p.venta === 'kg' && <p className="text-xs text-muted">Se vende por kilo; podés pedir en medios kilos (0,5 kg).</p>}
          <div className="flex items-center gap-3">
            <QtyStepper big p={p} qty={qty} onChange={(q) => setQty(Math.max(p.paso ?? 1, q))} />
            <Btn className="flex-1 py-3.5" disabled={agotado} onClick={() => { addToCart(p.id, qty); nav('/carrito') }}>
              {agotado ? 'Agotado' : 'Agregar al carrito'}
            </Btn>
          </div>
          <a href={`https://wa.me/${config.whatsapp}?text=${waPedido}`} target="_blank" rel="noreferrer" data-testid="pedir-whatsapp"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-surface px-4 py-3 font-extrabold text-brand-700 ring-2 ring-brand-600 transition hover:bg-brand-50 active:scale-[0.98] dark:text-brand-200 dark:ring-brand-400 dark:hover:bg-brand-900/40">
            <Icon name="whatsapp" size={20} /> Pedir por WhatsApp
          </a>
          <ul className="grid grid-cols-2 gap-2 text-xs text-muted">
            <li className="flex items-center gap-1.5 rounded-xl bg-surface p-2 ring-1 ring-line"><Icon name="truck" size={16} /> Gratis en San Isidro centro</li>
            <li className="flex items-center gap-1.5 rounded-xl bg-surface p-2 ring-1 ring-line"><Icon name="shield" size={16} /> Confirmás por WhatsApp</li>
          </ul>
          {p.descripcion && (
            <section aria-labelledby="desc-titulo" className="rounded-2xl bg-surface p-4 ring-1 ring-line">
              <h2 id="desc-titulo" className="text-lg font-bold">Descripción</h2>
              <div className="mt-2 space-y-2 text-[15px] leading-relaxed text-ink/90">
                {parrafos(p.descripcion).map((t, i) => <p key={i}>{t}</p>)}
              </div>
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 border-t border-line pt-3 text-sm">
                <dt className="text-muted">Categoría</dt><dd className="font-medium">{p.categoria}</dd>
                <dt className="text-muted">Disponibilidad</dt><dd className="font-medium">{p.disponibilidad}</dd>
                {p.origen && <><dt className="text-muted">Origen</dt><dd className="font-medium">{p.origen}</dd></>}
              </dl>
            </section>
          )}
        </div>
      </div>
      {juntos.length > 0 && (
        <Section title={p.finca ? 'Para acompañar' : 'Comprados juntos'} sub={misPedidos.some((o) => o.items.some((i) => i.id === p.id)) ? 'Lo que suele ir junto en los pedidos' : 'Combina bien con este producto'}>
          <Rail>{juntos.map((x) => <ProductCard key={x.id} p={x} />)}</Rail>
        </Section>
      )}
      {vistos.length > 0 && (
        <Section title="Vistos recientemente"><Rail>{vistos.map((x) => <ProductCard key={x.id} p={x} />)}</Rail></Section>
      )}
    </div>
  )
}
