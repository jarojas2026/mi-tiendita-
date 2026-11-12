import { Link, useNavigate, useParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { config } from '../config'
import { useStore } from '../store'
import { Badge, Btn, Empty, FavButton, Insignias, Precio, ProductCard, ProductImage, QtyStepper, Rail, Section, SkeletonGrid } from '../components/ui'
import { Icon } from '../components/icons'
import { compradosJuntos, marcarVisto, useVistos } from '../lib/memory'
import type { Product } from '../types'

export default function ProductPage() {
  const { id } = useParams()
  const { byId, products, addToCart, loading, misPedidos } = useStore()
  const nav = useNavigate()
  const [qty, setQty] = useState(1)
  const vistosIds = useVistos()
  const p = id ? byId[id] : undefined
  useEffect(() => { if (p) marcarVisto(p.id) }, [p?.id]) // eslint-disable-line
  useEffect(() => { setQty(1) }, [id])
  const juntos = useMemo(() => (p ? compradosJuntos(p, misPedidos, products, 8) : []), [p, misPedidos, products])
  const vistos = vistosIds.filter((x) => x !== id).map((x) => byId[x]).filter((x): x is Product => !!x && !x.oculto).slice(0, 10)

  if (!p) return loading ? <SkeletonGrid n={2} /> : <Empty tipo="lupa" titulo="Producto no encontrado" texto="Puede que ya no esté disponible."><Link to="/catalogo" className="rounded-full bg-brand-600 px-5 py-2 font-bold text-white">Ver catálogo</Link></Empty>
  const bajoPedido = p.disponibilidad === 'Bajo pedido'
  const waText = encodeURIComponent(`Hola, quiero consultar por: ${p.nombre}`)

  return (
    <div className="animate-fade-up">
      <nav aria-label="Ruta" className="flex items-center gap-1 text-sm text-muted">
        <Link to="/" className="hover:text-brand-600">Inicio</Link><Icon name="chevron" size={14} />
        <Link to={`/catalogo?cat=${p.categoriaId}`} className="font-semibold text-brand-600 dark:text-brand-300">{p.categoria}</Link>
      </nav>
      <div className="mt-3 grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="relative overflow-hidden rounded-3xl bg-surface shadow-card ring-1 ring-line">
          <ProductImage p={p} />
          <Insignias p={p} />
          <FavButton id={p.id} className="absolute top-3 right-3 p-2.5" />
        </div>
        <div className="space-y-3.5">
          <h1 className="text-[26px] leading-tight font-bold">{p.nombre}</h1>
          <Precio p={p} big />
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
            <Badge p={p} /> <span>Origen: {p.origen}</span>{p.unidad && <span>· {p.unidad}</span>}
          </div>
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
            <Btn className="flex-1 py-3.5" disabled={p.disponibilidad === 'Agotado'} onClick={() => { addToCart(p.id, qty); nav('/carrito') }}>
              Agregar al carrito
            </Btn>
          </div>
          <ul className="grid grid-cols-2 gap-2 text-xs text-muted">
            <li className="flex items-center gap-1.5 rounded-xl bg-surface p-2 ring-1 ring-line"><Icon name="truck" size={16} /> Gratis en San Isidro centro</li>
            <li className="flex items-center gap-1.5 rounded-xl bg-surface p-2 ring-1 ring-line"><Icon name="shield" size={16} /> Confirmás por WhatsApp</li>
          </ul>
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
