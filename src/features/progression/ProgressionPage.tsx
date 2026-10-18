import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Bar, CartesianGrid, ComposedChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { PageHeader } from '../../components/PageHeader'
import { Sheet } from '../../components/Sheet'
import { btnGhost, btnPrimary, card } from '../../components/ui'
import { db } from '../../db/db'
import { localDay } from '../../lib/dates'
import { fmtInt, fmtNumber, fmtShortDate } from '../../lib/format'
import { epley } from '../../lib/oneRepMax'
import { useProfile } from '../../lib/profile'
import { updateSettings, useSettings } from '../../lib/settings'
import { dailyIntakes, goalsForDate } from '../nutrition/nutrition'
import { addDays, smoothedWeights, weeklyAdaptiveTdee } from '../tdee/tdee'
import { TdeeInfo } from '../tdee/TdeeInfo'
import { seriesChange, weekStarts, weeklyLast, weeklyMax } from './progression'

const PERIODS = [
  { label: '1 mois', weeks: 5 },
  { label: '3 mois', weeks: 13 },
  { label: '6 mois', weeks: 26 },
  { label: '1 an', weeks: 52 },
]
const EX_COLORS = ['#a3e635', '#38bdf8', '#fbbf24', '#f472b6']
const MAX_KEY_EXERCISES = 4
const DEFAULT_KEY_NAMES = ['Squat', 'Développé couché', 'Soulevé de terre']

const axis = { tick: { fill: '#71717a', fontSize: 11 }, tickLine: false, axisLine: false } as const
const tooltipStyle = { contentStyle: { background: '#18181b', border: '1px solid #3f3f46', borderRadius: 12 }, labelStyle: { color: '#a1a1aa' } }

