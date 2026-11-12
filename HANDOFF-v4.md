# HANDOFF v5 — Mi Tiendita Digital (actualizado 2026-11-06)

**En vivo:** https://jarojas2026.github.io/mi-tiendita-/ (repo `jarojas2026/mi-tiendita-`, rama `gh-pages` = `dist/` + `.nojekyll`).
**Modo:** FIREBASE ENCENDIDO (proyecto `mi-tiendita-digital-b9835`, plan Spark $0: Auth + Firestore; sin Storage ni Functions).
Config web pública por defecto en `src/config.ts` (se puede sobreescribir con `VITE_FIREBASE_*`; `VITE_MODO=demo` fuerza demo).
**No tocar:** repos `CostaRicaTours2026` ni `costaricatours`.

## ⚠️ Falta 1 paso de Gabriel
Firestore está en modo producción BLOQUEADO hasta pegar `firestore.rules` (Consola › Firestore › Reglas › Publicar).
Mientras tanto: catálogo/ajustes usan los valores de `config.ts`; un pedido que no se pueda guardar en la nube se guarda
en el teléfono del cliente (`local: true`) y **igual sale por WhatsApp**; el admin muestra el error de permisos.

## Hecho en v5
1. **Firebase activo**: Google sign-in para clientes + **compra sin cuenta (nombre + teléfono)** que se mantiene. Correo/contraseña
   sigue detrás de un enlace (solo funciona si se habilita ese proveedor en Firebase).
2. **Firestore** (`src/services/backend/firebase.ts`):
   - `orders/{id}`: cliente con cuenta crea/lee los suyos (`userId = uid`); invitado crea con `userId ''`, `guest: true`.
   - `tracking/{orderId}_{token}`: copia pública mínima (sin teléfono/dirección/ubicación), se crea en el MISMO lote que el pedido
     (las reglas lo validan con `getAfter`). Enlace de seguimiento: `#/pedido/:id?t=token` → funciona en cualquier dispositivo.
   - `products/{id}`: ajustes del admin (precio, nombre, oferta, ocultar, **stock**). `settings/tienda`: zonas/tarifas, franjas, horario, umbral stock.
   - Admins = correos fijos en las reglas y en `config.adminEmails`: jarojas800@gmail.com, pulperiaybazardigital@gmail.com (Google, correo verificado).
     Ya no se usa la colección `/admins`.
3. **Admin**: pedidos **en vivo** (onSnapshot; "● en vivo"), cambio de estado con hora en `historial` + `actualizado`,
   **stock se descuenta solo al marcar "entregado"** (transacción, una vez: `stockDescontado`), **plantillas WhatsApp por estado**
   (💬 en Tablero y Lista; `src/lib/whatsapp.ts`), **Resumen del día** (ver/copiar/enviar por WhatsApp), **alerta de stock bajo**,
   nueva pestaña **⚙️ Ajustes** (zonas, tarifas, marca *Provisional*, activa, días de ruta, franjas, horario, umbral) → `settings/tienda`.
4. **Estructura**: `src/services/{auth,orders,products,settings,local}.ts` (lo que usan las páginas) y `src/services/backend/{api,demo,firebase}.ts`
   (antes `src/data/`). Tipos nuevos en `src/types.ts` (`ZonaCfg`, `Ajustes`, campos v5 del pedido). `src/pages/admin/{Ajustes,comun}.tsx`.
5. Respaldo: si Firebase no carga → modo demo; si falla un pedido → guardado local + WhatsApp; ajustes/overrides → valores por defecto.
6. `firestore.indexes.json` vacío (no hace falta índice compuesto). Service worker `mt-v5`. `scripts/e2e_demo.py`: estados renombrados (sigue siendo de v3 en lo demás).

## Verificación
- `npm run build` OK (tsc 0 errores, oxlint 0 errores). Deploy a gh-pages y curl 200 de la URL, del chunk de Firebase y de la config.
- Conexión real con Firestore probada desde Node: responde `permission-denied` (esperado hasta publicar reglas).
- NO probado en navegador headless (sin Chromium) ni con el emulador de reglas (sin Java). Probar a mano tras publicar reglas:
  pedido sin cuenta, pedido con Google, seguimiento desde otro teléfono, admin en vivo, entregar → baja stock, Ajustes guardar.

