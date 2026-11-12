// Búsqueda difusa (tolera faltas de ortografía: "audifonos", "termo", "medias navidenas").
import Fuse from 'fuse.js'
import { norm } from './format'
import type { Product } from '../types'

// Sinónimos y palabras ticas → términos del catálogo
const SINONIMOS: Record<string, string> = {
  calcetines: 'medias', calcetas: 'medias', cascos: 'audifonos', auriculares: 'audifonos', headphones: 'audifonos',
  bocina: 'parlante', bocinas: 'parlantes', parlantes: 'parlante', mochila: 'bulto', mochilas: 'bultos', salveque: 'bulto',
  cargador: 'cargador', foco: 'luz', focos: 'luces', bombillo: 'luz', lampara: 'lampara', botella: 'botella',
  cuaderno: 'cuaderno', utiles: 'escolar', lapices: 'lapiz', boligrafo: 'lapicero', juguete: 'juguete', munecas: 'muneca',
  quesito: 'queso', blanquillos: 'huevos', huevo: 'huevos', leche: 'leche', natilla: 'natilla', termo: 'termo', paraguas: 'sombrilla',
  reloj: 'reloj', smartwatch: 'reloj inteligente', perro: 'mascota', gato: 'mascota', bebe: 'bebe', maquillaje: 'belleza',
}
export const expandir = (q: string) => norm(q).split(/\s+/).filter(Boolean).map((w) => SINONIMOS[w] ?? w).filter(Boolean).join(' ')

let idx: { fuse: Fuse<Product>; src: Product[] } | null = null
export function buscar(products: Product[], q: string, limit = 60): Product[] {
  const visibles = products.filter((p) => !p.oculto)
  if (!idx || idx.src !== products) {
    idx = {
      src: products,
      fuse: new Fuse(visibles.map((p) => ({ ...p, _n: norm(p.nombre), _c: norm(p.categoria) }) as Product), {
        keys: [{ name: '_n', weight: 0.75 }, { name: '_c', weight: 0.25 }],
        threshold: 0.36, ignoreLocation: true, minMatchCharLength: 2,
      }),
    }
  }
  const t = expandir(q)
  if (!t) return []
  // Primero coincidencia exacta de todas las palabras; si no alcanza, difusa
  const words = t.split(' ')
  const exact = visibles.filter((p) => { const s = norm(p.nombre + ' ' + p.categoria); return words.every((w) => s.includes(w)) })
  if (exact.length >= Math.min(limit, 6)) return exact.slice(0, limit)
  // Si lo buscado coincide con productos ocultos a propósito (licencias, etc.), no "adivinar" parecidos
  if (!exact.length && products.some((p) => p.oculto && words.every((w) => norm(p.nombre).includes(w)))) return []
  const fuzzy = idx.fuse.search(t, { limit }).map((r) => visibles.find((p) => p.id === r.item.id)!).filter(Boolean)
  const seen = new Set(exact.map((p) => p.id))
  return [...exact, ...fuzzy.filter((p) => !seen.has(p.id))].slice(0, limit)
}
