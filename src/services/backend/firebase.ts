// MODO FIREBASE (plan gratuito Spark, sin tarjeta): Auth (Google + correo) + Firestore. Sin Storage ni Functions.
//
// Colecciones (seguridad real en firestore.rules):
//   orders/{id}                    pedido completo. Cliente con cuenta: crea y lee los suyos (userId = uid).
//                                  Invitado (sin cuenta): crea con userId '' y guest:true; no puede leerlo.
//   tracking/{id}_{token}          copia pública mínima (sin teléfono/dirección/ubicación). Solo `get`:
//                                  hay que conocer id + token secreto (va en el enlace #/pedido/:id?t=token).
//   products/{productId}           ajustes del admin sobre el catálogo: precio, nombre, oferta, ocultar, STOCK.
//   settings/tienda                zonas/tarifas, franjas, horario, umbral de stock bajo. Lectura pública.
//   users/{uid}                    perfil del cliente con cuenta.
//   clientNotes/{uid}              notas privadas del admin.
// Admins = correos fijos en firestore.rules (función isAdmin) y en config.adminEmails.
import { initializeApp } from 'firebase/app'
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut, updateProfile,
  sendEmailVerification, type User,
} from 'firebase/auth'
import {
  initializeFirestore, doc, getDoc, setDoc, collection, query, where, getDocs, orderBy, limit,
  onSnapshot, runTransaction, writeBatch,
} from 'firebase/firestore'
import { config, firebaseConfig } from '../../config'
import type { DataApi, Seguimiento } from './api'
import { clearGuest, digitos, getGuest, getGuestPerfil, localOrders, saveGuestPerfil, setGuest } from '../local'
import { normPedido, type Ajustes, type NotaCliente, type Order, type Perfil, type ProductOverride, type SessionUser } from '../../types'

const ERRORES: Record<string, string> = {
  'auth/email-already-in-use': 'Ya existe una cuenta con ese correo.',
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/wrong-password': 'Correo o contraseña incorrectos.',
  'auth/user-not-found': 'Correo o contraseña incorrectos.',
  'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
  'auth/invalid-email': 'El correo no es válido.',
  'auth/popup-closed-by-user': 'Inicio con Google cancelado.',
  'auth/cancelled-popup-request': 'Inicio con Google cancelado.',
  'auth/unauthorized-domain': 'Este dominio no está autorizado en Firebase (Authentication > Configuración > Dominios autorizados).',
  'auth/operation-not-allowed': 'Ese método de inicio no está activado. Usá "Entrar con Google" o comprá con tu número.',
  'auth/network-request-failed': 'Sin conexión. Revisá tu internet.',
  'auth/too-many-requests': 'Demasiados intentos. Esperá un momento.',
  'permission-denied': 'No tenés permiso para hacer esto (revisá las reglas de Firestore).',
  unavailable: 'Sin conexión con el servidor. Revisá tu internet.',
}
export const traducir = (e: unknown) => {
  const code = (e as { code?: string })?.code ?? ''
  const err = new Error(ERRORES[code] ?? ERRORES[code.replace('firestore/', '')] ?? 'Ocurrió un error. Intentá de nuevo.') as Error & { code?: string }
  err.code = code
  return err
}

// Quita campos undefined (Firestore no los acepta)
const limpio = <T,>(o: T): T => JSON.parse(JSON.stringify(o)) as T
const r2 = (n: number) => Math.round(n * 100) / 100

/** Campos de la copia pública de seguimiento (deben coincidir con firestore.rules) */
export const CAMPOS_TRACKING = ['codigo', 'estado', 'historial', 'creado', 'actualizado', 'fecha', 'franja', 'total', 'subtotal', 'envio', 'adelanto', 'hayBajoPedido', 'zonaId', 'zonaNombre', 'entrega', 'pago', 'items'] as const
const copiaPublica = (o: Partial<Order>) => limpio(Object.fromEntries(CAMPOS_TRACKING.filter((k) => o[k] !== undefined).map((k) => [k, o[k]])))
const trackId = (id: string, token: string) => `${id}_${token}`

