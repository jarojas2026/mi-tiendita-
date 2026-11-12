// "Asistente Tiendita" — MODO LOCAL: funciona sin servidor ni claves.
// Entiende intenciones comunes en español tico con reglas + búsqueda difusa sobre el catálogo.
import { config, sinpeTexto } from '../config'
import { colones, fechaLarga, norm } from '../lib/format'
import { buscar } from '../lib/search'
import type { Order, Product, SessionUser } from '../types'

export interface Respuesta {
  texto: string
  productos?: Product[]
  acciones?: { label: string; to?: string; href?: string; evento?: string }[]
  intent?: string
}

export interface Contexto {
  products: Product[]
  misPedidos: Order[]
  user: SessionUser | null
}

const STOP = new Set(('quiero busco buscando ocupo necesito tienen tenes tiene hay venden vende un una unos unas de del para el la los las lo me mi '
  + 'por favor precio precios cuanto cuesta cuestan vale valen algo algun alguna que cual cuales con sin y o a en al es son mas menos hasta '
  + 'colones mil barato barata baratos baratas regalo regalos regalar ver mostrame muestrame dame agrega agregame agregar carrito porfa hola '
  + 'buenas buenos dias tardes noches tienda ustedes usted vos tenga anos ano edad nina nino ninas ninos bebe mujer hombre mama papa '
  + 'senora senor amiga amigo novia novio esposa esposo hija hijo sobrina sobrino tia tio abuela abuelo').split(/\s+/))

const tiene = (t: string, ...ws: string[]) => ws.some((w) => new RegExp(`(^|\\s)${w}`).test(t))

/** "menos de ₡5.000", "hasta 5 mil", "5000 colones", "de 3000" → número */
export function presupuesto(q: string): number | null {
  const t = norm(q).replace(/₡/g, ' ')
  // Recorre todos los números y se queda con el primero que parezca dinero (>= ₡100)
  const re = /(\d{1,3}(?:[.,\s]\d{3})+|\d+)\s*(mil|k)?(?!\s*anos?)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(t))) {
    let n = Number(m[1].replace(/[.,\s]/g, ''))
    if (m[2]) n *= 1000
    if (n >= 100) return n
  }
  return null
}

const edad = (t: string) => { const m = t.match(/(\d{1,2})\s*anos?/); return m ? Number(m[1]) : null }

type Perfil = { cats: string[]; boost: string[]; etiqueta: string }
function destinatario(t: string): Perfil {
  const e = edad(t)
  if (tiene(t, 'bebe', 'recien nacid') || (e != null && e <= 2)) return { etiqueta: 'un bebé', cats: ['bebe', 'juguetes'], boost: ['sonajero', 'mordedor', 'peluche', 'bebe', 'musical'] }
  if (tiene(t, 'nina', 'chiquita', 'hija', 'sobrina', 'nieta')) return { etiqueta: e ? `una niña de ${e} años` : 'una niña', cats: e && e >= 10 ? ['belleza', 'joyeria-acero', 'medias', 'bultos-y-loncheras', 'llaveros', 'juguetes'] : ['juguetes', 'medias', 'bultos-y-loncheras', 'fiesta', 'llaveros', 'disfraces'], boost: ['muneca', 'unicornio', 'princesa', 'rosa', 'peluche', 'cocina', 'maquillaje', 'pulsera', 'slime', 'sirena', 'kit', 'cartera'] }
  if (tiene(t, 'nino', 'chiquito', 'hijo', 'sobrino', 'nieto', 'carajillo', 'chamaco')) return { etiqueta: e ? `un niño de ${e} años` : 'un niño', cats: e && e >= 10 ? ['consolas', 'audifonos', 'gorras-y-sombreros', 'juguetes', 'bultos-y-loncheras'] : ['juguetes', 'medias', 'bultos-y-loncheras', 'disfraces'], boost: ['carro', 'dinosaurio', 'pelota', 'robot', 'bloques', 'pista', 'control', 'avion', 'camion', 'pistola de agua', 'heroe'] }
  if (tiene(t, 'mama', 'mujer', 'esposa', 'novia', 'senora', 'abuela', 'tia', 'amiga', 'suegra')) return { etiqueta: 'ella', cats: ['belleza', 'joyeria-acero', 'bolsos', 'difusores', 'botellas-y-termos', 'medias', 'cocina'], boost: ['set', 'pulsera', 'collar', 'difusor', 'termo', 'bolso', 'aretes'] }
  if (tiene(t, 'papa', 'hombre', 'esposo', 'novio', 'senor', 'abuelo', 'tio', 'amigo', 'suegro')) return { etiqueta: 'él', cats: ['audifonos', 'relojes-inteligentes', 'botellas-y-termos', 'gorras-y-sombreros', 'parlantes', 'lentes', 'cables-y-cargadores'], boost: ['reloj', 'audifonos', 'parlante', 'termo', 'gorra', 'billetera'] }
  return { etiqueta: 'esa persona especial', cats: ['juguetes', 'audifonos', 'medias', 'botellas-y-termos', 'belleza', 'iluminacion', 'parlantes'], boost: ['set', 'kit', 'regalo'] }
}

