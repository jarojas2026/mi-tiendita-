// Service worker de Mi Tiendita (PWA). Subí la versión para forzar actualización.
const VERSION = 'mt-v2'
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './data/products.json']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== location.origin) return // Firebase, WhatsApp, etc. van directo a la red

  // Imágenes y assets con hash: cache-first
  if (url.pathname.includes('/img/') || url.pathname.includes('/assets/') || url.pathname.includes('/icons/')) {
    e.respondWith(
      caches.open(VERSION + '-static').then(async (c) => {
        const hit = await c.match(req)
        if (hit) return hit
        const res = await fetch(req)
        if (res.ok) c.put(req, res.clone())
        return res
      }),
    )
    return
  }

  // HTML y catálogo: red primero, caché si no hay señal
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) caches.open(VERSION).then((c) => c.put(req, res.clone()))
        return res
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('./index.html'))),
  )
})
