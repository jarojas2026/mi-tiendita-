// MODO DEMO: todo vive en el localStorage de este navegador.
// Sirve para probar la app sin crear nada en la nube. NO es seguro para producción.
import { config } from '../../config'
import { uid } from '../../lib/format'
import type { DataApi } from './api'
import { normPedido, type Ajustes, type NotaCliente, type Order, type Perfil, type ProductOverride, type SessionUser } from '../../types'

const K = {
  users: 'mt_demo_users',
  session: 'mt_demo_session',
  perfiles: 'mt_demo_perfiles',
  orders: 'mt_demo_orders',
  overrides: 'mt_demo_overrides',
  notas: 'mt_demo_notas',
  ajustes: 'mt_demo_ajustes',
}

interface DemoUser { uid: string; email: string; nombre: string; hash: string }

const read = <T,>(k: string, d: T): T => {
  try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d } catch { return d }
}
const write = (k: string, v: unknown) => localStorage.setItem(k, JSON.stringify(v))

// "hash" simple solo para no guardar la contraseña en texto plano en la demo
const hash = (s: string) => {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return 'd' + (h >>> 0).toString(36)
}

const isAdminEmail = (e: string) => [...config.adminEmails, ...config.demoAdminEmails].map((x) => x.toLowerCase()).includes(e.toLowerCase())