const hashDia = (s: string) => { let h = Math.floor(Date.now() / 86400000); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h >>> 0 }

export function regalos(products: Product[], q: string, n = 6) {
  const t = norm(q)
  const max = presupuesto(q)
  const per = destinatario(t)
  const lista = products
    .filter((p) => !p.oculto && !p.finca && p.precio != null && (max == null || p.precio <= max) && per.cats.includes(p.categoriaId))
    .map((p) => {
      const nn = norm(p.nombre)
      const s = per.boost.reduce((a, w) => a + (nn.includes(w) ? 3 : 0), 0) + (per.cats.length - per.cats.indexOf(p.categoriaId)) * 0.3 + (hashDia(p.id) % 100) / 100
      return { p, s }
    })
    .sort((a, b) => b.s - a.s)
  // Variedad: máximo 2 por categoría
  const out: Product[] = []
  const porCat = new Map<string, number>()
  for (const { p } of lista) {
    const c = porCat.get(p.categoriaId) ?? 0
    if (c >= 2) continue
    porCat.set(p.categoriaId, c + 1); out.push(p)
    if (out.length >= n) break
  }
  return { productos: out, max, per }
}

const terminos = (q: string) => norm(q).replace(/[^a-z0-9ñ\s]/g, ' ').split(/\s+/).filter((w) => w && !STOP.has(w) && !/^\d+$/.test(w)).join(' ')

