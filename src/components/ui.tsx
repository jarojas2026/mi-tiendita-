import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { config } from '../config'
import { colones } from '../lib/format'
import { buscar } from '../lib/search'
import { borrarBusquedas, guardarBusqueda, toggleFav, useBusquedas, useFavs } from '../lib/memory'
import { alternarTema, useTema } from '../lib/theme'
import { imgUrl, useStore } from '../store'
import { Icon, Logo } from './icons'
import type { Product } from '../types'

/* =================== Header =================== */
export function Header() {
  const { cartCount, user, api } = useStore()
  const tema = useTema()
  return (
    <header id="app-header" className="sticky top-0 z-30 bg-brand-800 text-white shadow-lg shadow-brand-900/20">
      {api?.modo === 'demo' && (
        <div data-testid="demo-banner" className="pointer-events-none bg-accent-300 px-3 py-0.5 text-center text-[11px] font-semibold text-earth-900">MODO DEMO · los datos se guardan solo en este navegador</div>
      )}
      <div className="mx-auto max-w-6xl px-3 pt-2.5 pb-2.5">
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2.5">
          <Link to="/" aria-label={`${config.storeName}, inicio`} className="order-1 rounded-xl"><Logo /></Link>
          <div className="order-3 w-full md:order-2 md:w-auto md:flex-1 md:px-6"><SearchBox /></div>
          <div className="order-2 flex items-center gap-0.5 md:order-3">
            {user?.isAdmin && <Link to="/admin" className="mr-1 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold hover:bg-white/25">Admin</Link>}
            <button onClick={alternarTema} className="rounded-full p-2 hover:bg-white/10" aria-label={tema === 'oscuro' ? 'Activar modo claro' : 'Activar modo oscuro'}>
              <Icon name={tema === 'oscuro' ? 'sun' : 'moon'} />
            </button>
            <Link to="/favoritos" className="hidden rounded-full p-2 hover:bg-white/10 sm:block" aria-label="Favoritos"><Icon name="heart" /></Link>
            <Link to={user ? '/cuenta' : '/entrar'} className="flex items-center gap-1 rounded-full p-2 text-sm hover:bg-white/10" aria-label="Mi cuenta">
              <Icon name="user" /><span className="hidden sm:inline">{user ? user.nombre.split(' ')[0] : 'Entrar'}</span>
            </Link>
            <Link to="/carrito" className="relative rounded-full p-2 hover:bg-white/10" aria-label={`Carrito, ${cartCount} artículos`}>
              <Icon name="cart" size={22} />
              {cartCount > 0 && (
                <span key={cartCount} data-testid="cart-count" className="absolute -top-0.5 -right-0.5 min-w-5 animate-pop rounded-full bg-accent-400 px-1 text-center text-xs font-extrabold leading-5 text-earth-900">{cartCount}</span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}

/* =================== Búsqueda con sugerencias =================== */
export function SearchBox() {
  const { products } = useStore()
  const nav = useNavigate()
  const recientes = useBusquedas()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [act, setAct] = useState(-1)
  const box = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const loc = useLocation()
  useEffect(() => { setOpen(false) }, [loc.pathname, loc.search])
  const sug = useMemo(() => (q.trim().length >= 2 ? buscar(products, q, 6) : []), [q, products])
  const populares = ['huevos', 'medias', 'audífonos', 'luces solares', 'juguetes', 'termo']
  const opciones: { label: string; go: () => void; p?: Product }[] = q.trim().length >= 2
    ? sug.map((p) => ({ label: p.nombre, p, go: () => { guardarBusqueda(q); nav(`/p/${p.id}`) } }))
    : recientes.map((r) => ({ label: r, go: () => ir(r) }))

  useEffect(() => {
    const f = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', f); document.addEventListener('keydown', k)
    return () => { document.removeEventListener('mousedown', f); document.removeEventListener('keydown', k) }
  }, [])

  const ir = (t: string) => { guardarBusqueda(t); setOpen(false); setQ(t); nav(`/catalogo?q=${encodeURIComponent(t)}`) }

  return (
    <div ref={box} className="relative">
      <form role="search" onSubmit={(e) => { e.preventDefault(); if (act >= 0 && opciones[act]) { opciones[act].go(); setOpen(false) } else ir(q) }}>
        <div className="flex items-center overflow-hidden rounded-2xl bg-white ring-2 ring-transparent transition focus-within:ring-accent-400 dark:bg-surface-2">
          <Icon name="search" className="ml-3 shrink-0 text-earth-400" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); setAct(-1) }}
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setAct((a) => Math.min(a + 1, opciones.length - 1)) }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setAct((a) => Math.max(a - 1, -1)) }
              else if (e.key === 'Escape') setOpen(false)
            }}
            placeholder="Buscá huevos, medias, regalos…"
            className="w-full bg-transparent px-2.5 py-2.5 text-[15px] text-ink outline-none placeholder:text-earth-400"
            aria-label="Buscar productos"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            autoComplete="off"
            enterKeyHint="search"
          />
          {q && <button type="button" onClick={() => { setQ(''); setAct(-1); setOpen(true); inputRef.current?.focus() }} className="p-2 text-earth-400" aria-label="Borrar búsqueda"><Icon name="x" size={18} /></button>}
          <button className="m-1 rounded-xl bg-accent-400 px-3.5 py-1.5 text-sm font-extrabold text-earth-900 hover:bg-accent-300" aria-label="Buscar">Buscar</button>
        </div>
      </form>
      {open && (q.trim().length >= 2 || recientes.length > 0 || q === '') && (
        <div id={listId} role="listbox" data-testid="search-suggest" className="absolute inset-x-0 top-full z-40 mt-1.5 animate-fade-up overflow-hidden rounded-2xl bg-surface text-ink shadow-lift ring-1 ring-line">
          {q.trim().length >= 2 ? (
            sug.length ? (
              <>
                {sug.map((p, i) => (
                  <button key={p.id} role="option" aria-selected={act === i} onMouseDown={(e) => e.preventDefault()} onClick={() => { opciones[i].go(); setOpen(false) }}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-surface-2 ${act === i ? 'bg-surface-2' : ''}`}>
                    <span className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-surface-2"><ProductImage p={p} thumb /></span>
                    <span className="line-clamp-1 flex-1">{p.nombre}</span>
                    <span className="text-xs font-bold whitespace-nowrap">{colones(p.precio)}</span>
                  </button>
                ))}
                <button onMouseDown={(e) => e.preventDefault()} onClick={() => ir(q)} className="w-full border-t border-line px-3 py-2.5 text-left text-sm font-bold text-brand-600 dark:text-brand-300">Ver todos los resultados para “{q}” ›</button>
              </>
            ) : <p className="px-3 py-3 text-sm text-muted">Sin coincidencias. Probá otra palabra o preguntale al asistente 💬</p>
          ) : (
            <div className="p-3">
              {recientes.length > 0 && (
                <>
                  <div className="mb-1.5 flex items-center justify-between text-xs font-bold uppercase tracking-wide text-muted">
                    <span>Búsquedas recientes</span>
                    <button onMouseDown={(e) => e.preventDefault()} onClick={borrarBusquedas} className="normal-case text-brand-600 dark:text-brand-300">Borrar</button>
                  </div>
                  <div className="mb-3 flex flex-col">
                    {recientes.map((r, i) => (
                      <button key={r} role="option" aria-selected={act === i} onMouseDown={(e) => e.preventDefault()} onClick={() => ir(r)} className={`flex items-center gap-2 rounded-lg px-1.5 py-1.5 text-left text-sm hover:bg-surface-2 ${act === i ? 'bg-surface-2' : ''}`}>
                        <Icon name="history" size={16} className="text-muted" />{r}
                      </button>
                    ))}
                  </div>
                </>
              )}
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">Lo más buscado</p>
              <div className="flex flex-wrap gap-1.5">
                {populares.map((t) => <button key={t} onMouseDown={(e) => e.preventDefault()} onClick={() => ir(t)} className="rounded-full bg-surface-2 px-3 py-1 text-sm">{t}</button>)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* =================== Barra inferior (móvil) =================== */
export function BottomNav() {
  const { cartCount, user } = useStore()
  const { pathname } = useLocation()
  if (pathname.startsWith('/checkout')) return null
  const cls = ({ isActive }: { isActive: boolean }) =>
    `relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold transition ${isActive ? 'text-brand-600 dark:text-brand-300' : 'text-muted'}`
  return (
    <nav aria-label="Navegación principal" className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
      <NavLink to="/" end className={cls}><Icon name="home" />Inicio</NavLink>
      <NavLink to="/catalogo" className={cls}><Icon name="grid" />Catálogo</NavLink>
      <NavLink to="/favoritos" className={cls}><Icon name="heart" />Favoritos</NavLink>
      <NavLink to="/carrito" className={cls}><Icon name="cart" />Carrito{cartCount ? ` (${cartCount})` : ''}</NavLink>
      <NavLink to={user ? '/cuenta' : '/entrar'} className={cls}><Icon name="user" />Cuenta</NavLink>
    </nav>
  )
}

/* =================== Pie de página =================== */
export function Footer() {
  const { ajustes } = useStore()
  return (
    <footer className="mt-14 bg-earth-900 text-earth-100 dark:bg-black/40">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:grid-cols-3">
        <div>
          <Logo />
          <p className="mt-3 text-sm text-earth-200">Pulpería y bazar digital de la familia, con huevos y lácteos de nuestra finca. Orgullosamente de Pérez Zeledón 🌄</p>
          <a href={config.facebook} target="_blank" rel="noreferrer" aria-label={`${config.storeName} en Facebook`} className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/20"><Icon name="facebook" size={18} /> Seguinos en Facebook</a>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-bold text-white">Contacto</p>
          <a href={`https://wa.me/${config.whatsapp}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-accent-300"><Icon name="whatsapp" size={18} /> WhatsApp {config.whatsappVisible}</a>
          <a href={`mailto:${config.email}`} className="flex items-center gap-2 break-all hover:text-accent-300"><Icon name="mail" size={18} /> {config.email}</a>
          <p className="flex items-center gap-2"><Icon name="card" size={18} /> SINPE Móvil {config.sinpe.numero}</p>
          <p className="flex items-center gap-2"><Icon name="clock" size={18} /> {ajustes.horario}</p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-bold text-white">Ubicación</p>
          <a href={`https://www.google.com/maps/search/?api=1&query=${config.tienda.lat},${config.tienda.lng}`} target="_blank" rel="noreferrer" className="flex items-start gap-2 hover:text-accent-300">
            <Icon name="pin" size={18} className="mt-0.5 shrink-0" /> Pérez Zeledón, San José, Costa Rica (retiro en Palmital de Rivas)
          </a>
          <p className="flex items-center gap-2"><Icon name="truck" size={18} /> Envío por zona · gratis en San Isidro centro</p>
        </div>
      </div>
      <p className="border-t border-white/10 py-4 text-center text-xs text-earth-300">© {new Date().getFullYear()} {config.storeName} · Hecho con cariño en Pérez Zeledón</p>
    </footer>
  )
}

/* =================== Producto =================== */
export function Badge({ p }: { p: Product }) {
  const color = p.disponibilidad === 'En tienda' ? 'bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-200' : p.disponibilidad === 'Agotado' ? 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300' : 'bg-accent-100 text-accent-700 dark:bg-accent-700/30 dark:text-accent-200'
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold whitespace-nowrap ${color}`}>{p.disponibilidad}</span>
}

/** Insignias sobre la foto: "De la finca", "Oferta", "Bajo pedido" */
export function Insignias({ p }: { p: Product }) {
  const descuento = p.precioAntes && p.precio && p.precioAntes > p.precio ? Math.round((1 - p.precio / p.precioAntes) * 100) : 0
  return (
    <div className="pointer-events-none absolute top-2 left-2 flex flex-col items-start gap-1">
      {p.finca && <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[10.5px] font-extrabold text-white shadow">🌱 De la finca</span>}
      {(p.oferta || descuento > 0) && <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10.5px] font-extrabold text-white shadow">Oferta{descuento ? ` −${descuento}%` : ''}</span>}
      {p.disponibilidad === 'Bajo pedido' && <span className="rounded-full bg-white/95 px-2 py-0.5 text-[10.5px] font-bold text-earth-700 shadow">Bajo pedido</span>}
    </div>
  )
}

export function Precio({ p, big }: { p: Product; big?: boolean }) {
  return (
    <div className={big ? 'text-3xl' : 'text-[17px]'}>
      <span className={`font-extrabold tracking-tight ${p.precio == null ? 'text-sm text-muted' : 'text-ink'}`}>{colones(p.precio)}</span>
      {p.precio != null && p.venta === 'kg' && <span className="text-xs font-semibold text-muted"> / kg</span>}
      {p.precioAntes && p.precio != null && p.precioAntes > p.precio && (
        <span className="ml-1.5 text-xs text-muted line-through">{colones(p.precioAntes)}</span>
      )}
      {p.precioPorConfirmar && <div className="text-[11px] font-medium text-accent-700">precio por confirmar</div>}
    </div>
  )
}

export function ProductImage({ p, thumb, className = '' }: { p: Product; thumb?: boolean; className?: string }) {
  const src = thumb ? p.miniatura : p.imagen
  const [ok, setOk] = useState(false)
  if (!src) {
    return <div className={`flex aspect-square w-full items-center justify-center bg-gradient-to-br from-brand-50 via-earth-50 to-accent-50 text-6xl dark:from-brand-900 dark:via-earth-900 dark:to-earth-800 ${className}`} role="img" aria-label={p.nombre}>{p.icono ?? '🛍️'}</div>
  }
  return (
    <div className={`relative aspect-square w-full overflow-hidden bg-surface-2 ${ok ? '' : 'skeleton'} ${className}`}>
      <img src={imgUrl(src)} alt={p.nombre} loading="lazy" decoding="async" onLoad={() => setOk(true)}
        className={`h-full w-full object-cover transition-opacity duration-500 ${ok ? 'opacity-100' : 'opacity-0'}`} />
    </div>
  )
}

export function FavButton({ id, className = '' }: { id: string; className?: string }) {
  const favs = useFavs()
  const on = favs.includes(id)
  return (
    <button onClick={(e) => { e.preventDefault(); toggleFav(id) }} aria-pressed={on} aria-label={on ? 'Quitar de favoritos' : 'Agregar a favoritos'}
      className={`rounded-full bg-white/90 p-1.5 shadow backdrop-blur transition hover:scale-110 dark:bg-black/50 ${on ? 'text-red-500' : 'text-earth-500 dark:text-earth-200'} ${className}`}>
      <Icon name="heart" size={18} filled={on} key={String(on)} className={on ? 'animate-pop' : ''} />
    </button>
  )
}

export function ProductCard({ p }: { p: Product }) {
  const { addToCart } = useStore()
  const [ok, setOk] = useState(false)
  return (
    <article className="group flex animate-fade-up flex-col overflow-hidden rounded-2xl bg-surface shadow-card ring-1 ring-line transition-shadow hover:shadow-lift" data-testid="product-card">
      <div className="relative">
        <Link to={`/p/${p.id}`} className="block" tabIndex={-1} aria-hidden="true"><ProductImage p={p} thumb className="transition duration-500 group-hover:scale-[1.03]" /></Link>
        <Insignias p={p} />
        <FavButton id={p.id} className="absolute top-2 right-2" />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-2.5">
        <Link to={`/p/${p.id}`} className="line-clamp-2 min-h-[2.5em] text-[13.5px] leading-tight font-medium text-ink hover:text-brand-600">{p.nombre}</Link>
        {p.finca && p.unidad && <span className="text-[11px] text-muted">{p.unidad}{p.paso && p.paso < 1 ? ' · desde ½ kg' : ''}</span>}
        <div className="mt-auto flex items-end justify-between gap-1">
          <Precio p={p} />
          <button
            disabled={p.disponibilidad === 'Agotado'}
            onClick={() => { addToCart(p.id, 1); setOk(true); setTimeout(() => setOk(false), 1200) }}
            className={`flex h-9 min-w-9 items-center justify-center rounded-full px-2.5 text-xs font-extrabold transition active:scale-95 disabled:opacity-40 ${ok ? 'bg-brand-600 text-white' : 'bg-accent-400 text-earth-900 hover:bg-accent-300'}`}
            aria-label={`Agregar ${p.nombre}`}
          >
            {ok ? '✓' : <><Icon name="plus" size={16} /><span className="hidden min-[380px]:inline">Agregar</span></>}
          </button>
        </div>
      </div>
    </article>
  )
}

export function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl bg-surface ring-1 ring-line" aria-hidden="true">
      <div className="skeleton aspect-square" />
      <div className="space-y-2 p-2.5"><div className="skeleton h-3 rounded" /><div className="skeleton h-3 w-2/3 rounded" /><div className="skeleton mt-3 h-5 w-1/2 rounded" /></div>
    </div>
  )
}
export const SkeletonGrid = ({ n = 8 }: { n?: number }) => (
  <div role="status" aria-label="Cargando productos"><Grid>{Array.from({ length: n }, (_, i) => <SkeletonCard key={i} />)}</Grid></div>
)

export function Grid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">{children}</div>
}

/** Fila horizontal deslizable (estilo app) */
export function Rail({ children }: { children: ReactNode }) {
  return <div className="no-scrollbar -mx-3 flex snap-x gap-2.5 overflow-x-auto px-3 pb-2 [&>*]:w-[42vw] [&>*]:max-w-[190px] [&>*]:shrink-0 [&>*]:snap-start">{children}</div>
}

export function Section({ title, link, sub, children, id }: { title: string; link?: string; sub?: string; children: ReactNode; id?: string }) {
  return (
    <section className="mt-8" id={id} aria-label={title}>
      <div className="mb-3 flex items-end justify-between gap-2">
        <div>
          <h2 className="text-[22px] font-bold leading-tight text-ink">{title}</h2>
          {sub && <p className="mt-0.5 text-sm text-muted">{sub}</p>}
        </div>
        {link && <Link to={link} className="flex shrink-0 items-center text-sm font-bold text-brand-600 dark:text-brand-300">Ver todo <Icon name="chevron" size={16} /></Link>}
      </div>
      {children}
    </section>
  )
}

/** Estado vacío ilustrado */
export function Empty({ titulo, texto, children, tipo = 'caja' }: { titulo: string; texto?: string; children?: ReactNode; tipo?: 'caja' | 'carrito' | 'corazon' | 'lupa' }) {
  const centro: Record<string, ReactNode> = {
    caja: <path d="M60 70 100 52l40 18v40l-40 18-40-18V70Zm0 0 40 18 40-18M100 88v40" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />,
    carrito: <path d="M54 58h12l10 46h46l10-32H72M84 120a5 5 0 1 1-10 0 5 5 0 0 1 10 0Zm42 0a5 5 0 1 1-10 0 5 5 0 0 1 10 0Z" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />,
    corazon: <path d="M100 128s-36-21-42-43c-4-15 6-28 20-28 9 0 16 5 22 13 6-8 13-13 22-13 14 0 24 13 20 28-6 22-42 43-42 43Z" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />,
    lupa: <path d="M92 60a28 28 0 1 0 0 56 28 28 0 0 0 0-56Zm20 48 24 24" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />,
  }
  return (
    <div className="flex flex-col items-center rounded-3xl bg-surface px-6 py-10 text-center ring-1 ring-line" data-testid="empty-state">
      <svg viewBox="0 0 200 160" width="180" height="144" aria-hidden="true">
        <ellipse cx="100" cy="140" rx="70" ry="10" className="fill-earth-100 dark:fill-earth-900" />
        <circle cx="100" cy="88" r="58" className="fill-brand-50 dark:fill-brand-900/50" />
        <path d="M150 40c0-10 6-16 16-17-1 10-6 16-16 17Zm0 0c0-6-4-10-10-11 0 6 4 10 10 11Z" className="fill-brand-400" />
        <g className="text-brand-600 dark:text-brand-300">{centro[tipo]}</g>
        <circle cx="52" cy="40" r="5" className="fill-accent-300" /><circle cx="160" cy="110" r="4" className="fill-accent-400" />
      </svg>
      <h2 className="mt-2 text-xl font-bold">{titulo}</h2>
      {texto && <p className="mt-1 max-w-sm text-sm text-muted">{texto}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}

export const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`rounded-2xl bg-surface p-3.5 shadow-card ring-1 ring-line ${className}`}>{children}</div>
)

export const Btn = ({ className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button {...props} className={`rounded-2xl bg-brand-600 px-4 py-3 font-extrabold text-white shadow-sm transition hover:bg-brand-700 active:scale-[0.98] disabled:opacity-50 ${className}`} />
)

export const Input = (props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) => {
  const { label, ...rest } = props
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-semibold text-ink">{label}</span>
      <input {...rest} className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-ink outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:focus:ring-brand-800" />
    </label>
  )
}

/** Selector de cantidad que respeta el paso (0,5 kg para queso/natilla). */
export function QtyStepper({ p, qty, onChange, big }: { p: Product; qty: number; onChange: (q: number) => void; big?: boolean }) {
  const paso = p.paso ?? 1
  const n = Number.isInteger(qty) ? String(qty) : qty.toLocaleString('es-CR', { maximumFractionDigits: 2 })
  const pad = big ? 'h-12 w-12 text-xl' : 'h-8 w-8'
  return (
    <div className="flex items-center rounded-2xl bg-surface-2 ring-1 ring-line">
      <button type="button" className={`${pad} rounded-2xl font-bold`} aria-label="Menos" onClick={() => onChange(Math.round((qty - paso) * 100) / 100)}>−</button>
      <span className={`${p.venta === 'kg' ? 'w-14' : 'w-8'} text-center text-sm font-extrabold`} data-testid="qty" aria-live="polite">{n}{p.venta === 'kg' ? ' kg' : ''}</span>
      <button type="button" className={`${pad} rounded-2xl font-bold`} aria-label="Más" onClick={() => onChange(Math.round((qty + paso) * 100) / 100)}>+</button>
    </div>
  )
}
