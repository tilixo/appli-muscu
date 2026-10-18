import { useEffect, useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { Stepper } from '../../components/Stepper'
import { btnDanger, btnPrimary, chip } from '../../components/ui'
import { db } from '../../db/db'
import { MEALS, type FoodEntry, type Meal } from '../../db/types'
import { macrosFor } from './nutrition'
import { fmtKcal, MacroLine } from './ui'

export function EntrySheet({ entry, onClose }: { entry: FoodEntry | null; onClose: () => void }) {
  const [grams, setGrams] = useState(100)
  const [meal, setMeal] = useState<Meal>('dejeuner')

  useEffect(() => {
    if (entry) {
      setGrams(entry.grams ?? 100)
      setMeal(entry.meal)
    }
  }, [entry])

  const total = entry?.per100 ? macrosFor(entry.per100, grams) : entry?.total

  return (
    <Sheet open={entry !== null} onClose={onClose} title={entry?.name}>
      {entry && total && (
        <div className="space-y-4">
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4">
            {MEALS.map((m) => (
              <button key={m.key} type="button" onClick={() => setMeal(m.key)} className={`${chip} ${meal === m.key ? 'bg-lime-400 text-zinc-950' : 'bg-zinc-800'}`}>
                {m.label}
              </button>
            ))}
          </div>
          {entry.per100 && (
            <div>
              <div className="mb-1 text-sm text-zinc-400">Quantité (g)</div>
              <Stepper value={grams} onChange={setGrams} step={10} min={1} decimal label="grammes" />
            </div>
          )}
          <div className="text-center">
            <div className="font-mono text-2xl font-semibold">{fmtKcal(total.kcal)}</div>
            <MacroLine m={total} />
          </div>
          <button
            type="button"
            className={`${btnPrimary} w-full`}
            onClick={async () => {
              await db.foodEntries.update(entry.id, { meal, ...(entry.per100 ? { grams, total } : {}) })
              onClose()
            }}
          >
            Enregistrer
          </button>
          <button
            type="button"
            className={`${btnDanger} w-full`}
            onClick={async () => {
              await db.foodEntries.delete(entry.id)
              onClose()
            }}
          >
            Supprimer
          </button>
        </div>
      )}
    </Sheet>
  )
}
