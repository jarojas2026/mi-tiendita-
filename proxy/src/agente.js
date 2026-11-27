// Agente de WhatsApp: procesa UN mensaje entrante (se corre dentro de ctx.waitUntil).
import { buscar } from './kb.js'
import { llamarGroq } from './groq.js'
import { sistemaWhatsApp, TOOLS_WA } from './prompt.js'
import { agregarMsg, guardarConv, leerConv, marcarVisto } from './store.js'
import { toolBuscar, toolHumano, toolPedido } from './tools.js'
import { enviarTexto } from './wa.js'

export const RL_MINUTO = 8 // mensajes por minuto por número
export const RL_DIA = 120 // mensajes por día por número
const MAX_VUELTAS = 3

export const TXT_ERROR = 'Disculpá, en este momento tengo un problema técnico 🙏. Te paso con Gabriel y te responde por aquí apenas pueda.'
const TXT_RAPIDO = 'Vas muy rápido 🙂 Dame un momentito y seguimos.'

function txtMedia(conv, tipo) {
  const que = { image: 'tu imagen', audio: 'tu audio', video: 'tu video', document: 'tu documento', sticker: 'tu sticker' }[tipo] || 'tu archivo'
  if (conv.pedidos.length) return `¡Gracias! Recibí ${que} 🙌. Si es el comprobante del SINPE, Gabriel lo revisa y te confirma por aquí.`
  return `Por ahora solo puedo leer mensajes de texto 🙏. ¿Me lo escribís? Si preferís, te paso con Gabriel.`
}

/**
 * deps: { kb, indice, fetchFn?, ahora? }. Devuelve un resumen de lo que pasó (útil en tests y logs).
 */
export async function procesarMensaje(env, msg, deps) {
  const { kb, indice, fetchFn = fetch } = deps
  const ahora = deps.ahora ?? Date.now()
  const kv = env.CHATS
  const conv = await leerConv(kv, msg.de)
  if (!marcarVisto(conv, msg.id)) return { accion: 'duplicado' }

  // Rate limit por número (dentro del mismo registro: no gasta escrituras extra)
  conv.rl = [...(conv.rl || []).filter((t) => ahora - t < 86_400_000), ahora]
  const enMinuto = conv.rl.filter((t) => ahora - t < 60_000).length
  if (msg.nombre) conv.nombre = msg.nombre
  conv.ultimoCliente = ahora
  agregarMsg(conv, 'user', msg.tipo === 'media' ? `[${msg.media}]${msg.texto ? ' ' + msg.texto : ''}` : msg.tipo === 'otro' ? '[mensaje no compatible]' : msg.texto, ahora)

  const enviar = async (texto) => {
    try { await enviarTexto(env, msg.de, texto, fetchFn); agregarMsg(conv, 'assistant', texto, Date.now()) }
    catch (e) { console.error('envío WhatsApp falló', e.message); conv.atencion = true }
  }

  if (conv.rl.length > RL_DIA || enMinuto > RL_MINUTO) {
    if (enMinuto === RL_MINUTO + 1) await enviar(TXT_RAPIDO)
    await guardarConv(kv, conv, ahora)
    return { accion: 'limitado' }
  }
  if (conv.estado === 'humano') { conv.atencion = true; await guardarConv(kv, conv, ahora); return { accion: 'humano' } }
  if (msg.tipo !== 'texto' || !msg.texto.trim()) {
    if (msg.tipo === 'media') conv.atencion = true
    await enviar(txtMedia(conv, msg.media))
    await guardarConv(kv, conv, ahora)
    return { accion: 'media' }
  }

  let respuesta = '', accion = 'respuesta'
  try {
    // Productos relevantes: el mensaje actual + el anterior del cliente (para "¿y en azul?")
    const previos = conv.msgs.filter((m) => m.r === 'user').slice(-2).map((m) => m.t).join(' ')
    const relevantes = buscar(indice, msg.texto, 6)
    const extra = relevantes.length < 3 ? buscar(indice, previos, 4) : []
    const productos = [...new Map([...relevantes, ...extra].map((p) => [p.id, p])).values()].slice(0, 6)
    const messages = [
      { role: 'system', content: sistemaWhatsApp(kb, productos) },
      ...conv.msgs.map((m) => ({ role: m.r, content: m.t })),
    ]
    for (let vuelta = 0; vuelta < MAX_VUELTAS && !respuesta; vuelta++) {
      const ultima = vuelta === MAX_VUELTAS - 1
      const data = await llamarGroq(env, { messages, max_tokens: 350, ...(ultima ? {} : { tools: TOOLS_WA, tool_choice: 'auto' }) }, { fetchFn })
      const m = data.choices[0].message
      const calls = (m.tool_calls || []).slice(0, 3)
      if (!calls.length) { respuesta = (m.content || '').trim(); break }
      messages.push({ role: 'assistant', content: m.content || null, tool_calls: calls })
      for (const tc of calls) {
        let args = {}
        try { args = JSON.parse(tc.function?.arguments || '{}') } catch { /* argumentos inválidos */ }
        let salida = ''
        const nombre = tc.function?.name
        if (nombre === 'buscar_productos') salida = toolBuscar(kb, indice, args)
        else if (nombre === 'tomar_pedido') {
          const r = await toolPedido(kb, indice, kv, conv, args, ahora)
          if (r.ok) { respuesta = r.resumen; accion = r.repetido ? 'pedido-repetido' : 'pedido' } else salida = 'ERROR: ' + r.error
        } else if (nombre === 'pasar_a_humano') { respuesta = toolHumano(kb, conv, args); accion = 'humano' }
        else salida = 'Herramienta desconocida.'
        if (respuesta) break
        messages.push({ role: 'tool', tool_call_id: tc.id, content: salida.slice(0, 2500) })
      }
    }
    if (!respuesta) throw new Error('sin texto final')
  } catch (e) {
    console.error('IA falló', e.message)
    respuesta = TXT_ERROR
    conv.estado = 'humano'; conv.motivo = 'Error de la IA: ' + String(e.message).slice(0, 80); conv.atencion = true
    accion = 'error'
  }
  await enviar(respuesta.slice(0, 3500))
  await guardarConv(kv, conv, ahora)
  return { accion, respuesta }
}
