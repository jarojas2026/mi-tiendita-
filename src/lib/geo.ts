// Geolocalización 100 % gratis: sin claves, sin APIs de pago.
import { config, type Zona } from '../config'
import type { LatLng } from '../types'

/** Distancia en línea recta (km) — fórmula de Haversine. */
export function distanciaKm(a: LatLng, b: LatLng) {
  const R = 6371
  const rad = (x: number) => (x * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export const tienda: LatLng = { lat: config.tienda.lat, lng: config.tienda.lng }
export const kmDesdeTienda = (p: LatLng) => Math.round(distanciaKm(tienda, p) * 10) / 10

/** Zona y tarifa sugeridas según la distancia a la tienda (config.envioTramos). */
export function sugerirEnvio(p: LatLng, zonas: Zona[] = config.zonas as Zona[]) {
  const km = kmDesdeTienda(p)
  const especial = config.zonasGratisRadio.find((z) => distanciaKm(z, p) <= z.radioKm)
  if (especial) {
    const zona = zonas.find((z) => z.id === especial.zonaId)
    return { km, tramo: { hastaKm: 0, zonaId: especial.zonaId, texto: especial.texto, tarifa: 0 }, zona, tarifa: 0 as number | null, gratis: true }
  }
  const tramo = config.envioTramos.find((t) => km <= t.hastaKm) ?? config.envioTramos[config.envioTramos.length - 1]
  const zona = zonas.find((z) => z.id === tramo.zonaId)
  const tarifa = tramo.tarifa !== undefined ? tramo.tarifa : zona?.tarifa ?? null
  return { km, tramo, zona, tarifa, gratis: tarifa === 0 }
}

export const fmtKm = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toLocaleString('es-CR', { maximumFractionDigits: 1 })} km`)

export const gmapsLink = (p: LatLng) => `https://www.google.com/maps/search/?api=1&query=${p.lat.toFixed(6)},${p.lng.toFixed(6)}`
export const gmapsDir = (p: LatLng) => `https://www.google.com/maps/dir/?api=1&destination=${p.lat.toFixed(6)},${p.lng.toFixed(6)}&travelmode=driving`
export const wazeLink = (p: LatLng) => `https://waze.com/ul?ll=${p.lat.toFixed(6)},${p.lng.toFixed(6)}&navigate=yes`

/** Ruta multi-parada en Google Maps (origen = tienda; máx. ~9 paradas intermedias). */
export function gmapsRuta(paradas: LatLng[]) {
  if (!paradas.length) return ''
  const f = (p: LatLng) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`
  const destino = paradas[paradas.length - 1]
  const medio = paradas.slice(0, -1).slice(0, 9).map(f).join('|')
  return `https://www.google.com/maps/dir/?api=1&origin=${f(tienda)}&destination=${f(destino)}${medio ? `&waypoints=${encodeURIComponent(medio)}` : ''}&travelmode=driving`
}

/** Orden de visita por vecino más cercano (nearest-neighbor) desde la tienda. */
export function rutaVecinoCercano<T extends { ubicacion?: LatLng }>(items: T[]) {
  const con = items.filter((x) => x.ubicacion)
  const sin = items.filter((x) => !x.ubicacion)
  const out: { item: T; km: number }[] = []
  let actual = tienda
  const pend = [...con]
  while (pend.length) {
    let best = 0
    let bestD = Infinity
    pend.forEach((x, i) => { const d = distanciaKm(actual, x.ubicacion!); if (d < bestD) { bestD = d; best = i } })
    const [x] = pend.splice(best, 1)
    out.push({ item: x, km: Math.round(bestD * 10) / 10 })
    actual = x.ubicacion!
  }
  return { orden: out, sinUbicacion: sin, totalKm: Math.round(out.reduce((s, x) => s + x.km, 0) * 10) / 10 }
}

/** navigator.geolocation como promesa, con mensajes en español. */
export function miUbicacion(): Promise<LatLng & { precision: number }> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('Tu navegador no permite obtener la ubicación.'))
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, precision: Math.round(p.coords.accuracy) }),
      (e) => reject(new Error(e.code === 1 ? 'No diste permiso de ubicación. Podés mover el pin en el mapa.' : 'No pudimos obtener tu ubicación. Mové el pin en el mapa.')),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    )
  })
}
