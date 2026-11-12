// "Asistente Tiendita" — MODO LLM: habla con TU proxy (Cloudflare Worker o Google Apps Script),
// que guarda la clave de Groq como secreto. El navegador NUNCA ve ninguna clave.
// Formato: OpenAI Chat Completions (lo entiende Groq). Ver /proxy/README.md
import { config, sinpeTexto } from '../config'
import { colones } from '../lib/format'
import { buscar } from '../lib/search'
import { regalos } from './local'
import type { Product } from '../types'

export interface ChatMsg { role: 'system' | 'user' | 'assistant'; content: string }

export interface LlmResultado { texto: string; productos: Product[]; agregados: { p: Product; qty: number }[] }

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'agregar_al_carrito',
      description: 'Agrega un producto del catálogo al carrito del cliente. Usalo solo si el cliente lo pide claramente.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'id exacto del producto (de la lista de productos relevantes)' },
          cantidad: { type: 'number', description: 'cantidad (unidades, o kg para queso/natilla; mínimo 0.5)' },
        },
        required: ['id'],
      },
    },
  },
]

const sistema = (productos: Product[]) => `Sos "Asistente Tiendita", el asistente de ${config.storeName}, pulpería y bazar digital de Pérez Zeledón, Costa Rica (retiro en Palmital de Rivas).
Hablás español de Costa Rica con voseo, cálido y breve (máx. 4 frases). Precios en colones con formato ₡4.000.
Datos de la tienda:
- Horario: ${config.horario}. WhatsApp: ${config.whatsappVisible}.
- Pago: ${sinpeTexto()} o efectivo contra entrega. Bajo pedido: adelanto ${config.adelantoPct}% y llega en ${config.plazoBajoPedido}.
- Zonas de envío: ${config.zonas.map((z) => `${z.nombre} (${z.tarifa == null ? 'cotizar' : z.tarifa === 0 ? 'gratis' : colones(z.tarifa)})`).join('; ')}. Envío GRATIS en San Isidro de El General centro.
- Productos de finca (Huevos Palmital cartón de 15 o bolsa de 20 a ₡1.500, queso, natilla, leche) siempre en tienda.
Reglas: recomendá SOLO productos de la lista; nunca inventes precios ni productos. Si no está, sugerí escribir por WhatsApp.
Mencioná el id entre corchetes así [id] cuando recomiendes un producto, para que la app muestre la tarjeta.
Productos relevantes (JSON):
${JSON.stringify(productos.map((p) => ({ id: p.id, nombre: p.nombre, precio: p.precio, unidad: p.venta === 'kg' ? 'kg' : p.unidad ?? 'unidad', disponibilidad: p.disponibilidad, categoria: p.categoria })))}`

/** Contexto: productos relevantes al último mensaje (búsqueda local + ideas de regalo). */
export function contextoProductos(products: Product[], q: string) {
  const a = buscar(products, q, 10)
  const b = /regal|obsequi|navidad|cumple/i.test(q) ? regalos(products, q, 6).productos : []
  const fin = products.filter((p) => p.finca)
  const all = [...a, ...b, ...fin]
  return [...new Map(all.map((p) => [p.id, p])).values()].slice(0, 18)
}

export async function preguntarLLM(historial: ChatMsg[], products: Product[], byId: Record<string, Product>, onAdd: (id: string, qty: number) => void): Promise<LlmResultado> {
  const ultima = [...historial].reverse().find((m) => m.role === 'user')?.content ?? ''
  const ctx = contextoProductos(products, ultima)
  const body = {
    model: 'llama-3.1-8b-instant', // el proxy puede forzar otro modelo vigente
    temperature: 0.4,
    max_tokens: 400,
    messages: [{ role: 'system', content: sistema(ctx) }, ...historial.slice(-8)],
    tools: TOOLS,
    tool_choice: 'auto',
  }
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), 20000)
  let data: { choices?: { message?: { content?: string | null; tool_calls?: { function: { name: string; arguments: string } }[] } }[]; error?: unknown }
  try {
    const r = await fetch(config.aiProxyUrl, {
      method: 'POST',
      // text/plain evita el "preflight" CORS (necesario para Google Apps Script)
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
      signal: ctl.signal,
    })
    if (!r.ok) throw new Error(`Proxy respondió ${r.status}`)
    data = await r.json()
  } finally { clearTimeout(timer) }
  const msg = data.choices?.[0]?.message
  if (!msg) throw new Error('Respuesta vacía del proxy')

  const agregados: LlmResultado['agregados'] = []
  for (const tc of msg.tool_calls ?? []) {
    if (tc.function?.name !== 'agregar_al_carrito') continue
    try {
      const a = JSON.parse(tc.function.arguments || '{}') as { id?: string; cantidad?: number }
      const p = a.id ? byId[a.id] : undefined
      if (!p || p.oculto || p.disponibilidad === 'Agotado') continue
      const qty = Math.max(p.paso ?? 1, Math.min(50, Number(a.cantidad) || 1))
      onAdd(p.id, qty); agregados.push({ p, qty })
    } catch { /* argumentos inválidos */ }
  }
  let texto = (msg.content ?? '').trim()
  const ids = [...texto.matchAll(/\[([a-z0-9-]+)\]/g)].map((m) => m[1])
  const productos = ids.map((id) => byId[id]).filter((p): p is Product => !!p && !p.oculto)
  texto = texto.replace(/\s*\[([a-z0-9-]+)\]/g, '')
  if (!texto && agregados.length) texto = `Listo, agregué ${agregados.map((x) => x.p.nombre).join(', ')} al carrito. 🛒`
  return { texto: texto || 'Perdón, no te entendí. ¿Me lo decís de otra forma?', productos: [...new Map(productos.map((p) => [p.id, p])).values()].slice(0, 6), agregados }
}

/** v4: texto libre con el LLM vía el proxy (sin herramientas). Lo usa el asistente del admin. */
export async function llmTexto(sistemaTxt: string, pedido: string, maxTokens = 450): Promise<string> {
  if (!config.aiProxyUrl) throw new Error('Modo IA apagado: falta VITE_AI_PROXY_URL')
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), 20000)
  try {
    const r = await fetch(config.aiProxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ temperature: 0.6, max_tokens: maxTokens, messages: [{ role: 'system', content: sistemaTxt }, { role: 'user', content: pedido.slice(0, 5500) }] }),
      signal: ctl.signal,
    })
    if (!r.ok) throw new Error(`Proxy respondió ${r.status}`)
    const d = (await r.json()) as { choices?: { message?: { content?: string } }[] }
    return (d.choices?.[0]?.message?.content ?? '').trim() || 'Sin respuesta.'
  } finally { clearTimeout(timer) }
}
