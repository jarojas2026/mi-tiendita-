# Agente de IA de Mi Tiendita Digital — web + WhatsApp (Cloudflare Worker, gratis)

Un solo **Cloudflare Worker** (plan Workers Free, sin tarjeta) hace tres cosas:

| Ruta | Qué hace |
|---|---|
| `POST /chat` | Chat de la tienda web (proxy a Groq). La app lo usa con `VITE_AI_PROXY_URL`. `POST /` también sirve (compatibilidad). |
| `GET/POST /whatsapp` | Webhook de **WhatsApp Cloud API**: verifica a Meta, valida la firma, responde 200 rápido y contesta con IA. |
| `/admin/api/*` | **Bandeja de Gabriel** (clave `ADMIN_KEY`): ver chats y pedidos, responder como humano, devolver el chat al bot. La pantalla está en la tienda: **Admin › 📱 WhatsApp**. |

La tienda funciona **sin esto** (modo local). Las claves **nunca** van en la app ni en GitHub: viven como secretos del Worker.

## Qué hace el agente de WhatsApp
- Responde en español de Costa Rica, cálido y breve. **Nunca inventa** precios, stock ni medidas: si no sabe, dice "consultá con nosotros" y ofrece pasarte con Gabriel.
- Conoce el catálogo (`kb.json`: id, nombre, precio en ₡, categoría y link a la ficha `#/p/<id>`) y las políticas de `src/config.ts` (envío gratis de lanzamiento, entregas jueves y sábado, cambios solo por defecto de fábrica, SINPE, horario). Busca por palabras clave **en el Worker** y solo le pasa a Groq los productos relevantes (≈1.000 tokens por mensaje).
- Herramientas: `buscar_productos`, `tomar_pedido` (guarda el pedido en KV y le manda al cliente el resumen con las instrucciones de SINPE; bajo pedido = adelanto 50 %; **no confirma stock**) y `pasar_a_humano` (el bot se calla en ese chat hasta que Gabriel lo libere).
- Huevos y productos de la finca: no van en el catálogo de Meta, pero sí se piden por chat y en la web.
- Imágenes/audios: respuesta amable ("por ahora solo leo texto"); si el cliente ya hizo un pedido, se asume posible comprobante y se marca para Gabriel.
- Si Groq falla: "te paso con Gabriel" y el chat queda marcado 🔴 en la bandeja.
- Memoria por número en KV: últimos 12 mensajes, 7 días. Pedidos: 90 días.
- Protecciones: firma `X-Hub-Signature-256`, dedup por id de mensaje, 8 mensajes/min y 120/día por número, 20 preguntas/min por IP en el chat web, cuerpo ≤ 24 KB (web) / 64 KB (webhook), CORS solo para la tienda.

**Límites gratis de Cloudflare KV:** 100.000 lecturas y **1.000 escrituras por día**. Cada mensaje entrante hace 1 escritura (≈ 500–900 mensajes/día). De sobra para empezar.

---

## Paso 1 — Cloudflare (Windows con Git Bash)
Necesitás Node 22+ (`node -v`). Abrí **Git Bash** en la carpeta del proyecto:

```bash
cd proxy
npx wrangler login                              # abre el navegador: entrá o creá la cuenta gratis de Cloudflare
npx wrangler kv namespace create CHATS          # copiá el "id" que te devuelve
```
Abrí `proxy/wrangler.toml` y cambiá `PEGAR_AQUI_EL_ID_DEL_KV` por ese id.

Secretos (cada comando te pide pegar el valor; no se ve en pantalla):
```bash
npx wrangler secret put GROQ_API_KEY        # clave gsk_… de https://console.groq.com/keys
npx wrangler secret put ADMIN_KEY           # tu clave de la bandeja (mín. 16 caracteres). Generala con:  openssl rand -hex 24
npx wrangler secret put WA_VERIFY_TOKEN     # una palabra secreta inventada para Meta. Generala con:  openssl rand -hex 16
# Estos tres salen de Meta (Paso 2). Si todavía no los tenés, cargalos después:
npx wrangler secret put WA_TOKEN            # token permanente del usuario del sistema
npx wrangler secret put WA_APP_SECRET       # "Clave secreta de la app" (Configuración de la app › Básica)
npx wrangler secret put WA_PHONE_NUMBER_ID  # "Identificador del número de teléfono" (WhatsApp › Configuración de la API)
```
Guardá `ADMIN_KEY` y `WA_VERIFY_TOKEN` en un lugar seguro (los vas a ocupar).

Publicar:
```bash
cd ..
node --experimental-strip-types scripts/build_kb.mjs   # regenera proxy/kb.json desde el catálogo y config.ts
cd proxy
npx wrangler deploy                         # te da la URL: https://tiendita-ia.<tu-subdominio>.workers.dev
curl -s https://tiendita-ia.<tu-subdominio>.workers.dev/      # debe decir {"ok":true,...}
```
> Cada vez que cambiés productos o `src/config.ts`: corré `build_kb.mjs` y `npx wrangler deploy` otra vez.

