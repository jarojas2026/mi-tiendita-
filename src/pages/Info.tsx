// Páginas de confianza: Envíos, Devoluciones, Términos, Privacidad, Nosotros y Ayuda.
// Los textos marcados con [COMPLETAR …] los define Gabriel antes de publicar.
import { Link } from 'react-router-dom'
import { useEffect, type ReactNode } from 'react'
import { config, zonasDefault } from '../config'
import { colones } from '../lib/format'
import { imgUrl } from '../store'
import { Icon } from '../components/icons'

const ACTUALIZADO = 'Actualizado el 25 de noviembre de 2026'
const WA_URL = `https://wa.me/${config.whatsapp}`

function useTitulo(pagina: string) {
  useEffect(() => {
    document.title = `${pagina} · ${config.storeName}`
  }, [pagina])
}

/** Texto pendiente que Gabriel debe definir. Visible a propósito. */
function Completar({ children }: { children: ReactNode }) {
  return (
    <mark className="rounded bg-accent-100 px-1 font-semibold text-earth-900 dark:bg-accent-700/40 dark:text-accent-100">
      [COMPLETAR: {children}]
    </mark>
  )
}

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="mt-6 rounded-2xl bg-surface p-4 shadow-card ring-1 ring-line sm:p-5">
      <h2 className="text-xl font-bold leading-tight text-ink">{titulo}</h2>
      <div className="mt-2 space-y-2 text-[15px] leading-relaxed text-ink">{children}</div>
    </section>
  )
}

function Acciones() {
  return (
    <div className="mt-8 flex flex-col gap-2.5 sm:flex-row">
      <a href={WA_URL} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-3 font-extrabold text-white shadow-sm transition hover:bg-brand-700">
        <Icon name="whatsapp" size={20} /> Escribinos por WhatsApp
      </a>
      <Link to="/catalogo" className="flex items-center justify-center gap-2 rounded-2xl bg-accent-400 px-4 py-3 font-extrabold text-earth-900 shadow-sm transition hover:bg-accent-300">
        <Icon name="grid" size={20} /> Ver el catálogo
      </Link>
    </div>
  )
}

function Pagina({ titulo, intro, legal, children }: { titulo: string; intro: string; legal?: boolean; children: ReactNode }) {
  useTitulo(titulo)
  return (
    <main className="mx-auto max-w-3xl px-3 py-6 sm:px-4">
      <h1 className="text-3xl font-bold leading-tight text-ink sm:text-4xl">{titulo}</h1>
      <p className="mt-1 text-sm text-muted">{ACTUALIZADO}</p>
      <p className="mt-3 text-[15px] text-ink">{intro}</p>
      {children}
      {legal && <p className="mt-6 text-sm italic text-muted">Este texto es una guía y no sustituye asesoría legal.</p>}
      <Acciones />
    </main>
  )
}

const WaLink = () => (
  <a href={WA_URL} target="_blank" rel="noreferrer" className="font-bold text-brand-700 underline dark:text-brand-300">WhatsApp {config.whatsappVisible}</a>
)

