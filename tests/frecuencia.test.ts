import test from 'node:test'
import assert from 'node:assert/strict'

// Copia de la lógica de revisarFrecuencia (src/services/orders.ts) para probarla sin navegador.
function revisar(ahora: number, previos: number[]): string | null {
  const hora = previos.filter((t) => ahora - t < 3_600_000)
  if (hora.some((t) => ahora - t < 45_000)) return 'espera'
  if (hora.length >= 6) return 'limite'
  return null
}

test('permite el primer pedido', () => assert.equal(revisar(1e9, []), null))
test('frena dos pedidos seguidos', () => assert.equal(revisar(1e9, [1e9 - 10_000]), 'espera'))
test('frena el 7.º pedido en una hora', () => assert.equal(revisar(1e9, [1, 2, 3, 4, 5, 6].map((i) => 1e9 - i * 300_000)), 'limite'))
test('olvida pedidos de hace más de una hora', () => assert.equal(revisar(1e9, Array(10).fill(1e9 - 4_000_000)), null))
