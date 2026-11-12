import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { config } from './config'
import { conMargen } from './lib/format'
import { getApi, type DataApi } from './services/backend/api'
import { getOverrides } from './services/products'
import { misPedidos as fetchMisPedidos } from './services/orders'
import { ajustesDefault, getAjustes } from './services/settings'
import { getFavs, setFavs, useFavs } from './lib/memory'
import type { Ajustes, CartItem, Order, Product, ProductOverride, SessionUser, Disponibilidad, ZonaCfg } from './types'

interface RawProduct {
  id: string; nombre: string; categoria: string; categoriaId: string; precio: number | null
  imagen: string; miniatura: string; origen: string; disponibilidad: Disponibilidad; vendorId: string
  hidden?: boolean; motivoOculto?: string
}

const fincaProducts = (): Product[] =>
  config.finca.map((f) => ({
    id: f.id, nombre: f.nombre, categoria: config.fincaCategoria, categoriaId: 'finca',
    ...(f.imagen ? { imagen: f.imagen, miniatura: f.miniatura ?? f.imagen } : {}),
    precio: f.precio, precioBase: f.precio, icono: f.icono, unidad: f.unidad, venta: f.venta, paso: f.paso, nota: f.nota,
    origen: 'Granja Palmital', disponibilidad: 'En tienda', vendorId: 'finca', finca: true,
    precioPorConfirmar: config.fincaPrecioPorConfirmar,
  }))

export const imgUrl = (p: string) => import.meta.env.BASE_URL + p

interface Store {
  api: DataApi | null
  products: Product[]
  byId: Record<string, Product>
  categorias: { id: string; nombre: string; count: number; portada?: string }[]
  loading: boolean
  user: SessionUser | null
  authReady: boolean
  cart: CartItem[]
  addToCart: (id: string, qty?: number) => void
  setQty: (id: string, qty: number) => void
  clearCart: () => void
  cartCount: number
  overrides: Record<string, ProductOverride>
  saveOverride: (id: string, o: ProductOverride) => Promise<void>
  /** Historial de pedidos del cliente con sesión (para "Repetir pedido" y recomendaciones) */
  misPedidos: Order[]
  refreshPedidos: () => void
  repetirPedido: (o: Order) => number
  /** v5: ajustes de la tienda (zonas/tarifas, franjas, horario) desde Firestore settings/tienda */
  ajustes: Ajustes
  /** Zonas activas */
  zonas: ZonaCfg[]
  setAjustes: (a: Ajustes) => void
  recargarOverrides: () => void
}

const Ctx = createContext<Store>(null as unknown as Store)
export const useStore = () => useContext(Ctx)

const CART_KEY = 'mt_cart'

