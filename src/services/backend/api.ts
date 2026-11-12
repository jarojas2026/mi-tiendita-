import { isFirebase } from '../../config'
import type { Ajustes, Order, EstadoPedido, NotaCliente, Perfil, ProductOverride, SessionUser } from '../../types'

/** Datos públicos de seguimiento (sin teléfono, dirección ni ubicación) */
export type Seguimiento = Pick<Order, 'id' | 'codigo' | 'estado' | 'historial' | 'creado' | 'fecha' | 'franja' | 'total' | 'zonaNombre'> & Partial<Order>

// Backend común: lo implementan demo.ts (localStorage) y firebase.ts (Auth + Firestore).
// Las páginas NO deberían llamar esto directo: usan src/services/{auth,orders,products,settings}.ts
export interface DataApi {
  modo: 'demo' | 'firebase'
  onAuth(cb: (u: SessionUser | null) => void): () => void
  registrar(email: string, password: string, nombre: string): Promise<void>
  entrar(email: string, password: string): Promise<void>
  entrarGoogle(): Promise<void>
  /** Cliente sin cuenta: nombre + teléfono (sesión en este dispositivo) */
  entrarTelefono(telefono: string, nombre: string): Promise<void>
  salir(): Promise<void>
  getPerfil(uid: string): Promise<Perfil | null>
  savePerfil(p: Perfil): Promise<void>

  /** Crea el pedido (el id lo genera el backend). Debe traer trackToken. */
  crearPedido(o: Omit<Order, 'id'>): Promise<Order>
  /** Seguimiento por id (+ token secreto para pedidos de invitado / otro dispositivo) */
  getSeguimiento(id: string, token?: string): Promise<Seguimiento | null>
  misPedidos(u: SessionUser): Promise<Order[]>
  todosPedidos(): Promise<Order[]>
  /** Admin: pedidos en vivo. Devuelve la función para dejar de escuchar. */
  escucharPedidos(cb: (os: Order[]) => void, onError?: (e: Error) => void): () => void
  /** Admin: cambia estado (+ historial con hora). Al pasar a "entregado" descuenta stock (una sola vez). */
  cambiarEstado(id: string, estado: EstadoPedido): Promise<{ stockDescontado: number }>

  getOverrides(): Promise<Record<string, ProductOverride>>
  saveOverride(id: string, o: ProductOverride): Promise<void>

  getAjustes(): Promise<Partial<Ajustes> | null>
  saveAjustes(a: Ajustes): Promise<void>

  todosPerfiles(): Promise<Perfil[]>
  getNotas(): Promise<Record<string, NotaCliente>>
  saveNota(uid: string, nota: string): Promise<void>
}

let impl: Promise<DataApi> | null = null

/** Firebase si está configurado; si falla al cargar/iniciar, cae a modo demo (localStorage). */
export function getApi(): Promise<DataApi> {
  if (!impl) {
    const demo = () => import('./demo').then((m) => m.demoApi())
    impl = isFirebase
      ? import('./firebase').then((m) => m.firebaseApi()).catch((e) => { console.warn('Firebase no disponible, modo demo:', e); return demo() })
      : demo()
  }
  return impl
}