## Pendiente / necesita OK de Gabriel
- **Publicar `firestore.rules`** (texto completo en el archivo). Sin eso nada se guarda en la nube.
- **Tarifas PROVISIONALES** (distritos de PZ) → ahora se confirman desde Admin › Ajustes (quitar "Provisional" y Guardar).
- Titular del SINPE 8769-2109, ubicación exacta de la tienda (`config.tienda`).
- Pedidos de invitado: cualquiera puede crearlos (validados por reglas, sin límite de frecuencia). Si llega spam: App Check (gratis) o pedir Google.
- El asistente IA local aún lee zonas/horario de `config.ts`, no de `settings/tienda`.
- Al pasar un pedido entregado a cancelado NO se devuelve el stock (hacerlo a mano).
- Worker de IA, dominio propio, fotos de queso/natilla/leche (igual que v4).

## Cómo continuar
```bash
cd work/app-tiendita && npm install && npm run build
# publicar: tar de dist/ a /tmp (el disco del workspace es lento), clonar gh-pages en /tmp, reemplazar, .nojekyll, commit, push
```

---

# (Histórico) HANDOFF v4 — Mi Tiendita Digital (actualizado 2026-11-06)

**En vivo:** https://jarojas2026.github.io/mi-tiendita-/ (repo `jarojas2026/mi-tiendita-`, rama `gh-pages` = `dist/` + `.nojekyll`; la rama `main` solo tiene README).
**Modo:** DEMO (localStorage). Firebase listo en código pero APAGADO (sin `VITE_FIREBASE_*`). Costo: $0.
**No tocar:** repos `CostaRicaTours2026` ni `costaricatours`.

