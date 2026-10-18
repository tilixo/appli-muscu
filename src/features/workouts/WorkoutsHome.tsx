import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { PageHeader } from '../../components/PageHeader'
import { btnPrimary, btnSecondary, card } from '../../components/ui'
import { db } from '../../db/db'
import type { PlanItem, Workout, WorkoutSet } from '../../db/types'
import { fmtDay, fmtInt, fmtLongDuration, fmtTime } from '../../lib/format'
import { getActiveWorkout, startWorkout, volumeOf } from './workoutService'

const PAGE = 15

/** Démarre une séance, ou rouvre celle en cours s'il y en a déjà une. */
export function useStartWorkout() {
  const navigate = useNavigate()
  return async (name: string, items: PlanItem[], templateId?: number) => {
    const current = await getActiveWorkout()
    if (current) {
      if (!confirm(`Une séance est déjà en cours (« ${current.name} »). La reprendre ?`)) return
      navigate(`/seance/${current.id}`)
      return
    }
    const id = await startWorkout(name, items, templateId)
    navigate(`/seance/${id}`)
  }
}

export default function WorkoutsHome() {
  const start = useStartWorkout()
  const [limit, setLimit] = useState(PAGE)
  const active = useLiveQuery(() => getActiveWorkout(), [])
  const templates = useLiveQuery(() => db.templates.orderBy('name').toArray(), []) ?? []
  const history = useLiveQuery(async () => {
    const workouts = await db.workouts.orderBy('startedAt').reverse().filter((w) => !!w.endedAt).limit(limit).toArray()
    const sets = await db.sets.where('workoutId').anyOf(workouts.map((w) => w.id)).toArray()
    return workouts.map((w) => ({ workout: w, sets: sets.filter((s) => s.workoutId === w.id) }))
  }, [limit])

  return (
    <div>
      <PageHeader title="Séances" />
      <div className="space-y-6 px-3 pb-6">
        {active ? (
          <Link to={`/seance/${active.id}`} className={`${card} flex items-center gap-3 p-4 ring-2 ring-lime-400`}>
            <span className="h-3 w-3 shrink-0 animate-pulse rounded-full bg-lime-400" />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">Séance en cours · {active.name}</span>
              <span className="block text-sm text-zinc-400">Commencée à {fmtTime(active.startedAt)}</span>
            </span>
            <span className={btnPrimary}>Reprendre</span>
          </Link>
        ) : (
          <section className="space-y-2">
            <h2 className="px-1 text-sm font-semibold tracking-wide text-zinc-400 uppercase">Démarrer</h2>
            <div className="grid grid-cols-2 gap-2">
              {templates.map((t) => (
                <button key={t.id} type="button" onClick={() => void start(t.name, t.items, t.id)} className={`${btnSecondary} min-h-16 flex-col gap-0 text-left`}>
                  <span className="font-semibold">{t.name}</span>
                  <span className="text-xs text-zinc-400">{t.items.length} exercices</span>
                </button>
              ))}
              <button type="button" onClick={() => void start('Séance libre', [])} className={`${btnSecondary} min-h-16 border border-dashed border-zinc-600 bg-transparent`}>
                Séance libre
              </button>
            </div>
          </section>
        )}

        <nav className="grid grid-cols-3 gap-2">
          <Link to="/modeles" className={`${btnSecondary} min-h-12 text-sm`}>Modèles</Link>
          <Link to="/exercices" className={`${btnSecondary} min-h-12 text-sm`}>Exercices</Link>
          <Link to="/volume" className={`${btnSecondary} min-h-12 text-sm`}>Volume</Link>
        </nav>

        <section className="space-y-2">
          <h2 className="px-1 text-sm font-semibold tracking-wide text-zinc-400 uppercase">Historique</h2>
          {history?.length === 0 && <p className="px-1 text-zinc-500">Aucune séance terminée pour l'instant.</p>}
          <ul className="space-y-2">
            {history?.map(({ workout, sets }) => (
              <li key={workout.id}>
                <HistoryRow workout={workout} sets={sets} />
              </li>
            ))}
          </ul>
          {history && history.length === limit && (
            <button type="button" onClick={() => setLimit(limit + PAGE)} className={`${btnSecondary} w-full`}>
              Voir plus
            </button>
          )}
        </section>
      </div>
    </div>
  )
}

function HistoryRow({ workout, sets }: { workout: Workout; sets: WorkoutSet[] }) {
  const duration = new Date(workout.endedAt!).getTime() - new Date(workout.startedAt).getTime()
  return (
    <Link to={`/seance/${workout.id}`} className={`${card} block p-4 active:bg-zinc-800`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate font-semibold">{workout.name}</span>
        <span className="shrink-0 text-sm text-zinc-500">{fmtDay(workout.startedAt)}</span>
      </div>
      <div className="mt-1 text-sm text-zinc-400">
        {workout.items.length} exercices · {sets.length} séries · {fmtInt(volumeOf(sets))} kg · {fmtLongDuration(duration)}
      </div>
    </Link>
  )
}
