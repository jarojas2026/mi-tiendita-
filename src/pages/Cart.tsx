import { Link, useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import { config } from '../config'
import { colones } from '../lib/format'
import { totales } from '../lib/order'
import { compradosJuntos } from '../lib/memory'
import { useStore } from '../store'
import { Badge, Btn, Card, Empty, ProductCard, ProductImage, QtyStepper, Rail, Section, SkeletonGrid } from '../components/ui'

export default function Cart() {
  const { cart, byId, setQty, user, loading, misPedidos, products } = useStore()
  const nav = useNavigate()
  const t = totales(cart, byId)
  const sugeridos = useMemo(() => {
    const en = new Set(cart.map((c) => c.id))
    const out = new Map<string, (typeof products)[number]>()
    cart.slice(0, 4).forEach((c) => { const p = byId[c.id]; if (p) compradosJuntos(p, misPedidos, products, 4).forEach((x) => { if (!en.has(x.id)) out.set(x.id, x) }) })
    return [...out.values()].slice(0, 10)
  }, [cart, byId, misPedidos, products])
  if (loading) return <SkeletonGrid n={2} />
  if (t.lineas.length === 0)
    return (
      <Empty tipo="carrito" titulo="Tu carrito está vacío" texto="Huevos de la finca, medias, juguetes y más te esperan.">
        <Link to="/catalogo" className="rounded-full bg-accent-400 px-5 py-2.5 font-extrabold text-earth-900">Ir al catálogo</Link>
      </Empty>
    )
  return (
    <>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="min-w-0 space-y-2.5 md:col-span-2">
          <h1 className="text-2xl font-bold">Carrito</h1>
          {t.lineas.map(({ item, p }) => (
            <Card key={p.id} className="flex animate-fade-up gap-3">
              <Link to={`/p/${p.id}`} className="w-20 shrink-0 overflow-hidden rounded-xl"><ProductImage p={p} thumb /></Link>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Link to={`/p/${p.id}`} className="line-clamp-2 text-sm font-medium">{p.nombre}</Link>
                <div className="flex items-center gap-2 text-sm"><Badge p={p} /><span className="font-bold">{colones(p.precio)}{p.venta === 'kg' ? ' / kg' : ''}</span></div>
                <div className="flex items-center justify-between gap-2">
                  <QtyStepper p={p} qty={item.qty} onChange={(q) => setQty(p.id, q)} />
                  <span className="text-sm font-extrabold">{colones(p.precio == null ? null : p.precio * item.qty)}</span>
                  <button className="text-xs font-semibold text-red-600 dark:text-red-400" onClick={() => setQty(p.id, 0)}>Quitar</button>
                </div>
              </div>
            </Card>
          ))}
        </div>
        <Card className="h-fit space-y-2.5 md:sticky md:top-32">
          <div className="flex justify-between text-lg"><span>Subtotal</span><b data-testid="subtotal">{colones(t.subtotal)}</b></div>
          <p className="text-xs text-muted">El envío se calcula con tu ubicación o zona en el siguiente paso. 🚚 Gratis en San Isidro centro.</p>
          {t.hayBajoPedido && <p className="rounded-xl bg-accent-50 p-2.5 text-xs text-accent-700 dark:bg-accent-700/20 dark:text-accent-100">📦 Incluye productos bajo pedido: adelanto de {config.adelantoPct}% ({colones(t.adelanto)}) · {config.plazoBajoPedido}.</p>}
          {t.hayPrecioPorConfirmar && <p className="rounded-xl bg-surface-2 p-2.5 text-xs">Algunos precios se confirman por WhatsApp.</p>}
          <Btn className="w-full py-3.5" onClick={() => nav(user ? '/checkout' : '/entrar?next=/checkout')}>Continuar al pago</Btn>
        </Card>
      </div>
      {sugeridos.length > 0 && (
        <Section title="Comprados juntos" sub="Completá tu pedido"><Rail>{sugeridos.map((p) => <ProductCard key={p.id} p={p} />)}</Rail></Section>
      )}
    </>
  )
}
