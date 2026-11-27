// Bandeja de WhatsApp para Gabriel: conversaciones y pedidos del agente (Worker en /proxy).
// Usa VITE_AI_PROXY_URL y la clave ADMIN_KEY del Worker (se guarda solo en este navegador).
import { useCallback, useEffect, useState } from 'react'
import { Card } from '../../components/ui'
import { config } from '../../config'
import { colones } from '../../lib/format'
import { baseProxy } from '../../ai/llm'

type ConvItem = { id: string; n?: string; e?: 'bot' | 'humano'; u?: number; a?: number; p?: string; c?: number }
type Msg = { r: 'user' | 'assistant'; t: string; ts: number; h?: number }
type Conv = { wa: string; nombre: string; estado: 'bot' | 'humano'; motivo: string; msgs: Msg[]; pedidos: { id: string }[]; ventanaAbierta: boolean }
type PedidoItem = { id: string; n?: string; w?: string; t?: number; f?: number; s?: string }
type Pedido = { id: string; nombre: string; wa: string; zona: string; direccion: string; pago: string; total: number; sinPrecio: boolean; adelanto: number; estado: string; fecha: number; items: { id: string; nombre: string; cantidad: number; precio: number | null; disp: string }[] }

const LLAVE = 'tiendita.wa.adminKey'
const hora = (ms?: number) => (ms ? new Date(ms).toLocaleString('es-CR', { dateStyle: 'short', timeStyle: 'short' }) : '')

