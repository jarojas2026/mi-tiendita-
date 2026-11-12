# Mi Tiendita 🛒 — Rivas, Pérez Zeledón (v3)

App web (PWA) de pulpería y bazar: catálogo, carrito, cuentas de clientes, checkout con zona/fecha/franja
y **ubicación en mapa**, pedido por WhatsApp, historial con **Repetir pedido**, favoritos, recomendaciones,
**Asistente Tiendita** (chat) y panel de administración con mapa, ruta, clientes y reportes.
Hecha con Vite + React + TypeScript + Tailwind. Costo: **₡0** (todo en planes gratis, sin claves en el navegador).

## Novedades v3
- **Diseño nuevo, móvil primero**: identidad "Mi Tiendita · Rivas" (verde finca + tierra + acento mango),
  tipografías Fraunces + Plus Jakarta Sans empaquetadas con `@fontsource` (sin CDN), logo SVG, carrusel
  (Navidad / De nuestra finca / Útiles escolares), chips de categoría con íconos, tarjetas con skeleton,
  insignias *De la finca / Oferta / Bajo pedido*, estados vacíos ilustrados, **modo oscuro**, foco visible y
  etiquetas ARIA. Sección **Hecho en Pérez Zeledón** y pie con WhatsApp 8769-2109 y ubicación.
- **Búsqueda** con sugerencias instantáneas (búsqueda difusa con fuse.js, sin tildes, sinónimos ticos) y
  búsquedas recientes.
- **Geolocalización gratis** (Leaflet + OpenStreetMap, sin claves): "Usar mi ubicación", mapa para mover el
  pin, distancia a la tienda, zona y envío sugeridos por distancia, **envío gratis si el pin cae en San Isidro
  de El General** (radio configurable), enlaces Waze/Google Maps y link del pin en el WhatsApp.
- **Memoria**: historial con "Repetir pedido", favoritos (se sincronizan con la cuenta), vistos recientemente,
  "Comprados juntos" y "Para vos".
- **Asistente Tiendita**: modo local (sin servidor) o modo IA con un proxy gratuito (carpeta `proxy/`).
- **Admin**: Mapa del día (pins por estado + ruta por cercanía con enlaces de navegación), Ruta por zona,
  Clientes (ficha con pedidos, total gastado, última ubicación y notas privadas), Reportes (ventas por día,
  productos y zonas top, gráficos SVG livianos) y Asistente admin ("¿qué hay que pedir a S&F hoy?").
- **Rendimiento**: rutas, mapa y chat se descargan bajo demanda; imágenes *lazy*; service worker `mt-v3`
  guarda el catálogo y hasta 400 imágenes vistas para usar sin señal.

- **Sin claves de Firebase → MODO DEMO**: todo se guarda en el navegador (localStorage). Sirve para probar y
  para publicar ya en GitHub Pages, pero los pedidos NO llegan a ningún servidor (solo por el mensaje de WhatsApp).
- **Con claves → MODO FIREBASE**: cuentas reales (correo + Google), pedidos y perfiles en Firestore. Plan
  **Spark gratuito, sin tarjeta**.

## Configuración rápida (`src/config.ts`)

| Qué | Dónde |
|---|---|
| WhatsApp de pedidos | `whatsapp: '50687692109'` (+506 8769-2109) |
| SINPE Móvil | `sinpe.numero` — vacío = se muestra "número SINPE por confirmar" |
| Productos de la finca, precios, unidad (kg/paquete) y paso (0,5 kg) | `finca` |
| Zonas, tarifas y días de ruta | `zonas` |
| Franjas horarias | `franjas` |
| Categorías destacadas del inicio y banner "Regalos de Navidad" | `destacadas`, `banner` |
| Margen sobre el precio de la foto | `margenPct`, `redondeo` |
| **Ubicación de la tienda** (aprox. Palmital, cambiala por la exacta) | `tienda: { lat, lng }` |
| **Envío por distancia** (km → zona sugerida, tarifa opcional por tramo) | `envioTramos` |
| **Envío gratis por radio** (San Isidro de El General, 3 km) | `zonasGratisRadio` |
| Zona "San Isidro de El General (centro)" — gratis | `zonas` (id `san-isidro`) |
| Horario (asistente y pie de página) | `horario` |
| Carrusel del inicio | `banners` |
| Asistente con IA (URL del proxy, nunca una clave) | `.env.local` → `VITE_AI_PROXY_URL` |

