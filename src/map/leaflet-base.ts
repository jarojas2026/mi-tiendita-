// Base común de Leaflet + OpenStreetMap (gratis, sin claves). Se carga solo cuando se muestra un mapa.
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { config } from '../config'

export { L }
export const OSM_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
export const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">colaboradores de OpenStreetMap</a>'

export function crearMapa(el: HTMLElement, centro: [number, number], zoom = 13) {
  const map = L.map(el, { zoomControl: true, attributionControl: true, scrollWheelZoom: false })
  map.setView(centro, zoom)
  L.tileLayer(OSM_URL, { maxZoom: 19, attribution: OSM_ATTR }).addTo(map)
  map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noreferrer">Leaflet</a>')
  return map
}

/** Pin SVG (evita las imágenes por defecto de Leaflet, que se rompen al empaquetar) */
export function pin(color = '#1c562d', label = '') {
  return L.divIcon({
    className: '',
    iconSize: [34, 44],
    iconAnchor: [17, 42],
    popupAnchor: [0, -38],
    html: `<svg width="34" height="44" viewBox="0 0 34 44" aria-hidden="true"><path d="M17 43s15-14.2 15-26A15 15 0 0 0 2 17c0 11.8 15 26 15 26Z" fill="${color}" stroke="white" stroke-width="2.5"/><circle cx="17" cy="17" r="${label ? 9 : 5.5}" fill="white"/>${label ? `<text x="17" y="21" text-anchor="middle" font-size="11" font-weight="800" font-family="sans-serif" fill="${color}">${label}</text>` : ''}</svg>`,
  })
}

export const tiendaIcon = () => L.divIcon({
  className: '', iconSize: [38, 38], iconAnchor: [19, 19],
  html: '<div style="width:38px;height:38px;border-radius:12px;background:#f9a62b;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:20px">🏪</div>',
})

export function agregarTienda(map: L.Map) {
  L.marker([config.tienda.lat, config.tienda.lng], { icon: tiendaIcon(), keyboard: false, title: 'Tienda' })
    .addTo(map).bindPopup(`<b>${config.tienda.nombre}</b>${config.tienda.aproximada ? '<br><small>Ubicación aproximada</small>' : ''}`)
  config.zonasGratisRadio.forEach((z) => {
    L.circle([z.lat, z.lng], { radius: z.radioKm * 1000, color: '#2f7f43', weight: 1.5, fillOpacity: 0.08, dashArray: '6 6' })
      .addTo(map).bindPopup('<b>Envío gratis</b><br>Centro de San Isidro de El General')
  })
}
