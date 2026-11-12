import { HashRouter, Route, Routes, useLocation } from 'react-router-dom'
import { lazy, Suspense, useEffect, useState } from 'react'
import { StoreProvider } from './store'
import { BottomNav, Empty, Footer, Header, SkeletonGrid } from './components/ui'
import { Icon } from './components/icons'
import Home from './pages/Home'

// Code-splitting: cada ruta se descarga solo cuando se visita
const Catalog = lazy(() => import('./pages/Catalog'))
const ProductPage = lazy(() => import('./pages/ProductPage'))
const Cart = lazy(() => import('./pages/Cart'))
const Checkout = lazy(() => import('./pages/Checkout'))
const Admin = lazy(() => import('./pages/admin/Admin'))
const Favorites = lazy(() => import('./pages/Favorites'))
const Login = lazy(() => import('./pages/Account').then((m) => ({ default: m.Login })))
const Profile = lazy(() => import('./pages/Account').then((m) => ({ default: m.Profile })))
const MyOrders = lazy(() => import('./pages/Account').then((m) => ({ default: m.MyOrders })))
const Tracking = lazy(() => import('./pages/Tracking'))
// El chat solo se descarga al tocar el botón
const Assistant = lazy(() => import('./ai/Assistant'))

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

function ChatLauncher() {
  const [open, setOpen] = useState(false)
  const [cargado, setCargado] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => {
    const f = () => { setCargado(true); setOpen(true) }
    window.addEventListener('mt:abrir-asistente', f); return () => window.removeEventListener('mt:abrir-asistente', f)
  }, [])
  if (pathname.startsWith('/checkout') || pathname.startsWith('/admin')) return null
  return (
    <>
      {!open && (
        <button onClick={() => { setCargado(true); setOpen(true) }} aria-label="Abrir Asistente Tiendita" data-testid="chat-open"
          className="fixed right-3 bottom-20 z-40 flex items-center gap-2 rounded-full bg-brand-600 py-3 pr-4 pl-3 font-bold text-white shadow-lift transition hover:scale-105 hover:bg-brand-700 sm:bottom-6">
          <span className="relative"><Icon name="chat" size={22} /><span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-accent-400 ring-2 ring-brand-600" /></span>
          <span className="text-sm">Asistente</span>
        </button>
      )}
      {cargado && (
        <Suspense fallback={null}>
          <Assistant open={open} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <HashRouter>
        <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-2">Saltar al contenido</a>
        <ScrollTop />
        <Header />
        <main id="contenido" className="mx-auto max-w-6xl px-3 pt-4 pb-6">
          <Suspense fallback={<div className="pt-4"><SkeletonGrid n={6} /></div>}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/catalogo" element={<Catalog />} />
              <Route path="/p/:id" element={<ProductPage />} />
              <Route path="/carrito" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/favoritos" element={<Favorites />} />
              <Route path="/entrar" element={<Login />} />
              <Route path="/cuenta" element={<Profile />} />
              <Route path="/cuenta/pedidos" element={<MyOrders />} />
              <Route path="/cuenta/pedidos/:id" element={<Tracking />} />
              <Route path="/pedido/:id" element={<Tracking />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="*" element={<Empty tipo="lupa" titulo="Página no encontrada" texto="Esa dirección no existe. Volvé al inicio y seguí comprando." />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
        <div className="h-20 sm:hidden" aria-hidden="true" />
        <BottomNav />
        <ChatLauncher />
      </HashRouter>
    </StoreProvider>
  )
}
