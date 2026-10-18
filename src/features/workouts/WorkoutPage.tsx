import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { PageHeader } from '../../components/PageHeader'
import { Sheet } from '../../components/Sheet'
import { btnDanger, btnPrimary, btnSecondary, input } from '../../components/ui'
import { db } from '../../db/db'
import type { PlanItem, Workout } from '../../db/types'
import { fmtDay, fmtInt, fmtLongDuration, fmtTime } from '../../lib/format'
import { useSettings } from '../../lib/settings'
import { useWakeLock } from '../../lib/wakeLock'
import { ExercisePicker } from '../exercises/ExercisePicker'
import { timer } from '../timer/timerStore'
import { ExerciseCard } from './ExerciseCard'
import { deleteWorkout, finishWorkout, getActiveWorkout, volumeOf, type PRKind } from './workoutService'

export default function WorkoutPage() {
  const id = Number(useParams().id)
  const workout = useLiveQuery(() => db.workouts.get(id), [id])
  if (workout === undefined) return null
  if (!workout) return <PageHeader title="Séance introuvable" backTo="/" />
  return <WorkoutView workout={workout} />
}

function WorkoutView({ workout }: { workout: Workout }) {
  const navigate = useNavigate()
  const settings = useSettings()
  const active = !workout.endedAt
  useWakeLock(active && settings.wakeLock)

  const sets = useLiveQuery(() => db.sets.where('workoutId').equals(workout.id).toArray(), [workout.id]) ?? []
  const exercises = useLiveQuery(() => db.exercises.bulkGet(workout.items.map((i) => i.exerciseId)), [workout.items])

  const [expanded, setExpanded] = useState<number | null>(null)
  const [picker, setPicker] = useState(false)
  const [options, setOptions] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number>(undefined)

  // À l'ouverture : déplier le premier exercice pas encore terminé.
  const initialized = useRef(false)
  useEffect(() => {
    if (initialized.current || !exercises) return
    initialized.current = true
    const first = workout.items.find((it) => sets.filter((s) => s.exerciseId === it.exerciseId).length < it.targetSets)
    setExpanded(first?.exerciseId ?? null)
  }, [exercises, sets, workout.items])

  const setItems = (items: PlanItem[]) => db.workouts.update(workout.id, { items })

  const showToast = (msg: string) => {
    setToast(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 3500)
  }

  const onSetLogged = (item: PlanItem, records: PRKind[]) => {
    if (records.length) showToast(records.includes('weight') ? 'Nouveau record de poids !' : 'Nouveau record : 1RM estimé !')
    // Série cible atteinte : on passe à l'exercice suivant non terminé.
    const doneCount = sets.filter((s) => s.exerciseId === item.exerciseId).length + 1
    if (doneCount >= item.targetSets) {
      const idx = workout.items.indexOf(item)
      const next = [...workout.items.slice(idx + 1), ...workout.items.slice(0, idx)].find(
        (it) => sets.filter((s) => s.exerciseId === it.exerciseId).length < it.targetSets,
      )
      if (next) setExpanded(next.exerciseId)
    }
  }

  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir
    if (j < 0 || j >= workout.items.length) return
    const items = [...workout.items]
    ;[items[idx], items[j]] = [items[j], items[idx]]
    void setItems(items)
  }

  const remove = async (item: PlanItem) => {
    await db.transaction('rw', db.workouts, db.sets, async () => {
      await db.sets.where('workoutId').equals(workout.id).filter((s) => s.exerciseId === item.exerciseId).delete()
      await db.workouts.update(workout.id, { items: workout.items.filter((i) => i !== item) })
    })
  }

  const addExercises = (ids: number[]) => {
    const fresh = ids.filter((id) => !workout.items.some((i) => i.exerciseId === id))
    if (!fresh.length) return
    void setItems([...workout.items, ...fresh.map((exerciseId) => ({ exerciseId, targetSets: 3 }))])
    setExpanded(fresh[0])
  }

  const finish = async () => {
    if (sets.length === 0) {
      if (!confirm('Aucune série enregistrée. Supprimer cette séance vide ?')) return
      await deleteWorkout(workout.id)
      timer.stop()
      navigate('/', { replace: true })
      return
    }
    await finishWorkout(workout.id)
    timer.stop()
  }

  const volume = volumeOf(sets)

  return (
    <div>
      <PageHeader
        title={workout.name}
        backTo="/"
        right={
          <button type="button" onClick={() => setOptions(true)} aria-label="Options de la séance" className="flex h-11 w-11 items-center justify-center rounded-full text-zinc-300 active:bg-zinc-800">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
          </button>
        }
      />
      <div className="space-y-3 px-3 pb-6">
        <WorkoutStats workout={workout} setCount={sets.length} volume={volume} />

        {exercises &&
          workout.items.map((item, idx) => {
            const ex = exercises[idx]
            if (!ex) return null
            return (
              <ExerciseCard
                key={item.exerciseId}
                workout={workout}
                item={item}
                index={idx}
                exercise={ex}
                sets={sets.filter((s) => s.exerciseId === item.exerciseId)}
                expanded={expanded === item.exerciseId}
                defaultRest={settings.defaultRestSeconds}
                onToggle={() => setExpanded(expanded === item.exerciseId ? null : item.exerciseId)}
                onSetLogged={(r) => onSetLogged(item, r)}
                onMove={(dir) => move(idx, dir)}
                onRemove={() => void remove(item)}
                onTargetChange={(n) => void setItems(workout.items.map((i) => (i === item ? { ...i, targetSets: n } : i)))}
              />
            )
          })}

        <button type="button" onClick={() => setPicker(true)} className="min-h-14 w-full rounded-2xl border border-dashed border-zinc-700 font-medium text-lime-400 active:bg-zinc-900">
          + Ajouter un exercice
        </button>

        {active && (
          <button type="button" onClick={() => void finish()} className={`${btnSecondary} min-h-14 w-full`}>
            Terminer la séance
          </button>
        )}
      </div>

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center px-4 pt-[calc(env(safe-area-inset-top)+4rem)]">
          <div className="rounded-full bg-amber-400 px-4 py-2 font-semibold text-zinc-950 shadow-lg">🏆 {toast}</div>
        </div>
      )}

      <ExercisePicker open={picker} onClose={() => setPicker(false)} onPick={addExercises} />
      <WorkoutOptions workout={workout} open={options} onClose={() => setOptions(false)} />
    </div>
  )
}

