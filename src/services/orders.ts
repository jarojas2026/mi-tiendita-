// Servicio de pedidos: crear (con respaldo local si Firebase falla), seguimiento, historial y panel admin.
import { getApi } from './backend/api'
import type { Seguimiento } from './backend/api'
import { findLocalOrder, nuevoToken, saveLocalOrder } from './local'
import { uid } from '../lib/format'
import { normPedido, type EstadoPedido, type Order, type SessionUser } from '../types'

export type { Seguimiento }
export type NuevoPedido = Omit<Order, 'id' | 'trackToken' | 'userId' | 'email' | 'guest'>

/**
 * Guarda el pedido. Cliente con cuenta → userId = uid. Invitado → userId '' y guest: true.
 * Si Firestore falla (sin internet, reglas sin publicar…), se guarda en este dispositivo con local: true
 * y el pedido igual sale por WhatsApp.
 */
// Anti-spam en el dispositivo: máximo 1 pedido cada 45 s y 6 por hora (las reglas de Firestore validan el resto).
const RL_KEY = 'mt-envios'
export function revisarFrecuencia(ahora = Date.now(), previos: number[] = leerEnvios()): string | null {
  const hora = previos.filter((t) => ahora - t < 3_600_000)
  if (hora.some((t) => ahora - t < 45_000)) return 'Esperá unos segundos antes de enviar otro pedido.'
  if (hora.length >= 6) return 'Ya enviaste varios pedidos en la última hora. Escribinos por WhatsApp si necesitás más.'
  return null
}
function leerEnvios(): number[] {
  try { return JSON.parse(localStorage.getItem(RL_KEY) || '[]') as number[] } catch { return [] }
}
function anotarEnvio(ahora = Date.now()) {
  try { localStorage.setItem(RL_KEY, JSON.stringify([...leerEnvios().filter((t) => ahora - t < 3_600_000), ahora])) } catch { /* sin storage */ }
}

export async function crearPedido(datos: NuevoPedido, u: SessionUser): Promise<Order> {
  const limite = revisarFrecuencia()
  if (limite) throw new Error(limite)
  const api = await getApi()
  const base: Omit<Order, 'id'> = {
    ...datos,
    userId: u.guest ? '' : u.uid,
    email: u.guest ? '' : u.email,
    guest: Boolean(u.guest),
    trackToken: nuevoToken(),
    actualizado: datos.creado,
  }
  let order: Order
  try {
    order = await api.crearPedido(base)
  } catch (e) {
    if (api.modo !== 'firebase') throw e
    console.warn('No se pudo guardar en Firebase; respaldo local:', e)
    order = { ...base, id: 'L' + uid(), local: true }
  }
  saveLocalOrder(order)
  anotarEnvio()
  return order
}

/** Seguimiento: Firestore (cualquier dispositivo con id + token) + detalle completo si el pedido se hizo aquí. */
export async function getSeguimiento(id: string, token?: string): Promise<Seguimiento | null> {
  const local = findLocalOrder(id)
  const api = await getApi()
  let remoto: Seguimiento | null = null
  if (!local?.local) { try { remoto = await api.getSeguimiento(id, token ?? local?.trackToken) } catch { /* sin conexión */ } }
  if (local) return normPedido({ ...local, ...(remoto ? { estado: remoto.estado, historial: remoto.historial, actualizado: remoto.actualizado } : {}) })
  return remoto
}

export const misPedidos = async (u: SessionUser) => (await getApi()).misPedidos(u)
export const todosPedidos = async () => (await getApi()).todosPedidos()

/** Admin: pedidos en vivo (onSnapshot en Firebase). Devuelve la función para dejar de escuchar. */
export function escucharPedidos(cb: (os: Order[]) => void, onError?: (e: Error) => void) {
  let stop: (() => void) | null = null
  let cancelado = false
  getApi().then((api) => { if (!cancelado) stop = api.escucharPedidos(cb, onError) })
  return () => { cancelado = true; stop?.() }
}

/** Admin: cambia el estado. Al marcar "entregado" descuenta el stock (transacción, una sola vez). */
export const cambiarEstado = async (id: string, estado: EstadoPedido) => (await getApi()).cambiarEstado(id, estado)
