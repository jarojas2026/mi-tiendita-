// Chat flotante "Asistente Tiendita". Se carga bajo demanda (lazy) al tocar el botón.
import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { config } from '../config'
import { colones } from '../lib/format'
import { imgUrl, useStore } from '../store'
import { Icon } from '../components/icons'
import { responderLocal, SUGERENCIAS, type Respuesta } from './local'
import { preguntarLLM, type ChatMsg } from './llm'
import type { Product } from '../types'

interface Msg { id: number; de: 'yo' | 'bot'; texto: string; productos?: Product[]; acciones?: Respuesta['acciones']; aviso?: string }

const HIST_KEY = 'mt_chat'
let seq = 1

/** **negrita** y saltos de línea, sin HTML inyectado */
function Rico({ t }: { t: string }) {
  return <>{t.split('\n').map((linea, i) => (
    <Fragment key={i}>{i > 0 && <br />}{linea.split(/(\*\*[^*]+\*\*)/g).map((s, j) => s.startsWith('**') && s.endsWith('**') ? <b key={j}>{s.slice(2, -2)}</b> : <Fragment key={j}>{s}</Fragment>)}</Fragment>
  ))}</>
}

function MiniCard({ p, onAdd }: { p: Product; onAdd: () => void }) {
  const [ok, setOk] = useState(false)
  return (
    <div className="flex w-36 shrink-0 flex-col overflow-hidden rounded-xl bg-surface ring-1 ring-line" data-testid="chat-product">
      <Link to={`/p/${p.id}`} className="block aspect-square bg-surface-2">
        {p.miniatura ? <img src={imgUrl(p.miniatura)} alt={p.nombre} loading="lazy" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-4xl">{p.icono ?? '🛍️'}</span>}
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-2">
        <Link to={`/p/${p.id}`} className="line-clamp-2 text-xs leading-tight">{p.nombre}</Link>
        <b className="mt-auto text-sm">{colones(p.precio)}{p.venta === 'kg' ? '/kg' : ''}</b>
        <button disabled={p.disponibilidad === 'Agotado'} onClick={() => { onAdd(); setOk(true) }} aria-label={`Agregar ${p.nombre} al carrito desde el chat`}
          className={`rounded-full py-1 text-xs font-extrabold ${ok ? 'bg-brand-600 text-white' : 'bg-accent-400 text-earth-900'}`}>{ok ? '✓ Agregado' : '+ Agregar'}</button>
      </div>
    </div>
  )
}

export default function Assistant({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { products, byId, misPedidos, user, addToCart, loading } = useStore()
  const modoLLM = Boolean(config.aiProxyUrl)
  const [msgs, setMsgs] = useState<Msg[]>(() => {
    try { const h = JSON.parse(sessionStorage.getItem(HIST_KEY) || '[]') as { de: Msg['de']; texto: string; ids?: string[] }[]; if (h.length) return h.map((m) => ({ id: seq++, de: m.de, texto: m.texto, productos: [] })) } catch { /* nada */ }
    return [{ id: seq++, de: 'bot', texto: `¡Hola! 👋 Soy el **Asistente Tiendita**. Preguntame por productos, precios, regalos, envío o tu pedido.` }]
  })
  const [q, setQ] = useState('')
  const [pensando, setPensando] = useState(false)
  const fin = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => { fin.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [msgs, pensando])
  useEffect(() => { if (open) setTimeout(() => input.current?.focus(), 60) }, [open])
  useEffect(() => { sessionStorage.setItem(HIST_KEY, JSON.stringify(msgs.slice(-20).map((m) => ({ de: m.de, texto: m.texto })))) }, [msgs])
  useEffect(() => {
    if (!open) return
    const f = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f)
  }, [open, onClose])

  const enviar = async (texto: string) => {
    texto = texto.trim(); if (!texto || pensando) return
    setQ('')
    const yo: Msg = { id: seq++, de: 'yo', texto }
    setMsgs((m) => [...m, yo])
    setPensando(true)
    const local = () => responderLocal(texto, { products, misPedidos, user })
    try {
      if (modoLLM) {
        const hist: ChatMsg[] = [...msgs, yo].slice(1).map((m) => ({ role: m.de === 'yo' ? 'user' : 'assistant', content: m.texto }))
        try {
          const r = await preguntarLLM(hist, products, byId, addToCart)
          const loc = r.productos.length ? null : local()
          setMsgs((m) => [...m, { id: seq++, de: 'bot', texto: r.texto, productos: r.productos.length ? r.productos : loc?.productos, aviso: r.agregados.length ? `🛒 Agregado: ${r.agregados.map((a) => a.p.nombre).join(', ')}` : undefined }])
        } catch {
          const r = local()
          setMsgs((m) => [...m, { id: seq++, de: 'bot', ...r, aviso: 'Sin conexión con la IA: te respondo en modo local.' }])
        }
      } else {
        await new Promise((res) => setTimeout(res, 280)) // pequeña pausa natural
        const r = local()
        setMsgs((m) => [...m, { id: seq++, de: 'bot', ...r }])
      }
    } finally { setPensando(false) }
  }

  const Accion = ({ a }: { a: NonNullable<Respuesta['acciones']>[number] }): ReactNode =>
    a.to ? <Link to={a.to} onClick={onClose} className="rounded-full bg-surface px-3 py-1 text-xs font-bold text-brand-600 ring-1 ring-line dark:text-brand-300">{a.label}</Link>
      : <a href={a.href} target="_blank" rel="noreferrer" className="rounded-full bg-surface px-3 py-1 text-xs font-bold text-brand-600 ring-1 ring-line dark:text-brand-300">{a.label}</a>

  return (
    <>
    {open && <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px] sm:hidden" onClick={onClose} aria-hidden="true" />}
    <div role="dialog" aria-modal="false" aria-label="Asistente Tiendita" data-testid="chat-panel"
      className={`${open ? 'flex' : 'hidden'} fixed inset-x-0 bottom-0 z-50 h-[78dvh] flex-col animate-fade-up flex-col overflow-hidden rounded-t-3xl bg-bg shadow-lift ring-1 ring-line sm:inset-x-auto sm:right-5 sm:bottom-5 sm:h-[620px] sm:w-[400px] sm:rounded-3xl`}>
      <div className="flex items-center gap-3 bg-brand-700 px-4 py-3 text-white">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-xl" aria-hidden="true">🌱</span>
        <div className="flex-1 leading-tight">
          <p className="font-display text-lg font-bold">Asistente Tiendita</p>
          <p className="text-[11px] text-white/80">{modoLLM ? 'Con IA · responde en segundos' : 'Modo local · gratis y sin conexión a IA'}</p>
        </div>
        <button onClick={onClose} aria-label="Cerrar asistente" className="rounded-full p-2 hover:bg-white/10"><Icon name="x" /></button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3" aria-live="polite" data-testid="chat-log">
        {msgs.map((m) => (
          <div key={m.id} className={`flex flex-col ${m.de === 'yo' ? 'items-end' : 'items-start'}`}>
            <div data-testid={m.de === 'bot' ? 'chat-bot' : 'chat-yo'} className={`max-w-[88%] rounded-2xl px-3.5 py-2 text-sm leading-snug ${m.de === 'yo' ? 'rounded-br-md bg-brand-600 text-white' : 'rounded-bl-md bg-surface text-ink ring-1 ring-line'}`}>
              <Rico t={m.texto} />
            </div>
            {m.aviso && <p className="mt-1 text-[11px] text-muted">{m.aviso}</p>}
            {!!m.productos?.length && (
              <div className="no-scrollbar mt-2 flex w-full gap-2 overflow-x-auto pb-1">
                {m.productos.map((p) => <MiniCard key={p.id} p={p} onAdd={() => addToCart(p.id, 1)} />)}
              </div>
            )}
            {!!m.acciones?.length && <div className="mt-2 flex flex-wrap gap-1.5">{m.acciones.map((a) => <Accion key={a.label} a={a} />)}</div>}
          </div>
        ))}
        {pensando && <div className="flex gap-1 rounded-2xl bg-surface px-4 py-3 ring-1 ring-line" style={{ width: 'fit-content' }} aria-label="Escribiendo"><span className="h-2 w-2 animate-bounce rounded-full bg-muted" /><span className="h-2 w-2 animate-bounce rounded-full bg-muted [animation-delay:120ms]" /><span className="h-2 w-2 animate-bounce rounded-full bg-muted [animation-delay:240ms]" /></div>}
        {msgs.length <= 1 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {SUGERENCIAS.map((s) => <button key={s} onClick={() => enviar(s)} className="rounded-full bg-surface-2 px-3 py-1.5 text-left text-xs font-semibold text-ink ring-1 ring-line">{s}</button>)}
          </div>
        )}
        <div ref={fin} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); enviar(q) }} className="flex items-center gap-2 border-t border-line bg-surface p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
        <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder={loading ? 'Cargando catálogo…' : 'Escribí tu pregunta…'} aria-label="Mensaje para el asistente" data-testid="chat-input"
          className="flex-1 rounded-full bg-surface-2 px-4 py-2.5 text-sm text-ink outline-none ring-1 ring-line focus:ring-brand-500" maxLength={400} enterKeyHint="send" />
        <button disabled={!q.trim() || pensando} aria-label="Enviar" className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-white disabled:opacity-40"><Icon name="send" size={18} /></button>
      </form>
    </div>
    </>
  )
}