export function responderLocal(qRaw: string, ctx: Contexto): Respuesta {
  const q = qRaw.trim()
  const t = norm(q).replace(/[¿?¡!.,]/g, ' ').replace(/\s+/g, ' ').trim()
  const { products, misPedidos, user } = ctx

  if (!t) return { texto: '¿En qué te ayudo? 🙂' }

  // ---- Estado de mi pedido ----
  if (tiene(t, 'mi pedido', 'mis pedidos', 'estado', 'donde esta', 'donde viene', 'ya viene', 'cuando llega', 'rastrear', 'seguimiento')) {
    if (!user) return { intent: 'pedido', texto: 'Para ver el estado de tu pedido, iniciá sesión con la cuenta con que lo hiciste.', acciones: [{ label: 'Iniciar sesión', to: '/entrar?next=/cuenta/pedidos' }] }
    const o = misPedidos[0]
    if (!o) return { intent: 'pedido', texto: 'Todavía no veo pedidos en tu cuenta. ¿Te ayudo a buscar algo?', acciones: [{ label: 'Ver catálogo', to: '/catalogo' }] }
    const extra = misPedidos.length > 1 ? ` Tenés ${misPedidos.length} pedidos en total.` : ''
    return {
      intent: 'pedido',
      texto: `Tu último pedido **${o.codigo}** está **${o.estado}**. Entrega: ${fechaLarga(o.fecha)}, ${o.franja}, en ${o.zonaNombre}. Total ${colones(o.total)}.${extra}`,
      acciones: [{ label: 'Ver detalle', to: `/cuenta/pedidos/${o.id}` }, { label: 'Escribir por WhatsApp', href: `https://wa.me/${config.whatsapp}?text=${encodeURIComponent(`Hola, consulto por mi pedido ${o.codigo}`)}` }],
    }
  }

  // ---- Horario ----
  if (tiene(t, 'horario', 'abren', 'abierto', 'cierran', 'cerrado', 'a que hora', 'que hora', 'atienden')) {
    return { intent: 'horario', texto: `🕒 ${config.horario}. Las entregas son en estas franjas: ${config.franjas.join(' · ')}.` }
  }

  // ---- Envío / zonas ----
  if (tiene(t, 'envio', 'envios', 'entrega', 'entregan', 'llevan', 'domicilio', 'express', 'zona', 'zonas', 'san isidro', 'gratis', 'retiro', 'retirar', 'recoger', 'ubicacion', 'donde quedan', 'donde estan')) {
    const zonas = config.zonas.map((z) => `• ${z.nombre}: ${z.tarifa == null ? 'por cotizar' : z.tarifa === 0 ? 'GRATIS' : colones(z.tarifa)}`).join('\n')
    return {
      intent: 'envio',
      texto: `🚚 Entregamos por zonas desde Palmital de Rivas:\n${zonas}\n\n🎉 **Envío gratis en San Isidro de El General (centro).** En el checkout podés tocar "Usar mi ubicación" y te calculo la zona y el envío por distancia.`,
      acciones: [{ label: 'Abrir ubicación de la tienda', href: `https://www.google.com/maps/search/?api=1&query=${config.tienda.lat},${config.tienda.lng}` }],
    }
  }

  // ---- Pago ----
  if (tiene(t, 'sinpe', 'pago', 'pagar', 'pagos', 'efectivo', 'tarjeta', 'transferencia', 'adelanto')) {
    return { intent: 'pago', texto: `💳 Podés pagar con ${sinpeTexto()} o en efectivo contra entrega. Los productos **bajo pedido** llevan un adelanto del ${config.adelantoPct}% por SINPE y tardan ${config.plazoBajoPedido}. Por ahora no recibimos tarjeta.` }
  }

  // ---- Bajo pedido ----
  if (tiene(t, 'bajo pedido', 'cuanto tarda', 'cuanto dura', 'cuando llega', 'demora')) {
    return { intent: 'bajo-pedido', texto: `📦 Lo "bajo pedido" se trae del proveedor en ${config.plazoBajoPedido}, con ${config.adelantoPct}% de adelanto. Lo de la finca (huevos, queso, natilla, leche) está en tienda.` }
  }

  // ---- Contacto ----
  if (tiene(t, 'whatsapp', 'telefono', 'numero', 'contacto', 'llamar', 'hablar con')) {
    return { intent: 'contacto', texto: `📲 Escribinos al WhatsApp ${config.whatsappVisible}. ¡Con gusto te atendemos!`, acciones: [{ label: 'Abrir WhatsApp', href: `https://wa.me/${config.whatsapp}` }] }
  }

  // ---- Regalos ----
  if (tiene(t, 'regalo', 'regalar', 'obsequio', 'detalle para', 'sorpresa', 'navidad', 'cumple')) {
    const { productos, max, per } = regalos(products, q)
    if (!productos.length) return { intent: 'regalo', texto: `No encontré regalos para ${per.etiqueta}${max ? ` por menos de ${colones(max)}` : ''}. ¿Subimos un poco el presupuesto?`, acciones: [{ label: 'Ver juguetes', to: '/catalogo?dest=juguetes' }] }
    return { intent: 'regalo', texto: `🎁 Ideas de regalo para ${per.etiqueta}${max ? ` por menos de ${colones(max)}` : ''}:`, productos, acciones: [{ label: 'Ver más regalos', to: `/catalogo?dest=juguetes${max ? `&max=${max}` : ''}` }] }
  }

  // ---- Saludo / gracias ----
  if (/^(hola|buenas|buenos dias|buenas tardes|buenas noches|pura vida|upe|hey)\b/.test(t) && t.split(' ').length <= 4) {
    return { intent: 'saludo', texto: `¡Hola! 👋 Soy el Asistente Tiendita. Te ayudo a encontrar productos, ver precios, calcular el envío o saber cómo va tu pedido. ¿Qué andás buscando?` }
  }
  if (/^(gracias|muchas gracias|tuanis|perfecto|listo|ok|dale)\b/.test(t)) return { intent: 'gracias', texto: '¡Con mucho gusto! 🌱 Cualquier cosa aquí estoy.' }

  // ---- Búsqueda de productos (con o sin presupuesto) ----
  const max = presupuesto(q)
  const qProd = terminos(q)
  if (qProd) {
    let res = buscar(products, qProd, 40)
    if (max != null) res = res.filter((p) => p.precio != null && p.precio <= max)
    if (tiene(t, 'barato', 'barata', 'economico', 'mas barato')) res = [...res].sort((a, b) => (a.precio ?? 1e9) - (b.precio ?? 1e9))
    if (res.length) {
      const precioQ = tiene(t, 'cuanto', 'precio', 'vale', 'cuesta')
      const p0 = res[0]
      const texto = precioQ && res.length
        ? `El **${p0.nombre}** está en **${colones(p0.precio)}${p0.venta === 'kg' ? ' por kg' : ''}** (${p0.disponibilidad.toLowerCase()}).${res.length > 1 ? ' También te puede servir:' : ''}`
        : `Encontré ${res.length > 6 ? 'varias opciones' : res.length === 1 ? 'esto' : 'estas opciones'} para “${qProd}”${max ? ` por menos de ${colones(max)}` : ''}:`
      return { intent: 'buscar', texto, productos: res.slice(0, 6), acciones: res.length > 6 ? [{ label: `Ver los ${res.length}+ resultados`, to: `/catalogo?q=${encodeURIComponent(qProd)}${max ? `&max=${max}` : ''}` }] : undefined }
    }
    return { intent: 'sin-resultados', texto: `No encontré “${qProd}”${max ? ` por menos de ${colones(max)}` : ''} en el catálogo. Podés preguntarnos por WhatsApp: a veces lo conseguimos bajo pedido.`, acciones: [{ label: 'Preguntar por WhatsApp', href: `https://wa.me/${config.whatsapp}?text=${encodeURIComponent(`Hola, ¿tienen ${qProd}?`)}` }] }
  }

  return { intent: 'ayuda', texto: 'Puedo ayudarte con: buscar productos y precios, ideas de regalo con presupuesto, envío y zonas, formas de pago, horario y el estado de tu pedido. Probá: “regalo para niña de 5 años por menos de ₡5.000”.' }
}

export const SUGERENCIAS = ['Regalo para niña de 5 años por menos de ₡5.000', '¿Cuánto cuesta el cartón de huevos?', 'Audífonos baratos', '¿Hacen envíos a San Isidro?', '¿Cómo va mi pedido?', '¿Cuál es el horario?']