export default function ProgressionPage() {
  const today = localDay()
  const profile = useProfile()
  const settings = useSettings()
  const [period, setPeriod] = useState(1)
  const [choosing, setChoosing] = useState(false)

  const weeks = weekStarts(addDays(today, -(PERIODS[period].weeks * 7 - 1)), today)
  const from = weeks[0]

  const raw = useLiveQuery(async () => {
    const fromIso = new Date(from + 'T00:00:00').toISOString()
    const [weighIns, entries, goals, sets, exercises, workouts] = await Promise.all([
      db.weighIns.toArray(),
      db.foodEntries.where('date').aboveOrEqual(addDays(from, -profile.adaptiveWindowDays)).toArray(),
      db.nutritionGoals.toArray(),
      db.sets.where('doneAt').aboveOrEqual(fromIso).toArray(),
      db.exercises.toArray(),
      db.workouts.toArray(),
    ])
    return { weighIns, entries, goals, sets, exercises, workouts }
  }, [from, profile.adaptiveWindowDays])

  const keyIds = useMemo(() => {
    if (settings.keyExerciseIds) return settings.keyExerciseIds
    return DEFAULT_KEY_NAMES.map((n) => raw?.exercises.find((e) => e.name === n)?.id).filter((id): id is number => id !== undefined)
  }, [settings.keyExerciseIds, raw?.exercises])

  const model = useMemo(() => {
    if (!raw) return null
    const labels = weeks.map((w) => fmtShortDate(w + 'T12:00:00'))

    const weight = weeklyLast(smoothedWeights(raw.weighIns).map((s) => ({ date: s.date, value: s.kg })), weeks)

    const intakes = dailyIntakes(raw.entries)
    const tdeeWeeks = weeklyAdaptiveTdee({ intakes, weighIns: raw.weighIns, windowDays: profile.adaptiveWindowDays, from, to: today })
    const goal = weeks.map((w) => (raw.goals.length ? goalsForDate(raw.goals, addDays(w, 6) < today ? addDays(w, 6) : today).kcal : null))

    // Séries des séances en cours exclues : on ne compare que des séances terminées.
    const done = new Set(raw.workouts.filter((w) => w.endedAt).map((w) => w.id))
    const strength = keyIds.map((id) => {
      const pts = raw.sets
        .filter((s) => s.exerciseId === id && done.has(s.workoutId))
        .map((s) => ({ date: localDay(new Date(s.doneAt)), value: epley(s.weight, s.reps) }))
      return { id, name: raw.exercises.find((e) => e.id === id)?.name ?? '?', values: weeklyMax(pts, weeks).map((v) => (v === null ? null : Math.round(v * 10) / 10)) }
    })

    const rows = weeks.map((_, i) => ({
      week: labels[i],
      weight: weight[i] === null ? null : Math.round(weight[i]! * 10) / 10,
      intake: tdeeWeeks[i]?.avgIntake ?? null,
      tdee: tdeeWeeks[i]?.tdee ?? null,
      goal: goal[i],
      ...Object.fromEntries(strength.map((s) => [`ex${s.id}`, s.values[i]])),
    }))
    const knownIntakes = tdeeWeeks.map((t) => t.avgIntake).filter((v): v is number => v !== null)
    return {
      rows,
      strength,
      weightChange: seriesChange(weight),
      avgIntake: knownIntakes.length ? Math.round(knownIntakes.reduce((a, b) => a + b, 0) / knownIntakes.length) : null,
      lastTdee: [...tdeeWeeks].reverse().find((t) => t.tdee !== null)?.tdee ?? null,
      hasWeight: weight.some((v) => v !== null),
      hasIntake: knownIntakes.length > 0,
    }
  }, [raw, weeks.join(), keyIds, profile.adaptiveWindowDays, today, from])

  if (!model) return null

  return (
    <div>
      <PageHeader title="Progression" backTo="/corps" />
      <div className="space-y-4 px-3 pb-6">
        <div className="flex gap-1 rounded-xl bg-zinc-900 p-1">
          {PERIODS.map((p, i) => (
            <button key={p.label} type="button" onClick={() => setPeriod(i)} className={`min-h-11 flex-1 rounded-lg text-sm font-medium ${period === i ? 'bg-zinc-700' : 'text-zinc-400'}`}>
              {p.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <Tile label="Poids lissé" value={model.weightChange ? signed(model.weightChange.delta) : '—'} unit="kg" />
          <Tile label="Apport moyen" value={model.avgIntake ? fmtInt(model.avgIntake) : '—'} unit="kcal" />
          <Tile label="TDEE adaptatif" value={model.lastTdee ? fmtInt(model.lastTdee) : '—'} unit="kcal" />
        </div>

        <ChartCard title="Poids lissé (kg)" empty={!model.hasWeight && 'Aucune pesée sur la période.'}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={model.rows} syncId="progression" margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#27272a" vertical={false} />
              <XAxis dataKey="week" {...axis} minTickGap={24} />
              <YAxis {...axis} domain={['auto', 'auto']} width={40} tickFormatter={(v) => fmtNumber(Math.round(v * 10) / 10)} />
              <Tooltip {...tooltipStyle} formatter={(v) => [`${fmtNumber(Number(v))} kg`, 'Poids lissé']} />
              <Line dataKey="weight" type="monotone" stroke="#e4e4e7" strokeWidth={2.5} dot={{ r: 2.5, fill: '#e4e4e7' }} connectNulls isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Calories : apport moyen et TDEE (kcal/j)"
          right={<TdeeInfo />}
          empty={!model.hasIntake && 'Aucun repas loggé sur la période.'}
          legend={[
            { label: 'Apport moyen', swatch: 'h-2.5 w-2.5 rounded-sm bg-sky-400/70' },
            { label: 'TDEE adaptatif', swatch: 'h-0.5 w-4 bg-lime-400' },
            { label: 'Objectif', swatch: 'h-0.5 w-4 border-t border-dashed border-zinc-400' },
          ]}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={model.rows} syncId="progression" margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#27272a" vertical={false} />
              <XAxis dataKey="week" {...axis} minTickGap={24} />
              <YAxis {...axis} domain={[(min: number) => Math.max(0, Math.floor((min - 300) / 100) * 100), 'auto']} width={44} tickFormatter={(v) => fmtInt(v)} />
              <Tooltip
                {...tooltipStyle}
                formatter={(v, name) => [`${fmtInt(Number(v))} kcal`, name === 'intake' ? 'Apport moyen' : name === 'tdee' ? 'TDEE adaptatif' : 'Objectif']}
              />
              <Bar dataKey="intake" fill="#38bdf8" fillOpacity={0.7} radius={[4, 4, 0, 0]} isAnimationActive={false} />
              <Line dataKey="goal" type="stepAfter" stroke="#a1a1aa" strokeDasharray="4 4" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              <Line dataKey="tdee" type="monotone" stroke="#a3e635" strokeWidth={2.5} dot={{ r: 2.5, fill: '#a3e635' }} connectNulls isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Force : 1RM estimé (kg)"
          right={<button type="button" className={btnGhost} onClick={() => setChoosing(true)}>Exercices</button>}
          empty={(keyIds.length === 0 && 'Choisis des exercices clés à suivre.') || (model.strength.every((s) => s.values.every((v) => v === null)) && 'Aucune séance avec ces exercices sur la période.')}
          legend={model.strength.map((s, i) => {
            const c = seriesChange(s.values)
            return {
              label: `${s.name}${c ? ` ${signed(c.delta)} kg (${signed((c.delta / c.from) * 100, 0)} %)` : ''}`,
              swatch: 'h-0.5 w-4',
              color: EX_COLORS[i],
            }
          })}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={model.rows} syncId="progression" margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#27272a" vertical={false} />
              <XAxis dataKey="week" {...axis} minTickGap={24} />
              <YAxis {...axis} domain={['auto', 'auto']} width={44} tickFormatter={(v) => fmtInt(v)} />
              <Tooltip {...tooltipStyle} formatter={(v, name) => [`${fmtNumber(Number(v))} kg`, model.strength.find((s) => `ex${s.id}` === name)?.name ?? '']} />
              {model.strength.map((s, i) => (
                <Line key={s.id} dataKey={`ex${s.id}`} type="monotone" stroke={EX_COLORS[i]} strokeWidth={2.5} dot={{ r: 2.5, fill: EX_COLORS[i] }} connectNulls isAnimationActive={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <KeyExercisesSheet open={choosing} onClose={() => setChoosing(false)} selected={keyIds} />
    </div>
  )
}

const signed = (n: number, digits = 1) => {
  const f = 10 ** digits
  const r = Math.round(n * f) / f
  return `${r > 0 ? '+' : r < 0 ? '−' : '±'}${fmtNumber(Math.abs(r))}`
}

function Tile({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-xl bg-zinc-900 px-2 py-2">
      <div className="font-mono text-base font-semibold">
        {value}
        {unit && value !== '—' && <span className="text-xs font-normal text-zinc-400"> {unit}</span>}
      </div>
      <div className="truncate text-xs text-zinc-500">{label}</div>
    </div>
  )
}

interface LegendItem {
  label: string
  swatch: string
  color?: string
}

function ChartCard({ title, right, empty, legend, children }: { title: string; right?: ReactNode; empty: string | false; legend?: LegendItem[]; children: ReactNode }) {
  return (
    <section className={`${card} p-3`}>
      <div className="flex min-h-11 items-center justify-between gap-2 pl-1">
        <h2 className="text-sm font-semibold">{title}</h2>
        {right}
      </div>
      {empty ? (
        <p className="py-6 text-center text-sm text-zinc-500">{empty}</p>
      ) : (
        <>
          <div className="h-48">{children}</div>
          {legend && legend.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
              {legend.map((l) => (
                <span key={l.label} className="flex items-center gap-1">
                  <span className={l.swatch} style={l.color ? { background: l.color } : undefined} />
                  {l.label}
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}

function KeyExercisesSheet({ open, onClose, selected }: { open: boolean; onClose: () => void; selected: number[] }) {
  const [draft, setDraft] = useState<number[]>(selected)
  useEffect(() => {
    if (open) setDraft(selected)
  }, [open, selected])
  // Exercices déjà pratiqués, les plus fréquents d'abord.
  const options = useLiveQuery(async () => {
    if (!open) return []
    const [sets, exercises] = await Promise.all([db.sets.toArray(), db.exercises.toArray()])
    const count = new Map<number, number>()
    for (const s of sets) count.set(s.exerciseId, (count.get(s.exerciseId) ?? 0) + 1)
    return exercises.filter((e) => count.has(e.id) || selected.includes(e.id)).sort((a, b) => (count.get(b.id) ?? 0) - (count.get(a.id) ?? 0))
  }, [open])

  const toggle = (id: number) =>
    setDraft((d) => (d.includes(id) ? d.filter((x) => x !== id) : d.length >= MAX_KEY_EXERCISES ? d : [...d, id]))

  return (
    <Sheet open={open} onClose={onClose} title="Exercices clés">
      <p className="pb-2 text-sm text-zinc-500">Jusqu'à {MAX_KEY_EXERCISES} exercices, parmi ceux que tu as déjà faits.</p>
      <ul className="divide-y divide-zinc-800">
        {options?.map((e) => {
          const idx = draft.indexOf(e.id)
          return (
            <li key={e.id}>
              <button type="button" onClick={() => toggle(e.id)} className="flex min-h-12 w-full items-center gap-3 text-left active:bg-zinc-800">
                <span className="h-6 w-6 shrink-0 rounded-full border-2 border-zinc-600" style={idx >= 0 ? { background: EX_COLORS[idx], borderColor: EX_COLORS[idx] } : undefined} />
                <span className="flex-1">{e.name}</span>
              </button>
            </li>
          )
        })}
        {options?.length === 0 && <li className="py-4 text-zinc-500">Fais quelques séances pour pouvoir suivre ta force ici.</li>}
      </ul>
      <button
        type="button"
        className={`${btnPrimary} mt-3 w-full`}
        onClick={async () => {
          await updateSettings({ keyExerciseIds: draft })
          onClose()
        }}
      >
        Enregistrer
      </button>
    </Sheet>
  )
}
