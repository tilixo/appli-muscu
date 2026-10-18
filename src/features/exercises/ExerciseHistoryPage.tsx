import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { PageHeader } from '../../components/PageHeader'
import { btnGhost, btnSecondary, card, chip } from '../../components/ui'
import { db } from '../../db/db'
import type { Exercise } from '../../db/types'
import { fmtDuration, fmtNumber, fmtSet, fmtShortDate, fmtDay } from '../../lib/format'
import { epley, round1 } from '../../lib/oneRepMax'
import { useSettings } from '../../lib/settings'
import { setsForExercise } from '../workouts/workoutService'
import { ExerciseForm } from './ExerciseForm'
import { bestBy, computeSessions } from './exerciseStats'

const RANGES = [
  { label: '3 mois', days: 91 },
  { label: '6 mois', days: 182 },
  { label: '1 an', days: 365 },
  { label: 'Tout', days: Infinity },
]

export default function ExerciseHistoryPage() {
  const id = Number(useParams().id)
  const exercise = useLiveQuery(() => db.exercises.get(id), [id])
  if (exercise === undefined) return null
  if (!exercise) return <PageHeader title="Exercice introuvable" backTo="/exercices" />
  return <History exercise={exercise} />
}

function History({ exercise }: { exercise: Exercise }) {
  const { defaultRestSeconds } = useSettings()
  const [editing, setEditing] = useState(false)
  const [range, setRange] = useState(1)
  const sets = useLiveQuery(() => setsForExercise(exercise.id), [exercise.id])
  const workouts = useLiveQuery(() => db.workouts.toArray(), [])

  const sessions = useMemo(() => {
    // On ignore les séries de la séance en cours (pas encore terminée).
    const done = new Set(workouts?.filter((w) => w.endedAt).map((w) => w.id))
    return computeSessions((sets ?? []).filter((s) => done.has(s.workoutId)))
  }, [sets, workouts])

  const allSets = sessions.flatMap((s) => s.sets)
  const bestE1rm = bestBy(allSets, (s) => epley(s.weight, s.reps))
  const heaviest = bestBy(allSets, (s) => s.weight)

  const since = Date.now() - RANGES[range].days * 86_400_000
  const chartData = sessions
    .filter((s) => new Date(s.date).getTime() >= since)
    .map((s) => ({ date: fmtShortDate(s.date), e1rm: round1(s.bestE1rm), max: s.maxWeight }))

  return (
    <div>
      <PageHeader title={exercise.name} back right={<button type="button" className={btnGhost} onClick={() => setEditing(true)}>Modifier</button>} />
      <div className="space-y-4 px-3 pb-6">
        <div className="flex flex-wrap gap-2 text-sm text-zinc-400">
          <span className={`${chip} bg-zinc-900`}>{exercise.muscleGroup}</span>
          <span className={`${chip} bg-zinc-900`}>Repos {fmtDuration(exercise.restSeconds ?? defaultRestSeconds)}</span>
          {exercise.archived && (
            <button type="button" className={`${chip} bg-amber-400/15 text-amber-300`} onClick={() => db.exercises.update(exercise.id, { archived: false })}>
              Archivé · restaurer
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <RecordCard title="1RM estimé" value={bestE1rm ? `${fmtNumber(round1(bestE1rm.value))} kg` : '—'} detail={bestE1rm ? `${fmtSet(bestE1rm.set)} · ${fmtShortDate(bestE1rm.set.doneAt)}` : ''} />
          <RecordCard title="Charge max" value={heaviest ? `${fmtNumber(heaviest.value)} kg` : '—'} detail={heaviest ? `${fmtSet(heaviest.set)} · ${fmtShortDate(heaviest.set.doneAt)}` : ''} />
        </div>

        {sessions.length >= 2 ? (
          <section className={`${card} p-3`}>
            <div className="mb-2 flex gap-1 overflow-x-auto">
              {RANGES.map((r, i) => (
                <button key={r.label} type="button" onClick={() => setRange(i)} className={`${chip} ${range === i ? 'bg-zinc-700' : 'text-zinc-400'}`}>
                  {r.label}
                </button>
              ))}
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid stroke="#27272a" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis tick={{ fill: '#71717a', fontSize: 11 }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 12 }}
                    labelStyle={{ color: '#a1a1aa' }}
                    formatter={(v, name) => [`${fmtNumber(Number(v))} kg`, name === 'e1rm' ? '1RM estimé' : 'Charge max']}
                  />
                  <Line type="monotone" dataKey="e1rm" stroke="#a3e635" strokeWidth={2.5} dot={{ r: 3, fill: '#a3e635' }} isAnimationActive={false} />
                  <Line type="monotone" dataKey="max" stroke="#71717a" strokeWidth={1.5} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex gap-4 text-xs text-zinc-400">
              <span className="flex items-center gap-1"><span className="h-0.5 w-4 bg-lime-400" />1RM estimé</span>
              <span className="flex items-center gap-1"><span className="h-0.5 w-4 border-t border-dashed border-zinc-500" />Charge max</span>
            </div>
          </section>
        ) : (
          <p className={`${card} p-4 text-sm text-zinc-500`}>Le graphique apparaîtra après deux séances terminées avec cet exercice.</p>
        )}

        <section className="space-y-2">
          <h2 className="px-1 text-sm font-semibold tracking-wide text-zinc-400 uppercase">Séances ({sessions.length})</h2>
          {[...sessions].reverse().map((s) => (
            <Link key={s.workoutId} to={`/seance/${s.workoutId}`} className={`${card} block p-3 active:bg-zinc-800`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{fmtDay(s.date)}</span>
                <span className="flex gap-1">
                  {s.weightRecord && <Badge>Charge</Badge>}
                  {s.e1rmRecord && <Badge>1RM</Badge>}
                </span>
              </div>
              <div className="mt-1 font-mono text-sm text-zinc-300">{s.sets.map(fmtSet).join(' · ')}</div>
              <div className="mt-0.5 text-xs text-zinc-500">1RM estimé {fmtNumber(round1(s.bestE1rm))} kg</div>
            </Link>
          ))}
          {sessions.length === 0 && (
            <p className="px-1 text-zinc-500">Pas encore de séance terminée avec cet exercice.</p>
          )}
        </section>

        <Link to="/exercices" className={`${btnSecondary} w-full`}>Tous les exercices</Link>
      </div>
      <ExerciseForm open={editing} exercise={exercise} onClose={() => setEditing(false)} />
    </div>
  )
}

function RecordCard({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <div className={`${card} p-3`}>
      <div className="text-xs text-zinc-500">{title}</div>
      <div className="font-mono text-2xl font-semibold text-amber-300">{value}</div>
      <div className="truncate text-xs text-zinc-500">{detail}</div>
    </div>
  )
}

function Badge({ children }: { children: string }) {
  return <span className="rounded-md bg-amber-400/15 px-1.5 py-0.5 text-xs font-bold text-amber-300">🏆 {children}</span>
}