> **Ubicación de la tienda**: hoy usa `9.4773, -83.6586`, el punto "Palmital" de OpenStreetMap (aproximado).
> Para poner el exacto: en Google Maps mantené presionado sobre la tienda, copiá las coordenadas y pegalas en
> `config.tienda`. San Isidro centro está en `9.373, -83.704` con radio de 3 km (`zonasGratisRadio`).

## Comandos

```bash
npm install
npm run dev        # desarrollo en http://localhost:5173
npm run build      # genera dist/ (lo que se publica)
python3 scripts/curar_catalogo.py      # oculta licencias/coleccionables/cuadros/>₡20.000 y renombra joyas
python3 scripts/export_meta_csv.py     # genera whatsapp/catalogo_meta.csv para Meta Commerce Manager
```

Si volvés a importar las fotos con `scripts/import_catalog.py`, corré después `curar_catalogo.py` y
`export_meta_csv.py` (el import reescribe `public/data/products.json`).

## Catálogo: ocultar y reactivar

`curar_catalogo.py` marca `"hidden": true` (con `"motivoOculto"`) en `public/data/products.json`. En la app,
**Admin › Productos › "Solo ocultos"** lista esos productos; desmarcá **Ocultar** y tocá **Guardar** para
reactivar uno. Ese ajuste se guarda como *override* (en modo demo, en el navegador; en Firebase, en
`productOverrides`).

---

## Activar el backend real (Firebase, gratis, sin tarjeta)

> Todo esto se hace con tu cuenta de Google en el navegador. No cuesta nada mientras te quedés en el plan
> **Spark** (no le pongás tarjeta ni lo subás a Blaze). Límites gratis de Firestore: 50.000 lecturas y
> 20.000 escrituras por día, 1 GiB guardado — de sobra para la tienda.

### 1. Crear el proyecto
1. Entrá a <https://console.firebase.google.com> e iniciá sesión con tu Gmail.
2. **Crear un proyecto** → nombre: `mi-tiendita` (o el que querás) → **Continuar**.
3. Google Analytics: **desactivalo** (no hace falta) → **Crear proyecto**.
4. Verificá abajo a la izquierda que diga **Plan Spark**. Si en algún momento te pide tarjeta, es porque estás
   por pasar a Blaze: **cancelá**.

### 2. Registrar la app web y copiar las claves
1. En la página del proyecto tocá el ícono **`</>` (Web)**.
2. Apodo: `tiendita-web`. **No** marqués "Firebase Hosting" todavía. → **Registrar app**.
3. Te muestra un bloque `firebaseConfig = { apiKey: ..., authDomain: ..., projectId: ..., ... }`.
4. En la carpeta del proyecto copiá `.env.example` como `.env.local` y pegá cada valor:
   ```
   VITE_FIREBASE_API_KEY=AIza...
   VITE_FIREBASE_AUTH_DOMAIN=mi-tiendita.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=mi-tiendita
   VITE_FIREBASE_STORAGE_BUCKET=mi-tiendita.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
   VITE_FIREBASE_APP_ID=1:1234567890:web:abc123
   ```
   Estas claves no son secretas (viajan al navegador); lo que protege los datos son las reglas del paso 4.

### 3. Activar Authentication (correo y Google)
1. Menú **Compilación › Authentication › Comenzar**.
2. Pestaña **Método de inicio de sesión**:
   - **Correo electrónico/contraseña** → Habilitar → Guardar.
   - **Google** → Habilitar → elegí tu correo de asistencia → Guardar.
3. Pestaña **Configuración › Dominios autorizados** → **Agregar dominio** → `jarojas2026.github.io`
   (y el dominio propio si luego usás uno). `localhost` y `<proyecto>.web.app` ya vienen.

### 4. Activar Firestore y poner las reglas
1. **Compilación › Firestore Database › Crear base de datos**.
2. Ubicación: `nam5 (United States)` (o la más cercana que ofrezca) → **Modo de producción** → Crear.
3. Pestaña **Reglas**: borrá lo que hay, pegá el contenido completo de `firestore.rules` → **Publicar**.
   (O con la CLI del paso 6: `firebase deploy --only firestore:rules`.)

### 5. Hacerte administrador
1. Entrá primero a la tienda con **Continuar con Google** usando tu correo (así queda verificado).
2. En Firestore › **Datos** → **Iniciar colección** → ID: `admins`.
3. ID del documento: tu correo **en minúsculas**, p. ej. `jarojas800@gmail.com`. Agregá un campo cualquiera
   (`nombre` = `Gabriel`) → Guardar. Repetí por cada admin (p. ej. `mycrtours@gmail.com`).
