// Servicio de sesión: Google (Firebase Auth), correo/contraseña y cliente sin cuenta (nombre + teléfono).
import { getApi } from './backend/api'
import type { SessionUser } from '../types'

export const modo = async () => (await getApi()).modo
export const onAuth = async (cb: (u: SessionUser | null) => void) => (await getApi()).onAuth(cb)
export const entrarGoogle = async () => (await getApi()).entrarGoogle()
export const entrarTelefono = async (telefono: string, nombre: string) => (await getApi()).entrarTelefono(telefono, nombre)
export const entrarCorreo = async (email: string, pass: string) => (await getApi()).entrar(email, pass)
export const registrar = async (email: string, pass: string, nombre: string) => (await getApi()).registrar(email, pass, nombre)
export const salir = async () => (await getApi()).salir()
