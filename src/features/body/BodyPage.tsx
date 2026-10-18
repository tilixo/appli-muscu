import { useLiveQuery } from 'dexie-react-hooks'
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { PageHeader } from '../../components/PageHeader'
import { Sheet } from '../../components/Sheet'
import { Stepper } from '../../components/Stepper'
import { btnDanger, btnPrimary, btnSecondary, card, chip, input } from '../../components/ui'
import { db } from '../../db/db'
import type { WeighInRow } from '../../db/types'
import { localDay } from '../../lib/dates'
import { fmtDay, fmtNumber } from '../../lib/format'
import { useProfile } from '../../lib/profile'
import { weightTrendPerWeek } from '../progression/progression'
import { addDays, smoothedWeights } from '../tdee/tdee'

const WeightChart = lazy(() => import('./WeightChart'))

const RANGES = [
  { label: '1 mois', days: 31 },
  { label: '3 mois', days: 92 },
  { label: '6 mois', days: 183 },
  { label: '1 an', days: 366 },
  { label: 'Tout', days: Infinity },
]
const PAGE = 20

const fmtKg = (n: number) => `${fmtNumber(Math.round(n * 10) / 10)} kg`
const signed = (n: number, unit: string) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${fmtNumber(Math.round(Math.abs(n) * 100) / 100)} ${unit}`

export default function BodyPage() {
  const today = localDay()
  const profile = useProfile()
  const weighIns = useLiveQuery(() => db.weighIns.orderBy('date').toArray(), [])
  const [range, setRange] = useState(1)
  const [limit, setLimit] = useState(PAGE)
  const [editing, setEditing] = useState<WeighInRow | 'new' | null>(null)

  const smoothed = useMemo(() => smoothedWeights(weighIns ?? []), [weighIns])
  const smoothByDate = useMemo(() => new Map(smoothed.map((s) => [s.date, s.kg])), [smoothed])
  if (!weighIns) return null

  const todayRow = weighIns.find((w) => w.date === today)
  const last = weighIns.at(-1)
  const lastSmooth = smoothed.at(-1)
  const trend = weightTrendPerWeek(weighIns, today)
  const monthAgo = smoothed.filter((s) => s.date <= addDays(today, -30)).at(-1)

  const since = RANGES[range].days === Infinity ? '' : addDays(today, -RANGES[range].days)
  const chartPoints = weighIns.filter((w) => w.date >= since).map((w) => ({ date: w.date, raw: w.kg, smooth: smoothByDate.get(w.date) ?? w.kg }))

  return (
    <div>
      <PageHeader title="Corps" />
      <div className="space-y-4 px-3 pb-6">
        <QuickWeighIn initial={todayRow?.kg ?? last?.kg ?? profile.weightKg ?? 70} exists={!!todayRow} today={today} onOtherDate={() => setEditing('new')} />

        {weighIns.length > 0 && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <Tile label="Moyenne 7 j" value={lastSmooth ? fmtKg(lastSmooth.kg) : '—'} />
            <Tile label="Tendance / sem." value={trend === null ? '—' : signed(trend, 'kg')} />
            <Tile label="Sur 30 jours" value={monthAgo && lastSmooth ? signed(lastSmooth.kg - monthAgo.kg, 'kg') : '—'} />
          </div>
        )}

        {chartPoints.length >= 2 && (
          <section className={`${card} p-3`}>
            <div className="mb-2 flex gap-1 overflow-x-auto">
              {RANGES.map((r, i) => (
                <button key={r.label} type="button" onClick={() => setRange(i)} className={`${chip} ${range === i ? 'bg-zinc-700' : 'text-zinc-400'}`}>
                  {r.label}
                </button>
              ))}
            </div>
            <Suspense fallback={<div className="h-56" />}>
              <WeightChart points={chartPoints} />
            </Suspense>
          </section>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Link to="/corps/progression" className={`${btnPrimary} min-h-14`}>Progression</Link>
          <Link to="/corps/mensurations" className={`${btnSecondary} min-h-14`}>Mensurations</Link>
        </div>

        {weighIns.length > 0 && (
          <section className="space-y-2">
            <h2 className="px-1 text-sm font-semibold tracking-wide text-zinc-400 uppercase">Pesées</h2>
            <ul className="divide-y divide-zinc-800 overflow-hidden rounded-2xl bg-zinc-900">
              {[...weighIns].reverse().slice(0, limit).map((w) => (
                <li key={w.date}>
                  <button type="button" onClick={() => setEditing(w)} className="flex min-h-12 w-full items-center gap-3 px-4 text-left active:bg-zinc-800">
                    <span className="flex-1">{fmtDay(w.date + 'T12:00:00')}</span>
                    <span className="font-mono font-semibold">{fmtKg(w.kg)}</span>
                    <span className="w-20 text-right font-mono text-sm text-zinc-500">{fmtKg(smoothByDate.get(w.date) ?? w.kg)}</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="px-1 text-xs text-zinc-500">À droite : moyenne lissée sur 7 jours.</p>
            {weighIns.length > limit && (
              <button type="button" className={`${btnSecondary} w-full`} onClick={() => setLimit(limit + PAGE)}>Voir plus</button>
            )}
          </section>
        )}
      </div>
      <WeighInSheet row={editing} today={today} defaultKg={last?.kg ?? 70} onClose={() => setEditing(null)} />
    </div>
  )
}

function QuickWeighIn({ initial, exists, today, onOtherDate }: { initial: number; exists: boolean; today: string; onOtherDate: () => void }) {
  const [kg, setKg] = useState(initial)
  const [saved, setSaved] = useState(false)
  return (
    <section className={`${card} space-y-3 p-4`}>
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">Pesée du jour</h2>
        <button type="button" onClick={onOtherDate} className="min-h-11 text-sm text-lime-400">Autre date</button>
      </div>
      <Stepper value={kg} onChange={(v) => { setKg(v); setSaved(false) }} step={0.1} min={20} max={400} decimal label="poids en kg" />
      <button
        type="button"
        className={`${btnPrimary} min-h-14 w-full text-lg`}
        onClick={async () => {
          await db.weighIns.put({ date: today, kg })
          setSaved(true)
        }}
      >
        {saved ? '✓ Enregistré' : exists ? 'Mettre à jour' : 'Enregistrer'}
      </button>
      <p className="text-xs text-zinc-500">Idéalement le matin, à jeun, après être passé aux toilettes : c'est la régularité qui compte.</p>
    </section>
  )
}

function WeighInSheet({ row, today, defaultKg, onClose }: { row: WeighInRow | 'new' | null; today: string; defaultKg: number; onClose: () => void }) {
  const [date, setDate] = useState(today)
  const [kg, setKg] = useState(defaultKg)
  useEffect(() => {
    if (row === 'new') {
      setDate(addDays(today, -1))
      setKg(defaultKg)
    } else if (row) {
      setDate(row.date)
      setKg(row.kg)
    }
  }, [row, today, defaultKg])

  const isNew = row === 'new'
  return (
    <Sheet open={row !== null} onClose={onClose} title={isNew ? 'Ajouter une pesée' : 'Modifier la pesée'}>
      <div className="space-y-4">
        <label className="block space-y-1">
          <span className="text-sm text-zinc-400">Date</span>
          <input type="date" className={input} value={date} max={today} disabled={!isNew} onChange={(e) => setDate(e.target.value)} />
        </label>
        <Stepper value={kg} onChange={setKg} step={0.1} min={20} max={400} decimal label="poids en kg" />
        <button
          type="button"
          className={`${btnPrimary} w-full`}
          disabled={!date}
          onClick={async () => {
            await db.weighIns.put({ date, kg })
            onClose()
          }}
        >
          Enregistrer
        </button>
        {!isNew && row && (
          <button
            type="button"
            className={`${btnDanger} w-full`}
            onClick={async () => {
              await db.weighIns.delete(row.date)
              onClose()
            }}
          >
            Supprimer
          </button>
        )}
      </div>
    </Sheet>
  )
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-zinc-900 px-2 py-2">
      <div className="font-mono text-base font-semibold">{value}</div>
      <div className="truncate text-xs text-zinc-500">{label}</div>
    </div>
  )
}
