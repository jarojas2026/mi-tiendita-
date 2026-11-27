// Pruebas del Worker (proxy/): webhook de WhatsApp, firma, parseo, herramientas y bandeja.
// Sin red: Groq, la Graph API de Meta y el KV están simulados.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { crearApp } from '../proxy/src/app.js'
import { buscar, indexar } from '../proxy/src/kb.js'
import { firmaValida, parsearMensajes } from '../proxy/src/wa.js'
import { toolPedido } from '../proxy/src/tools.js'
import { nuevaConv } from '../proxy/src/store.js'

const kb = JSON.parse(readFileSync(new URL('../proxy/kb.json', import.meta.url), 'utf8'))
const ORIGEN = 'https://mi-tiendita-digital-b9835.web.app'

class KVFalso {
  constructor() { this.m = new Map() }
  async get(k, tipo) { const v = this.m.get(k); return v == null ? null : tipo === 'json' ? JSON.parse(v.valor) : v.valor }
  async put(k, valor, o = {}) { this.m.set(k, { valor, metadata: o.metadata }) }
  async list({ prefix }) { return { keys: [...this.m].filter(([k]) => k.startsWith(prefix)).map(([name, v]) => ({ name, metadata: v.metadata })) } }
}

/** fetch simulado: respuestas de Groq en cola; guarda lo que se manda a Meta. */
function fetchFalso(respuestasGroq) {
  const enviados = [], aGroq = []
  const fn = async (url, init) => {
    if (String(url).includes('api.groq.com')) {
      aGroq.push(JSON.parse(init.body))
      const r = respuestasGroq.shift()
      if (r instanceof Response) return r
      return new Response(JSON.stringify({ choices: [{ message: r }] }), { status: 200 })
    }
    if (String(url).includes('graph.facebook.com')) {
      enviados.push(JSON.parse(init.body))
      return new Response(JSON.stringify({ messages: [{ id: 'wamid.out' }] }), { status: 200 })
    }
    throw new Error('URL inesperada ' + url)
  }
  return { fn, enviados, aGroq }
}

const env = (extra = {}) => ({ GROQ_API_KEY: 'gsk_prueba', WA_TOKEN: 'tok', WA_APP_SECRET: 'secreto-app', WA_VERIFY_TOKEN: 'verificame', WA_PHONE_NUMBER_ID: '123', ADMIN_KEY: 'clave-admin-larga-123', ALLOWED_ORIGINS: ORIGEN, CHATS: new KVFalso(), ...extra })
const ctxFalso = () => { const ps = []; return { waitUntil: (p) => ps.push(p), listo: () => Promise.all(ps) } }

const payloadTexto = (id, texto, de = '50688887777') => ({
  object: 'whatsapp_business_account',
  entry: [{ changes: [{ field: 'messages', value: { metadata: { phone_number_id: '123' }, contacts: [{ wa_id: de, profile: { name: 'María Pérez' } }], messages: [{ id, from: de, timestamp: '1764000000', type: 'text', text: { body: texto } }] } }] }],
})
const firmar = (cuerpo, secreto = 'secreto-app') => 'sha256=' + createHmac('sha256', secreto).update(cuerpo).digest('hex')
const postWA = (obj, firma) => { const c = JSON.stringify(obj); return new Request('https://w.dev/whatsapp', { method: 'POST', body: c, headers: { 'X-Hub-Signature-256': firma ?? firmar(c), 'Content-Type': 'application/json' } }) }

test('verificación del webhook: token correcto devuelve el challenge', async () => {
  const app = crearApp(kb)
  const ok = await app.fetch(new Request('https://w.dev/whatsapp?hub.mode=subscribe&hub.verify_token=verificame&hub.challenge=42'), env(), ctxFalso())
  assert.equal(ok.status, 200); assert.equal(await ok.text(), '42')
  const mal = await app.fetch(new Request('https://w.dev/whatsapp?hub.mode=subscribe&hub.verify_token=otro&hub.challenge=42'), env(), ctxFalso())
  assert.equal(mal.status, 403)
})

