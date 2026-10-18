import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { Stepper } from '../../components/Stepper'
import { btnPrimary, chip } from '../../components/ui'
import { db } from '../../db/db'
import type { Food } from '../../db/types'
import { fmtNumber } from '../../lib/format'
import { macrosFor } from './nutrition'
import { fmtKcal, MacroLine } from './ui'

interface Props {
  foodId: number | null
  mealLabel: string
  onClose: () => void
  onAdd: (food: Food, grams: number) => void
  onEditFood: (food: Food) => void
}

/** Choix de la quantité : pré-remplie avec la dernière quantité utilisée. */
export function QuantitySheet({ foodId, mealLabel, onClose, onAdd, onEditFood }: Props) {
  const food = useLiveQuery(() => (foodId === null ? undefined : db.foods.get(foodId)), [foodId])
  const [grams, setGrams] = useState(100)
  // Quantité initialisée à l'ouverture seulement (pas à chaque mise à jour de l'aliment).
  const loaded = food?.id ?? null
  useEffect(() => {
    if (food) setGrams(food.lastGrams ?? food.servingGrams ?? 100)
  }, [loaded])

  if (foodId === null || !food) return null
  const total = macrosFor(food.per100, grams)
  const presets = [...new Set([food.servingGrams, 50, 100, 150, 200].filter((g): g is number => !!g))]

  return (
    <Sheet open onClose={onClose} title={food.name}>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 text-sm text-zinc-500">
          <span className="min-w-0 truncate">
            {food.brand ? `${food.brand} · ` : ''}
            {fmtNumber(food.per100.kcal)} kcal / 100 g
          </span>
          <button
            type="button"
            onClick={() => void db.foods.update(food.id, { favorite: food.favorite ? 0 : 1 })}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-2xl active:bg-zinc-800 ${food.favorite ? 'text-amber-300' : 'text-zinc-600'}`}
            aria-label={food.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            aria-pressed={!!food.favorite}
          >
            ★
          </button>
        </div>
        <div>
          <div className="mb-1 text-sm text-zinc-400">Quantité (g)</div>
          <Stepper value={grams} onChange={setGrams} step={10} min={1} decimal label="grammes" />
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4">
          {presets.map((g) => (
            <button key={g} type="button" onClick={() => setGrams(g)} className={`${chip} ${g === grams ? 'bg-zinc-600' : 'bg-zinc-800'}`}>
              {g === food.servingGrams ? `1 portion (${fmtNumber(g)} g)` : `${g} g`}
            </button>
          ))}
        </div>
        <div className="text-center">
          <div className="font-mono text-2xl font-semibold">{fmtKcal(total.kcal)}</div>
          <MacroLine m={total} />
        </div>
        <button type="button" className={`${btnPrimary} min-h-14 w-full text-lg`} onClick={() => onAdd(food, grams)}>
          Ajouter au {mealLabel.toLowerCase()}
        </button>
        <button type="button" className="min-h-11 w-full text-sm text-zinc-400" onClick={() => onEditFood(food)}>
          Corriger les valeurs de l'aliment
        </button>
      </div>
    </Sheet>
  )
}
