// Pruebas de contrato: verifican piezas críticas de configuración sin red ni dependencias.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const leer = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
const fb = JSON.parse(leer('firebase.json'))
const config = leer('src/config.ts')
const reglas = leer('firestore.rules')

test('Hosting manda COOP same-origin-allow-popups (popup de Google)', () => {
  const h = fb.hosting.headers.find((x) => x.source === '**')
  assert.ok(h.headers.some((x) => x.key === 'Cross-Origin-Opener-Policy' && x.value === 'same-origin-allow-popups'))
})

test('authDomain usa el mismo dominio solo en Firebase Hosting', () => {
  assert.match(config, /authDomain: resolveAuthDomain\(/)
  assert.match(config, /mi-tiendita-digital-b9835\.web\.app/)
})

test('Admins fijos en reglas y en config coinciden', () => {
  for (const c of ['jarojas800@gmail.com', 'pulperiaybazardigital@gmail.com']) {
    assert.ok(reglas.includes(c), `reglas sin ${c}`)
    assert.ok(config.includes(c), `config sin ${c}`)
  }
})

test('Reglas limitan items del pedido', () => {
  assert.match(reglas, /d\.items\.size\(\) <= 100/)
})

test('Sin claves secretas en el código', () => {
  for (const p of ['src/config.ts', 'src/services/backend/firebase.ts']) {
    assert.doesNotMatch(leer(p), /(gsk_|sk-[A-Za-z0-9]{20}|BEGIN PRIVATE KEY)/)
  }
})
