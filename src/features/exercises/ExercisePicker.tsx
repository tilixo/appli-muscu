import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { btnPrimary, chip, input } from '../../components/ui'
import { db } from '../../db/db'
import { MUSCLE_GROUPS, type Exercise, type MuscleGroup } from '../../db/types'
import { ExerciseForm } from './ExerciseForm'

interface Props {
  open: boolean
  onClose: () => void
  onPick: (ids: number[]) => void
  title?: string
}

export const normalize = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

export function filterExercises(list: Exercise[], query: string, group: MuscleGroup | null) {
  const q = normalize(query)
  return list
    .filter((e) => !e.archived)
    .filter((e) => !group || e.muscleGroup === group)
    .filter((e) => !q || normalize(e.name).includes(q))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
}

/** Sélection multiple d'exercices, avec création à la volée. */
export function ExercisePicker({ open, onClose, onPick, title = 'Ajouter des exercices' }: Props) {
  const exercises = useLiveQuery(() => db.exercises.toArray(), []) ?? []
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<MuscleGroup | null>(null)
  const [selected, setSelected] = useState<number[]>([])
  const [creating, setCreating] = useState(false)

  const filtered = useMemo(() => filterExercises(exercises, query, group), [exercises, query, group])

  const close = () => {
    setSelected([])
    setQuery('')
    onClose()
  }
  const toggle = (id: number) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  return (
    <Sheet open={open} onClose={close} title={title} tall>
      <div className="sticky top-0 z-10 -mx-4 space-y-2 bg-zinc-900 px-4 pb-2">
        <input
          className={input}
          placeholder="Rechercher…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          type="search"
        />
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <button type="button" onClick={() => setGroup(null)} className={`${chip} ${group === null ? 'bg-lime-400 text-zinc-950' : 'bg-zinc-800'}`}>
            Tous
          </button>
          {MUSCLE_GROUPS.map((g) => (
            <button key={g} type="button" onClick={() => setGroup(g === group ? null : g)} className={`${chip} ${group === g ? 'bg-lime-400 text-zinc-950' : 'bg-zinc-800'}`}>
              {g}
            </button>
          ))}
        </div>
      </div>

      <ul className="divide-y divide-zinc-800">
        {filtered.map((e) => {
          const idx = selected.indexOf(e.id)
          return (
            <li key={e.id}>
              <button type="button" onClick={() => toggle(e.id)} className="flex min-h-13 w-full items-center gap-3 py-2 text-left active:bg-zinc-800">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold ${idx >= 0 ? 'border-lime-400 bg-lime-400 text-zinc-950' : 'border-zinc-600'}`}>
                  {idx >= 0 ? idx + 1 : ''}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{e.name}</span>
                  <span className="block text-xs text-zinc-500">{e.muscleGroup}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <button type="button" onClick={() => setCreating(true)} className="mt-2 min-h-11 w-full rounded-xl border border-dashed border-zinc-700 text-lime-400 active:bg-zinc-800">
        + Créer {query.trim() ? `« ${query.trim()} »` : 'un exercice'}
      </button>

      {selected.length > 0 && (
        <div className="sticky bottom-0 -mx-4 bg-zinc-900 px-4 pt-2">
          <button
            type="button"
            className={`${btnPrimary} w-full`}
            onClick={() => {
              onPick(selected)
              close()
            }}
          >
            Ajouter ({selected.length})
          </button>
        </div>
      )}

      <ExerciseForm
        open={creating}
        initialName={query.trim()}
        initialGroup={group ?? undefined}
        onClose={() => setCreating(false)}
        onSaved={(id) => {
          setSelected((s) => [...s, id])
          setQuery('')
        }}
      />
    </Sheet>
  )
}