4. Cerrá sesión y volvé a entrar: aparece el botón **Admin**.
   > Si el admin usa correo y contraseña en vez de Google, tiene que verificar el correo (le llega un enlace al
   > registrarse); sin correo verificado las reglas no lo dejan entrar como admin.

### 6. Compilar y publicar
**Opción A — GitHub Pages (lo que ya usás):** `npm run build` y subí el contenido de `dist/` como siempre.
Las claves quedan dentro del build porque Vite lee `.env.local` al compilar.

**Opción B — Firebase Hosting (también gratis en Spark):**
```bash
npm install -g firebase-tools
firebase login
firebase use --add            # elegí tu proyecto (crea .firebaserc)
npm run build
firebase deploy               # sube dist/ + reglas de Firestore
```
Queda en `https://<proyecto>.web.app`.

### 7. Probar
Creá una cuenta de cliente, hacé un pedido de prueba, revisá que aparezca en **Mi cuenta › Historial** y en
**Admin › Pedidos**. En Firestore verás las colecciones `users`, `orders`, `clientNotes` (notas del admin) y
(si editás productos) `productOverrides`.

### 8. Índices (v3)
`firestore.indexes.json` trae índices para pedidos por cliente/fecha. Se suben con
`firebase deploy --only firestore:indexes` (o la consola los ofrece con un enlace si alguna consulta los pide).
Las reglas v3 aceptan: `favoritos` en el perfil, `lat`/`lng` en direcciones, `ubicacion` y `distanciaKm` en
pedidos (coordenadas validadas) y la colección `clientNotes/{uid}` (solo admin).

### Qué protegen las reglas (`firestore.rules`)
- Cada cliente lee/escribe **solo su perfil** y ve **solo sus pedidos**; puede crear pedidos a su nombre en
  estado `recibido`, pero no editarlos ni borrarlos.
- Solo un **admin** (documento en `/admins/{correo}` con correo verificado, o custom claim `admin: true`) ve
  todos los pedidos, cambia estados y edita productos.
- La colección `admins` solo se modifica desde la consola.
- `clientNotes` (notas privadas por cliente) solo la lee y escribe un admin.

---

## Asistente Tiendita (chat)

- **Modo local (por defecto, ₡0)**: entiende búsquedas, precios ("¿cuánto cuesta el cartón de huevos?"),
  regalos con presupuesto ("regalo para niña de 5 años por menos de ₡5.000"), envío, pago, horario y
  "¿cómo va mi pedido?". Responde con tarjetas y botón **Agregar**.
- **Modo IA (opcional, gratis)**: publicá el proxy de `proxy/` (Cloudflare Worker o Google Apps Script) con tu
  clave de Groq guardada **en el proxy**, y poné su URL en `VITE_AI_PROXY_URL`. Pasos en `proxy/README.md`.
  Si el proxy falla, el chat responde en modo local.
- **Admin › Asistente**: resume pedidos en modo local ("¿qué hay que pedir a S&F hoy?", "¿qué alisto de la finca?",
  "entregas de hoy", "¿cuánto vendimos hoy?").

## Mapas

Leaflet + tiles de OpenStreetMap (gratis, con atribución visible). Uso moderado de una tienda está dentro de la
política de uso de OSM; si algún día el tráfico crece mucho, se cambia `OSM_URL` en `src/map/leaflet-base.ts`
por otro proveedor gratuito.

---

## WhatsApp Business / Meta

`whatsapp/catalogo_meta.csv` (columnas `id,title,description,availability,condition,price,link,image_link,brand`)
se sube en **Meta Commerce Manager › Catálogo › Orígenes de datos › Agregar artículos › Carga de datos**.
Incluye solo productos visibles con precio. Las imágenes y enlaces apuntan a
`https://jarojas2026.github.io/mi-tiendita-/`, así que **primero publicá el sitio** para que Meta pueda leerlas.

## Prueba automática (modo demo)

```bash
npm run build
python3 scripts/e2e_demo.py      # requiere playwright para Python; capturas en screenshots/v3-*.png
```
La prueba simula la ubicación del cliente (geolocalización de Playwright en San Isidro → envío gratis), usa el
chat en modo local y agrega pedidos de ejemplo para ver el mapa, la ruta y los reportes del admin.
