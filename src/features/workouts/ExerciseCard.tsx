import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Sheet } from '../../components/Sheet'
import { Stepper } from '../../components/Stepper'
import { btnPrimary, btnSecondary, card, chip } from '../../components/ui'
import { db } from '../../db/db'
import type { Exercise, PlanItem, Workout, WorkoutSet } from '../../db/types'
import { fmtDuration, fmtSet, fmtShortDate } from '../../lib/format'
import { unlockAudio } from '../../lib/sound'
import { REST_OPTIONS } from '../exercises/ExerciseForm'
import { timer } from '../timer/timerStore'
import { SetEditSheet } from './SetEditSheet'
import { byDate, getBestsBefore, getPreviousSession, logSet, markRecords, type PRKind } from './workoutService'

const WEIGHT_STEPS = [0.5, 1, 2.5]
const DEFAULT_STEP = 2.5

interface Props {
  workout: Workout
  item: PlanItem
  index: number
  exercise: Exercise
  sets: WorkoutSet[]
  expanded: boolean
  defaultRest: number
  onToggle: () => void
  onSetLogged: (records: PRKind[]) => void
  onMove: (dir: -1 | 1) => void
  onRemove: () => void
  onTargetChange: (n: number) => void
}

export function ExerciseCard(props: Props) {
  const { workout, item, exercise, expanded, defaultRest, onToggle } = props
  const sets = useMemo(() => [...props.sets].sort(byDate), [props.sets])
  const prev = useLiveQuery(() => getPreviousSession(exercise.id, workout), [exercise.id, workout.id, workout.startedAt])
  const bests = useLiveQuery(() => getBestsBefore(exercise.id, workout), [exercise.id, workout.id, workout.startedAt])
  const records = useMemo(() => markRecords(sets, bests ?? null), [sets, bests])

  const [editing, setEditing] = useState<number | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [restOpen, setRestOpen] = useState(false)

  const step = exercise.weightStep ?? DEFAULT_STEP
  const rest = exercise.restSeconds ?? defaultRest
  const prevSets = prev?.sets ?? []
  const nextIndex = sets.length

  // Pré-remplissage : même série la dernière fois, sinon la dernière série faite.
  const suggestion = prevSets[nextIndex] ?? sets.at(-1) ?? prevSets.at(-1) ?? { weight: 0, reps: 10 }
  const [weight, setWeight] = useState(suggestion.weight)
  const [reps, setReps] = useState(suggestion.reps)
  const suggestionKey = `${nextIndex}|${prev === undefined ? 'loading' : (prev?.workoutId ?? 'none')}`
  useEffect(() => {
    setWeight(suggestion.weight)
    setReps(suggestion.reps)
  }, [suggestionKey])

  const rowCount = Math.max(item.targetSets, prevSets.length, sets.length + 1)
  const pending = Array.from({ length: rowCount - sets.length - 1 }, (_, i) => nextIndex + 1 + i)

  const validate = async () => {
    unlockAudio()
    const id = await logSet(workout, exercise.id, weight, reps)
    const newRecords = markRecords([...sets, { id, workoutId: workout.id, exerciseId: exercise.id, weight, reps, doneAt: new Date().toISOString() }], bests ?? null)
    props.onSetLogged(newRecords.get(id) ?? [])
    if (!workout.endedAt) timer.start(rest, exercise.name)
  }

  const cycleStep = () => {
    const next = WEIGHT_STEPS[(WEIGHT_STEPS.indexOf(step) + 1) % WEIGHT_STEPS.length]
    void db.exercises.update(exercise.id, { weightStep: next })
  }

  const done = sets.length >= item.targetSets

  return (
    <section className={`${card} overflow-hidden ${expanded ? 'ring-1 ring-zinc-700' : ''}`}>
      <div className="flex items-center">
        <button type="button" onClick={onToggle} className="flex min-h-16 min-w-0 flex-1 items-center gap-3 px-4 py-2 text-left">
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${done ? 'bg-lime-400 text-zinc-950' : 'bg-zinc-800 text-zinc-300'}`}>
            {done ? '✓' : `${sets.length}/${item.targetSets}`}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">{exercise.name}</span>
            <span className="block truncate text-sm text-zinc-500">
              {!expanded && sets.length > 0 ? sets.map(fmtSet).join(' · ') : exercise.muscleGroup}
            </span>
          </span>
        </button>
        <button type="button" onClick={() => setMenuOpen(true)} aria-label="Options de l'exercice" className="flex h-12 w-12 items-center justify-center text-zinc-400 active:text-zinc-100">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
        </button>
      </div>

      {expanded && (
        <div className="space-y-3 px-4 pb-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <button type="button" onClick={() => setRestOpen(true)} className={`${chip} bg-zinc-800 active:bg-zinc-700`}>
              Repos {fmtDuration(rest)}
            </button>
            <span className="text-zinc-500">
              {prev ? `Dernière fois : ${fmtShortDate(prev.date)}` : prev === null ? 'Première fois' : ''}
            </span>
          </div>

          <ol className="space-y-1">
            {sets.map((s, i) => (
              <li key={s.id}>
                <button type="button" onClick={() => setEditing(i)} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-2 text-left active:bg-zinc-800">
                  <span className="w-6 text-sm text-zinc-500">{i + 1}</span>
                  <span className="w-20 text-sm text-zinc-500">{prevSets[i] ? fmtSet(prevSets[i]) : '—'}</span>
                  <span className="flex-1 font-mono font-semibold">{fmtSet(s)}</span>
                  {records.has(s.id) && <span className="rounded-md bg-amber-400/15 px-1.5 py-0.5 text-xs font-bold text-amber-300">RECORD</span>}
                  <span className="text-lime-400">✓</span>
                </button>
              </li>
            ))}
          </ol>

          <div className="space-y-3 rounded-xl bg-zinc-950/60 p-3">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-semibold">Série {nextIndex + 1}</span>
              <span className="text-zinc-500">{prevSets[nextIndex] ? `Préc. ${fmtSet(prevSets[nextIndex])}` : ''}</span>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm text-zinc-400">Poids (kg)</span>
                <button type="button" onClick={cycleStep} className={`${chip} min-h-8 bg-zinc-800 text-xs text-zinc-300 active:bg-zinc-700`}>
                  pas {String(step).replace('.', ',')}
                </button>
              </div>
              <Stepper value={weight} onChange={setWeight} step={step} decimal label="poids" />
            </div>
            <div>
              <div className="mb-1 text-sm text-zinc-400">Répétitions</div>
              <Stepper value={reps} onChange={setReps} step={1} min={1} label="répétitions" />
            </div>
            <button type="button" onClick={() => void validate()} disabled={reps < 1} className={`${btnPrimary} min-h-14 w-full text-lg`}>
              Valider la série
            </button>
          </div>

          {pending.length > 0 && (
            <ol className="space-y-1 opacity-50">
              {pending.map((i) => (
                <li key={i} className="flex min-h-9 items-center gap-3 px-2 text-sm">
                  <span className="w-6 text-zinc-500">{i + 1}</span>
                  <span className="w-20 text-zinc-500">{prevSets[i] ? fmtSet(prevSets[i]) : '—'}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      <SetEditSheet set={editing === null ? null : (sets[editing] ?? null)} index={editing ?? 0} weightStep={step} onClose={() => setEditing(null)} />

      <Sheet open={restOpen} onClose={() => setRestOpen(false)} title={`Repos · ${exercise.name}`}>
        <div className="grid grid-cols-3 gap-2">
          {REST_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={async () => {
                await db.exercises.update(exercise.id, { restSeconds: s })
                setRestOpen(false)
              }}
              className={`${s === rest ? btnPrimary : btnSecondary} min-h-12`}
            >
              {fmtDuration(s)}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={async () => {
            await db.exercises.update(exercise.id, { restSeconds: undefined })
            setRestOpen(false)
          }}
          className={`${btnSecondary} mt-2 w-full`}
        >
          Par défaut ({fmtDuration(defaultRest)})
        </button>
      </Sheet>

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title={exercise.name}>
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-xl bg-zinc-800 p-2 pl-4">
            <span>Séries prévues</span>
            <div className="flex items-center gap-2">
              <button type="button" className="h-11 w-11 rounded-lg bg-zinc-700 text-xl" onClick={() => props.onTargetChange(Math.max(1, item.targetSets - 1))}>−</button>
              <span className="w-6 text-center font-mono text-lg">{item.targetSets}</span>
              <button type="button" className="h-11 w-11 rounded-lg bg-zinc-700 text-xl" onClick={() => props.onTargetChange(item.targetSets + 1)}>+</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className={btnSecondary} onClick={() => props.onMove(-1)}>↑ Monter</button>
            <button type="button" className={btnSecondary} onClick={() => props.onMove(1)}>↓ Descendre</button>
          </div>
          <Link to={`/exercices/${exercise.id}`} className={`${btnSecondary} w-full`}>
            Historique et records
          </Link>
          <button
            type="button"
            className={`${btnSecondary} w-full text-red-400`}
            onClick={() => {
              if (sets.length && !confirm(`Retirer « ${exercise.name} » et ses ${sets.length} série(s) de la séance ?`)) return
              setMenuOpen(false)
              props.onRemove()
            }}
          >
            Retirer de la séance
          </button>
        </div>
      </Sheet>
    </section>
  )
}
