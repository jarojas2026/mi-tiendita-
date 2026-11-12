// ============================================================
//  CONFIGURACIÓN DE LA TIENDA — editá este archivo y listo.
//  (Nombre, WhatsApp, márgenes, zonas, tarifas, horarios, finca)
// ============================================================

import type { ZonaCfg } from './types'

export const config = {
  // Marca
  storeName: 'Mi Tiendita Digital',
  slogan: 'Tu pulpería y bazar en línea con entrega en Pérez Zeledón',
  ubicacion: 'Pérez Zeledón, San José, Costa Rica',
  email: 'pulperiaybazardigital@gmail.com',
  facebook: 'https://www.facebook.com/profile.php?id=61596021703093',

  // Número de WhatsApp Business que recibe los pedidos (formato internacional sin +)
  whatsapp: '50687692109', // +506 8769-2109
  whatsappVisible: '8769-2109',

  // SINPE Móvil: poné el número cuando esté confirmado (ej.: '8888-8888').
  // Mientras numero sea '' la app muestra "número SINPE por confirmar".
  sinpe: { numero: '8769-2109' as string, numeroIntl: '87692109', nombre: 'José Gabriel Arias Rojas' },

  // Margen global (%) que se suma al precio de la foto del catálogo S&F.
  // 0 = mismo precio de la foto. Ej.: 15 suma un 15 % y redondea a ₡50.
  margenPct: 0,
  redondeo: 50,

  // Productos "Bajo pedido": adelanto requerido y plazo estimado
  adelantoPct: 50,
  plazoBajoPedido: '3 a 5 días hábiles',
  diasMinBajoPedido: 3, // días mínimos antes de la primera fecha de entrega

  // Cuántos días hacia adelante se pueden agendar entregas
  diasAgenda: 14,

  // Franjas horarias de entrega
  franjas: ['8:00 a. m. – 11:00 a. m.', '11:00 a. m. – 2:00 p. m.', '2:00 p. m. – 5:00 p. m.'],

  // Zonas de entrega. tarifa: null = "por cotizar".
  // diasRuta: 0=domingo, 1=lunes ... 6=sábado
  zonas: [
    { id: 'centro-rivas', nombre: 'Centro de Rivas', tarifa: 1000 as number | null, diasRuta: [1, 2, 3, 4, 5, 6] },
    { id: 'san-antonio', nombre: 'San Antonio / Pueblo Nuevo', tarifa: 1500 as number | null, diasRuta: [2, 4, 6] },
    { id: 'palmital', nombre: 'Palmital / La Piedra', tarifa: 1500 as number | null, diasRuta: [1, 3, 5] },
    { id: 'chimirol', nombre: 'Chimirol / Guadalupe', tarifa: 2000 as number | null, diasRuta: [3, 6] },
    { id: 'herradura', nombre: 'Herradura / San Gerardo', tarifa: null as number | null, diasRuta: [6] },
    { id: 'san-isidro', nombre: 'San Isidro de El General (centro)', tarifa: 0 as number | null, diasRuta: [1, 2, 3, 4, 5, 6], gratis: true },
    // ⚠️ TARIFAS PROVISIONALES (provisional: true): distritos de Pérez Zeledón. Gabriel debe confirmarlas.
    { id: 'daniel-flores', nombre: 'Daniel Flores', tarifa: 1500 as number | null, diasRuta: [2, 4, 6], provisional: true },
    { id: 'el-general', nombre: 'El General', tarifa: 2000 as number | null, diasRuta: [3, 6], provisional: true },
    { id: 'san-pedro', nombre: 'San Pedro', tarifa: 2500 as number | null, diasRuta: [3, 6], provisional: true },
    { id: 'platanares', nombre: 'Platanares', tarifa: 2500 as number | null, diasRuta: [2, 5], provisional: true },
    { id: 'cajon', nombre: 'Cajón', tarifa: 2500 as number | null, diasRuta: [2, 5], provisional: true },
    { id: 'baru', nombre: 'Barú', tarifa: 3000 as number | null, diasRuta: [6], provisional: true },
    { id: 'rio-nuevo', nombre: 'Río Nuevo', tarifa: 2500 as number | null, diasRuta: [4], provisional: true },
    { id: 'paramo', nombre: 'Páramo', tarifa: 3000 as number | null, diasRuta: [4], provisional: true },
    { id: 'pejibaye', nombre: 'Pejibaye', tarifa: null as number | null, diasRuta: [6], provisional: true },
    { id: 'la-amistad', nombre: 'La Amistad', tarifa: null as number | null, diasRuta: [6], provisional: true },
    { id: 'retiro', nombre: 'Retiro en la tienda (Palmital) — gratis', tarifa: 0 as number | null, diasRuta: [1, 2, 3, 4, 5, 6], retiro: true },
  ],

  // Administradores. En Firebase la lista real está en firestore.rules (función isAdmin):
  // si cambiás esta lista, cambiá también las reglas. En MODO DEMO se suma la cuenta de prueba.
  adminEmails: ['jarojas800@gmail.com', 'pulperiaybazardigital@gmail.com'],
  demoAdminEmails: ['admin@tiendita.demo', 'mycrtours@gmail.com'],

  // Umbral de "stock bajo" por defecto (editable en Admin › Ajustes)
  stockBajo: 3,

  // Cuenta admin que se crea sola en MODO DEMO (solo localStorage)
  demoAdmin: { email: 'admin@tiendita.demo', password: 'demo1234', nombre: 'Admin demo' },

  // URL pública base (para el CSV de WhatsApp/Meta y enlaces). Sin "/" final.
  baseUrl: 'https://mi-tiendita-digital-b9835.web.app',

  // Productos de la finca.
  //  venta: 'kg' (precio por kilo) o 'paquete' (precio por unidad de venta)
  //  paso: de cuánto en cuánto se puede pedir (0.5 = medios kilos)
  finca: [
    { id: 'finca-queso-tierno', nombre: 'Queso tierno de la finca', precio: 4000, icono: '🧀', venta: 'kg', unidad: 'por kg', paso: 0.5, nota: 'El precio puede variar a ₡4.500 por kg.' },
    { id: 'finca-natilla', nombre: 'Natilla casera', precio: 2000, icono: '🥣', venta: 'kg', unidad: 'por kg', paso: 0.5 },
    { id: 'finca-leche', nombre: 'Leche fresca de la finca — 3 litros', precio: 2000, icono: '🥛', venta: 'paquete', unidad: '3 litros', paso: 1 },
    { id: 'finca-huevos-15', nombre: 'Huevos Palmital – cartón 15 unidades', precio: 1500, icono: '🥚', venta: 'paquete', unidad: 'cartón de 15', paso: 1, imagen: 'img/finca/huevos-carton-15.webp', miniatura: 'img/finca/huevos-carton-15-t.webp', imagenJpg: 'img/finca/huevos-carton-15.jpg', nota: 'Huevo rojo fresco de nuestras gallinas en Palmital.' },
    { id: 'finca-huevos-20', nombre: 'Huevos Palmital – bolsa 20 unidades', precio: 1500, icono: '🥚', venta: 'paquete', unidad: 'bolsa de 20', paso: 1, imagen: 'img/finca/huevos-bolsa-20.webp', miniatura: 'img/finca/huevos-bolsa-20-t.webp', imagenJpg: 'img/finca/huevos-bolsa-20.jpg', nota: 'Huevo fresco de Granja Palmital, en bolsa práctica.' },
  ] as { id: string; nombre: string; precio: number; icono: string; venta: 'kg' | 'paquete'; unidad: string; paso: number; nota?: string; imagen?: string; miniatura?: string; imagenJpg?: string }[],
  fincaCategoria: 'Productos de finca',
  fincaPrecioPorConfirmar: false,

  // Categorías que se destacan en el inicio (en este orden).
  // cats = ids de categoría del catálogo; q = palabras extra que también entran (ej. "solar", "led").
  destacadas: [
    { id: 'medias', titulo: '🧦 Medias', cats: ['medias'], q: [] as string[] },
    { id: 'luces', titulo: '💡 Luces solares y LED', cats: ['iluminacion', 'aros-de-luz', 'espejos-led'], q: ['solar', 'led'] },
    { id: 'juguetes', titulo: '🎄 Juguetes para Navidad', cats: ['juguetes'], q: [] as string[] },
    { id: 'escolar', titulo: '✏️ Escolar y oficina', cats: ['escolar-y-oficina'], q: [] as string[] },
    { id: 'audifonos', titulo: '🎧 Audífonos', cats: ['audifonos'], q: [] as string[] },
    { id: 'cables', titulo: '🔌 Cables y cargadores', cats: ['cables-y-cargadores', 'power-banks'], q: [] as string[] },
  ],
  // ---------- v3: ubicación de la tienda y envío por distancia ----------
  // Coordenadas APROXIMADAS de Palmital de Rivas (OpenStreetMap, nodo "Palmital" 9.47732, -83.65864).
  // Cambialas por el punto exacto de la tienda: abrí Google Maps, mantené presionado sobre la tienda y copiá.
  tienda: { lat: 9.4773, lng: -83.6586, nombre: 'Mi Tiendita Digital · Palmital de Rivas', aproximada: true },

  // Tramos de envío por distancia en línea recta desde la tienda (km). El primero que cumpla hastaKm gana.
  // zonaId = zona que se sugiere (y su tarifa). Si querés cobrar por distancia en vez de por zona,
  // agregale tarifa: 1200 a un tramo y esa tarifa reemplaza a la de la zona.
  envioTramos: [
    { hastaKm: 0.3, zonaId: 'retiro', texto: 'Estás al lado de la tienda: podés retirar gratis' },
    { hastaKm: 3, zonaId: 'palmital', texto: 'Muy cerca: Palmital / La Piedra' },
    { hastaKm: 8, zonaId: 'centro-rivas', texto: 'Centro de Rivas y alrededores' },
    { hastaKm: 12, zonaId: 'san-antonio', texto: 'San Antonio / Pueblo Nuevo' },
    { hastaKm: 18, zonaId: 'chimirol', texto: 'Chimirol / Guadalupe' },
    { hastaKm: 9999, zonaId: 'herradura', texto: 'Lejos: el envío se cotiza por WhatsApp' },
  ] as { hastaKm: number; zonaId: string; texto: string; tarifa?: number | null }[],

  // Zonas con envío GRATIS por cercanía a un punto (se revisan ANTES que los tramos de distancia).
  // San Isidro de El General: centro aprox. 9.3730, -83.7040; radioKm configurable.
  zonasGratisRadio: [
    { zonaId: 'san-isidro', lat: 9.373, lng: -83.704, radioKm: 3, texto: '¡Envío gratis en San Isidro de El General!' },
  ],

  // Horario de atención (lo usa el asistente y el pie de página)
  horario: 'Lunes a sábado, 7:00 a. m. – 7:00 p. m. · Domingo cerrado',

  // Asistente con IA. Vacío = modo local (gratis, sin servidor, basado en el catálogo).
  // Con la URL de tu proxy (Cloudflare Worker o Google Apps Script, ver /proxy) usa un LLM (Groq).
  // ⚠️ NUNCA pongás aquí una clave de API: la clave vive SOLO en el proxy.
  aiProxyUrl: (import.meta.env.VITE_AI_PROXY_URL as string | undefined) || '',

  // Carrusel del inicio (orden = orden de aparición). dest = id de config.destacadas, cat = categoría.
  banners: [
    { id: 'navidad', titulo: 'Regalos de Navidad', texto: 'Juguetes, medias, audífonos y luces para regalar. Pedí con tiempo: lo bajo pedido tarda 3 a 5 días hábiles.', cta: 'Ver regalos', link: '/catalogo?dest=juguetes', tono: 'navidad', icono: '🎁', fotos: 'juguetes' },
    { id: 'finca', titulo: 'De nuestra finca a tu mesa', texto: 'Huevos Palmital (cartón de 15 o bolsa de 20 a ₡1.500), queso tierno, natilla y leche fresca. Hecho en Pérez Zeledón.', cta: 'Ver productos de la finca', link: '/catalogo?cat=finca', tono: 'finca', icono: '🥚', fotos: '', foto: 'img/finca/gallinas.webp' },
    { id: 'escolar', titulo: 'Útiles escolares', texto: 'Cuadernos, lápices, bultos y loncheras para arrancar el curso lectivo con todo.', cta: 'Ver útiles', link: '/catalogo?dest=escolar', tono: 'escolar', icono: '✏️', fotos: 'escolar' },
  ],

  // Banner de temporada en el inicio
  banner: { activo: true, titulo: '🎁 Regalos de Navidad', texto: 'Juguetes, medias, audífonos y luces para regalar. Pedí con tiempo: lo bajo pedido tarda 3 a 5 días hábiles.', destacadas: ['juguetes', 'medias', 'audifonos', 'luces'] },
}

