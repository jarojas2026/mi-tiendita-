import { useState } from 'react'
import { Card } from '../../components/ui'
import { config } from '../../config'
import { responderAdmin, SISTEMA_ADMIN, SUGERENCIAS_ADMIN } from '../../ai/adminLocal'
import { llmTexto } from '../../ai/llm'
import { useStore } from '../../store'
import type { Order } from '../../types'

type Msg = { de: 'yo' | 'bot'; t: string; ia?: boolean }

export default function AsistenteAdmin({ orders }: { orders: Order[] }) {
  const { products } = useStore()
  const iaOn = Boolean(config.aiProxyUrl)
  const [log, setLog] = useState<Msg[]>([{ de: 'bot', t: `Hola 👋 Te resumo pedidos, te digo qué reabastecer y te redacto publicaciones para redes. Modo ${iaOn ? 'local + IA (proxy activo)' : 'local (sin internet ni costo)'}.` }])
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [copiado, setCopiado] = useState<number | null>(null)
  const enviar = (t: string) => { if (!t.trim()) return; setLog((l) => [...l, { de: 'yo', t }, { de: 'bot', t: responderAdmin(t, orders, products) }]); setQ('') }
  const mejorar = async (i: number) => {
    setBusy(true)
    try {
      const pedido = `${log[i - 1]?.t ?? ''}\n\nDatos (borrador local):\n${log[i].t}\n\nMejoralo: si son publicaciones, hacelas más atractivas y listas para copiar; si es un resumen, dame 3 acciones concretas para hoy.`
      const r = await llmTexto(SISTEMA_ADMIN, pedido, 500)
      setLog((l) => [...l, { de: 'bot', t: r, ia: true }])
    } catch (e) { setLog((l) => [...l, { de: 'bot', t: `No pude usar la IA: ${(e as Error).message}. El borrador local sigue sirviendo.` }]) } finally { setBusy(false) }
  }
  const copiar = async (i: number) => {
    try { await navigator.clipboard.writeText(log[i].t.replace(/\*\*/g, '')) } catch { /* sin portapapeles */ }
    setCopiado(i); setTimeout(() => setCopiado(null), 1400)
  }
  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap gap-1.5">{SUGERENCIAS_ADMIN.map((s) => <button key={s} onClick={() => enviar(s)} className="rounded-full bg-surface-2 px-3 py-1.5 text-xs font-semibold ring-1 ring-line hover:ring-brand-400">{s}</button>)}</div>
      <div className="max-h-[520px] space-y-2 overflow-y-auto" data-testid="admin-chat" aria-live="polite">
        {log.map((m, i) => (
          <div key={i} className={`flex ${m.de === 'yo' ? 'justify-end' : ''}`}>
            <div className={`max-w-[92%] rounded-2xl px-3 py-2 text-sm ${m.de === 'yo' ? 'bg-brand-600 text-white' : 'bg-surface-2'}`}>
              {m.ia && <span className="mb-1 block text-[10px] font-bold text-brand-600 uppercase dark:text-brand-300">✨ IA</span>}
              <p className="whitespace-pre-line">{m.t.replace(/\*\*/g, '')}</p>
              {m.de === 'bot' && i > 0 && (
                <div className="mt-2 flex gap-2">
                  <button onClick={() => copiar(i)} className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold ring-1 ring-line">{copiado === i ? 'Copiado ✓' : '📋 Copiar'}</button>
                  {iaOn && !m.ia && <button disabled={busy} onClick={() => mejorar(i)} className="rounded-full bg-accent-400 px-2.5 py-1 text-[11px] font-bold text-earth-900 disabled:opacity-50">{busy ? 'Pensando…' : '✨ Mejorar con IA'}</button>}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); enviar(q) }} className="flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Preguntá sobre pedidos, stock o redes…" aria-label="Pregunta para el asistente admin" className="flex-1 rounded-full border border-line bg-surface px-4 py-2 text-sm" />
        <button className="rounded-full bg-brand-600 px-4 font-bold text-white">Enviar</button>
      </form>
      {!iaOn && <p className="text-[11px] text-muted">Modo IA apagado (gratis). Para activarlo hace falta desplegar el proxy de <code>worker/</code> con el OK de Gabriel.</p>}
    </Card>
  )
}
