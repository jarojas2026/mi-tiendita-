// v5 — Ajustes de la tienda (Firestore settings/tienda): zonas y tarifas de envío, días de ruta,
// franjas de entrega, horario y umbral de stock bajo. Lectura pública, solo admin escribe.
import { useState } from 'react'
import { Card } from '../../components/ui'
import { nombreDia } from '../../lib/format'
import { useStore } from '../../store'
import { ajustesDefault, saveAjustes } from '../../services/settings'
import type { Ajustes as AjustesT, ZonaCfg } from '../../types'

const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)

export default function Ajustes() {
  const { ajustes, setAjustes, api } = useStore()
  const [a, setA] = useState<AjustesT>(() => JSON.parse(JSON.stringify(ajustes)))
  const [franjasTxt, setFranjasTxt] = useState(ajustes.franjas.join('\n'))
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const setZona = (i: number, z: Partial<ZonaCfg>) => setA((x) => ({ ...x, zonas: x.zonas.map((y, j) => (j === i ? { ...y, ...z } : y)) }))
  const inp = 'rounded-lg border border-line bg-surface px-2 py-1 text-sm'

  const guardar = async () => {
    setMsg(''); setBusy(true)
    const franjas = franjasTxt.split('\n').map((x) => x.trim()).filter(Boolean)
    const zonas = a.zonas.filter((z) => z.nombre.trim()).map((z) => ({ ...z, nombre: z.nombre.trim(), id: z.id || slug(z.nombre) }))
    if (!franjas.length) { setBusy(false); return setMsg('⚠️ Poné al menos una franja de entrega.') }
    const nuevo: AjustesT = { ...a, zonas, franjas, stockBajo: Math.max(0, Math.round(a.stockBajo)) }
    try { await saveAjustes(nuevo); setAjustes(nuevo); setMsg('✅ Ajustes guardados. Los clientes ven los cambios al recargar la página.') }
    catch (e) { setMsg(`⚠️ ${(e as Error).message}`) } finally { setBusy(false) }
  }

  const provisionales = a.zonas.filter((z) => z.provisional && z.activa !== false).length
  return (
    <div className="space-y-3" data-testid="admin-ajustes">
      {provisionales > 0 && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">⚠️ Hay <b>{provisionales}</b> zonas con tarifa <b>PROVISIONAL</b> (el cliente ve "aprox."). Cuando confirmés la tarifa, quitá la marca "Provisional" y guardá.</p>}
      <Card className="space-y-2">
        <h3 className="font-bold">🛵 Zonas y tarifas de envío</h3>
        <p className="text-xs text-muted">Tarifa vacía = "por cotizar". 0 = gratis. Días = días de ruta en que se entrega en esa zona.</p>
        {a.zonas.map((z, i) => (
          <div key={z.id || i} className={`space-y-1.5 rounded-xl p-2 ring-1 ring-line ${z.activa === false ? 'opacity-60' : ''} ${z.provisional ? 'bg-amber-50/60 dark:bg-amber-900/20' : 'bg-surface-2'}`}>
            <div className="flex flex-wrap items-center gap-2">
              <input className={`${inp} min-w-44 flex-1`} value={z.nombre} onChange={(e) => setZona(i, { nombre: e.target.value })} aria-label="Nombre de la zona" />
              <input className={`${inp} w-24`} inputMode="numeric" placeholder="cotizar" aria-label="Tarifa ₡" value={z.tarifa == null ? '' : String(z.tarifa)} onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); setZona(i, { tarifa: v === '' ? null : Number(v) }) }} />
              <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={!!z.provisional} onChange={(e) => setZona(i, { provisional: e.target.checked })} />Provisional</label>
              <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={z.activa !== false} onChange={(e) => setZona(i, { activa: e.target.checked })} />Activa</label>
              {z.retiro && <span className="rounded-full bg-surface px-2 text-[11px] font-semibold">retiro en tienda</span>}
            </div>
            <div className="flex flex-wrap gap-1">
              {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                <label key={d} className={`cursor-pointer rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-line ${z.diasRuta.includes(d) ? 'bg-brand-600 text-white' : 'bg-surface'}`}>
                  <input type="checkbox" className="sr-only" checked={z.diasRuta.includes(d)} onChange={(e) => setZona(i, { diasRuta: e.target.checked ? [...z.diasRuta, d].sort() : z.diasRuta.filter((x) => x !== d) })} />{nombreDia(d).slice(0, 3)}
                </label>
              ))}
            </div>
          </div>
        ))}
        <button onClick={() => setA((x) => ({ ...x, zonas: [...x.zonas, { id: '', nombre: '', tarifa: null, diasRuta: [6], provisional: true, activa: true }] }))} className="text-sm font-semibold text-brand-600 dark:text-brand-300">+ Agregar zona</button>
      </Card>
      <Card className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold">🕒 Franjas de entrega (una por línea)
          <textarea className={`${inp} mt-1 block h-24 w-full`} value={franjasTxt} onChange={(e) => setFranjasTxt(e.target.value)} />
        </label>
        <div className="space-y-3">
          <label className="block text-sm font-semibold">🏪 Horario de atención
            <input className={`${inp} mt-1 block w-full`} value={a.horario} onChange={(e) => setA({ ...a, horario: e.target.value })} />
          </label>
          <label className="block text-sm font-semibold">📦 Alerta de stock bajo (≤)
            <input className={`${inp} mt-1 block w-24`} inputMode="numeric" value={String(a.stockBajo)} onChange={(e) => setA({ ...a, stockBajo: Number(e.target.value.replace(/\D/g, '') || 0) })} />
          </label>
        </div>
      </Card>
      <div className="flex flex-wrap items-center gap-2">
        <button disabled={busy} onClick={guardar} className="rounded-xl bg-brand-600 px-5 py-2.5 font-bold text-white disabled:opacity-50">{busy ? 'Guardando…' : 'Guardar ajustes'}</button>
        <button onClick={() => { const d = ajustesDefault(); setA(d); setFranjasTxt(d.franjas.join('\n')); setMsg('Valores de fábrica cargados: tocá Guardar para aplicarlos.') }} className="rounded-xl bg-surface px-4 py-2.5 text-sm font-semibold ring-1 ring-line">Restaurar valores de fábrica</button>
        {a.actualizado && <span className="text-xs text-muted">Última vez guardado: {new Date(a.actualizado).toLocaleString('es-CR')}</span>}
      </div>
      {msg && <p role="status" className="rounded-lg bg-surface-2 p-2 text-sm">{msg}</p>}
      {api?.modo === 'demo' && <p className="text-xs text-muted">Modo demo: estos ajustes se guardan solo en este navegador.</p>}
    </div>
  )
}