export const sinpeTexto = () => (config.sinpe.numero ? `SINPE Móvil al ${config.sinpe.numero} (${config.sinpe.nombre})` : 'SINPE Móvil (número SINPE por confirmar)')

export type Zona = ZonaCfg
// Zonas por defecto (si Firestore no tiene settings/tienda o no responde)
export const zonasDefault: ZonaCfg[] = config.zonas as ZonaCfg[]

// Firebase (v5: ENCENDIDO). Proyecto mi-tiendita-digital-b9835, plan Spark (gratis): Auth + Firestore.
// Estos valores son identificadores PÚBLICOS de la app web (no son secretos); la seguridad está en firestore.rules.
// Se pueden sobreescribir con VITE_FIREBASE_* en .env.local. VITE_MODO=demo fuerza el modo demo (localStorage).
const env = import.meta.env
// En Firebase Hosting el manejador /__/auth vive en el mismo dominio: Google muestra la tienda
// (no firebaseapp.com) y el inicio por redirección funciona en Safari/iPhone (sin cookies de terceros).
export const HOSTING_AUTH_HOSTS = ['mi-tiendita-digital-b9835.web.app', 'mi-tiendita-digital-b9835.firebaseapp.com']
export function resolveAuthDomain(fallback: string): string {
  const h = typeof location !== 'undefined' ? location.hostname : ''
  return HOSTING_AUTH_HOSTS.includes(h) ? h : fallback
}
export const firebaseConfig = {
  apiKey: (env.VITE_FIREBASE_API_KEY as string | undefined) || 'AIzaSyBXUN1AlFJYkGjO1rzCFIxG3Xy6caRID48',
  authDomain: resolveAuthDomain((env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined) || 'mi-tiendita-digital-b9835.firebaseapp.com'),
  projectId: (env.VITE_FIREBASE_PROJECT_ID as string | undefined) || 'mi-tiendita-digital-b9835',
  storageBucket: (env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined) || 'mi-tiendita-digital-b9835.firebasestorage.app',
  messagingSenderId: (env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined) || '730926839221',
  appId: (env.VITE_FIREBASE_APP_ID as string | undefined) || '1:730926839221:web:1716bc2f9917abb61ad5fc',
}
export const isFirebase = env.VITE_MODO !== 'demo' && Boolean(firebaseConfig.apiKey && firebaseConfig.projectId)
