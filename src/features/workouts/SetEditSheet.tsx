import { useEffect, useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { Stepper } from '../../components/Stepper'
import { btnDanger, btnPrimary } from '../../components/ui'
import { db } from '../../db/db'
import type { WorkoutSet } from '../../db/types'

interface Props {
  set: WorkoutSet | null
  index: number
  weightStep: number
  onClose: () => void
}

export function SetEditSheet({ set, index, weightStep, onClose }: Props) {
  const [weight, setWeight] = useState(0)
  const [reps, setReps] = useState(0)

  useEffect(() => {
    if (set) {
      setWeight(set.weight)
      setReps(set.reps)
    }
  }, [set])

  return (
    <Sheet open={set !== null} onClose={onClose} title={`Série ${index + 1}`}>
      <div className="space-y-4">
        <div>
          <div className="mb-1 text-sm text-zinc-400">Poids (kg)</div>
          <Stepper value={weight} onChange={setWeight} step={weightStep} decimal label="poids" />
        </div>
        <div>
          <div className="mb-1 text-sm text-zinc-400">Répétitions</div>
          <Stepper value={reps} onChange={setReps} step={1} min={1} label="répétitions" />
        </div>
        <button
          type="button"
          className={`${btnPrimary} w-full`}
          onClick={async () => {
            if (set) await db.sets.update(set.id, { weight, reps })
            onClose()
          }}
        >
          Enregistrer
        </button>
        <button
          type="button"
          className={`${btnDanger} w-full`}
          onClick={async () => {
            if (set) await db.sets.delete(set.id)
            onClose()
          }}
        >
          Supprimer la série
        </button>
      </div>
    </Sheet>
  )
}
