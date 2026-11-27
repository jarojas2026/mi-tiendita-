// Conocimiento de la tienda: catálogo compacto + búsqueda por palabras clave (del lado del Worker).
// Así al LLM solo le pasamos los productos relevantes y respetamos el límite de tokens de Groq.

/** minúsculas, sin tildes, solo letras/números */
export const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9ñ ]+/g, ' ').replace(/\s+/g, ' ').trim()

// Palabras que no ayudan a buscar
const VACIAS = new Set('de del la las el los un una unos unas y o para por con sin que en al me mi tu su se lo le les hay tienen tiene venden vende quiero quisiera ocupo necesito busco algo cuanto cuesta cuestan precio precios vale valen hola buenas buenos dias tardes noches gracias favor porfa pura vida info informacion tienda ustedes usted vos este esta eso esa como donde cuando'.split(' '))

// Sinónimos y formas ticas → palabra que aparece en el catálogo
const SINONIMOS = { cel: 'celular', celu: 'celular', cels: 'celular', audifono: 'audifono', audifonos: 'audifono', jaquitas: 'audifono', cargador: 'cargador', cargadores: 'cargador', huevo: 'huevo', huevos: 'huevo', blanquillos: 'huevo', lapicero: 'lapicero', lapiceros: 'lapicero', bulto: 'bulto', bultos: 'bulto', mochila: 'bulto', jugete: 'juguete', juguetes: 'juguete', parlante: 'parlante', bocina: 'parlante', luz: 'luz', luces: 'luz', lampara: 'lampara', bombillo: 'bombillo' }

/** raíz simple: singular aproximado */
const raiz = (w) => { const s = SINONIMOS[w] || w; return s.length > 4 && s.endsWith('es') ? s.slice(0, -2) : s.length > 3 && s.endsWith('s') ? s.slice(0, -1) : s }

export const tokens = (q) => norm(q).split(' ').filter((w) => w.length >= 3 && !VACIAS.has(w)).map(raiz)

/** Índice: por producto, sus palabras normalizadas (nombre y categoría). Se arma una vez por instancia. */
export function indexar(kb) {
  return kb.productos.map(([id, nombre, precio, categoria, disp, nota]) => ({
    id, nombre, precio, categoria, disp, nota,
    pn: norm(nombre).split(' ').map(raiz),
    pc: norm(categoria).split(' ').map(raiz),
  }))
}

// Coincidencia: 2 = palabra exacta, 1 = prefijo (≥4 letras), 0 = nada. "arroz" NO coincide con "carro".
const pega = (palabras, t) => {
  let m = 0
  for (const w of palabras) {
    if (w === t) return 2
    if ((t.length >= 4 && w.startsWith(t)) || (w.length >= 4 && t.startsWith(w) && t.length - w.length <= 2)) m = 1
  }
  return m
}

/** Busca productos por palabras clave. Devuelve los n mejores (con puntaje > 0). */
export function buscar(indice, q, n = 6) {
  const ts = [...new Set(tokens(q))]
  if (!ts.length) return []
  const res = []
  for (const p of indice) {
    let s = 0, hits = 0
    for (const t of ts) {
      const n = pega(p.pn, t)
      if (n) { s += n === 2 ? 3 : 1.5; hits++ } else if (pega(p.pc, t)) { s += 1; hits++ }
    }
    if (!s) continue
    if (hits === ts.length) s += 2 // tiene todas las palabras
    if (p.precio != null) s += 0.5 // preferimos los que tienen precio
    res.push([s, p])
  }
  return res.sort((a, b) => b[0] - a[0]).slice(0, n).map((x) => x[1])
}

export const colones = (n) => '₡' + Math.round(n).toLocaleString('es-CR').replace(/[\s\u00a0\u202f]/g, '.')
export const linkProducto = (kb, id) => `${kb.tienda.baseUrl}/#/p/${encodeURIComponent(id)}`

/** Una línea por producto para el LLM (pocas palabras = pocos tokens). */
export const lineaProducto = (kb, p) =>
  `- [${p.id}] ${p.nombre} | ${p.precio == null ? 'precio: consultar' : colones(p.precio)} | ${p.disp}${p.nota ? ` | ${p.nota}` : ''} | ${linkProducto(kb, p.id)}`

export const porId = (indice, id) => indice.find((p) => p.id === id)
