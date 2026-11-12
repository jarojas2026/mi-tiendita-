// Memoria del cliente en este dispositivo: favoritos, vistos recientemente y búsquedas recientes.
// Los favoritos además se sincronizan con el perfil (Firestore) cuando hay sesión.
import { useSyncExternalStore } from 'react'
import { norm } from './format'
import type { Order, Product } from '../types'

const subs = new Set<() => void>()
const cache = new Map<string, string[]>()
const leer = (k: string): string[] => {
  if (!cache.has(k)) { try { cache.set(k, JSON.parse(localStorage.getItem(k) || '[]')) } catch { cache.set(k, []) } }
  return cache.get(k)!
}
const guardar = (k: string, v: string[]) => { cache.set(k, v); localStorage.setItem(k, JSON.stringify(v)); subs.forEach((f) => f()) }
const subscribe = (f: () => void) => { subs.add(f); return () => subs.delete(f) }
const useLista = (k: string) => useSyncExternalStore(subscribe, () => leer(k))

export const KEYS = { favs: 'mt_favs', vistos: 'mt_vistos', busquedas: 'mt_busquedas' }

export const useFavs = () => useLista(KEYS.favs)
export const getFavs = () => leer(KEYS.favs)
export const setFavs = (v: string[]) => guardar(KEYS.favs, [...new Set(v)].slice(0, 200))
export const toggleFav = (id: string) => { const f = leer(KEYS.favs); setFavs(f.includes(id) ? f.filter((x) => x !== id) : [id, ...f]) }

export const useVistos = () => useLista(KEYS.vistos)
export const marcarVisto = (id: string) => guardar(KEYS.vistos, [id, ...leer(KEYS.vistos).filter((x) => x !== id)].slice(0, 24))

export const useBusquedas = () => useLista(KEYS.busquedas)
export const guardarBusqueda = (q: string) => {
  q = q.trim(); if (q.length < 2) return
  guardar(KEYS.busquedas, [q, ...leer(KEYS.busquedas).filter((x) => norm(x) !== norm(q))].slice(0, 8))
}
export const borrarBusquedas = () => guardar(KEYS.busquedas, [])

/** "Comprados juntos": co-ocurrencia en pedidos; si no hay datos, misma categoría y precio parecido. */
export function compradosJuntos(p: Product, orders: Order[], products: Product[], n = 6) {
  const score = new Map<string, number>()
  orders.forEach((o) => {
    if (!o.items.some((i) => i.id === p.id)) return
    o.items.forEach((i) => { if (i.id !== p.id) score.set(i.id, (score.get(i.id) ?? 0) + 1) })
  })
  const byId = new Map(products.map((x) => [x.id, x]))
  const top = [...score.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => byId.get(id)).filter((x): x is Product => !!x && !x.oculto)
  if (top.length >= n) return top.slice(0, n)
  const precio = p.precio ?? 5000
  const extra = products
    .filter((x) => !x.oculto && x.id !== p.id && !top.includes(x) && (x.categoriaId === p.categoriaId || (p.finca && x.finca)))
    .sort((a, b) => Math.abs((a.precio ?? 1e9) - precio) - Math.abs((b.precio ?? 1e9) - precio))
  return [...top, ...extra].slice(0, n)
}

/** "Para vos": pesa categorías de pedidos (x3), favoritos (x2) y vistos (x1). */
export function paraVos(products: Product[], orders: Order[], favs: string[], vistos: string[], n = 12) {
  const byId = new Map(products.map((x) => [x.id, x]))
  const peso = new Map<string, number>()
  const sumar = (id: string, w: number) => { const p = byId.get(id); if (p) peso.set(p.categoriaId, (peso.get(p.categoriaId) ?? 0) + w) }
  orders.forEach((o) => o.items.forEach((i) => sumar(i.id, 3)))
  favs.forEach((id) => sumar(id, 2))
  vistos.forEach((id) => sumar(id, 1))
  if (!peso.size) return []
  const yaComprados = new Set(orders.flatMap((o) => o.items.map((i) => i.id)))
  return products
    .filter((p) => !p.oculto && peso.has(p.categoriaId) && !vistos.slice(0, 3).includes(p.id))
    .map((p) => ({ p, s: (peso.get(p.categoriaId) ?? 0) + (p.precio != null ? 0.5 : 0) + (p.finca && yaComprados.has(p.id) ? 3 : 0) + (hash(p.id) % 100) / 200 }))
    .sort((a, b) => b.s - a.s)
    .slice(0, n)
    .map((x) => x.p)
}
const hash = (s: string) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h >>> 0 }