export default function WhatsAppTab() {
  const base = baseProxy(config.aiProxyUrl)
  const [clave, setClave] = useState(() => localStorage.getItem(LLAVE) || '')
  const [borrador, setBorrador] = useState('')
  const [vista, setVista] = useState<'chats' | 'pedidos'>('chats')
  const [convs, setConvs] = useState<ConvItem[]>([])
  const [pedidos, setPedidos] = useState<PedidoItem[]>([])
  const [sel, setSel] = useState<Conv | null>(null)
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [texto, setTexto] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const api = useCallback(async <T,>(ruta: string, body?: unknown): Promise<T> => {
    const r = await fetch(`${base}/admin/api${ruta}`, {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${clave}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
    const d = await r.json().catch(() => ({}))
    if (r.status === 401) { localStorage.removeItem(LLAVE); setClave(''); throw new Error('Clave incorrecta') }
    if (!r.ok) throw new Error((d as { error?: string }).error || `Error ${r.status}`)
    return d as T
  }, [base, clave])

  const cargar = useCallback(async () => {
    if (!clave || !base) return
    try {
      const [c, p] = await Promise.all([api<{ convs: ConvItem[] }>('/convs'), api<{ pedidos: PedidoItem[] }>('/pedidos')])
      setConvs(c.convs); setPedidos(p.pedidos); setError('')
    } catch (e) { setError((e as Error).message) }
  }, [api, base, clave])

  useEffect(() => { const t0 = setTimeout(cargar, 0); const t = setInterval(cargar, 30000); return () => { clearTimeout(t0); clearInterval(t) } }, [cargar])

  const abrir = async (wa: string) => { try { setSel((await api<{ conv: Conv }>(`/conv?wa=${wa}`)).conv); setError('') } catch (e) { setError((e as Error).message) } }
  const abrirPedido = async (id: string) => { try { setPedido((await api<{ pedido: Pedido }>(`/pedido?id=${encodeURIComponent(id)}`)).pedido) } catch (e) { setError((e as Error).message) } }
  const accion = async (fn: () => Promise<unknown>) => { setBusy(true); try { await fn(); setError('') } catch (e) { setError((e as Error).message) } finally { setBusy(false) } }

  if (!base) return <Card><p className="text-sm">Falta <code>VITE_AI_PROXY_URL</code>: primero hay que desplegar el Worker de <code>proxy/</code> (ver proxy/README.md).</p></Card>
  if (!clave) return (
    <Card className="space-y-3">
      <p className="text-sm font-bold">📱 Bandeja de WhatsApp</p>
      <p className="text-xs text-muted">Pegá la clave <code>ADMIN_KEY</code> del Worker. Se guarda solo en este navegador.</p>
      <form onSubmit={(e) => { e.preventDefault(); localStorage.setItem(LLAVE, borrador.trim()); setClave(borrador.trim()) }} className="flex gap-2">
        <input type="password" value={borrador} onChange={(e) => setBorrador(e.target.value)} aria-label="Clave ADMIN_KEY" className="flex-1 rounded-full border border-line bg-surface px-4 py-2 text-sm" />
        <button className="rounded-full bg-brand-600 px-4 font-bold text-white">Entrar</button>
      </form>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </Card>
  )

  const boton = 'rounded-full px-3 py-1.5 text-xs font-bold ring-1 ring-line disabled:opacity-50'
  return (
    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <Card className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <button className={`${boton} ${vista === 'chats' ? 'bg-brand-600 text-white' : ''}`} onClick={() => setVista('chats')}>💬 Chats ({convs.length})</button>
          <button className={`${boton} ${vista === 'pedidos' ? 'bg-brand-600 text-white' : ''}`} onClick={() => setVista('pedidos')}>🧾 Pedidos ({pedidos.length})</button>
          <button className={boton} onClick={cargar}>↻</button>
          <button className={`${boton} ml-auto`} onClick={() => { localStorage.removeItem(LLAVE); setClave('') }}>Salir</button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <ul className="max-h-[520px] divide-y divide-line overflow-y-auto">
          {vista === 'chats' && convs.map((c) => (
            <li key={c.id}><button onClick={() => abrir(c.id)} className={`w-full px-1 py-2 text-left text-sm ${sel?.wa === c.id ? 'bg-surface-2' : ''}`}>
              <span className="font-bold">{c.a ? '🔴 ' : ''}{c.n || '+' + c.id}</span> <span className="text-[11px] text-muted">{c.e === 'humano' ? '🙋 humano' : '🤖 bot'} · {hora(c.u)}</span>
              <span className="block truncate text-xs text-muted">{c.p}</span>
            </button></li>
          ))}
          {vista === 'pedidos' && pedidos.map((p) => (
            <li key={p.id}><button onClick={() => abrirPedido(p.id)} className="w-full px-1 py-2 text-left text-sm">
              <span className="font-bold">{p.id}</span> · {p.n} · {colones(p.t ?? 0)} <span className="text-[11px] text-muted">· {p.s} · {hora(p.f)}</span>
            </button></li>
          ))}
          {vista === 'chats' && !convs.length && <li className="py-3 text-xs text-muted">Todavía no hay conversaciones (se guardan 7 días).</li>}
        </ul>
      </Card>

      {vista === 'pedidos' && pedido ? (
        <Card className="space-y-2 text-sm">
          <p className="font-bold">{pedido.id} · {pedido.nombre} (+{pedido.wa})</p>
          <ul className="list-disc pl-5">{pedido.items.map((i) => <li key={i.id}>{i.cantidad} × {i.nombre} — {i.precio == null ? 'por confirmar' : colones(i.precio * i.cantidad)} {i.disp === 'Bajo pedido' ? '(bajo pedido)' : ''}</li>)}</ul>
          <p>Total: <b>{colones(pedido.total)}</b>{pedido.sinPrecio ? ' + por confirmar' : ''}{pedido.adelanto ? ` · adelanto ${colones(pedido.adelanto)}` : ''}</p>
          <p>Entrega: {pedido.zona} — {pedido.direccion} · Pago: {pedido.pago}</p>
          <div className="flex flex-wrap gap-2">
            {['pendiente', 'confirmado', 'entregado', 'cancelado'].map((s) => (
              <button key={s} disabled={busy} className={`${boton} ${pedido.estado === s ? 'bg-brand-600 text-white' : ''}`} onClick={() => accion(async () => { await api('/pedido-estado', { id: pedido.id, estado: s }); setPedido({ ...pedido, estado: s }); cargar() })}>{s}</button>
            ))}
            <button className={boton} onClick={() => { setVista('chats'); abrir(pedido.wa) }}>Ver chat</button>
          </div>
        </Card>
      ) : sel ? (
        <Card className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold">{sel.nombre || '+' + sel.wa}</p>
            <a className="text-xs text-brand-600 underline" href={`https://wa.me/${sel.wa}`} target="_blank" rel="noreferrer">+{sel.wa}</a>
            <span className="text-xs text-muted">{sel.estado === 'humano' ? `🙋 Atendés vos${sel.motivo ? ` (${sel.motivo})` : ''}` : '🤖 Atiende el bot'}</span>
            {sel.estado === 'humano'
              ? <button disabled={busy} className={`${boton} ml-auto`} onClick={() => accion(async () => { await api('/estado', { wa: sel.wa, estado: 'bot' }); await abrir(sel.wa); cargar() })}>🤖 Devolver al bot</button>
              : <button disabled={busy} className={`${boton} ml-auto`} onClick={() => accion(async () => { await api('/estado', { wa: sel.wa, estado: 'humano' }); await abrir(sel.wa); cargar() })}>🙋 Tomar chat</button>}
          </div>
          <div className="max-h-[420px] space-y-2 overflow-y-auto">
            {sel.msgs.map((m, i) => (
              <div key={i} className={`flex ${m.r === 'user' ? '' : 'justify-end'}`}>
                <div className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm ${m.r === 'user' ? 'bg-surface-2' : m.h ? 'bg-accent-400 text-earth-900' : 'bg-brand-600 text-white'}`}>
                  <span className="block text-[10px] font-bold opacity-70">{m.r === 'user' ? 'Cliente' : m.h ? 'Vos' : 'Bot'} · {hora(m.ts)}</span>
                  <p className="whitespace-pre-line">{m.t}</p>
                </div>
              </div>
            ))}
          </div>
          {sel.ventanaAbierta ? (
            <form onSubmit={(e) => { e.preventDefault(); if (texto.trim()) accion(async () => { await api('/responder', { wa: sel.wa, texto }); setTexto(''); await abrir(sel.wa); cargar() }) }} className="flex gap-2">
              <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Responder como Gabriel…" aria-label="Respuesta" className="flex-1 rounded-full border border-line bg-surface px-4 py-2 text-sm" />
              <button disabled={busy} className="rounded-full bg-brand-600 px-4 font-bold text-white disabled:opacity-50">Enviar</button>
            </form>
          ) : <p className="text-xs text-muted">Pasaron más de 24 h desde el último mensaje del cliente: WhatsApp no deja responder texto libre hasta que vuelva a escribir.</p>}
          <p className="text-[11px] text-muted">Al responder vos, el bot se calla en este chat hasta que lo devolvás.</p>
        </Card>
      ) : <Card><p className="text-sm text-muted">Elegí una conversación o un pedido.</p></Card>}
    </div>
  )
}
