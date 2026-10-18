import { useEffect, useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { btnDanger, btnPrimary, input } from '../../components/ui'
import { db } from '../../db/db'
import type { Food } from '../../db/types'
import { fmtNumber, parseDecimal } from '../../lib/format'
import { NumInput } from './ui'

export interface FoodDraft {
  name?: string
  code?: string
  /** Message affiché en tête (ex. produit introuvable, hors-ligne). */
  notice?: string
}

interface Props {
  open: boolean
  food?: Food
  draft?: FoodDraft
  onClose: () => void
  onSaved: (food: Food) => void
}

const str = (n?: number) => (n === undefined ? '' : fmtNumber(n))

/** Création ou correction d'un aliment (valeurs pour 100 g). */
export function FoodForm({ open, food, draft, onClose, onSaved }: Props) {
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [kcal, setKcal] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [serving, setServing] = useState('')

  useEffect(() => {
    if (!open) return
    setName(food?.name ?? draft?.name ?? '')
    setBrand(food?.brand ?? '')
    setKcal(str(food?.per100.kcal))
    setProtein(str(food?.per100.protein))
    setCarbs(str(food?.per100.carbs))
    setFat(str(food?.per100.fat))
    setServing(str(food?.servingGrams))
  }, [open, food, draft])

  const n = (s: string) => {
    const v = parseDecimal(s)
    return Number.isNaN(v) || v < 0 ? 0 : v
  }
  const valid = name.trim() !== '' && kcal.trim() !== '' && !Number.isNaN(parseDecimal(kcal))

  const save = async () => {
    const data = {
      name: name.trim(),
      brand: brand.trim() || undefined,
      per100: { kcal: Math.round(n(kcal)), protein: n(protein), carbs: n(carbs), fat: n(fat) },
      servingGrams: n(serving) || undefined,
    }
    let id: number
    if (food) {
      await db.foods.update(food.id, data)
      id = food.id
    } else {
      // Le code-barres est conservé : le prochain scan trouvera ce produit localement.
      id = await db.foods.add({ ...data, code: draft?.code || undefined, source: 'manuel', favorite: 0 })
    }
    onSaved((await db.foods.get(id))!)
  }

  return (
    <Sheet open={open} onClose={onClose} title={food ? "Modifier l'aliment" : 'Nouvel aliment'}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (valid) void save()
        }}
      >
        {draft?.notice && <p className="rounded-xl bg-amber-400/10 p-3 text-sm text-amber-200">{draft.notice}</p>}
        {(food?.code ?? draft?.code) && <p className="text-xs text-zinc-500">Code-barres {food?.code ?? draft?.code}</p>}
        <label className="block space-y-1">
          <span className="text-sm text-zinc-400">Nom</span>
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-zinc-400">Marque (facultatif)</span>
          <input className={input} value={brand} onChange={(e) => setBrand(e.target.value)} />
        </label>
        <p className="pt-1 text-sm font-semibold">Pour 100 g</p>
        <div className="grid grid-cols-2 gap-3">
          <NumInput label="Calories" value={kcal} onChange={setKcal} suffix="kcal" decimal={false} />
          <NumInput label="Protéines" value={protein} onChange={setProtein} suffix="g" />
          <NumInput label="Glucides" value={carbs} onChange={setCarbs} suffix="g" />
          <NumInput label="Lipides" value={fat} onChange={setFat} suffix="g" />
          <NumInput label="Portion (facultatif)" value={serving} onChange={setServing} suffix="g" />
        </div>
        <button type="submit" disabled={!valid} className={`${btnPrimary} w-full`}>
          Enregistrer
        </button>
        {food && (
          <button
            type="button"
            className={`${btnDanger} w-full`}
            onClick={async () => {
              if (!confirm(`Supprimer « ${food.name} » de tes aliments ? Ton journal n'est pas modifié.`)) return
              await db.foods.delete(food.id)
              onClose()
            }}
          >
            Supprimer l'aliment
          </button>
        )}
      </form>
    </Sheet>
  )
}