test('firma X-Hub-Signature-256', async () => {
  const cuerpo = '{"hola":"mundo ñ"}'
  const bytes = new TextEncoder().encode(cuerpo)
  assert.equal(await firmaValida(bytes, firmar(cuerpo), 'secreto-app'), true)
  assert.equal(await firmaValida(bytes, firmar(cuerpo, 'otro'), 'secreto-app'), false)
  assert.equal(await firmaValida(bytes, '', 'secreto-app'), false)
  const app = crearApp(kb)
  const r = await app.fetch(postWA(payloadTexto('m1', 'hola'), 'sha256=00'), env(), ctxFalso())
  assert.equal(r.status, 401)
})

test('parseo: texto, botones, media; ignora statuses y otro número', () => {
  const p = payloadTexto('m1', 'Hola')
  p.entry[0].changes[0].value.messages.push({ id: 'm2', from: '50688887777', type: 'image', image: { caption: 'comprobante' } })
  p.entry.push({ changes: [{ field: 'messages', value: { metadata: { phone_number_id: '123' }, statuses: [{ id: 'x' }] } }] })
  p.entry.push({ changes: [{ field: 'messages', value: { metadata: { phone_number_id: '999' }, messages: [{ id: 'm3', from: '1', type: 'text', text: { body: 'x' } }] } }] })
  const ms = parsearMensajes(p, '123')
  assert.equal(ms.length, 2)
  assert.deepEqual([ms[0].tipo, ms[0].texto, ms[0].nombre], ['texto', 'Hola', 'María Pérez'])
  assert.deepEqual([ms[1].tipo, ms[1].media, ms[1].texto], ['media', 'image', 'comprobante'])
})

test('búsqueda por palabras clave: huevos sí, arroz no pega con carro', () => {
  const ind = indexar(kb)
  assert.ok(buscar(ind, '¿tienen huevos?').some((p) => p.id.startsWith('finca-huevos')))
  assert.ok(!buscar(ind, 'arroz').some((p) => /carro/i.test(p.nombre)))
  assert.deepEqual(buscar(ind, 'hola buenas'), [])
})

test('mensaje de texto: responde 200, llama a Groq con productos relevantes y contesta por Meta', async () => {
  const f = fetchFalso([{ content: '¡Hola María! Tenemos huevos Palmital, cartón de 30 a ₡2.500.' }])
  const app = crearApp(kb, { fetchFn: f.fn })
  const e = env(), ctx = ctxFalso()
  const r = await app.fetch(postWA(payloadTexto('wamid.1', '¿Tienen huevos?')), e, ctx)
  assert.equal(r.status, 200)
  await ctx.listo()
  assert.equal(f.enviados.length, 1)
  assert.equal(f.enviados[0].to, '50688887777')
  assert.match(f.enviados[0].text.body, /huevos/i)
  assert.match(f.aGroq[0].messages[0].content, /finca-huevos-30/) // solo productos relevantes en el prompt
  assert.ok(f.aGroq[0].messages[0].content.length < 9000)
  const conv = await e.CHATS.get('conv:50688887777', 'json')
  assert.equal(conv.msgs.length, 2)
  assert.equal(conv.nombre, 'María Pérez')
  // Duplicado (Meta reintenta): no se responde dos veces
  const ctx2 = ctxFalso()
  await crearApp(kb, { fetchFn: f.fn }).fetch(postWA(payloadTexto('wamid.1', '¿Tienen huevos?')), e, ctx2)
  await ctx2.listo()
  assert.equal(f.enviados.length, 1)
})