## Hecho en v4
1. **Marca "Mi Tiendita Digital"**: `config.storeName`, logo (Logo en `src/components/icons.tsx`: "Mi Tiendita / Digital · Pérez Zeledón"),
   `<title>`, meta/OG/Twitter, JSON-LD ConvenienceStore, `manifest.webmanifest` (nombre, id, shortcuts), service worker `mt-v4`,
   pie con WhatsApp 8769-2109, correo pulperiaybazardigital@gmail.com, SINPE 8769-2109 y botón de Facebook
   (https://www.facebook.com/profile.php?id=61596021703093). Nueva imagen para compartir `public/og-image.jpg` (foto de gallinas).
2. **Productos de finca**: categoría "Productos de finca". Huevos: **"Huevos Palmital – cartón 15 unidades" ₡1.500** y
   **"Huevos Palmital – bolsa 20 unidades" ₡1.500** (precios de Gabriel) con fotos reales. Se quitó el cartón de 30.
   Fotos optimizadas en `public/img/finca/` (webp + jpg + miniaturas): huevos-carton-15, huevos-bolsa-20, gallinas, granja, produccion, nidos.
   Origen: `files/granja-palmital/`. Sección **"De nuestra granja a tu mesa"** en el inicio con foto de gallinas; banner de finca con foto de fondo.
   Queso, natilla y leche siguen igual (ícono, sin foto).
3. **Checkout**: carrito persiste; botón **Entrega a domicilio / Retiro en tienda**; "Usar mi ubicación" + mapa Leaflet con pin;
   zona sugerida por distancia; **envío GRATIS en San Isidro de El General**; selector de zonas con los distritos de PZ
   (**tarifas PROVISIONALES** marcadas `provisional: true` en `config.zonas`, el cliente ve "(aprox.)");
   **SINPE Móvil 8769-2109** con instrucciones, botón copiar número y campo de comprobante; efectivo contra entrega / al retirar.
   Al confirmar: guarda pedido (estado `nuevo`) y abre **wa.me/50687692109** con resumen (productos, total, entrega/retiro, zona,
   link de Google Maps del pin, pago/comprobante y **link de seguimiento**).
4. **Cuentas**: modo demo = **"Entrar con tu número"** (teléfono + nombre, sin contraseña; perfil, direcciones, historial y "Repetir pedido"
   en localStorage). Correo/contraseña sigue como opción. Con Firebase activo: botón **"Entrar con Google"** (Firebase Auth) + correo.
5. **Admin `#/admin`** (demo: admin@tiendita.demo / demo1234): pestañas **Resumen** (KPIs: pedidos hoy, ventas hoy/7 días, pendientes,
   ticket promedio, lo más vendido, por atender, mapa de pedidos activos), **Tablero** por estado
   (nuevo → confirmado → en camino → entregado / cancelado, botón Avanzar y aviso 💬 por WhatsApp al cliente), Lista con filtros y
   **CSV de pedidos**, Mapa/Ruta del día, Clientes, Reportes, Asistente, **Productos** (precio, antes, **stock** —0 = Agotado automático—,
   disponibilidad, oferta, ocultar, paginado de 40 en 40) y **"CSV para Meta"** (id,title,description,availability,condition,price,link,
   image_link,brand con JPG públicos en gh-pages; lista de JPG en `public/data/meta-jpg.json`, huevos incluidos con su foto).
   Estados viejos (recibido / pedido al proveedor / en ruta) se convierten solos (`normEstado` en `src/types.ts`).
6. **IA**: asistente local sin clave (clientes y admin). Admin: **Resumen del día, ¿Qué reabastecer?, Publicaciones para redes**
   (borradores listos para copiar), alistar finca, entregas, por confirmar. Si existe `VITE_AI_PROXY_URL`, aparece "✨ Mejorar con IA".
   Proxy **`worker/groq-proxy.js`** + `worker/wrangler.toml` + `worker/README.md` (Cloudflare Worker, NO desplegado). Ninguna clave en el frontend.
7. **Seguimiento `#/pedido/:id`**: línea de tiempo con horas, se refresca cada 30 s, compartir enlace, consultar por WhatsApp, detalle,
   repetir pedido. En Firebase usa una copia pública mínima `tracking/{id}` (reglas en `firestore.rules`: solo `get`, sin lista).
   En demo solo funciona en el mismo navegador donde se hizo el pedido.
8. Diseño móvil primero, español de Costa Rica, imágenes lazy, catálogo paginado, rutas cargadas bajo demanda.

## Verificación
- `npm run build` OK (tsc sin errores; oxlint 0 errores). Deploy a gh-pages hecho y URL verificada con curl.
- **No se pudo correr la prueba con navegador headless** (sin Chromium en el sandbox: la descarga de Playwright falló). El script viejo
  `scripts/e2e_demo.py` es de v3 (usa radios de zona y estados viejos): hay que actualizarlo antes de usarlo.

## Pendiente / necesita OK de Gabriel
- **Tarifas de envío** de los distritos de PZ (Daniel Flores, El General, San Pedro, Platanares, Cajón, Barú, Río Nuevo, Páramo,
  Pejibaye, La Amistad) — hoy son PROVISIONALES en `src/config.ts`. También confirmar las de Rivas.
- **Titular del SINPE 8769-2109**: la app muestra "José Gabriel Arias Rojas" (`config.sinpe.nombre`, venía de v3). Confirmar que ese número SINPE está a su nombre.
- **Ubicación exacta de la tienda** (`config.tienda`, hoy aproximada en Palmital) y si el retiro es en Palmital.
- **Firebase** (proyecto Spark gratis, con pulperiabazardigital@gmail.com): crear proyecto, habilitar Google + correo, pegar
  `VITE_FIREBASE_*` en `.env.local`, publicar `firestore.rules` y crear `/admins/<correo>`. Sin esto los pedidos solo llegan por WhatsApp.
- **Worker de IA** (Cloudflare gratis + clave Groq): ver `worker/README.md`.
- **Dominio propio** (costo): no comprado.
- Fotos para queso, natilla y leche (hoy con ícono; no entran al CSV de Meta).
- Descontar stock automáticamente al entregar (hoy el stock se edita a mano).

## Cómo continuar
```bash
cd work/app-tiendita && npm install && npm run build
# publicar: clonar la rama gh-pages en /tmp (el disco del workspace es lento), copiar dist/ con tar, git add/commit/push
```
Archivos clave: `src/config.ts` (marca, contacto, SINPE, finca, zonas), `src/pages/Checkout.tsx`, `src/pages/Tracking.tsx`,
`src/pages/admin/{Admin,Resumen,Tablero,AsistenteAdmin}.tsx`, `src/ai/adminLocal.ts`, `src/lib/exports.ts`, `src/data/{demo,firebase}.ts`.
