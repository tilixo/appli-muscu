import { useEffect, useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { Stepper } from '../../components/Stepper'
import { btnPrimary } from '../../components/ui'
import type { Macros } from '../../db/types'
import { fmtDay, fmtInt } from '../../lib/format'
import { setGoals } from './foodService'

interface Props {
  open: boolean
  onClose: () => void
  goals: Macros
  /** Les objectifs s'appliquent à partir de ce jour. */
  from: string
}

export function GoalsSheet({ open, onClose, goals, from }: Props) {
  const [draft, setDraft] = useState(goals)
  useEffect(() => {
    if (open) setDraft(goals)
  }, [open, goals])

  const fromMacros = Math.round(draft.protein * 4 + draft.carbs * 4 + draft.fat * 9)
  const field = (key: keyof Macros, label: string, step: number) => (
    <div>
      <div className="mb-1 text-sm text-zinc-400">{label}</div>
      <Stepper value={draft[key]} step={step} min={0} max={10000} onChange={(v) => setDraft({ ...draft, [key]: v })} label={label} />
    </div>
  )

  return (
    <Sheet open={open} onClose={onClose} title="Objectifs journaliers">
      <div className="space-y-3">
        {field('kcal', 'Calories (kcal)', 50)}
        {field('protein', 'Protéines (g)', 5)}
        {field('carbs', 'Glucides (g)', 5)}
        {field('fat', 'Lipides (g)', 5)}
        <p className={`text-xs ${Math.abs(fromMacros - draft.kcal) > 100 ? 'text-amber-300' : 'text-zinc-500'}`}>
          Les macros représentent {fmtInt(fromMacros)} kcal (4 kcal/g de protéines et glucides, 9 kcal/g de lipides).
        </p>
        <p className="text-xs text-zinc-500">S'applique à partir du {fmtDay(from + 'T12:00:00').toLowerCase()} ; les jours précédents gardent leurs objectifs.</p>
        <button
          type="button"
          className={`${btnPrimary} w-full`}
          onClick={async () => {
            await setGoals(from, draft)
            onClose()
          }}
        >
          Enregistrer
        </button>
      </div>
    </Sheet>
  )
}