test('tools: buscar_productos y luego tomar_pedido guarda en KV y manda resumen con SINPE', async () => {
  const f = fetchFalso([
    { content: null, tool_calls: [{ id: 't1', type: 'function', function: { name: 'buscar_productos', arguments: '{"consulta":"huevos"}' } }] },
    { content: null, tool_calls: [{ id: 't2', type: 'function', function: { name: 'tomar_pedido', arguments: JSON.stringify({ items: [{ id: 'finca-huevos-30', cantidad: 2 }], nombre: 'María Pérez', zona: 'Palmital', direccion: '200 m sur de la escuela', pago: 'sinpe' }) } }] },
  ])
  const app = crearApp(kb, { fetchFn: f.fn })
  const e = env(), ctx = ctxFalso()
  await app.fetch(postWA(payloadTexto('wamid.2', 'Quiero 2 cartones de 30 huevos, soy María, Palmital, 200 m sur de la escuela, pago SINPE')), e, ctx)
  await ctx.listo()
  assert.equal(f.aGroq.length, 2)
  assert.equal(f.aGroq[1].messages.at(-1).role, 'tool')
  assert.match(f.aGroq[1].messages.at(-1).content, /finca-huevos/)
  const body = f.enviados[0].text.body
  assert.match(body, /WA-\d{6}-/)
  assert.match(body, /₡5\.000/)
  assert.match(body, /8769-2109/)
  assert.match(body, /Envío:\* gratis/)
  const pedidos = [...e.CHATS.m.keys()].filter((k) => k.startsWith('pedido:'))
  assert.equal(pedidos.length, 1)
})

test('tomar_pedido no acepta ids inventados ni datos faltantes; bajo pedido pide adelanto 50%', async () => {
  const ind = indexar(kb), kv = new KVFalso(), conv = nuevaConv('506')
  const malo = await toolPedido(kb, ind, kv, conv, { items: [{ id: 'inventado', cantidad: 1 }], nombre: 'A', zona: 'B', direccion: 'C', pago: 'sinpe' })
  assert.equal(malo.ok, false); assert.match(malo.error, /no existen/)
  const falta = await toolPedido(kb, ind, kv, conv, { items: [{ id: 'finca-leche', cantidad: 1 }], nombre: 'Ana', pago: 'efectivo' })
  assert.equal(falta.ok, false); assert.match(falta.error, /zona/)
  const bp = kb.productos.find((p) => p[4] === 'Bajo pedido' && p[2] === 10000) || kb.productos.find((p) => p[4] === 'Bajo pedido' && p[2])
  const ok = await toolPedido(kb, ind, kv, conv, { items: [{ id: bp[0], cantidad: 1 }], nombre: 'Ana', zona: 'Rivas', direccion: 'Centro', pago: 'efectivo' })
  assert.equal(ok.ok, true)
  assert.equal(ok.pedido.adelanto, Math.ceil(bp[2] / 2 / 50) * 50)
  assert.match(ok.resumen, /adelanto del 50%/)
})

test('pasar_a_humano: el bot deja de contestar en esa conversación', async () => {
  const f = fetchFalso([{ content: null, tool_calls: [{ id: 'h', type: 'function', function: { name: 'pasar_a_humano', arguments: '{"motivo":"reclamo"}' } }] }])
  const app = crearApp(kb, { fetchFn: f.fn })
  const e = env()
  let ctx = ctxFalso()
  await app.fetch(postWA(payloadTexto('wamid.3', 'Quiero hablar con una persona')), e, ctx); await ctx.listo()
  assert.match(f.enviados[0].text.body, /Gabriel/)
  ctx = ctxFalso()
  await app.fetch(postWA(payloadTexto('wamid.4', '¿hola?')), e, ctx); await ctx.listo()
  assert.equal(f.enviados.length, 1) // no contestó
  assert.equal(f.aGroq.length, 1)
})

test('si Groq falla: respaldo "te paso con Gabriel"', async () => {
  const f = fetchFalso([new Response('{}', { status: 500 }), new Response('{}', { status: 500 })])
  const app = crearApp(kb, { fetchFn: f.fn })
  const e = env(), ctx = ctxFalso()
  await app.fetch(postWA(payloadTexto('wamid.5', 'precio de audífonos')), e, ctx); await ctx.listo()
  assert.match(f.enviados[0].text.body, /Te paso con Gabriel/)
  assert.equal((await e.CHATS.get('conv:50688887777', 'json')).estado, 'humano')
})

