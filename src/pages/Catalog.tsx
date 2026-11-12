import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useStore } from '../store'
import { Empty, Grid, ProductCard, SkeletonGrid } from '../components/ui'
import { enDestacada } from '../lib/format'
import { buscar } from '../lib/search'
import { iconoCat } from '../lib/categorias'
import { config } from '../config'

const PAGE = 48

export default function Catalog() {
  const { products, categorias, loading } = useStore()
  const [sp, setSp] = useSearchParams()
  const q = sp.get('q') ?? ''
  const cat = sp.get('cat') ?? ''
  const disp = sp.get('disp') ?? ''
  const orden = sp.get('orden') ?? 'relevancia'
  const min = sp.get('min') ?? ''
  const max = sp.get('max') ?? ''
  const oferta = sp.get('oferta') === '1'
  const dest = config.destacadas.find((d) => d.id === sp.get('dest'))
  const [limit, setLimit] = useState(PAGE)
  const [open, setOpen] = useState(false)

  const set = (k: string, v: string) => {
    const n = new URLSearchParams(sp)
    if (v) n.set(k, v); else n.delete(k)
    setSp(n, { replace: true }); setLimit(PAGE)
  }

  const list = useMemo(() => {
    let r = q.trim() ? buscar(products, q, 5000) : products.filter((p) => !p.oculto)
    if (dest) r = r.filter((p) => enDestacada(p, dest))
    if (cat) r = r.filter((p) => p.categoriaId === cat)
    if (disp) r = r.filter((p) => p.disponibilidad === disp)
    if (oferta) r = r.filter((p) => p.oferta)
    if (min) r = r.filter((p) => p.precio != null && p.precio >= Number(min))
    if (max) r = r.filter((p) => p.precio != null && p.precio <= Number(max))
    const sorted = [...r]
    if (orden === 'precio-asc') sorted.sort((a, b) => (a.precio ?? 1e12) - (b.precio ?? 1e12))
    else if (orden === 'precio-desc') sorted.sort((a, b) => (b.precio ?? -1) - (a.precio ?? -1))
    else if (orden === 'nombre') sorted.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    else if (!q.trim()) sorted.sort((a, b) => Number(!!b.finca) - Number(!!a.finca) || Number(a.precio == null) - Number(b.precio == null))
    return sorted
  }, [products, q, cat, disp, orden, min, max, oferta, dest])

  const catName = categorias.find((c) => c.id === cat)?.nombre
  const sel = 'w-full rounded-xl border border-line bg-surface px-2 py-2 text-sm text-ink'
  const chip = (on: boolean) => `flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${on ? 'bg-brand-600 text-white shadow-sm' : 'bg-surface ring-1 ring-line hover:ring-brand-400'}`

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">
          {q ? `“${q}”` : catName ?? dest?.titulo ?? (oferta ? 'Ofertas' : 'Catálogo')}
          <span className="ml-2 font-sans text-sm font-normal text-muted" data-testid="result-count">{list.length} productos</span>
        </h1>
        <button onClick={() => setOpen(!open)} aria-expanded={open} className="shrink-0 rounded-full bg-surface px-3.5 py-2 text-sm font-semibold ring-1 ring-line">⚙️ Filtros</button>
      </div>

      <div className="no-scrollbar -mx-3 mt-3 flex gap-2 overflow-x-auto px-3 pb-1" role="toolbar" aria-label="Categorías">
        <button onClick={() => { const n = new URLSearchParams(sp); n.delete('cat'); n.delete('dest'); setSp(n, { replace: true }) }} className={chip(!cat && !dest)}>Todo</button>
        <button onClick={() => set('cat', cat === 'finca' ? '' : 'finca')} className={chip(cat === 'finca')}>🌱 Finca</button>
        {categorias.map((c) => (
          <button key={c.id} onClick={() => set('cat', c.id)} className={chip(cat === c.id)}><span aria-hidden="true">{iconoCat(c.id)}</span>{c.nombre}</button>
        ))}
      </div>

      {open && (
        <div className="mt-2 grid animate-fade-up grid-cols-2 gap-2 rounded-2xl bg-surface p-3 ring-1 ring-line sm:grid-cols-5">
          <label className="text-xs font-semibold">Categoría
            <select className={sel} value={cat} onChange={(e) => set('cat', e.target.value)}>
              <option value="">Todas</option>
              <option value="finca">Productos de finca</option>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre} ({c.count})</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold">Disponibilidad
            <select className={sel} value={disp} onChange={(e) => set('disp', e.target.value)}>
              <option value="">Todas</option><option>En tienda</option><option>Bajo pedido</option><option>Agotado</option>
            </select>
          </label>
          <label className="text-xs font-semibold">Precio mín. (₡)
            <input className={sel} inputMode="numeric" value={min} onChange={(e) => set('min', e.target.value.replace(/\D/g, ''))} />
          </label>
          <label className="text-xs font-semibold">Precio máx. (₡)
            <input className={sel} inputMode="numeric" value={max} onChange={(e) => set('max', e.target.value.replace(/\D/g, ''))} />
          </label>
          <label className="col-span-2 text-xs font-semibold sm:col-span-1">Ordenar por
            <select className={sel} value={orden} onChange={(e) => set('orden', e.target.value)}>
              <option value="relevancia">Relevancia</option>
              <option value="precio-asc">Precio: menor a mayor</option>
              <option value="precio-desc">Precio: mayor a menor</option>
              <option value="nombre">Nombre A–Z</option>
            </select>
          </label>
        </div>
      )}

      <div className="mt-3">
        {loading ? <SkeletonGrid n={8} /> : list.length === 0 ? (
          <Empty tipo="lupa" titulo="No encontramos nada" texto={q ? `No hay productos para “${q}”. Probá otra palabra o preguntale al Asistente Tiendita.` : 'No hay productos con esos filtros.'}>
            <button onClick={() => window.dispatchEvent(new Event('mt:abrir-asistente'))} className="rounded-full bg-brand-600 px-5 py-2 font-bold text-white">💬 Preguntar al asistente</button>
          </Empty>
        ) : (
          <>
            <Grid>{list.slice(0, limit).map((p) => <ProductCard key={p.id} p={p} />)}</Grid>
            {limit < list.length && (
              <button onClick={() => setLimit(limit + PAGE)} className="mx-auto mt-5 block rounded-full bg-surface px-6 py-2.5 font-bold ring-1 ring-line hover:ring-brand-400">
                Ver más ({list.length - limit})
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
