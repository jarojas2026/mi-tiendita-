// Proxy del "Asistente Tiendita" — Cloudflare Worker (plan gratis).
// Recibe la conversación desde la app (formato OpenAI chat completions) y la reenvía a Groq.
// La clave vive SOLO aquí, como secreto del Worker:  npx wrangler secret put GROQ_API_KEY
//
// Protecciones: CORS limitado a tu dominio, tamaño máximo del cuerpo, límite de mensajes/tokens,
// modelo fijo del lado del servidor y rate-limit básico por IP.

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MAX_BODY = 24 * 1024 // 24 KB
const MAX_MSGS = 12
const MAX_CHARS = 6000 // por mensaje (el de sistema trae el contexto de productos)
const RATE = { ventanaMs: 60_000, max: 20 } // 20 preguntas por minuto por IP (por instancia)
const golpes = new Map() // ip -> [timestamps]

function origenes(env) {
  return (env.ALLOWED_ORIGINS || 'https://jarojas2026.github.io').split(',').map((s) => s.trim()).filter(Boolean)
}

function cors(origin, env) {
  const ok = origenes(env).includes(origin)
  return {
    'Access-Control-Allow-Origin': ok ? origin : 'null',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

const json = (data, status, headers) => new Response(JSON.stringify(data), { status, headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' } })

function limitar(ip) {
  const ahora = Date.now()
  const lista = (golpes.get(ip) || []).filter((t) => ahora - t < RATE.ventanaMs)
  lista.push(ahora)
  golpes.set(ip, lista)
  if (golpes.size > 5000) golpes.clear() // evitar crecer sin límite
  return lista.length > RATE.max
}

/** Solo deja pasar lo que la app necesita. */
function sanear(body, env) {
  if (!body || !Array.isArray(body.messages)) throw new Error('Falta messages')
  const messages = body.messages.slice(-MAX_MSGS).map((m, i) => {
    const role = ['system', 'user', 'assistant'].includes(m.role) ? m.role : 'user'
    if (role === 'system' && i !== 0) return { role: 'user', content: String(m.content || '').slice(0, MAX_CHARS) }
    return { role, content: String(m.content || '').slice(0, MAX_CHARS) }
  })
  const tools = Array.isArray(body.tools) ? body.tools.filter((t) => t?.function?.name === 'agregar_al_carrito').slice(0, 1) : undefined
  return {
    model: env.MODEL || 'llama-3.1-8b-instant',
    messages,
    temperature: Math.min(Math.max(Number(body.temperature) || 0.4, 0), 1),
    max_tokens: Math.min(Number(body.max_tokens) || 400, 512),
    ...(tools && tools.length ? { tools, tool_choice: 'auto' } : {}),
  }
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || ''
    const h = cors(origin, env)
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: h })
    if (request.method !== 'POST') return json({ error: 'Usá POST' }, 405, h)
    if (!origenes(env).includes(origin)) return json({ error: 'Origen no permitido' }, 403, h)
    if (!env.GROQ_API_KEY) return json({ error: 'Falta el secreto GROQ_API_KEY' }, 500, h)

    const ip = request.headers.get('CF-Connecting-IP') || 'anon'
    if (limitar(ip)) return json({ error: 'Demasiadas preguntas. Esperá un minuto.' }, 429, h)

    const largo = Number(request.headers.get('Content-Length') || 0)
    if (largo > MAX_BODY) return json({ error: 'Mensaje demasiado grande' }, 413, h)
    const texto = await request.text()
    if (texto.length > MAX_BODY) return json({ error: 'Mensaje demasiado grande' }, 413, h)

    let payload
    try { payload = sanear(JSON.parse(texto), env) } catch (e) { return json({ error: 'JSON inválido: ' + e.message }, 400, h) }

    const r = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await r.text()
    // No reenviar detalles internos de error de Groq al navegador
    if (!r.ok) return json({ error: 'El servicio de IA no respondió', status: r.status }, 502, h)
    return new Response(data, { status: 200, headers: { ...h, 'Content-Type': 'application/json; charset=utf-8' } })
  },
}
