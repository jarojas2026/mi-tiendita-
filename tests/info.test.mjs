// Páginas de confianza: verifica que Info.tsx exporte las 6 páginas y sus piezas clave.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const info = readFileSync(new URL('../src/pages/Info.tsx', import.meta.url), 'utf8')
const PAGINAS = ['Envios', 'Devoluciones', 'Terminos', 'Privacidad', 'Nosotros', 'Ayuda']

test('Info.tsx exporta las 6 páginas', () => {
  for (const p of PAGINAS) assert.match(info, new RegExp(`export function ${p}\\(\\)`), `falta ${p}`)
})

test('Fecha de actualización, aviso legal y título del documento', () => {
  assert.match(info, /Actualizado el 25 de noviembre de 2026/)
  assert.match(info, /Este texto es una guía y no sustituye asesoría legal\./)
  assert.match(info, /document\.title = `\$\{pagina\} · \$\{config\.storeName\}`/)
})

test('Tarifas salen de config y hay enlaces a WhatsApp y catálogo', () => {
  assert.match(info, /zonasDefault/)
  assert.match(info, /wa\.me\/\$\{config\.whatsapp\}/)
  assert.match(info, /to="\/catalogo"/)
  assert.match(info, /to="\/seguimiento"/)
})

test('Ayuda tiene 8 preguntas', () => {
  const ayuda = info.slice(info.indexOf('export function Ayuda'))
  assert.equal((ayuda.match(/\{ p: '/g) ?? []).length, 8)
})
