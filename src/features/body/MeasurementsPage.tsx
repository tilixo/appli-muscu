import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { PageHeader } from '../../components/PageHeader'
import { Sheet } from '../../components/Sheet'
import { btnDanger, btnGhost, btnPrimary, card, input } from '../../components/ui'
import { db } from '../../db/db'
import { MEASURES, type MeasureKey, type MeasurementRow } from '../../db/types'
import { localDay } from '../../lib/dates'
import { fmtDay, fmtNumber, fmtShortDate, parseDecimal } from '../../lib/format'
import { NumInput } from '../nutrition/ui'

const fmt = (n: number) => fmtNumber(Math.round(n * 10) / 10)

export default function MeasurementsPage() {
  const rows = useLiveQuery(() => db.measurements.orderBy('date').toArray(), []) ?? []
  const [editing, setEditing] = useState<MeasurementRow | 'new' | null>(null)

  // Pour chaque mesure : première et dernière valeur connues.
  const summary = MEASURES.map((m) => {
    const known = rows.filter((r) => r.values[m.key] !== undefined)
    return { ...m, first: known[0], last: known.at(-1) }
  }).filter((m) => m.last)

  return (
    <div>
      <PageHeader title="Mensurations" backTo="/corps" right={<button type="button" className={btnGhost} onClick={() => setEditing('new')}>+ Ajouter</button>} />
      <div className="space-y-4 px-3 pb-6">
        {rows.length === 0 ? (
          <p className={`${card} p-4 text-sm text-zinc-400`}>
            Facultatif : mesure-toi toutes les 2 à 4 semaines, au même moment de la journée. Tous les champs sont optionnels.
          </p>
        ) : (
          <section className={`${card} divide-y divide-zinc-800`}>
            {summary.map((m) => {
              const delta = m.first && m.last && m.first !== m.last ? m.last.values[m.key]! - m.first.values[m.key]! : null
              return (
                <div key={m.key} className="flex min-h-12 items-center gap-3 px-4 py-2">
                  <span className="flex-1">{m.label}</span>
                  <span className="text-right">
                    <span className="block font-mono font-semibold">
                      {fmt(m.last!.values[m.key]!)} {m.unit}
                    </span>
                    {delta !== null && (
                      <span className="block text-xs text-zinc-500">
                        {delta > 0 ? '+' : delta < 0 ? '−' : '±'}
                        {fmt(Math.abs(delta))} depuis le {fmtShortDate(m.first!.date + 'T12:00:00')}
                      </span>
                    )}
                  </span>
                </div>
              )
            })}
          </section>
        )}

        {rows.length > 0 && (
          <section className="space-y-2">
            <h2 className="px-1 text-sm font-semibold tracking-wide text-zinc-400 uppercase">Historique</h2>
            <ul className="space-y-2">
              {[...rows].reverse().map((r) => (
                <li key={r.date}>
                  <button type="button" onClick={() => setEditing(r)} className={`${card} block w-full p-3 text-left active:bg-zinc-800`}>
                    <div className="font-medium">{fmtDay(r.date + 'T12:00:00')}</div>
                    <div className="mt-1 text-sm text-zinc-400">
                      {MEASURES.filter((m) => r.values[m.key] !== undefined)
                        .map((m) => `${m.label} ${fmt(r.values[m.key]!)} ${m.unit}`)
                        .join(' · ')}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      <MeasurementSheet row={editing} previous={rows.at(-1)} onClose={() => setEditing(null)} />
    </div>
  )
}

function MeasurementSheet({ row, previous, onClose }: { row: MeasurementRow | 'new' | null; previous?: MeasurementRow; onClose: () => void }) {
  const today = localDay()
  const [date, setDate] = useState(today)
  const [values, setValues] = useState<Partial<Record<MeasureKey, string>>>({})

  useEffect(() => {
    if (row === null) return
    const source = row === 'new' ? undefined : row
    setDate(source?.date ?? today)
    setValues(Object.fromEntries(Object.entries(source?.values ?? {}).map(([k, v]) => [k, fmtNumber(v)])))
  }, [row, today])

  const save = async () => {
    const parsed: MeasurementRow['values'] = {}
    for (const m of MEASURES) {
      const n = parseDecimal(values[m.key] ?? '')
      if (!Number.isNaN(n) && n > 0) parsed[m.key] = n
    }
    await db.transaction('rw', db.measurements, async () => {
      if (row !== 'new' && row && row.date !== date) await db.measurements.delete(row.date)
      // Nouvelle saisie sur une date déjà mesurée : on complète au lieu d'écraser.
      const existing = row === 'new' ? await db.measurements.get(date) : undefined
      const merged = { ...existing?.values, ...parsed }
      if (Object.keys(merged).length) await db.measurements.put({ date, values: merged })
      else await db.measurements.delete(date)
    })
    onClose()
  }

  return (
    <Sheet open={row !== null} onClose={onClose} title={row === 'new' ? 'Nouvelles mensurations' : 'Modifier'}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <label className="block space-y-1">
          <span className="text-sm text-zinc-400">Date</span>
          <input type="date" className={input} value={date} max={today} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <div className="grid grid-cols-2 gap-3">
          {MEASURES.map((m) => (
            <div key={m.key}>
              <NumInput label={m.label} value={values[m.key] ?? ''} onChange={(v) => setValues({ ...values, [m.key]: v })} suffix={m.unit} />
              {row === 'new' && previous?.values[m.key] !== undefined && (
                <span className="text-xs text-zinc-500">Préc. {fmt(previous.values[m.key]!)}</span>
              )}
            </div>
          ))}
        </div>
        <button type="submit" className={`${btnPrimary} w-full`}>Enregistrer</button>
        {row !== 'new' && row && (
          <button
            type="button"
            className={`${btnDanger} w-full`}
            onClick={async () => {
              await db.measurements.delete(row.date)
              onClose()
            }}
          >
            Supprimer
          </button>
        )}
      </form>
    </Sheet>
  )
}