### Conectar la tienda web
En la raíz del proyecto, archivo `.env.local`:
```
VITE_AI_PROXY_URL=https://tiendita-ia.<tu-subdominio>.workers.dev
```
Luego `npm run build` y `firebase deploy --only hosting`. El chat de la tienda dirá "Con IA" y en **Admin › 📱 WhatsApp** pegás tu `ADMIN_KEY` (queda guardada solo en ese navegador).

## Paso 2 — Meta (WhatsApp Cloud API)
> ⚠️ **El número 8769-2109 deja de funcionar en la app WhatsApp Business** cuando se registra en la API (los chats pasan a la bandeja de la tienda). **Antes**, en la app: *Configuración › Chats › Copia de seguridad* y exportá los chats importantes. Si al registrar Meta te ofrece "conectar tu app de WhatsApp Business existente" (coexistencia), leé bien qué conserva antes de aceptar.

1. Entrá a <https://developers.facebook.com> con la cuenta de Facebook del negocio → **Mis apps › Crear app** → tipo **Empresa (Business)** → elegí el portafolio **Mi Tiendita Digital**.
2. En la app: **Agregar producto › WhatsApp › Configurar**.
3. **WhatsApp › Configuración de la API › Agregar número de teléfono**: nombre visible "Mi Tiendita Digital", categoría, número **+506 8769-2109** (antes eliminá la cuenta en la app WhatsApp Business del cel: *Configuración › Cuenta › Eliminar cuenta*, después del respaldo). Verificá con el código por SMS o llamada.
4. Copiá el **Identificador del número de teléfono** → `npx wrangler secret put WA_PHONE_NUMBER_ID`.
5. **Clave secreta de la app**: *Configuración de la app › Básica › Clave secreta* → **Mostrar** → `npx wrangler secret put WA_APP_SECRET`.
6. **Token permanente** (el temporal vence en 24 h): <https://business.facebook.com/settings> → **Usuarios › Usuarios del sistema › Agregar** (rol Administrador) → **Asignar activos**: la app (control total) y la cuenta de WhatsApp → **Generar token** → elegí la app, vencimiento **Nunca**, permisos `whatsapp_business_messaging` y `whatsapp_business_management` → copiá → `npx wrangler secret put WA_TOKEN`.
7. **Webhook**: en la app, **WhatsApp › Configuración › Webhook › Editar**:
   - URL de devolución de llamada: `https://tiendita-ia.<tu-subdominio>.workers.dev/whatsapp`
   - Token de verificación: el mismo `WA_VERIFY_TOKEN` → **Verificar y guardar**.
   - En **Campos del webhook**, suscribite a **messages**.
8. Publicá la app (modo **Activo**) y escribile al 8769-2109 desde otro celular: debe contestar el bot y aparecer el chat en **Admin › 📱 WhatsApp**.
9. Volvé a desplegar si cargaste secretos nuevos: `npx wrangler deploy`.

**Costo de Meta:** según lo revisado por Gabriel, desde octubre de 2026 hay **1.000 respuestas de servicio gratis al mes por número**; después se cobran y Meta pide un método de pago. Revisá la tabla vigente en <https://developers.facebook.com/docs/whatsapp/pricing> antes de pasar ese volumen. Las respuestas de Gabriel desde la bandeja solo se pueden mandar **dentro de las 24 h** desde el último mensaje del cliente (fuera de esa ventana Meta exige plantillas aprobadas).

## Probar
```bash
URL=https://tiendita-ia.<tu-subdominio>.workers.dev
curl -s "$URL/whatsapp?hub.mode=subscribe&hub.verify_token=<WA_VERIFY_TOKEN>&hub.challenge=123"   # → 123
curl -s -X POST "$URL/chat" -H 'Origin: https://mi-tiendita-digital-b9835.web.app' -H 'Content-Type: text/plain' \
  -d '{"messages":[{"role":"user","content":"Hola, ¿tienen huevos?"}]}'
curl -s "$URL/admin/api/convs" -H "Authorization: Bearer <ADMIN_KEY>"
```
Logs en vivo: `npx wrangler tail`.

### En local (sin gastar ni tocar Meta)
Creá `proxy/.dev.vars` (está en `.gitignore`) con valores de prueba y, si querés simular Groq/Meta, `GROQ_URL` y `GRAPH_BASE` apuntando a un servidor falso local. Luego `npx wrangler dev`. Las pruebas automáticas: `npm test` (tests/worker.test.mjs).

## Configuración (`wrangler.toml`)
- `ALLOWED_ORIGINS`: dominios del chat web (Firebase Hosting `.web.app` y `.firebaseapp.com`, y GitHub Pages).
- `MODEL`: `llama-3.1-8b-instant` por defecto (≈8.000 tokens/min gratis). `openai/gpt-oss-120b` también funcionó. Modelos vigentes: <https://console.groq.com/docs/models>.
- `GRAPH_VERSION`: versión de la Graph API de Meta (`v23.0`).

## Opción B — Google Apps Script (solo chat web, sin WhatsApp)
`Code.gs` sigue sirviendo como proxy del chat web: <https://script.google.com> → pegá `Code.gs` → propiedad `GROQ_API_KEY` → implementar como aplicación web → `VITE_AI_PROXY_URL=<url que termina en /exec>`.