export function StoreProvider({ children }: { children: ReactNode }) {
  const [api, setApi] = useState<DataApi | null>(null)
  const [raw, setRaw] = useState<RawProduct[]>([])
  const [overrides, setOverrides] = useState<Record<string, ProductOverride>>({})
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<SessionUser | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [ajustes, setAjustes] = useState<Ajustes>(ajustesDefault)
  const zonas = useMemo(() => ajustes.zonas.filter((z) => z.activa !== false), [ajustes])
  const [cart, setCart] = useState<CartItem[]>(() => {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]') } catch { return [] }
  })

  useEffect(() => { localStorage.setItem(CART_KEY, JSON.stringify(cart)) }, [cart])

  // Historial del cliente
  const [misPedidos, setMisPedidos] = useState<Order[]>([])
  const refreshPedidos = useCallback(() => {
    if (api && user) fetchMisPedidos(user).then(setMisPedidos).catch(() => {})
    else setMisPedidos([])
  }, [api, user])
  useEffect(() => { refreshPedidos() }, [refreshPedidos])

  // Favoritos: al iniciar sesión se unen los del dispositivo con los del perfil; luego se guardan en el perfil
  const favs = useFavs()
  const favSync = useRef<string | null>(null)
  useEffect(() => {
    if (!api || !user) { favSync.current = null; return }
    api.getPerfil(user.uid).then((p) => {
      const union = [...new Set([...(p?.favoritos ?? []), ...getFavs()])]
      favSync.current = user.uid
      setFavs(union)
    }).catch(() => {})
  }, [api, user])
  useEffect(() => {
    if (!api || !user || favSync.current !== user.uid) return
    const t = setTimeout(() => {
      api.getPerfil(user.uid).then((p) => {
        const base = p ?? { uid: user.uid, email: user.email, nombre: user.nombre, telefono: '', direcciones: [] }
        if (JSON.stringify(base.favoritos ?? []) !== JSON.stringify(favs)) return api.savePerfil({ ...base, favoritos: favs })
      }).catch(() => {})
    }, 1200)
    return () => clearTimeout(t)
  }, [favs, api, user])

  useEffect(() => {
    let unsub: (() => void) | undefined
    getApi().then((a) => {
      setApi(a)
      unsub = a.onAuth((u) => { setUser(u); setAuthReady(true) })
      getOverrides().then(setOverrides)
      getAjustes().then(setAjustes)
    })
    fetch(imgUrl('data/products.json')).then((r) => r.json()).then((d) => { setRaw(d); setLoading(false) })
      .catch(() => setLoading(false))
    return () => unsub?.()
  }, [])

  const products = useMemo<Product[]>(() => {
    const base: Product[] = [
      ...fincaProducts(),
      ...raw.map(({ hidden, ...r }) => ({ ...r, oculto: Boolean(hidden), precioBase: r.precio, precio: conMargen(r.precio) })),
    ]
    return base.map((p) => {
      const o = overrides[p.id]
      if (!o) return p
      return {
        ...p,
        ...(o.nombre ? { nombre: o.nombre } : {}),
        ...(o.precio !== undefined ? { precio: o.precio, precioPorConfirmar: false } : {}),
        ...(o.precioAntes !== undefined ? { precioAntes: o.precioAntes } : {}),
        ...(o.disponibilidad ? { disponibilidad: o.disponibilidad } : {}),
        ...(o.oferta !== undefined ? { oferta: o.oferta } : {}),
        ...(o.oculto !== undefined ? { oculto: o.oculto } : {}),
        ...(o.stock !== undefined ? { stock: o.stock } : {}),
        ...(o.stock === 0 ? { disponibilidad: 'Agotado' as const } : {}),
      }
    })
  }, [raw, overrides])

  const byId = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products])

  const categorias = useMemo(() => {
    const m = new Map<string, { id: string; nombre: string; count: number; portada?: string }>()
    products.filter((p) => !p.finca && !p.oculto).forEach((p) => {
      const c = m.get(p.categoriaId) ?? { id: p.categoriaId, nombre: p.categoria, count: 0, portada: p.miniatura }
      c.count++; m.set(p.categoriaId, c)
    })
    return [...m.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  }, [products])

  const redondear = (q: number) => Math.round(q * 100) / 100
  const addToCart = useCallback((id: string, qty = 1) => {
    setCart((c) => {
      const f = c.find((x) => x.id === id)
      return f ? c.map((x) => (x.id === id ? { ...x, qty: redondear(x.qty + qty) } : x)) : [...c, { id, qty: redondear(qty) }]
    })
  }, [])
  const setQty = useCallback((id: string, qty: number) => {
    qty = redondear(qty)
    setCart((c) => (qty <= 0 ? c.filter((x) => x.id !== id) : c.map((x) => (x.id === id ? { ...x, qty } : x))))
  }, [])
  const clearCart = useCallback(() => setCart([]), [])

  const saveOverride = useCallback(async (id: string, o: ProductOverride) => {
    if (!api) return
    await api.saveOverride(id, o)
    setOverrides((all) => ({ ...all, [id]: { ...all[id], ...o } }))
  }, [api])

  const recargarOverrides = useCallback(() => { getOverrides().then(setOverrides) }, [])

  const repetirPedido = useCallback((o: Order) => {
    let n = 0
    o.items.forEach((i) => { const p = byId[i.id]; if (p && !p.oculto && p.disponibilidad !== 'Agotado') { addToCart(i.id, i.qty); n++ } })
    return n
  }, [byId, addToCart])

  // Lo que se vende por kg cuenta como 1 artículo (aunque sean 1,5 kg)
  const cartCount = cart.reduce((s, x) => s + (byId[x.id]?.venta === 'kg' ? 1 : x.qty), 0)

  return (
    <Ctx.Provider value={{ api, products, byId, categorias, loading, user, authReady, cart, addToCart, setQty, clearCart, cartCount, overrides, saveOverride, misPedidos, refreshPedidos, repetirPedido, ajustes, zonas, setAjustes, recargarOverrides }}>
      {children}
    </Ctx.Provider>
  )
}