/* =================== Envíos =================== */
export function Envios() {
  const zonas = zonasDefault.filter((z) => z.activa !== false)
  const tarifa = (t: number | null, gratis?: boolean, provisional?: boolean) => {
    if (gratis || t === 0) return 'Gratis'
    if (t == null) return 'Por cotizar'
    return provisional ? `${colones(t)} (aprox.)` : colones(t)
  }
  return (
    <Pagina titulo="Envíos" intro="Te llevamos el pedido a la casa o lo retirás en la tienda. Aquí te contamos cómo funciona.">
      <Seccion titulo="Retiro gratis">
        <p>Podés retirar tu pedido sin costo en Palmital de Rivas, Pérez Zeledón.</p>
        <p>Te avisamos por WhatsApp cuando esté listo.</p>
      </Seccion>
      <Seccion titulo="Entrega gratis en San Isidro">
        <p>La entrega es gratis en San Isidro de El General (centro) y alrededores.</p>
      </Seccion>
      <Seccion titulo="Días de entrega">
        <p>Por ahora entregamos los <b>jueves y sábados</b>.</p>
        <p>Al confirmar el pedido te decimos el día y la franja horaria.</p>
      </Seccion>
      <Seccion titulo="Zonas y tarifas">
        <p className="text-sm text-muted">Son tarifas de referencia. Te confirmamos el monto final por WhatsApp antes de entregar.</p>
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[18rem] text-left text-sm">
            <caption className="sr-only">Tarifas de referencia de envío por zona</caption>
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="px-1 py-2 font-bold">Zona</th>
                <th scope="col" className="px-1 py-2 text-right font-bold">Tarifa de referencia</th>
              </tr>
            </thead>
            <tbody>
              {zonas.map((z) => (
                <tr key={z.id} className="border-b border-line last:border-0">
                  <td className="px-1 py-2">{z.nombre}</td>
                  <td className="px-1 py-2 text-right font-semibold whitespace-nowrap">{tarifa(z.tarifa, z.gratis || z.retiro, z.provisional)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Seccion>
      <Seccion titulo="Productos bajo pedido">
        <p>Para los productos bajo pedido pedimos un adelanto del {config.adelantoPct} % por SINPE Móvil.</p>
        <p>La entrega tarda de {config.plazoBajoPedido}.</p>
      </Seccion>
    </Pagina>
  )
}

/* =================== Devoluciones =================== */
export function Devoluciones() {
  return (
    <Pagina titulo="Devoluciones" legal intro="Queremos que quedés contento con tu compra. Si algo sale mal, lo arreglamos.">
      <Seccion titulo="Huevos y lácteos">
        <p>Son productos perecederos. Si algo viene mal, avisanos el mismo día que lo recibís.</p>
        <p>Mandanos una foto por <WaLink />.</p>
      </Seccion>
      <Seccion titulo="Productos del bazar">
        <p>Podés devolver un producto sin usar y en su empaque original.</p>
        <p>Plazo para avisar: <Completar>plazo, sugerido 8 días naturales</Completar>.</p>
      </Seccion>
      <Seccion titulo="Garantía por defectos de fábrica">
        <p>Si un producto trae un defecto de fábrica, tenés garantía según la Ley 7472 (Ley de Promoción de la Competencia y Defensa Efectiva del Consumidor).</p>
      </Seccion>
      <Seccion titulo="Reembolsos">
        <p>Si corresponde un reembolso, te lo hacemos por SINPE Móvil.</p>
      </Seccion>
      <Seccion titulo="Cómo hacer un reclamo">
        <ol className="list-decimal space-y-1 pl-5">
          <li>Escribinos por <WaLink />.</li>
          <li>Indicá tu nombre y el número de pedido.</li>
          <li>Contanos qué pasó y mandá una foto.</li>
          <li>Te respondemos con la solución.</li>
        </ol>
      </Seccion>
    </Pagina>
  )
}

/* =================== Términos =================== */
export function Terminos() {
  return (
    <Pagina titulo="Términos y condiciones" legal intro="Estas son las reglas para comprar en la tienda. Son cortas y claras.">
      <Seccion titulo="Quién vende">
        <p>Vende {config.storeName}, de <Completar>nombre legal y cédula</Completar>, en Pérez Zeledón, Costa Rica.</p>
      </Seccion>
      <Seccion titulo="Precios">
        <p>Los precios están en colones e incluyen impuestos <Completar>confirmar que incluyen impuestos</Completar>.</p>
      </Seccion>
      <Seccion titulo="Formas de pago">
        <p>Podés pagar por SINPE Móvil al {config.sinpe.numero} o en efectivo al recibir.</p>
      </Seccion>
      <Seccion titulo="Adelantos">
        <p>Los productos bajo pedido requieren un adelanto del {config.adelantoPct} % por SINPE Móvil.</p>
      </Seccion>
      <Seccion titulo="Cancelaciones">
        <p>Podés cancelar tu pedido por WhatsApp antes de que salga a entregarse.</p>
        <p>Si pagaste un adelanto, te explicamos cómo se devuelve <Completar>condiciones de devolución del adelanto</Completar>.</p>
      </Seccion>
      <Seccion titulo="Disponibilidad">
        <p>Algunos productos tienen pocas unidades. Si algo se agota, te avisamos y te damos opciones.</p>
      </Seccion>
      <Seccion titulo="Confirmación del pedido">
        <p>Tu pedido queda confirmado cuando te escribimos por <WaLink />.</p>
      </Seccion>
      <Seccion titulo="Ley aplicable">
        <p>Estos términos se rigen por las leyes de Costa Rica.</p>
      </Seccion>
    </Pagina>
  )
}

/* =================== Privacidad =================== */
export function Privacidad() {
  return (
    <Pagina titulo="Privacidad" legal intro="Cuidamos tus datos. Solo pedimos lo necesario para entregarte el pedido.">
      <Seccion titulo="Qué datos pedimos">
        <ul className="list-disc space-y-1 pl-5">
          <li>Nombre.</li>
          <li>Teléfono.</li>
          <li>Dirección y ubicación en el mapa.</li>
          <li>Correo electrónico, si iniciás sesión.</li>
        </ul>
      </Seccion>
      <Seccion titulo="Para qué los usamos">
        <p>Para entregar tu pedido y coordinar contigo la entrega.</p>
      </Seccion>
      <Seccion titulo="Dónde se guardan">
        <p>Se guardan en Google Firebase, un servicio en la nube de Google.</p>
      </Seccion>
      <Seccion titulo="Por cuánto tiempo">
        <p>Los guardamos por <Completar>tiempo de conservación de los datos</Completar>.</p>
      </Seccion>
      <Seccion titulo="No vendemos tus datos">
        <p>Nunca vendemos ni alquilamos tus datos a nadie.</p>
      </Seccion>
      <Seccion titulo="Tus derechos">
        <p>Según la Ley 8968 (Protección de la Persona frente al Tratamiento de sus Datos Personales), podés pedir ver, corregir o borrar tus datos.</p>
        <p>
          Escribinos a{' '}
          <a href={`mailto:${config.email}`} className="font-bold break-all text-brand-700 underline dark:text-brand-300">{config.email}</a>{' '}
          o por <WaLink />.
        </p>
      </Seccion>
    </Pagina>
  )
}

/* =================== Nosotros =================== */
const FOTOS = [
  { src: 'img/finca/granja.webp', alt: 'Vista de Granja Palmital en Pérez Zeledón' },
  { src: 'img/finca/gallinas.webp', alt: 'Gallinas de Granja Palmital en el corral' },
  { src: 'img/finca/nidos.webp', alt: 'Nidos donde ponen las gallinas de la granja' },
  { src: 'img/finca/produccion.webp', alt: 'Huevos recién recogidos en la granja' },
]

export function Nosotros() {
  return (
    <Pagina titulo="Nosotros" intro={`${config.storeName} es un negocio familiar de Pérez Zeledón.`}>
      <Seccion titulo="Nuestra historia">
        <p><Completar>breve historia de la familia y la tienda</Completar></p>
      </Seccion>
      <Seccion titulo="Granja Palmital">
        <p>Tenemos cerca de 170 gallinas en Palmital de Rivas.</p>
        <p>Los huevos se recogen cada día y llegan frescos a tu mesa.</p>
        <div className="grid grid-cols-2 gap-2.5 pt-2">
          {FOTOS.map((f) => (
            <figure key={f.src} className="overflow-hidden rounded-xl bg-surface-2 ring-1 ring-line">
              <img src={imgUrl(f.src)} alt={f.alt} loading="lazy" decoding="async" className="aspect-[4/3] h-full w-full object-cover" />
            </figure>
          ))}
        </div>
      </Seccion>
      <Seccion titulo="Nuestra lechería">
        <p>La familia también hace queso, natilla y leche fresca.</p>
        <p>La lechería cuenta con Certificado Veterinario de Operación (CVO) del SENASA.</p>
      </Seccion>
      <Seccion titulo="Por qué comprarnos">
        <ul className="list-disc space-y-1 pl-5">
          <li>Entrega local y rápida en Pérez Zeledón.</li>
          <li>Pagás por SINPE Móvil o en efectivo.</li>
          <li>Producto fresco, directo de la finca.</li>
        </ul>
      </Seccion>
    </Pagina>
  )
}

/* =================== Ayuda =================== */
export function Ayuda() {
  const preguntas: { p: string; r: ReactNode }[] = [
    { p: '¿Cómo hago un pedido?', r: <>Agregá productos al carrito desde el <Link to="/catalogo" className="font-bold text-brand-700 underline dark:text-brand-300">catálogo</Link>, llená tus datos y enviá el pedido. Te confirmamos por WhatsApp.</> },
    { p: '¿Necesito crear una cuenta?', r: <>No. Podés comprar sin cuenta. Si iniciás sesión, podés ver tus pedidos más fácil.</> },
    { p: '¿Qué días entregan?', r: <>Por ahora entregamos los jueves y sábados. El retiro es gratis en Palmital de Rivas.</> },
    { p: '¿Cuánto cuesta el envío?', r: <>Depende de la zona. Es gratis en San Isidro centro y alrededores. Las demás zonas tienen tarifas de referencia que te confirmamos por WhatsApp.</> },
    { p: '¿Cómo puedo pagar?', r: <>Por SINPE Móvil al {config.sinpe.numero} o en efectivo al recibir.</> },
    { p: '¿Qué son los productos bajo pedido?', r: <>Son productos que traemos para vos. Piden un adelanto del {config.adelantoPct} % por SINPE y llegan en {config.plazoBajoPedido}.</> },
    { p: '¿Cómo sigo mi pedido?', r: <>Entrá a <Link to="/seguimiento" className="font-bold text-brand-700 underline dark:text-brand-300">Seguimiento</Link> y buscá tu pedido.</> },
    { p: '¿Cómo los contacto?', r: <>Por <WaLink /> o al correo <a href={`mailto:${config.email}`} className="font-bold break-all text-brand-700 underline dark:text-brand-300">{config.email}</a>. Horario: {config.horario}.</> },
  ]
  return (
    <Pagina titulo="Ayuda" intro="Respuestas rápidas a las dudas más comunes.">
      <section className="mt-6">
        <h2 className="text-xl font-bold leading-tight text-ink">Preguntas frecuentes</h2>
        <div className="mt-3 space-y-2.5">
          {preguntas.map((q) => (
            <details key={q.p} className="group rounded-2xl bg-surface p-4 shadow-card ring-1 ring-line">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-bold text-ink">
                {q.p}
                <span aria-hidden="true" className="text-xl text-muted transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2 text-[15px] leading-relaxed text-ink">{q.r}</p>
            </details>
          ))}
        </div>
      </section>
    </Pagina>
  )
}