function WorkoutStats({ workout, setCount, volume }: { workout: Workout; setCount: number; volume: number }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (workout.endedAt) return
    const id = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [workout.endedAt])

  const end = workout.endedAt ? new Date(workout.endedAt).getTime() : now
  return (
    <div className="grid grid-cols-3 gap-2 text-center">
      <Stat label={workout.endedAt ? fmtDay(workout.startedAt) : `Depuis ${fmtTime(workout.startedAt)}`} value={fmtLongDuration(end - new Date(workout.startedAt).getTime())} />
      <Stat label="Séries" value={String(setCount)} />
      <Stat label="Volume" value={`${fmtInt(volume)} kg`} />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-zinc-900 px-2 py-2">
      <div className="font-mono text-lg font-semibold">{value}</div>
      <div className="truncate text-xs text-zinc-500">{label}</div>
    </div>
  )
}

function WorkoutOptions({ workout, open, onClose }: { workout: Workout; open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const [name, setName] = useState(workout.name)
  const date = useMemo(() => toLocalInput(workout.startedAt), [workout.startedAt])

  useEffect(() => {
    if (open) setName(workout.name)
  }, [open, workout.name])

  return (
    <Sheet open={open} onClose={onClose} title="Options de la séance">
      <div className="space-y-4">
        <label className="block space-y-1">
          <span className="text-sm text-zinc-400">Nom</span>
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name.trim() && db.workouts.update(workout.id, { name: name.trim() })} />
        </label>
        {workout.endedAt && (
          <label className="block space-y-1">
            <span className="text-sm text-zinc-400">Date et heure de début</span>
            <input
              type="datetime-local"
              className={input}
              defaultValue={date}
              onBlur={async (e) => {
                const d = new Date(e.target.value)
                if (Number.isNaN(d.getTime())) return
                // On décale fin et séries du même écart pour garder la cohérence.
                const delta = d.getTime() - new Date(workout.startedAt).getTime()
                const shift = (iso: string) => new Date(new Date(iso).getTime() + delta).toISOString()
                await db.transaction('rw', db.workouts, db.sets, async () => {
                  await db.workouts.update(workout.id, { startedAt: d.toISOString(), endedAt: shift(workout.endedAt!) })
                  await db.sets.where('workoutId').equals(workout.id).modify((s) => {
                    s.doneAt = shift(s.doneAt)
                  })
                })
              }}
            />
          </label>
        )}
        <button
          type="button"
          className={`${btnSecondary} w-full`}
          onClick={async () => {
            const id = await db.templates.add({ name: name.trim() || workout.name, items: workout.items, updatedAt: new Date().toISOString() })
            onClose()
            navigate(`/modeles/${id}`)
          }}
        >
          Enregistrer comme modèle
        </button>
        {workout.endedAt && (
          <button
            type="button"
            className={`${btnPrimary} w-full`}
            onClick={async () => {
              if (await getActiveWorkout()) return alert('Une autre séance est déjà en cours.')
              await db.workouts.update(workout.id, { endedAt: undefined })
              onClose()
            }}
          >
            Rouvrir la séance
          </button>
        )}
        <button
          type="button"
          className={`${btnDanger} w-full`}
          onClick={async () => {
            if (!confirm('Supprimer définitivement cette séance et toutes ses séries ?')) return
            await deleteWorkout(workout.id)
            if (!workout.endedAt) timer.stop()
            onClose()
            navigate('/', { replace: true })
          }}
        >
          Supprimer la séance
        </button>
      </div>
    </Sheet>
  )
}

function toLocalInput(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
