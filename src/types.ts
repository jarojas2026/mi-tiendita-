export type Disponibilidad = 'Bajo pedido' | 'En tienda' | 'Agotado'

export interface Product {
  id: string
  nombre: string
  categoria: string
  categoriaId: string
  precio: number | null // precio final (con margen) o null = consultar
  precioBase: number | null // precio de la foto
  precioAntes?: number | null
  oferta?: boolean
  imagen?: string
  miniatura?: string
  icono?: string
  unidad?: string // texto de la unidad: "por kg", "3 litros", "cartón de 30"
  venta?: 'kg' | 'paquete' | 'unidad' // unidad de venta (por defecto 'unidad')
  paso?: number // incremento de cantidad (0.5 = medios kilos)
  nota?: string
  origen: string
  disponibilidad: Disponibilidad
  vendorId: string
  finca?: boolean
  precioPorConfirmar?: boolean
  oculto?: boolean
  motivoOculto?: string
  stock?: number | null
}

export interface ProductOverride {
  nombre?: string
  precio?: number | null
  precioAntes?: number | null
  disponibilidad?: Disponibilidad
  oferta?: boolean
  oculto?: boolean
  stock?: number | null // v4: existencias (null/undefined = sin control)
  actualizado?: string
}

export interface CartItem {
  id: string
  qty: number
}

export interface LatLng { lat: number; lng: number }

export interface Direccion {
  id: string
  etiqueta: string
  zonaId: string
  detalle: string
  lat?: number
  lng?: number
}

export interface Perfil {
  uid: string
  email: string
  nombre: string
  telefono: string
  direcciones: Direccion[]
  favoritos?: string[]
}

/** Nota privada del admin sobre un cliente (Firestore: clientNotes/{uid}) */
export interface NotaCliente { uid: string; nota: string; actualizado: string }

export interface SessionUser {
  uid: string
  email: string
  nombre: string
  isAdmin: boolean
  /** v5: cliente sin cuenta (nombre + teléfono, sesión guardada en este dispositivo) */
  guest?: boolean
  telefono?: string
}

/** v5: zona de entrega editable desde el admin (Firestore settings/tienda) */
export interface ZonaCfg {
  id: string
  nombre: string
  tarifa: number | null // null = por cotizar
  diasRuta: number[] // 0=domingo … 6=sábado
  gratis?: boolean
  provisional?: boolean // tarifa aún sin confirmar (el cliente ve "aprox.")
  retiro?: boolean
  activa?: boolean // false = no se ofrece
}

/** v5: ajustes de la tienda (Firestore settings/tienda; lectura pública, escritura solo admin) */
export interface Ajustes {
  zonas: ZonaCfg[]
  franjas: string[]
  horario: string
  stockBajo: number // umbral de alerta de stock bajo
  actualizado?: string
}

export const ESTADOS = ['nuevo', 'confirmado', 'en camino', 'entregado', 'cancelado'] as const
export type EstadoPedido = (typeof ESTADOS)[number]
/** Flujo principal (sin "cancelado") para la línea de tiempo */
export const FLUJO: EstadoPedido[] = ['nuevo', 'confirmado', 'en camino', 'entregado']
export const ESTADO_INFO: Record<EstadoPedido, { titulo: string; texto: string; icono: string; color: string }> = {
  nuevo: { titulo: 'Pedido recibido', texto: 'Lo recibimos y lo vamos a revisar.', icono: '🧾', color: '#2563eb' },
  confirmado: { titulo: 'Confirmado', texto: 'Confirmamos productos, pago y hora de entrega.', icono: '✅', color: '#4f46e5' },
  'en camino': { titulo: 'En camino', texto: 'Tu pedido salió de la tienda y va hacia vos.', icono: '🛵', color: '#9333ea' },
  entregado: { titulo: 'Entregado', texto: '¡Gracias por comprar en Mi Tiendita Digital!', icono: '🎉', color: '#16a34a' },
  cancelado: { titulo: 'Cancelado', texto: 'Este pedido fue cancelado. Escribinos si fue un error.', icono: '✖️', color: '#6b7280' },
}
/** Convierte estados de la v3 (recibido, pedido al proveedor, en ruta) a los de la v4. */
export function normEstado(e: string): EstadoPedido {
  if (e === 'recibido') return 'nuevo'
  if (e === 'pedido al proveedor') return 'confirmado'
  if (e === 'en ruta') return 'en camino'
  return (ESTADOS as readonly string[]).includes(e) ? (e as EstadoPedido) : 'nuevo'
}
export function normPedido(o: Order): Order {
  return { ...o, estado: normEstado(o.estado), historial: (o.historial ?? []).map((h) => ({ ...h, estado: normEstado(h.estado) })) }
}

export interface OrderItem {
  id: string
  nombre: string
  precio: number | null
  qty: number
  disponibilidad: Disponibilidad
  vendorId: string
  venta?: 'kg' | 'paquete' | 'unidad'
  unidad?: string
}

export interface Order {
  id: string
  codigo: string
  userId: string
  email: string
  cliente: { nombre: string; telefono: string }
  items: OrderItem[]
  subtotal: number
  envio: number | null
  total: number
  adelanto: number
  hayBajoPedido: boolean
  hayPrecioPorConfirmar: boolean
  zonaId: string
  zonaNombre: string
  direccion: string
  ubicacion?: LatLng & { precision?: number } // pin del cliente
  distanciaKm?: number // en línea recta desde la tienda
  fecha: string // YYYY-MM-DD
  franja: string
  pago: 'sinpe' | 'efectivo'
  /** v4: domicilio o retiro en tienda */
  entrega?: 'domicilio' | 'retiro'
  /** v4: número de comprobante SINPE que escribió el cliente (opcional) */
  sinpeRef?: string
  notas: string
  estado: EstadoPedido
  historial: { estado: EstadoPedido; at: string }[]
  creado: string // ISO
  /** v5: token secreto del enlace de seguimiento (#/pedido/:id?t=token) */
  trackToken?: string
  /** v5: pedido hecho sin cuenta (solo nombre + teléfono) */
  guest?: boolean
  /** v5: última modificación (ISO) */
  actualizado?: string
  /** v5: el stock ya se descontó al marcarlo entregado */
  stockDescontado?: boolean
  /** v5: guardado solo en este dispositivo porque Firebase falló (se envió por WhatsApp) */
  local?: boolean
}
