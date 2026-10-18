import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { PageHeader } from '../../components/PageHeader'
import { btnGhost, chip, input } from '../../components/ui'
import { db } from '../../db/db'
import { MUSCLE_GROUPS, type MuscleGroup } from '../../db/types'
import { ExerciseForm } from './ExerciseForm'
import { filterExercises } from './ExercisePicker'

export default function ExercisesPage() {
  const exercises = useLiveQuery(() => db.exercises.toArray(), []) ?? []
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<MuscleGroup | null>(null)
  const [creating, setCreating] = useState(false)
  const filtered = useMemo(() => filterExercises(exercises, query, group), [exercises, query, group])

  const byGroup = MUSCLE_GROUPS.map((g) => [g, filtered.filter((e) => e.muscleGroup === g)] as const).filter(([, l]) => l.length)

  return (
    <div>
      <PageHeader title="Exercices" backTo="/" right={<button type="button" className={btnGhost} onClick={() => setCreating(true)}>+ Ajouter</button>} />
      <div className="space-y-2 px-3">
        <input className={input} type="search" placeholder="Rechercher…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1">
          {MUSCLE_GROUPS.map((g) => (
            <button key={g} type="button" onClick={() => setGroup(g === group ? null : g)} className={`${chip} ${group === g ? 'bg-lime-400 text-zinc-950' : 'bg-zinc-800'}`}>
              {g}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-4 px-3 pt-2 pb-6">
        {byGroup.map(([g, list]) => (
          <section key={g}>
            <h2 className="px-1 pb-1 text-sm font-semibold tracking-wide text-zinc-400 uppercase">{g}</h2>
            <ul className="divide-y divide-zinc-800 overflow-hidden rounded-2xl bg-zinc-900">
              {list.map((e) => (
                <li key={e.id}>
                  <Link to={`/exercices/${e.id}`} className="flex min-h-12 items-center justify-between px-4 active:bg-zinc-800">
                    <span>{e.name}</span>
                    <span className="text-zinc-600">›</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {byGroup.length === 0 && <p className="px-1 text-zinc-500">Aucun exercice trouvé.</p>}
      </div>
      <ExerciseForm open={creating} initialName={query.trim()} initialGroup={group ?? undefined} onClose={() => setCreating(false)} />
    </div>
  )
}
