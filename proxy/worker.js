// Cloudflare Worker de Mi Tiendita Digital (plan Workers Free, sin tarjeta).
//  - POST /chat      → chat de la tienda web (proxy a Groq; la clave vive solo aquí como secreto)
//  - GET/POST /whatsapp → agente de WhatsApp Cloud API (memoria en KV, pedidos, pasar a humano)
//  - /admin/api/*    → bandeja de Gabriel (protegida con el secreto ADMIN_KEY)
// El conocimiento (catálogo + políticas) sale de kb.json: node --experimental-strip-types scripts/build_kb.mjs
// Ver proxy/README.md para desplegar.
import kb from './kb.json' with { type: 'json' }
import { crearApp } from './src/app.js'

const app = crearApp(kb)

export default { fetch: (request, env, ctx) => app.fetch(request, env, ctx) }
