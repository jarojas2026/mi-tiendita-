import { useSyncExternalStore } from 'react'

const K = 'mt_tema'
const subs = new Set<() => void>()
export const temaActual = (): 'claro' | 'oscuro' => {
  const t = localStorage.getItem(K)
  if (t === 'claro' || t === 'oscuro') return t
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro'
}
export const aplicarTema = () => {
  const dark = temaActual() === 'oscuro'
  document.documentElement.classList.toggle('dark', dark)
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', dark ? '#11140f' : '#1c562d')
}
export const alternarTema = () => {
  localStorage.setItem(K, temaActual() === 'oscuro' ? 'claro' : 'oscuro'); aplicarTema(); subs.forEach((f) => f())
}
export const useTema = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, temaActual)
