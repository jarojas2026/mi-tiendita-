import { HashRouter, Link, Route, Routes, useLocation , Navigate } from 'react-router-dom'
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
  if (['/checkout','/admin','/entrar','/carrito'].some((r) => pathname.startsWith(r))) return null
  // En la ficha de producto (móvil) ya está "Pedir por WhatsApp": el botón flotante no debe tapar acciones
  const ocultarMovil = pathname.startsWith('/p/')
  return (
    <>
      {!open && (
        <button onClick={() => { setCargado(true); setOpen(true) }} aria-label="Abrir Asistente Tiendita" data-testid="chat-open"
          className={`fixed right-3 bottom-20 z-40 ${ocultarMovil ? 'hidden sm:flex' : 'flex'} items-center gap-2 rounded-full bg-brand-600 p-3 sm:pr-4 font-bold text-white shadow-lift transition hover:scale-105 hover:bg-brand-700 sm:bottom-6`}>
          <span className="relative"><Icon name="chat" size={22} /><span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-accent-400 ring-2 ring-brand-600" /></span>
          <span className="hidden text-sm sm:inline">Asistente</span>
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
        <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:font-bold focus:text-brand-800 focus:shadow-lift">Saltar al contenido</a>
        <ScrollTop />
        <Header />
        <main id="contenido" className="mx-auto min-h-[60vh] max-w-6xl px-3 pt-4 pb-8 sm:px-4">
          <Suspense fallback={<div className="pt-4"><SkeletonGrid n={6} /></div>}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/catalogo" element={<Catalog />} />
              <Route path="/p/:id" element={<ProductPage />} />
              <Route path="/carrito" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/favoritos" element={<Favorites />} />
              <Route path="/entrar" element={<Login />} />
              <Route path="/finca" element={<Navigate to="/catalogo?cat=finca" replace />} />
              <Route path="/cuenta" element={<Profile />} />
              <Route path="/cuenta/pedidos" element={<MyOrders />} />
              <Route path="/cuenta/pedidos/:id" element={<Tracking />} />
              <Route path="/pedido/:id" element={<Tracking />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="*" element={<Empty tipo="lupa" titulo="Página no encontrada" texto="Esa dirección no existe. Volvé al inicio y seguí comprando."><Link to="/" data-testid="btn-volver-inicio" className="rounded-full bg-brand-600 px-5 py-2 font-bold text-white">Volver al inicio</Link></Empty>} />
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
