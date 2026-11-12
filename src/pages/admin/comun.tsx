// v5 — Piezas compartidas del panel admin.
import { ESTADO_INFO, type EstadoPedido, type Order } from '../../types'

/** Cambia el estado de un pedido (lo usan Tablero y Lista) */
export type OnEstado = (o: Order, e: EstadoPedido) => Promise<void>
export const horaCorta = (iso: string) => new Date(iso).toLocaleString('es-CR', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
/** Línea de tiempo corta: nuevo 9:05 · confirmado 9:20 … */
export const Lineatiempo = ({ o }: { o: Order }) => <p className="text-[11px] text-muted">{o.historial.map((h) => `${ESTADO_INFO[h.estado].icono} ${horaCorta(h.at)}`).join(' → ')}</p>
