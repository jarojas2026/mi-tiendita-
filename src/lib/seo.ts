import { useEffect } from 'react'
import { config } from '../config'

const BASE_DESC = 'Pulpería y bazar en línea con entrega en Pérez Zeledón. Huevos y lácteos de nuestra finca, regalos y más. SINPE Móvil o efectivo.'

function meta(name: string, content: string, attr: 'name' | 'property' = 'name') {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`)
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el) }
  el.content = content
}

/** Título y descripción por ruta (SPA con HashRouter: solo afecta la pestaña y lo que lee el navegador). */
export function useSeo(titulo?: string, descripcion?: string) {
  useEffect(() => {
    const t = titulo ? `${titulo} · ${config.storeName}` : `${config.storeName} · Pulpería y bazar en Pérez Zeledón`
    const d = (descripcion || BASE_DESC).slice(0, 160)
    document.title = t
    meta('description', d)
    meta('og:title', t, 'property')
    meta('og:description', d, 'property')
  }, [titulo, descripcion])
}
