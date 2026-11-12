// Servicio de productos: ajustes del admin (precio, nombre, oferta, ocultar, stock) sobre el catálogo base.
import { getApi } from './backend/api'
import type { Product, ProductOverride } from '../types'

export async function getOverrides(): Promise<Record<string, ProductOverride>> {
  try { return await (await getApi()).getOverrides() } catch { return {} } // sin conexión: catálogo base
}
export const saveOverride = async (id: string, o: ProductOverride) => (await getApi()).saveOverride(id, o)

/** Productos con control de stock en o por debajo del umbral (no ocultos), los más bajos primero. */
export const stockBajo = (products: Product[], umbral: number) =>
  products.filter((p) => !p.oculto && p.stock != null && p.stock <= umbral).sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0))
