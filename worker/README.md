# worker/groq-proxy.js — IA opcional de Mi Tiendita Digital (NO desplegado)

La app funciona **sin IA** (asistente local por reglas + búsqueda en el catálogo, para clientes y admin).
Este Worker es solo para activar el **modo IA** (Groq, modelo `llama-3.1-8b-instant`). **Costo: ₡0**
(Cloudflare Workers Free: 100.000 solicitudes/día, sin tarjeta; Groq tiene capa gratis).

> ⚠️ La clave de Groq NUNCA va en la app ni en GitHub. Solo vive como secreto del Worker.
> ⚠️ Desplegar necesita el **OK de Gabriel** (crea una cuenta/recurso en Cloudflare).

## Pasos (cuando Gabriel dé el OK)
```bash
cd worker
npx wrangler login                     # cuenta Cloudflare (gratis)
npx wrangler secret put GROQ_API_KEY   # pegar la clave gsk_… de https://console.groq.com/keys
npx wrangler deploy                    # devuelve https://mi-tiendita-ia.<subdominio>.workers.dev
```
Luego, en la app:
```bash
echo "VITE_AI_PROXY_URL=https://mi-tiendita-ia.<subdominio>.workers.dev" > .env.local
npm run build   # y publicar dist/ en gh-pages
```

## Protecciones incluidas
- CORS solo para `ALLOWED_ORIGINS` (`https://jarojas2026.github.io`; agregar el dominio propio si se compra).
- Cuerpo ≤ 24 KB, ≤ 12 mensajes, `max_tokens` ≤ 512, modelo fijo del lado del servidor.
- 20 preguntas/minuto por IP. Solo deja pasar la herramienta `agregar_al_carrito`.

## Qué usa el modo IA
- Clientes: chat "Asistente Tiendita" (recomienda solo productos del catálogo, puede agregar al carrito).
- Admin: botón "✨ Mejorar con IA" en resumen del día, reabastecer y publicaciones para redes.
