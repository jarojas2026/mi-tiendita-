// Servicio de ajustes de la tienda (Firestore settings/tienda): zonas/tarifas, franjas, horario, stock bajo.
import { config, zonasDefault } from '../config'
import { getApi } from './backend/api'
import type { Ajustes } from '../types'

export const ajustesDefault = (): Ajustes => ({
  zonas: zonasDefault.map((z) => ({ ...z, activa: true })),
  franjas: [...config.franjas],
  horario: config.horario,
  stockBajo: config.stockBajo,
})

/** Ajustes guardados en Firestore, completando con los de config.ts lo que falte. */
export async function getAjustes(): Promise<Ajustes> {
  const d = ajustesDefault()
  try {
    const a = await (await getApi()).getAjustes()
    if (!a) return d
    return {
      zonas: Array.isArray(a.zonas) && a.zonas.length ? a.zonas : d.zonas,
      franjas: Array.isArray(a.franjas) && a.franjas.length ? a.franjas : d.franjas,
      horario: a.horario || d.horario,
      stockBajo: typeof a.stockBajo === 'number' ? a.stockBajo : d.stockBajo,
      ...(a.actualizado ? { actualizado: a.actualizado } : {}),
    }
  } catch { return d }
}
export const saveAjustes = async (a: Ajustes) => (await getApi()).saveAjustes(a)