export function demoApi(): DataApi {
  const listeners = new Set<(u: SessionUser | null) => void>()

  // Sembrar cuenta admin de demo
  const users = read<DemoUser[]>(K.users, [])
  if (!users.find((u) => u.email === config.demoAdmin.email)) {
    users.push({ uid: 'admin-demo', email: config.demoAdmin.email, nombre: config.demoAdmin.nombre, hash: hash(config.demoAdmin.password) })
    write(K.users, users)
  }

  const current = (): SessionUser | null => {
    const id = read<string | null>(K.session, null)
    const u = read<DemoUser[]>(K.users, []).find((x) => x.uid === id)
    return u ? { uid: u.uid, email: u.email, nombre: u.nombre, isAdmin: isAdminEmail(u.email) } : null
  }
  const emit = () => { const u = current(); listeners.forEach((l) => l(u)) }
  const setSession = (id: string | null) => { write(K.session, id); emit() }

  const ensurePerfil = (u: DemoUser) => {
    const ps = read<Record<string, Perfil>>(K.perfiles, {})
    if (!ps[u.uid]) { ps[u.uid] = { uid: u.uid, email: u.email, nombre: u.nombre, telefono: '', direcciones: [] }; write(K.perfiles, ps) }
  }

  return {
    modo: 'demo',
    onAuth(cb) { listeners.add(cb); cb(current()); return () => listeners.delete(cb) },
    async registrar(email, password, nombre) {
      email = email.trim().toLowerCase()
      if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.')
      const us = read<DemoUser[]>(K.users, [])
      if (us.find((u) => u.email === email)) throw new Error('Ya existe una cuenta con ese correo.')
      const u = { uid: uid(), email, nombre, hash: hash(password) }
      us.push(u); write(K.users, us); ensurePerfil(u); setSession(u.uid)
    },
    async entrar(email, password) {
      email = email.trim().toLowerCase()
      const u = read<DemoUser[]>(K.users, []).find((x) => x.email === email)
      if (!u || u.hash !== hash(password)) throw new Error('Correo o contraseña incorrectos.')
      ensurePerfil(u); setSession(u.uid)
    },
    async entrarGoogle() {
      // Simulación: en modo demo no hay Google real
      const email = (window.prompt('MODO DEMO — simulación de Google.\nEscribí un correo de Gmail:', 'cliente@gmail.com') || '').trim().toLowerCase()
      if (!email) throw new Error('Inicio con Google cancelado.')
      const us = read<DemoUser[]>(K.users, [])
      let u = us.find((x) => x.email === email)
      if (!u) { u = { uid: uid(), email, nombre: email.split('@')[0], hash: 'google' }; us.push(u); write(K.users, us) }
      ensurePerfil(u); setSession(u.uid)
    },
    async entrarTelefono(telefono, nombre) {
      const dig = telefono.replace(/\D/g, '').slice(-8)
      if (dig.length !== 8) throw new Error('Escribí un número de 8 dígitos (ej.: 8888-8888).')
      const email = `${dig}@tel.mitiendita`
      const us = read<DemoUser[]>(K.users, [])
      let u = us.find((x) => x.email === email)
      if (!u) { u = { uid: 'tel-' + dig, email, nombre: nombre.trim() || 'Cliente', hash: 'tel' }; us.push(u); write(K.users, us) }
      else if (nombre.trim()) { u.nombre = nombre.trim(); write(K.users, us) }
      const ps = read<Record<string, Perfil>>(K.perfiles, {})
      const fmt = `${dig.slice(0, 4)}-${dig.slice(4)}`
      ps[u.uid] = { ...(ps[u.uid] ?? { uid: u.uid, email: '', direcciones: [] }), uid: u.uid, nombre: u.nombre, telefono: fmt } as Perfil
      write(K.perfiles, ps); setSession(u.uid)
    },
    async getSeguimiento(id, _token) {
      const o = read<Order[]>(K.orders, []).find((x) => x.id === id || x.codigo === id)
      return o ? normPedido(o) : null
    },
    async salir() { setSession(null) },
    async getPerfil(id) { return read<Record<string, Perfil>>(K.perfiles, {})[id] ?? null },
    async savePerfil(p) {
      const ps = read<Record<string, Perfil>>(K.perfiles, {}); ps[p.uid] = p; write(K.perfiles, ps)
      const us = read<DemoUser[]>(K.users, []); const u = us.find((x) => x.uid === p.uid)
      if (u && p.nombre) { u.nombre = p.nombre; write(K.users, us); emit() }
    },
    async crearPedido(o) {
      const order: Order = { ...o, id: uid() }
      const os = read<Order[]>(K.orders, []); os.push(order); write(K.orders, os)
      return order
    },
    async misPedidos(u) { return read<Order[]>(K.orders, []).map(normPedido).filter((o) => o.userId === u.uid).sort((a, b) => b.creado.localeCompare(a.creado)) },
    async todosPedidos() { return read<Order[]>(K.orders, []).map(normPedido).sort((a, b) => b.creado.localeCompare(a.creado)) },
    escucharPedidos(cb) {
      // Demo: "en vivo" = relee cada 5 s y cuando otra pestaña cambia el localStorage
      const leer = () => cb(read<Order[]>(K.orders, []).map(normPedido).sort((a, b) => b.creado.localeCompare(a.creado)))
      leer()
      const t = setInterval(leer, 5000)
      const f = (e: StorageEvent) => { if (e.key === K.orders) leer() }
      window.addEventListener('storage', f)
      return () => { clearInterval(t); window.removeEventListener('storage', f) }
    },
    async cambiarEstado(id, estado) {
      const os = read<Order[]>(K.orders, []).map(normPedido); const o = os.find((x) => x.id === id)
      let n = 0
      if (o) {
        const now = new Date().toISOString()
        if (estado === 'entregado' && !o.stockDescontado) {
          const ov = read<Record<string, ProductOverride>>(K.overrides, {})
          o.items.forEach((i) => { const st = ov[i.id]?.stock; if (typeof st === 'number') { ov[i.id] = { ...ov[i.id], stock: Math.max(0, Math.round((st - i.qty) * 100) / 100) }; n++ } })
          write(K.overrides, ov); o.stockDescontado = true
        }
        o.estado = estado; o.actualizado = now; o.historial.push({ estado, at: now }); write(K.orders, os)
      }
      return { stockDescontado: n }
    },
    async getAjustes() { return read<Partial<Ajustes> | null>(K.ajustes, null) },
    async saveAjustes(a) { write(K.ajustes, { ...a, actualizado: new Date().toISOString() }) },
    async getOverrides() { return read<Record<string, ProductOverride>>(K.overrides, {}) },
    async saveOverride(id, ov) { const all = read<Record<string, ProductOverride>>(K.overrides, {}); all[id] = { ...all[id], ...ov }; write(K.overrides, all) },
    async todosPerfiles() { return Object.values(read<Record<string, Perfil>>(K.perfiles, {})) },
    async getNotas() { return read<Record<string, NotaCliente>>(K.notas, {}) },
    async saveNota(id, nota) { const all = read<Record<string, NotaCliente>>(K.notas, {}); all[id] = { uid: id, nota, actualizado: new Date().toISOString() }; write(K.notas, all) },
  }
}
