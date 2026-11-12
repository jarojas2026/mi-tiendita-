import { useEffect, useRef } from 'react'
import { config } from '../config'
import { agregarTienda, crearMapa, L, pin } from './leaflet-base'

export interface Punto { id: string; lat: number; lng: number; color: string; label?: string; popup: string }

/** Mapa del admin: pins de pedidos/clientes y (opcional) la ruta ordenada. */
export default function OrdersMap({ puntos, ruta, testId }: { puntos: Punto[]; ruta?: [number, number][]; testId?: string }) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const capa = useRef<L.LayerGroup | null>(null)
  useEffect(() => {
    if (!el.current) return
    const m = crearMapa(el.current, [config.tienda.lat, config.tienda.lng], 12)
    agregarTienda(m)
    capa.current = L.layerGroup().addTo(m)
    map.current = m
    setTimeout(() => m.invalidateSize(), 50)
    return () => { m.remove(); map.current = null }
  }, [])
  useEffect(() => {
    const m = map.current, g = capa.current
    if (!m || !g) return
    g.clearLayers()
    puntos.forEach((p) => L.marker([p.lat, p.lng], { icon: pin(p.color, p.label), title: p.label }).addTo(g).bindPopup(p.popup))
    if (ruta && ruta.length > 1) L.polyline(ruta, { color: '#c06a0b', weight: 3, dashArray: '8 6', opacity: 0.85 }).addTo(g)
    const pts: [number, number][] = [[config.tienda.lat, config.tienda.lng], ...puntos.map((p) => [p.lat, p.lng] as [number, number])]
    if (pts.length > 1) m.fitBounds(L.latLngBounds(pts), { padding: [30, 30], maxZoom: 15 })
  }, [puntos, ruta])
  return <div ref={el} data-testid={testId} className="h-80 w-full overflow-hidden rounded-2xl ring-1 ring-line sm:h-[420px]" role="region" aria-label="Mapa de pedidos" />
}
