// Página de ayuda: cómo comprar, envíos, pagos, horario y contacto.
// Solo usa datos que ya existen en config/ajustes (no inventa políticas).
import { Link } from 'react-router-dom'
import { config } from '../config'
import { useStore } from '../store'
import { Card } from '../components/ui'
import { colones } from '../lib/format'
import { useSeo } from '../lib/seo'

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const diasTexto = (d: number[]) => (d.length >= 6 ? 'lunes a sábado' : d.map((x) => DIAS[x]).join(', '))

export default function Info() {
  useSeo('Envíos, pagos y contacto', `Envío gratis por lanzamiento (jueves y sábado), pago por SINPE Móvil ${config.sinpe.numero} o efectivo. WhatsApp ${config.whatsappVisible}.`)
  const { ajustes } = useStore()
  const zonas = ajustes.zonas.filter((z) => z.activa !== false)
  const tarifa = (t: number | null, gratis?: boolean, prov?: boolean) =>
    gratis || t === 0 ? 'Gratis' : t == null ? 'Por cotizar' : `${colones(t)}${prov ? ' (aprox.)' : ''}`
  return (
    <div className="mx-auto max-w-3xl space-y-4" data-testid="pagina-info">
      <h1 className="text-2xl font-bold">Envíos, pagos y contacto</h1>

      <Card className="space-y-2">
        <h2 className="text-lg font-bold">Cómo comprar</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>Agregá productos al carrito desde el <Link to="/catalogo" className="font-semibold text-brand-600 underline">catálogo</Link>.</li>
          <li>En el pago elegí entrega a domicilio o retiro en la tienda, la fecha y la forma de pago.</li>
          <li>Confirmá el pedido: se abre WhatsApp con el resumen para que nos lo enviés.</li>
        </ol>
        <p className="text-sm text-muted">También podés escribirnos directo por WhatsApp y te ayudamos a armar el pedido.</p>
      </Card>

      <Card className="space-y-2">
        <h2 className="text-lg font-bold" id="devoluciones">Cambios y devoluciones</h2>
        <p className="text-sm">{config.politicaDevoluciones}</p>
      </Card>

      <Card className="space-y-2" >
        <h2 className="text-lg font-bold" id="envios">Envíos y retiro</h2>
        <p className="rounded-xl bg-brand-50 p-3 text-sm font-semibold text-brand-700">🎉 Promoción de lanzamiento: envío GRATIS a todas las zonas. Entregamos los jueves y sábados. Más adelante el envío podría tener costo.</p>
        <p className="text-sm">También podés retirar gratis en la tienda, en Palmital de Rivas.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b border-line text-muted"><th className="py-1.5 pr-2 font-semibold">Zona</th><th className="py-1.5 pr-2 font-semibold">Envío</th><th className="py-1.5 font-semibold">Días de ruta</th></tr></thead>
            <tbody>
              {zonas.map((z) => (
                <tr key={z.id} className="border-b border-line/60">
                  <td className="py-1.5 pr-2">{z.nombre}</td>
                  <td className="py-1.5 pr-2 whitespace-nowrap">{tarifa(z.tarifa, z.gratis || z.retiro, z.provisional)}</td>
                  <td className="py-1.5">{diasTexto(z.diasRuta)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {ajustes.franjas.length > 0 && <p className="text-sm">Franjas de entrega: {ajustes.franjas.join(' · ')}</p>}
        <p className="text-sm">Productos bajo pedido: adelanto del {config.adelantoPct}% por SINPE Móvil y plazo estimado de {config.plazoBajoPedido}.</p>
      </Card>

      <Card className="space-y-2">
        <h2 className="text-lg font-bold" id="pagos">Formas de pago</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>SINPE Móvil al <b>{config.sinpe.numero}</b> a nombre de <b>{config.sinpe.nombre}</b>.</li>
          <li>Efectivo contra entrega.</li>
        </ul>
      </Card>

      <Card className="space-y-2">
        <h2 className="text-lg font-bold" id="contacto">Horario y contacto</h2>
        <p className="text-sm">{ajustes.horario}</p>
        <div className="flex flex-wrap gap-2">
          <a href={`https://wa.me/${config.whatsapp}`} target="_blank" rel="noreferrer" className="rounded-full bg-brand-600 px-4 py-2 text-sm font-bold text-white">WhatsApp {config.whatsappVisible}</a>
          <a href={`mailto:${config.email}`} className="rounded-full bg-surface-2 px-4 py-2 text-sm font-semibold ring-1 ring-line break-all">{config.email}</a>
          <a href={config.facebook} target="_blank" rel="noreferrer" className="rounded-full bg-surface-2 px-4 py-2 text-sm font-semibold ring-1 ring-line">Facebook</a>
        </div>
        <p className="text-sm text-muted">{config.ubicacion}. Para consultas sobre un pedido, escribinos por WhatsApp con tu número de pedido.</p>
      </Card>
    </div>
  )
}
