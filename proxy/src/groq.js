// Cliente de Groq (formato OpenAI chat completions) con tiempo límite y un reintento si hay 429/5xx.
export const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

export class ErrorIA extends Error {
  constructor(msg, status) { super(msg); this.status = status }
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Llama a Groq. payload = { messages, tools?, max_tokens?, temperature? }.
 * El modelo lo fija el servidor (env.MODEL). Lanza ErrorIA si no hay respuesta útil.
 */
export async function llamarGroq(env, payload, { fetchFn = fetch, timeoutMs = 20000, reintentos = 1 } = {}) {
  if (!env.GROQ_API_KEY) throw new ErrorIA('Falta el secreto GROQ_API_KEY', 500)
  const body = JSON.stringify({ model: env.MODEL || 'llama-3.1-8b-instant', temperature: 0.4, max_tokens: 400, ...payload })
  for (let intento = 0; ; intento++) {
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), timeoutMs)
    let r
    try {
      r = await fetchFn(env.GROQ_URL || GROQ_URL, { method: 'POST', headers: { Authorization: `Bearer ${env.GROQ_API_KEY}`, 'Content-Type': 'application/json' }, body, signal: ctl.signal })
    } catch (e) {
      clearTimeout(timer)
      if (intento < reintentos) { await dormir(800); continue }
      throw new ErrorIA('Groq no respondió: ' + (e?.name === 'AbortError' ? 'tiempo agotado' : e?.message), 504)
    }
    clearTimeout(timer)
    if (r.ok) {
      const data = await r.json()
      if (!data?.choices?.[0]?.message) throw new ErrorIA('Respuesta vacía de Groq', 502)
      return data
    }
    // 429 (límite de tokens/min) o 5xx: un reintento corto
    if ((r.status === 429 || r.status >= 500) && intento < reintentos) {
      const espera = Math.min(Number(r.headers.get('retry-after')) || 2, 5) * 1000
      await dormir(espera)
      continue
    }
    throw new ErrorIA('Groq respondió ' + r.status, r.status)
  }
}
