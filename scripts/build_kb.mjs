#!/usr/bin/env node
// Genera proxy/kb.json: el "conocimiento" compacto del agente de WhatsApp y del chat web.
//  - Catálogo: id, nombre, precio (₡, con el margen de config.ts), categoría, disponibilidad.
//    El link a la ficha se arma en el Worker: <baseUrl>/#/p/<id>
//  - Políticas, zonas, envíos, pagos y horario, tomados de src/config.ts (una sola fuente de verdad).
//
// Uso:  node --experimental-strip-types scripts/build_kb.mjs
// Correlo cada vez que cambiés productos (public/data/products.json) o src/config.ts, y volvé a desplegar.
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'

const raiz = fileURLToPath(new URL('..', import.meta.url))

/** Carga src/config.ts fuera de Vite: cambiamos import.meta.env por un objeto vacío. */
async function cargarConfig() {
  const src = readFileSync(join(raiz, 'src/config.ts'), 'utf8').replaceAll('import.meta.env', '({} as Record<string, string>)')
  const dir = mkdtempSync(join(tmpdir(), 'kb-'))
  const f = join(dir, 'config.ts')
  writeFileSync(f, src)
  try { return (await import(pathToFileURL(f).href)).config } finally { rmSync(dir, { recursive: true, force: true }) }
}

const conMargen = (cfg, base) => {
  if (base == null) return null
  if (!cfg.margenPct) return base
  const r = cfg.redondeo || 1
  return Math.round((base * (1 + cfg.margenPct / 100)) / r) * r
}

export async function construirKB() {
  const cfg = await cargarConfig()
  const crudos = JSON.parse(readFileSync(join(raiz, 'public/data/products.json'), 'utf8'))
  // Productos: [id, nombre, precio|null, categoría, disponibilidad, nota?]  (formato compacto = menos bytes)
  const productos = [
    ...cfg.finca.map((f) => [f.id, f.nombre + (f.venta === 'kg' ? ' (por kg)' : ''), cfg.fincaPrecioPorConfirmar ? null : f.precio, cfg.fincaCategoria, 'En tienda', ...(f.nota ? [f.nota] : [])]),
    ...crudos.filter((p) => !p.hidden).map((p) => [p.id, p.nombre, conMargen(cfg, p.precio), p.categoria, p.disponibilidad || 'Bajo pedido']),
  ]
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
  return {
    generado: new Date().toISOString().slice(0, 10),
    tienda: {
      nombre: cfg.storeName,
      ubicacion: cfg.ubicacion,
      baseUrl: cfg.baseUrl,
      whatsapp: cfg.whatsappVisible,
      horario: cfg.horario,
      sinpe: cfg.sinpe.numero ? `${cfg.sinpe.numero} a nombre de ${cfg.sinpe.nombre}` : '',
      adelantoPct: cfg.adelantoPct,
      plazoBajoPedido: cfg.plazoBajoPedido,
      envioGratis: Boolean(cfg.envioGratisLanzamiento),
      diasEntrega: (cfg.diasEntregaLanzamiento || []).map((d) => DIAS[d]),
      devoluciones: cfg.politicaDevoluciones,
      zonas: cfg.zonas.map((z) => z.nombre),
      retiro: 'Retiro gratis en la tienda (Palmital de Rivas)',
    },
    productos,
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const kb = await construirKB()
  const out = join(raiz, 'proxy/kb.json')
  writeFileSync(out, JSON.stringify(kb))
  console.log(`proxy/kb.json: ${kb.productos.length} productos, ${(JSON.stringify(kb).length / 1024).toFixed(0)} KB`)
}
