// Service worker de Mi Tiendita (PWA). Subí la versión para forzar actualización.
// v3: caché del catálogo (red primero), imágenes vistas (caché primero, con límite) y assets con hash.
const VERSION = 'mt-v3'
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './data/products.json']
const IMG_CACHE = VERSION + '-img'
const STATIC_CACHE = VERSION + '-static'
const MAX_IMGS = 400 // imágenes vistas que se guardan para ver sin señal

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  )
})

async function recortar(nombre, max) {
  const c = await caches.open(nombre)
  const ks = await c.keys()
  if (ks.length > max) await Promise.all(ks.slice(0, ks.length - max).map((k) => c.delete(k)))
}

async function cacheFirst(req, nombre, limite) {
  const c = await caches.open(nombre)
  const hit = await c.match(req)
  if (hit) return hit
  const res = await fetch(req)
  if (res.ok) { c.put(req, res.clone()); if (limite) recortar(nombre, limite) }
  return res
}

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  // Firebase, WhatsApp, tiles de OpenStreetMap, proxy de IA, etc. van directo a la red
  if (url.origin !== location.origin) return

  if (url.pathname.includes('/img/')) { e.respondWith(cacheFirst(req, IMG_CACHE, MAX_IMGS)); return }
  if (url.pathname.includes('/assets/') || url.pathname.includes('/icons/')) { e.respondWith(cacheFirst(req, STATIC_CACHE)); return }

  // HTML y catálogo (products.json): red primero, caché si no hay señal
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) { const copia = res.clone(); caches.open(VERSION).then((c) => c.put(req, copia)) }
        return res
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('./index.html'))),
  )
})
