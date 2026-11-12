// Datos que viven solo en ESTE dispositivo (localStorage): sesión de invitado, su perfil
// y una copia de los pedidos hechos aquí (para ver el detalle completo y como respaldo si Firebase falla).
import type { Order, Perfil, SessionUser } from '../types'

const K = { guest: 'mt_guest', perfil: 'mt_guest_perfil', orders: 'mt_local_orders' }

const read = <T,>(k: string, d: T): T => {
  try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d } catch { return d }
}
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* lleno o bloqueado */ } }

export const digitos = (tel: string) => tel.replace(/\D/g, '').slice(-8)

/** Sesión de cliente sin cuenta (nombre + teléfono) */
export function getGuest(): SessionUser | null {
  return read<SessionUser | null>(K.guest, null)
}
export function setGuest(telefono: string, nombre: string): SessionUser {
  const dig = digitos(telefono)
  if (dig.length !== 8) throw new Error('Escribí un número de 8 dígitos (ej.: 8888-8888).')
  const fmt = `${dig.slice(0, 4)}-${dig.slice(4)}`
  const u: SessionUser = { uid: 'tel-' + dig, email: '', nombre: nombre.trim() || 'Cliente', isAdmin: false, guest: true, telefono: fmt }
  write(K.guest, u)
  const p = getGuestPerfil()
  saveGuestPerfil({ ...(p?.uid === u.uid ? p : { direcciones: [] }), uid: u.uid, email: '', nombre: u.nombre, telefono: fmt } as Perfil)
  return u
}
export const clearGuest = () => { try { localStorage.removeItem(K.guest) } catch { /* nada */ } }
export const getGuestPerfil = () => read<Perfil | null>(K.perfil, null)
export const saveGuestPerfil = (p: Perfil) => write(K.perfil, p)

/** Pedidos hechos en este dispositivo (máx. 40, el más nuevo primero) */
export const localOrders = () => read<Order[]>(K.orders, [])
export function saveLocalOrder(o: Order) {
  const all = localOrders().filter((x) => x.id !== o.id)
  write(K.orders, [o, ...all].slice(0, 40))
}
export const findLocalOrder = (id: string) => localOrders().find((o) => o.id === id || o.codigo === id) ?? null

/** Token aleatorio para el enlace de seguimiento (solo letras y números) */
export function nuevoToken(n = 24) {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const b = new Uint8Array(n)
  crypto.getRandomValues(b)
  return Array.from(b, (x) => abc[x % abc.length]).join('')
}
