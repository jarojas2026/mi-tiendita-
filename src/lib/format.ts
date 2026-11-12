import { config } from '../config'

export const colones = (n: number | null | undefined) =>
  // Formato tico: ₡4.000 (punto de miles, sin espacios que partan la cifra)
  n == null ? 'Consultar precio' : '₡' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')

export const conMargen = (base: number | null): number | null => {
  if (base == null) return null
  if (!config.margenPct) return base
  const r = config.redondeo || 1
  return Math.round((base * (1 + config.margenPct / 100)) / r) * r
}

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic']

export const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const parseIso = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const fechaLarga = (s: string) => {
  const d = parseIso(s)
  const dia = DIAS[d.getDay()]
  return `${dia[0].toUpperCase()}${dia.slice(1)} ${d.getDate()} ${MESES[d.getMonth()]}`
}

export const nombreDia = (n: number) => DIAS[n]

export const norm = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

export const codigoPedido = () => {
  const d = new Date()
  const p = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  return `MT-${p}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
}

/** Cantidad legible: 1,5 kg · 2 × */
export const cantidad = (qty: number, venta?: string) => {
  const n = Number.isInteger(qty) ? String(qty) : qty.toLocaleString('es-CR', { maximumFractionDigits: 2 })
  return venta === 'kg' ? `${n} kg` : `${n} ×`
}

/** ¿El producto pertenece a una categoría destacada? (por categoría o palabra en el nombre) */
export const enDestacada = (p: { categoriaId: string; nombre: string; finca?: boolean }, d: { cats: string[]; q: string[] }) =>
  !p.finca && (d.cats.includes(p.categoriaId) || d.q.some((w) => new RegExp(`\\b${w}\\b`).test(norm(p.nombre))))
