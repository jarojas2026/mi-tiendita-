import { Link } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { config } from '../config'
import { imgUrl, useStore } from '../store'
import { Grid, ProductCard, Rail, Section, SkeletonGrid } from '../components/ui'
import { Icon } from '../components/icons'
import { enDestacada } from '../lib/format'
import { iconoCat } from '../lib/categorias'
import { paraVos, useFavs, useVistos } from '../lib/memory'
import type { Product } from '../types'

// Selección determinística (cambia cada día)
const seeded = (s: string, day: number) => {
  let h = day
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return h >>> 0
}

const TONOS: Record<string, string> = {
  navidad: 'from-[#7a1f1f] via-[#a8322a] to-[#d4572f]',
  finca: 'from-brand-800 via-brand-700 to-[#4f7a2a]',
  escolar: 'from-[#1f3f7a] via-[#2c5aa8] to-[#3f86c9]',
}

function Hero({ fotos }: { fotos: Record<string, Product[]> }) {
  const [i, setI] = useState(0)
  const [pausa, setPausa] = useState(false)
  const track = useRef<HTMLDivElement>(null)
  const n = config.banners.length
  const ir = (k: number) => {
    const el = track.current; if (!el) return
    el.scrollTo({ left: el.clientWidth * k, behavior: 'smooth' })
  }
  useEffect(() => {
    if (pausa) return
    const t = setInterval(() => ir((i + 1) % n), 6000)
    return () => clearInterval(t)
  }, [i, pausa, n])
  return (
    <section aria-roledescription="carrusel" aria-label="Novedades de la tienda" className="relative" onMouseEnter={() => setPausa(true)} onMouseLeave={() => setPausa(false)} onTouchStart={() => setPausa(true)}>
      <div ref={track} onScroll={(e) => { const el = e.currentTarget; setI(Math.round(el.scrollLeft / el.clientWidth)) }}
        className="no-scrollbar snap-x-mandatory flex overflow-x-auto rounded-3xl shadow-lift">
        {config.banners.map((b, k) => {
          const imgs = (fotos[b.id] ?? []).slice(0, 3)
          return (
            <div key={b.id} role="group" aria-roledescription="diapositiva" aria-label={`${k + 1} de ${n}: ${b.titulo}`} data-testid={b.id === 'navidad' ? 'banner-navidad' : `banner-${b.id}`}
              className={`relative flex min-h-[300px] w-full shrink-0 snap-start overflow-hidden bg-gradient-to-br p-5 pb-9 text-white sm:min-h-[300px] sm:p-8 ${TONOS[b.tono]}`}>
              {'foto' in b && b.foto ? <img src={imgUrl(b.foto)} alt="" aria-hidden="true" loading={k === 0 ? 'eager' : 'lazy'} className="absolute inset-0 h-full w-full object-cover opacity-30 mix-blend-luminosity" /> : null}
              <svg className="absolute -right-10 -bottom-16 h-72 w-72 opacity-15" viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="90" fill="none" stroke="white" strokeWidth="18" /><circle cx="100" cy="100" r="50" fill="white" /></svg>
              <div className="relative z-10 flex flex-col sm:max-w-[55%]">
                <span className="w-fit rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase backdrop-blur">{b.icono} {b.id === 'finca' ? 'Hecho en Pérez Zeledón' : b.id === 'navidad' ? 'Temporada' : 'Regreso a clases'}</span>
                <h2 className="mt-2 text-[28px] leading-[1.05] font-bold sm:text-5xl">{b.titulo}</h2>
                <p className="mt-2 line-clamp-3 max-w-[30rem] text-[13.5px] text-white/90 sm:text-base">{b.texto}</p>
                <Link to={b.link} className="mt-4 w-fit rounded-full bg-white px-4 py-2 text-sm font-extrabold text-earth-900 shadow transition hover:scale-105">{b.cta} →</Link>
              </div>
              <div className="absolute right-4 bottom-8 z-0 flex items-center sm:top-1/2 sm:right-10 sm:bottom-auto sm:-translate-y-1/2" aria-hidden="true">
                {imgs.length ? imgs.map((p, j) => (
                  <img key={p.id} src={imgUrl(p.miniatura!)} alt="" loading={k === 0 ? 'eager' : 'lazy'}
                    className={`h-[72px] w-[72px] rounded-2xl bg-white object-cover shadow-xl ring-[3px] ring-white/80 sm:h-36 sm:w-36 sm:ring-4 ${j === 0 ? 'relative z-20 -rotate-3' : j === 1 ? '-ml-5 rotate-6 sm:-ml-14 sm:translate-y-10' : 'hidden sm:block sm:-ml-14 sm:-translate-y-10 sm:-rotate-6'}`} />
                )) : (
                  <div className="flex gap-1.5 text-3xl sm:grid sm:grid-cols-2 sm:gap-2 sm:text-7xl">
                    {config.finca.slice(0, 4).map((f) => <span key={f.id} className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur sm:h-24 sm:w-24">{f.icono}</span>)}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
        {config.banners.map((b, k) => (
          <button key={b.id} onClick={() => ir(k)} aria-label={`Ver ${b.titulo}`} aria-current={i === k}
            className={`h-2 rounded-full transition-all ${i === k ? 'w-6 bg-white' : 'w-2 bg-white/50'}`} />
        ))}
      </div>
    </section>
  )
}

const BENEFICIOS = [
  { icono: '🚚', t: 'Envío gratis en San Isidro', s: 'Centro de San Isidro de El General', destacado: true },
  { icono: '📱', t: 'SINPE o efectivo', s: 'Pagás al recibir o por SINPE' },
  { icono: '🏡', t: 'Retiro gratis', s: 'En la tienda, Palmital de Rivas' },
  { icono: '💬', t: 'Pedí por WhatsApp', s: `Te atendemos al ${config.whatsappVisible}` },
]

export default function Home() {
  const { products, categorias, loading, misPedidos } = useStore()
  const favs = useFavs()
  const vistosIds = useVistos()
  const visibles = useMemo(() => products.filter((p) => !p.oculto), [products])
  const byId = useMemo(() => new Map(visibles.map((p) => [p.id, p])), [visibles])
  const finca = useMemo(() => visibles.filter((p) => p.finca), [visibles])
  const ofertas = visibles.filter((p) => p.oferta)
  const vistos = vistosIds.map((id) => byId.get(id)).filter((p): p is Product => !!p).slice(0, 12)
  const recomendados = useMemo(() => paraVos(visibles, misPedidos, favs, vistosIds, 12), [visibles, misPedidos, favs, vistosIds])
  const day = Math.floor(Date.now() / 86400000)
  const novedades = useMemo(() => visibles.filter((p) => !p.finca && p.precio != null)
    .sort((a, b) => seeded(a.id, day) - seeded(b.id, day)).slice(0, 12), [visibles, day])

  const destacadas = useMemo(() => config.destacadas.map((d) => {
    const ps = visibles.filter((p) => enDestacada(p, d))
    const top = [...ps].sort((a, b) => Number(a.precio == null) - Number(b.precio == null) || seeded(a.id, day) - seeded(b.id, day)).slice(0, 10)
    return { ...d, total: ps.length, top, portada: top.find((p) => p.miniatura)?.miniatura }
  }).filter((d) => d.total > 0), [visibles, day])

  const fotosBanner = useMemo(() => Object.fromEntries(config.banners.map((b) => [b.id, b.id === 'finca' ? finca.filter((p) => p.miniatura) : destacadas.find((d) => d.id === b.fotos)?.top.filter((p) => p.miniatura) ?? []])), [destacadas, finca])

  return (
    <div>
      <Hero fotos={fotosBanner} />

      {/* Beneficios */}
      <div className="no-scrollbar -mx-3 mt-4 flex gap-2 overflow-x-auto px-3 sm:grid sm:grid-cols-4" data-testid="beneficios">
        {BENEFICIOS.map((b) => (
          <div key={b.t} className={`flex min-w-[210px] items-center gap-3 rounded-2xl p-3 ring-1 sm:min-w-0 ${b.destacado ? 'bg-accent-50 ring-accent-200 dark:bg-accent-700/20 dark:ring-accent-700' : 'bg-surface ring-line'}`}>
            <span className="text-2xl" aria-hidden="true">{b.icono}</span>
            <span className="leading-tight"><b className="block text-sm">{b.t}</b><span className="text-xs text-muted">{b.s}</span></span>
          </div>
        ))}
      </div>

      {/* Chips de categoría */}
      <nav aria-label="Categorías" className="no-scrollbar -mx-3 mt-5 flex gap-2 overflow-x-auto px-3 pb-1">
        <Link to="/catalogo?cat=finca" className="flex shrink-0 items-center gap-1.5 rounded-full bg-brand-600 px-3.5 py-2 text-sm font-bold text-white shadow-sm">🌱 Productos de finca</Link>
        {categorias.map((c) => (
          <Link key={c.id} to={`/catalogo?cat=${c.id}`} className="flex shrink-0 items-center gap-1.5 rounded-full bg-surface px-3.5 py-2 text-sm font-semibold ring-1 ring-line transition hover:ring-brand-400">
            <span aria-hidden="true">{iconoCat(c.id)}</span>{c.nombre}
          </Link>
        ))}
      </nav>

      <Section title="Lo más buscado" sub="Lo que más piden los vecinos esta temporada">
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6" data-testid="destacadas">
          {destacadas.map((d) => (
            <Link key={d.id} to={`/catalogo?dest=${d.id}`} className="group flex flex-col items-center rounded-2xl bg-surface p-2.5 text-center shadow-card ring-1 ring-line transition-shadow hover:shadow-lift">
              <span className="h-16 w-16 overflow-hidden rounded-full bg-surface-2 ring-2 ring-accent-200 dark:ring-accent-700">
                {d.portada && <img src={imgUrl(d.portada)} alt="" loading="lazy" className="h-full w-full object-cover transition group-hover:scale-110" />}
              </span>
              <span className="mt-1.5 text-[12.5px] leading-tight font-bold text-ink">{d.titulo}</span>
              <span className="text-[10.5px] text-muted">{d.total} productos</span>
            </Link>
          ))}
        </div>
      </Section>

      {/* De nuestra granja */}
      <section id="finca" aria-label="De nuestra granja" data-testid="seccion-granja" className="mt-8 overflow-hidden rounded-3xl bg-gradient-to-br from-earth-100 via-earth-50 to-brand-50 ring-1 ring-earth-200 dark:from-earth-900 dark:via-earth-900 dark:to-brand-900 dark:ring-earth-800">
        <div className="grid md:grid-cols-[1fr_1.15fr]">
          <figure className="relative min-h-56 overflow-hidden md:min-h-full">
            <picture>
              <source srcSet={imgUrl('img/finca/gallinas.webp')} type="image/webp" />
              <img src={imgUrl('img/finca/gallinas.jpg')} alt="Gallinas de Granja Palmital sueltas en el corral, Pérez Zeledón" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
            </picture>
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-xs font-semibold text-white">🐔 Nuestras gallinas en Granja Palmital · cerca de 170 gallinas criadas en el campo</figcaption>
          </figure>
          <div className="space-y-4 p-4 sm:p-6">
            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-600 px-2.5 py-1 text-[11px] font-extrabold tracking-wide text-white uppercase"><Icon name="leaf" size={14} /> Productos de finca</span>
              <h2 className="mt-2 text-[28px] leading-tight font-bold text-earth-900 dark:text-earth-50">De nuestra granja a tu mesa</h2>
              <p className="mt-2 max-w-xl text-sm text-earth-700 dark:text-earth-200">Huevos Palmital frescos —cartón de 15 o bolsa de 20, a {'₡'}1.500— y lácteos de la lechería de la familia. Sin intermediarios, directo de Pérez Zeledón.</p>
            </div>
            <ul className="flex flex-wrap gap-2 text-sm text-earth-800 dark:text-earth-100">
              <li className="rounded-full bg-white/70 px-3 py-1 dark:bg-black/20">🥚 Recogidos cada día</li>
              <li className="rounded-full bg-white/70 px-3 py-1 dark:bg-black/20">🧀 Lácteos frescos</li>
              <li className="rounded-full bg-white/70 px-3 py-1 dark:bg-black/20">✅ CVO de SENASA</li>
            </ul>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">{loading ? null : finca.map((p) => <ProductCard key={p.id} p={p} />)}</div>
          </div>
        </div>
      </section>

      {recomendados.length > 0 && (
        <Section title="Para vos" sub="Según lo que compraste, guardaste y viste">
          <Rail>{recomendados.map((p) => <ProductCard key={p.id} p={p} />)}</Rail>
        </Section>
      )}

      {vistos.length > 0 && (
        <Section title="Vistos recientemente">
          <Rail>{vistos.map((p) => <ProductCard key={p.id} p={p} />)}</Rail>
        </Section>
      )}

      {ofertas.length > 0 && (
        <Section title="🔥 Ofertas" link="/catalogo?oferta=1">
          <Rail>{ofertas.slice(0, 12).map((p) => <ProductCard key={p.id} p={p} />)}</Rail>
        </Section>
      )}

      {destacadas.map((d) => (
        <Section key={d.id} title={d.titulo} link={`/catalogo?dest=${d.id}`}>
          {loading ? <SkeletonGrid n={4} /> : <Rail>{d.top.map((p) => <ProductCard key={p.id} p={p} />)}</Rail>}
        </Section>
      ))}

      <Section title="Novedades del bazar" link="/catalogo">
        {loading ? <SkeletonGrid /> : <Grid>{novedades.map((p) => <ProductCard key={p.id} p={p} />)}</Grid>}
      </Section>

      <Section title="¿Cómo funciona?">
        <ol className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {[
            ['🛒', 'Armá tu carrito', 'Elegí zona, fecha y hora. Podés marcar tu casa en el mapa.'],
            ['💬', 'Confirmamos por WhatsApp', `Lo bajo pedido lleva ${config.adelantoPct}% de adelanto.`],
            ['🚚', 'Te lo llevamos', 'O lo retirás gratis en Palmital. En San Isidro centro el envío es gratis.'],
          ].map(([i, t, s], k) => (
            <li key={t} className="flex gap-3 rounded-2xl bg-surface p-4 ring-1 ring-line">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xl dark:bg-brand-900" aria-hidden="true">{i}</span>
              <span><b className="block text-sm">{k + 1}. {t}</b><span className="text-sm text-muted">{s}</span></span>
            </li>
          ))}
        </ol>
      </Section>
    </div>
  )
}
