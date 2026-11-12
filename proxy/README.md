# Proxy del Asistente Tiendita (IA con Groq) — gratis

La app funciona **sin esto** (modo local: reglas + búsqueda en el catálogo). Si querés respuestas con IA,
publicá UNO de estos dos proxies y poné su URL en la app. **La clave de Groq nunca va en la app**: solo
en el proxy. El proxy reenvía la conversación a Groq en formato OpenAI *chat completions* (modelo
`llama-3.1-8b-instant`, o el vigente que elijás) e incluye la herramienta `agregar_al_carrito`.

## 0. Clave de Groq (gratis)
1. Entrá a <https://console.groq.com> → **API Keys** → **Create API Key**. Copiala (empieza con `gsk_`).
2. Revisá el modelo vigente en <https://console.groq.com/docs/models> (si `llama-3.1-8b-instant` se retira,
   cambiá `MODEL` en `wrangler.toml` o `MODELO` en `Code.gs`).

## Opción A — Cloudflare Worker (recomendado: CORS limitado a tu dominio)
Plan **Workers Free** (100.000 solicitudes/día). No pide tarjeta.
```bash
cd proxy
npx wrangler login                 # abre el navegador con tu cuenta de Cloudflare
npx wrangler secret put GROQ_API_KEY   # pegá la clave gsk_… (queda cifrada en Cloudflare)
npx wrangler deploy                # te da la URL: https://tiendita-ia.<tu-subdominio>.workers.dev
```
- `ALLOWED_ORIGINS` (en `wrangler.toml`) = `https://jarojas2026.github.io`. Solo ese dominio puede usarlo.
- Límites: cuerpo ≤ 24 KB, ≤ 12 mensajes, `max_tokens` ≤ 512, 20 preguntas/minuto por IP, modelo fijo.

## Opción B — Google Apps Script (sin tarjeta, solo con tu Gmail)
1. <https://script.google.com> → **Nuevo proyecto** → pegá `Code.gs`.
2. ⚙️ **Configuración del proyecto › Propiedades del script** → `GROQ_API_KEY` = tu clave.
3. **Implementar › Nueva implementación › Aplicación web** → Ejecutar como **Yo**, acceso **Cualquier usuario** →
   autorizá → copiá la URL que termina en `/exec`.
- Apps Script no permite restringir CORS por dominio; tiene rate-limit global (30/min) y límites de tamaño.

## Conectar la app
En `.env.local` (o en las variables del build de GitHub Actions):
```
VITE_AI_PROXY_URL=https://tiendita-ia.<tu-subdominio>.workers.dev
```
`npm run build` y publicá. El chat dirá "Con IA". Si el proxy falla, responde solo en modo local.

## Probar el proxy
```bash
curl -s -X POST "$URL" -H 'Origin: https://jarojas2026.github.io' -H 'Content-Type: text/plain' \
  -d '{"messages":[{"role":"user","content":"Hola, ¿tienen huevos?"}]}'
```