test('imagen: respaldo amable sin llamar a Groq', async () => {
  const f = fetchFalso([])
  const p = payloadTexto('wamid.6', '')
  p.entry[0].changes[0].value.messages[0] = { id: 'wamid.6', from: '50688887777', type: 'audio', audio: {} }
  const ctx = ctxFalso()
  await crearApp(kb, { fetchFn: f.fn }).fetch(postWA(p), env(), ctx); await ctx.listo()
  assert.match(f.enviados[0].text.body, /solo puedo leer mensajes de texto/)
})

test('bandeja admin: requiere clave, lista, responde como humano y devuelve al bot', async () => {
  const f = fetchFalso([{ content: 'Hola' }])
  const app = crearApp(kb, { fetchFn: f.fn })
  const e = env(), ctx = ctxFalso()
  await app.fetch(postWA(payloadTexto('wamid.7', 'hola')), e, ctx); await ctx.listo()
  const req = (ruta, init = {}, clave = e.ADMIN_KEY) => app.fetch(new Request('https://w.dev/admin/api' + ruta, { ...init, headers: { Authorization: 'Bearer ' + clave, 'Content-Type': 'application/json' } }), e, ctxFalso())
  assert.equal((await req('/convs', {}, 'mala')).status, 401)
  const convs = await (await req('/convs')).json()
  assert.equal(convs.convs[0].id, '50688887777')
  const r = await req('/responder', { method: 'POST', body: JSON.stringify({ wa: '50688887777', texto: 'Hola, soy Gabriel' }) })
  assert.equal(r.status, 200)
  assert.equal(f.enviados.at(-1).text.body, 'Hola, soy Gabriel')
  let c = (await (await req('/conv?wa=50688887777')).json()).conv
  assert.equal(c.estado, 'humano'); assert.equal(c.ventanaAbierta, true)
  await req('/estado', { method: 'POST', body: JSON.stringify({ wa: '50688887777', estado: 'bot' }) })
  c = (await (await req('/conv?wa=50688887777')).json()).conv
  assert.equal(c.estado, 'bot')
})

test('chat web: CORS para Firebase Hosting y políticas agregadas al sistema', async () => {
  const f = fetchFalso([{ content: 'Hola' }])
  const app = crearApp(kb, { fetchFn: f.fn })
  const body = JSON.stringify({ messages: [{ role: 'system', content: 'Sos el asistente' }, { role: 'user', content: 'hola' }], tools: [{ type: 'function', function: { name: 'agregar_al_carrito' } }, { type: 'function', function: { name: 'otra' } }] })
  const r = await app.fetch(new Request('https://w.dev/chat', { method: 'POST', body, headers: { Origin: ORIGEN } }), env(), ctxFalso())
  assert.equal(r.status, 200)
  assert.equal(r.headers.get('Access-Control-Allow-Origin'), ORIGEN)
  assert.match(f.aGroq[0].messages[0].content, /Envío GRATIS/)
  assert.equal(f.aGroq[0].tools.length, 1)
  const otro = await app.fetch(new Request('https://w.dev/chat', { method: 'POST', body, headers: { Origin: 'https://malo.com' } }), env(), ctxFalso())
  assert.equal(otro.status, 403)
})

test('wrangler.toml permite los dominios de Firebase Hosting', () => {
  const t = readFileSync(new URL('../proxy/wrangler.toml', import.meta.url), 'utf8')
  assert.match(t, /mi-tiendita-digital-b9835\.web\.app/)
  assert.match(t, /mi-tiendita-digital-b9835\.firebaseapp\.com/)
  assert.match(t, /binding = "CHATS"/)
})
