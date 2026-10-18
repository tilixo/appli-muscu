import { useEffect, useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { btnDanger, btnPrimary, btnSecondary, input } from '../../components/ui'
import { db } from '../../db/db'
import { MUSCLE_GROUPS, type Exercise, type MuscleGroup } from '../../db/types'
import { fmtDuration } from '../../lib/format'

export const REST_OPTIONS = [30, 45, 60, 75, 90, 120, 150, 180, 240, 300]

interface Props {
  open: boolean
  onClose: () => void
  exercise?: Exercise
  initialName?: string
  initialGroup?: MuscleGroup
  onSaved?: (id: number) => void
  onDeleted?: () => void
}

export function ExerciseForm({ open, onClose, exercise, initialName, initialGroup, onSaved, onDeleted }: Props) {
  const [name, setName] = useState('')
  const [group, setGroup] = useState<MuscleGroup>('Pectoraux')
  const [rest, setRest] = useState<number | ''>('')
  const [setCount, setSetCount] = useState(0)

  useEffect(() => {
    if (!open) return
    setName(exercise?.name ?? initialName ?? '')
    setGroup(exercise?.muscleGroup ?? initialGroup ?? 'Pectoraux')
    setRest(exercise?.restSeconds ?? '')
    if (exercise) void db.sets.where('[exerciseId+doneAt]').between([exercise.id, ''], [exercise.id, '￿']).count().then(setSetCount)
  }, [open, exercise, initialName, initialGroup])

  const save = async () => {
    const data = { name: name.trim(), muscleGroup: group, restSeconds: rest === '' ? undefined : rest }
    if (!data.name) return
    let id: number
    if (exercise) {
      await db.exercises.update(exercise.id, data)
      id = exercise.id
    } else {
      id = await db.exercises.add({ ...data, isCustom: true })
    }
    onSaved?.(id)
    onClose()
  }

  const remove = async () => {
    if (!exercise) return
    if (setCount > 0) {
      if (!confirm(`Archiver « ${exercise.name} » ? Il n'apparaîtra plus dans les listes, mais son historique est conservé.`)) return
      await db.exercises.update(exercise.id, { archived: true })
    } else {
      if (!confirm(`Supprimer « ${exercise.name} » ?`)) return
      await db.exercises.delete(exercise.id)
    }
    onClose()
    onDeleted?.()
  }

  return (
    <Sheet open={open} onClose={onClose} title={exercise ? "Modifier l'exercice" : 'Nouvel exercice'}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <label className="block space-y-1">
          <span className="text-sm text-zinc-400">Nom</span>
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-zinc-400">Groupe musculaire</span>
          <select className={input} value={group} onChange={(e) => setGroup(e.target.value as MuscleGroup)}>
            {MUSCLE_GROUPS.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-zinc-400">Temps de repos</span>
          <select className={input} value={rest} onChange={(e) => setRest(e.target.value === '' ? '' : Number(e.target.value))}>
            <option value="">Par défaut (réglages)</option>
            {REST_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {fmtDuration(s)}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-2 pt-2">
          <button type="button" className={`${btnSecondary} flex-1`} onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className={`${btnPrimary} flex-1`}>
            Enregistrer
          </button>
        </div>
        {exercise && (
          <button type="button" className={`${btnDanger} w-full`} onClick={() => void remove()}>
            {setCount > 0 ? 'Archiver' : 'Supprimer'}
          </button>
        )}
      </form>
    </Sheet>
  )
}
