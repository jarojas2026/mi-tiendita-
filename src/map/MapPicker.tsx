import { useEffect, useRef } from 'react'
import { config } from '../config'
import type { LatLng } from '../types'
import { agregarTienda, crearMapa, L, pin } from './leaflet-base'

/** Mapa para elegir/mover el pin de entrega. */
export default function MapPicker({ value, onChange }: { value: LatLng | null; onChange: (p: LatLng) => void }) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const marker = useRef<L.Marker | null>(null)
  const cb = useRef(onChange); cb.current = onChange

  useEffect(() => {
    if (!el.current) return
    const inicio = value ?? { lat: config.tienda.lat, lng: config.tienda.lng }
    const m = crearMapa(el.current, [inicio.lat, inicio.lng], value ? 16 : 12)
    agregarTienda(m)
    const mk = L.marker([inicio.lat, inicio.lng], { draggable: true, icon: pin('#c06a0b'), title: 'Tu ubicación de entrega', autoPan: true }).addTo(m)
    mk.on('dragend', () => { const p = mk.getLatLng(); cb.current({ lat: p.lat, lng: p.lng }) })
    m.on('click', (e: L.LeafletMouseEvent) => { mk.setLatLng(e.latlng); cb.current({ lat: e.latlng.lat, lng: e.latlng.lng }) })
    map.current = m; marker.current = mk
    setTimeout(() => m.invalidateSize(), 50)
    return () => { m.remove(); map.current = null }
  }, []) // eslint-disable-line

  useEffect(() => {
    if (!value || !marker.current || !map.current) return
    const cur = marker.current.getLatLng()
    if (Math.abs(cur.lat - value.lat) > 1e-6 || Math.abs(cur.lng - value.lng) > 1e-6) {
      marker.current.setLatLng([value.lat, value.lng])
      map.current.setView([value.lat, value.lng], Math.max(map.current.getZoom(), 16))
    }
  }, [value])

  return (
    <div>
      <div ref={el} className="h-64 w-full overflow-hidden rounded-2xl ring-1 ring-line sm:h-80" data-testid="mapa-checkout" role="application" aria-label="Mapa: tocá o arrastrá el pin naranja para marcar dónde entregamos" />
      <p className="mt-1.5 text-[11px] text-muted">Tocá el mapa o arrastrá el pin 📍 hasta tu casa. 🏪 = la tienda · círculo verde = envío gratis.</p>
    </div>
  )
}
