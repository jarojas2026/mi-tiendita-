// Rutas del Worker. Se arma con el conocimiento (kb) para poder probarlo sin Cloudflare.
//   POST /chat (y POST / por compatibilidad) → chat web (proxy a Groq)
//   GET  /whatsapp → verificación del webhook de Meta
//   POST /whatsapp → mensajes entrantes (responde 200 rápido y procesa con ctx.waitUntil)
//   /admin/api/*   → bandeja de Gabriel (ADMIN_KEY)
import { indexar } from './kb.js'
import { llamarGroq } from './groq.js'
import { extraWeb } from './prompt.js'
import { firmaValida, parsearMensajes, verificarWebhook } from './wa.js'
import { procesarMensaje } from './agente.js'
import { autorizado, rutaAdmin } from './admin.js'

const MAX_BODY_CHAT = 24 * 1024
const MAX_BODY_WA = 64 * 1024
const MAX_MSGS = 12
const MAX_CHARS = 6000
const RATE_IP = { ventanaMs: 60_000, chat: 20, admin: 30 }

const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' } })

export function crearApp(kb, opciones = {}) {
  const fetchFn = opciones.fetchFn || ((...a) => fetch(...a))
  const indice = indexar(kb)
  const golpes = new Map() // "tipo:ip" -> [timestamps] (por instancia; suficiente como freno)
  const vistos = new Set() // dedup rápida en memoria (la definitiva vive en KV)

  const limitar = (clave, max) => {
    const ahora = Date.now()
    const lista = (golpes.get(clave) || []).filter((t) => ahora - t < RATE_IP.ventanaMs)
    lista.push(ahora)
    golpes.set(clave, lista)
    if (golpes.size > 5000) golpes.clear()
    return lista.length > max
  }
  const origenes = (env) => (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean)
  const cors = (origin, env) => ({
    'Access-Control-Allow-Origin': origenes(env).includes(origin) ? origin : 'null',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  })

  async function leerTexto(request, max) {
    if (Number(request.headers.get('Content-Length') || 0) > max) return null
    const t = await request.text()
    return t.length > max ? null : t
  }

  /** Chat web: igual que antes + políticas vigentes del servidor + reintento ante 429. */
  async function chat(request, env, h) {
    const origin = request.headers.get('Origin') || ''
    if (!origenes(env).includes(origin)) return json({ error: 'Origen no permitido' }, 403, h)
    const ip = request.headers.get('CF-Connecting-IP') || 'anon'
    if (limitar('chat:' + ip, RATE_IP.chat)) return json({ error: 'Demasiadas preguntas. Esperá un minuto.' }, 429, h)
    const texto = await leerTexto(request, MAX_BODY_CHAT)
    if (texto == null) return json({ error: 'Mensaje demasiado grande' }, 413, h)
    let body
    try { body = JSON.parse(texto) } catch { return json({ error: 'JSON inválido' }, 400, h) }
    if (!body || !Array.isArray(body.messages) || !body.messages.length) return json({ error: 'Falta messages' }, 400, h)
    const tools = Array.isArray(body.tools) ? body.tools.filter((t) => t?.function?.name === 'agregar_al_carrito').slice(0, 1) : []
    const messages = body.messages.slice(-MAX_MSGS).map((m, i) => {
      const role = ['system', 'user', 'assistant'].includes(m?.role) ? m.role : 'user'
      let content = String(m?.content || '').slice(0, MAX_CHARS)
      if (role === 'system' && i !== 0) return { role: 'user', content }
      if (role === 'system' && tools.length) content += extraWeb(kb) // solo el chat de clientes
      return { role, content }
    })
    try {
      const data = await llamarGroq(env, {
        messages,
        temperature: Math.min(Math.max(Number(body.temperature) || 0.4, 0), 1),
        max_tokens: Math.min(Number(body.max_tokens) || 400, 512),
        ...(tools.length ? { tools, tool_choice: 'auto' } : {}),
      }, { fetchFn, timeoutMs: 15000 })
      return json(data, 200, h)
    } catch (e) {
      // No reenviar detalles internos de Groq al navegador; la app cae al modo local
      return json({ error: 'El servicio de IA no respondió', status: e.status || 502 }, 502, h)
    }
  }

  async function whatsapp(request, env, ctx) {
    if (Number(request.headers.get('Content-Length') || 0) > MAX_BODY_WA) return new Response('Muy grande', { status: 413 })
    const bytes = new Uint8Array(await request.arrayBuffer()) // la firma se calcula sobre los bytes crudos
    if (bytes.length > MAX_BODY_WA) return new Response('Muy grande', { status: 413 })
    const crudo = new TextDecoder().decode(bytes)
    if (!(await firmaValida(bytes, request.headers.get('X-Hub-Signature-256'), env.WA_APP_SECRET))) return new Response('Firma inválida', { status: 401 })
    let body
    try { body = JSON.parse(crudo) } catch { return new Response('JSON inválido', { status: 400 }) }
    const msgs = parsearMensajes(body, env.WA_PHONE_NUMBER_ID).filter((m) => {
      if (vistos.has(m.id)) return false
      vistos.add(m.id)
      if (vistos.size > 2000) vistos.clear()
      return true
    })
    if (msgs.length && env.CHATS) {
      // Uno por uno (en orden) para no pisar la conversación en KV
      ctx.waitUntil((async () => {
        for (const m of msgs.slice(0, 10)) {
          try { await procesarMensaje(env, m, { kb, indice, fetchFn }) } catch (e) { console.error('procesarMensaje', e.message) }
        }
      })())
    }
    return new Response('EVENT_RECEIVED', { status: 200 })
  }

  return {
    indice,
    async fetch(request, env, ctx) {
      const url = new URL(request.url)
      const origin = request.headers.get('Origin') || ''
      const h = cors(origin, env)
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: h })
      try {
        if (url.pathname === '/whatsapp') {
          if (request.method === 'GET') return verificarWebhook(url, env)
          if (request.method === 'POST') return await whatsapp(request, env, ctx)
          return new Response('Método no permitido', { status: 405 })
        }
        if (url.pathname.startsWith('/admin/api/')) {
          const ip = request.headers.get('CF-Connecting-IP') || 'anon'
          if (limitar('admin:' + ip, RATE_IP.admin)) return json({ error: 'Demasiados intentos' }, 429, h)
          if (!env.CHATS) return json({ error: 'Falta el KV CHATS' }, 500, h)
          if (!autorizado(request, env)) return json({ error: 'Clave incorrecta' }, 401, h)
          const [st, datos] = await rutaAdmin(request, env, url, fetchFn)
          return json(datos, st, h)
        }
        if (request.method === 'POST' && (url.pathname === '/chat' || url.pathname === '/')) return await chat(request, env, h)
        if (request.method === 'GET' && url.pathname === '/') return json({ ok: true, servicio: 'La Tiendita de Jade IA', productos: indice.length, kb: kb.generado }, 200, h)
        return json({ error: 'No encontrado' }, 404, h)
      } catch (e) {
        console.error('Error', e?.message)
        return json({ error: 'Error interno: ' + String(e?.message || e).slice(0, 120) }, 500, h)
      }
    },
  }
}
