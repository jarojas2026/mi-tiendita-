import { Link } from 'react-router-dom'
import { useStore } from '../store'
import { Empty, Grid, ProductCard, SkeletonGrid } from '../components/ui'
import { useFavs } from '../lib/memory'

export default function Favorites() {
  const { byId, loading, addToCart } = useStore()
  const favs = useFavs()
  const list = favs.map((id) => byId[id]).filter((p) => p && !p.oculto)
  if (loading) return <SkeletonGrid n={4} />
  if (!list.length) return (
    <Empty tipo="corazon" titulo="Tu lista de deseos está vacía" texto="Tocá el corazón de cualquier producto para guardarlo aquí. Si iniciás sesión, tus favoritos te siguen a cualquier celular.">
      <Link to="/catalogo" className="rounded-full bg-brand-600 px-5 py-2.5 font-bold text-white">Explorar el catálogo</Link>
    </Empty>
  )
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Favoritos <span className="font-sans text-sm font-normal text-muted" data-testid="fav-count">{list.length}</span></h1>
        <button onClick={() => list.forEach((p) => p.disponibilidad !== 'Agotado' && addToCart(p.id, 1))} className="rounded-full bg-accent-400 px-4 py-2 text-sm font-extrabold text-earth-900">Agregar todo al carrito</button>
      </div>
      <Grid>{list.map((p) => <ProductCard key={p.id} p={p} />)}</Grid>
    </div>
  )
}