export function firebaseApi(): DataApi {
  const app = initializeApp(firebaseConfig as Record<string, string>)
  const auth = getAuth(app)
  auth.languageCode = 'es'
  // Long polling automático: más estable en redes móviles/proxies
  const db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true })

  const admins = config.adminEmails.map((x) => x.toLowerCase())
  const esAdmin = (u: User) => Boolean(u.email && u.emailVerified && admins.includes(u.email.toLowerCase()))

  const ensurePerfil = async (uid: string, email: string, nombre: string) => {
    try {
      const ref = doc(db, 'users', uid)
      const snap = await getDoc(ref)
      if (!snap.exists()) await setDoc(ref, { uid, email, nombre, telefono: '', direcciones: [] } satisfies Perfil)
    } catch { /* reglas aún no publicadas: no bloquea el inicio de sesión */ }
  }

  // Si Google se abrió por redirección (celulares que bloquean ventanas), completar al volver
  getRedirectResult(auth)
    .then((c) => c && ensurePerfil(c.user.uid, c.user.email ?? '', c.user.displayName ?? ''))
    .catch(() => {})

  // Sesión = usuario de Firebase o, si no hay, el invitado de este dispositivo
  const listeners = new Set<(u: SessionUser | null) => void>()
  let fbUser: User | null = null
  let listo = false
  const sesion = (): SessionUser | null => fbUser
    ? { uid: fbUser.uid, email: fbUser.email ?? '', nombre: fbUser.displayName ?? (fbUser.email ?? '').split('@')[0], isAdmin: esAdmin(fbUser) }
    : getGuest()
  const emit = () => { if (listo) { const s = sesion(); listeners.forEach((l) => l(s)) } }
  onAuthStateChanged(auth, (u) => { fbUser = u; if (u) clearGuest(); listo = true; emit() })

  const leerTracking = async (id: string, token: string) => {
    const t = await getDoc(doc(db, 'tracking', trackId(id, token)))
    return t.exists() ? normPedido({ ...(t.data() as Order), id, trackToken: token }) : null
  }

  return {
    modo: 'firebase',
    onAuth(cb) {
      listeners.add(cb)
      if (listo) cb(sesion())
      return () => { listeners.delete(cb) }
    },
    async registrar(email, password, nombre) {
      try {
        const c = await createUserWithEmailAndPassword(auth, email.trim(), password)
        await updateProfile(c.user, { displayName: nombre })
        await ensurePerfil(c.user.uid, c.user.email ?? email, nombre)
        sendEmailVerification(c.user).catch(() => {})
      } catch (e) { throw traducir(e) }
    },
    async entrar(email, password) {
      try { await signInWithEmailAndPassword(auth, email.trim(), password) } catch (e) { throw traducir(e) }
    },
    async entrarGoogle() {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      try {
        const c = await signInWithPopup(auth, provider)
        await ensurePerfil(c.user.uid, c.user.email ?? '', c.user.displayName ?? '')
      } catch (e) {
        const code = (e as { code?: string })?.code
        if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
          await signInWithRedirect(auth, provider)
          return
        }
        throw traducir(e)
      }
    },
    async entrarTelefono(telefono, nombre) {
      setGuest(telefono, nombre)
      emit()
    },
    async salir() { clearGuest(); if (fbUser) await signOut(auth); else emit() },

    async getPerfil(uid) {
      const g = getGuest()
      if (!fbUser && g?.uid === uid) return getGuestPerfil()
      try {
        const s = await getDoc(doc(db, 'users', uid))
        return s.exists() ? (s.data() as Perfil) : null
      } catch (e) { throw traducir(e) }
    },
    async savePerfil(p) {
      if (!fbUser) { saveGuestPerfil(p); return }
      try {
        await setDoc(doc(db, 'users', p.uid), limpio({ uid: p.uid, email: p.email ?? '', nombre: p.nombre ?? '', telefono: p.telefono ?? '', direcciones: p.direcciones ?? [], ...(p.favoritos ? { favoritos: p.favoritos } : {}) }))
        if (auth.currentUser && p.nombre && auth.currentUser.displayName !== p.nombre) await updateProfile(auth.currentUser, { displayName: p.nombre })
      } catch (e) { throw traducir(e) }
    },

    async crearPedido(o) {
      if (!o.trackToken) throw new Error('Falta el token de seguimiento.')
      try {
        const ref = doc(collection(db, 'orders'))
        // Pedido + copia pública en un solo lote (las reglas verifican que coincidan con getAfter)
        const b = writeBatch(db)
        b.set(ref, limpio(o))
        b.set(doc(db, 'tracking', trackId(ref.id, o.trackToken)), copiaPublica(o))
        await b.commit()
        return { ...o, id: ref.id }
      } catch (e) { throw traducir(e) }
    },
    async getSeguimiento(id, token) {
      // 1) Dueño o admin: pedido completo
      if (fbUser) {
        try { const s = await getDoc(doc(db, 'orders', id)); if (s.exists()) return normPedido({ ...(s.data() as Order), id }) as Seguimiento } catch { /* sin permiso */ }
      }
      // 2) Cualquiera con id + token: copia pública
      if (token) { try { return await leerTracking(id, token) } catch { /* nada */ } }
      return null
    },
    async misPedidos(u) {
      if (u.guest) {
        // Invitado: pedidos hechos en este dispositivo con su número, con el estado actualizado desde Firestore
        const mios = localOrders().filter((o) => o.guest && digitos(o.cliente.telefono) === digitos(u.telefono ?? ''))
        return Promise.all(mios.map(async (o) => {
          if (o.local || !o.trackToken) return normPedido(o)
          try { const t = await leerTracking(o.id, o.trackToken); return t ? normPedido({ ...o, estado: t.estado, historial: t.historial, actualizado: t.actualizado }) : normPedido(o) } catch { return normPedido(o) }
        }))
      }
      const s = await getDocs(query(collection(db, 'orders'), where('userId', '==', u.uid)))
      return s.docs.map((d) => normPedido({ ...(d.data() as Order), id: d.id })).sort((a, b) => b.creado.localeCompare(a.creado))
    },
    async todosPedidos() {
      const s = await getDocs(query(collection(db, 'orders'), orderBy('creado', 'desc'), limit(1000)))
      return s.docs.map((d) => normPedido({ ...(d.data() as Order), id: d.id }))
    },
    escucharPedidos(cb, onError) {
      return onSnapshot(query(collection(db, 'orders'), orderBy('creado', 'desc'), limit(1000)),
        (s) => cb(s.docs.map((d) => normPedido({ ...(d.data() as Order), id: d.id }))),
        (e) => onError?.(traducir(e)))
    },
    async cambiarEstado(id, estado) {
      try {
        return await runTransaction(db, async (tx) => {
          const ref = doc(db, 'orders', id)
          const s = await tx.get(ref)
          if (!s.exists()) throw new Error('Pedido no encontrado.')
          const o = normPedido({ ...(s.data() as Order), id })
          const now = new Date().toISOString()
          const historial = [...o.historial, { estado, at: now }]
          // Descontar stock solo una vez, al pasar a "entregado"
          const descontar = estado === 'entregado' && !o.stockDescontado
          const cant = new Map<string, number>()
          if (descontar) o.items.forEach((i) => cant.set(i.id, (cant.get(i.id) ?? 0) + i.qty))
          const prods = await Promise.all([...cant.keys()].map((pid) => tx.get(doc(db, 'products', pid))))
          // --- escrituras (después de todas las lecturas) ---
          let n = 0
          prods.forEach((ps) => {
            const st = ps.exists() ? (ps.data() as ProductOverride).stock : undefined
            if (typeof st === 'number') { tx.set(ps.ref, { stock: Math.max(0, r2(st - (cant.get(ps.id) ?? 0))), actualizado: now }, { merge: true }); n++ }
          })
          tx.update(ref, { estado, historial, actualizado: now, ...(descontar ? { stockDescontado: true } : {}) })
          if (o.trackToken) tx.set(doc(db, 'tracking', trackId(id, o.trackToken)), { estado, historial, actualizado: now }, { merge: true })
          return { stockDescontado: n }
        })
      } catch (e) { throw (e as { code?: string }).code ? traducir(e) : e }
    },

    async getOverrides() {
      const s = await getDocs(collection(db, 'products'))
      const out: Record<string, ProductOverride> = {}
      s.docs.forEach((d) => { out[d.id] = d.data() as ProductOverride })
      return out
    },
    async saveOverride(id, ov) {
      try { await setDoc(doc(db, 'products', id), limpio({ ...ov, actualizado: new Date().toISOString() }), { merge: true }) } catch (e) { throw traducir(e) }
    },
    async getAjustes() {
      const s = await getDoc(doc(db, 'settings', 'tienda'))
      return s.exists() ? (s.data() as Partial<Ajustes>) : null
    },
    async saveAjustes(a) {
      try { await setDoc(doc(db, 'settings', 'tienda'), limpio({ ...a, actualizado: new Date().toISOString() })) } catch (e) { throw traducir(e) }
    },

    async todosPerfiles() {
      const s = await getDocs(collection(db, 'users'))
      return s.docs.map((d) => d.data() as Perfil)
    },
    async getNotas() {
      const s = await getDocs(collection(db, 'clientNotes'))
      const out: Record<string, NotaCliente> = {}
      s.docs.forEach((d) => { out[d.id] = d.data() as NotaCliente })
      return out
    },
    async saveNota(uid, nota) {
      try { await setDoc(doc(db, 'clientNotes', uid), { uid, nota, actualizado: new Date().toISOString() }) } catch (e) { throw traducir(e) }
    },
  }
}
