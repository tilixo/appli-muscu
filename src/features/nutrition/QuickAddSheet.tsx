import { useEffect, useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { btnPrimary, input } from '../../components/ui'
import { parseDecimal } from '../../lib/format'
import type { Macros } from '../../db/types'
import { NumInput } from './ui'

interface Props {
  open: boolean
  onClose: () => void
  onAdd: (name: string, total: Macros) => void
}

/** Ajout direct de calories / macros, sans aliment (restaurant, estimation...). */
export function QuickAddSheet({ open, onClose, onAdd }: Props) {
  const [name, setName] = useState('')
  const [kcal, setKcal] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')

  useEffect(() => {
    if (open) [setName, setKcal, setProtein, setCarbs, setFat].forEach((f) => f(''))
  }, [open])

  const n = (s: string) => {
    const v = parseDecimal(s)
    return Number.isNaN(v) || v < 0 ? 0 : v
  }
  const valid = n(kcal) > 0

  return (
    <Sheet open={open} onClose={onClose} title="Saisie rapide">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (valid) onAdd(name.trim() || 'Saisie rapide', { kcal: Math.round(n(kcal)), protein: n(protein), carbs: n(carbs), fat: n(fat) })
        }}
      >
        <label className="block space-y-1">
          <span className="text-sm text-zinc-400">Description (facultatif)</span>
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. : burger au resto" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <NumInput label="Calories" value={kcal} onChange={setKcal} suffix="kcal" decimal={false} />
          <NumInput label="Protéines" value={protein} onChange={setProtein} suffix="g" />
          <NumInput label="Glucides" value={carbs} onChange={setCarbs} suffix="g" />
          <NumInput label="Lipides" value={fat} onChange={setFat} suffix="g" />
        </div>
        <button type="submit" disabled={!valid} className={`${btnPrimary} w-full`}>
          Ajouter
        </button>
      </form>
    </Sheet>
  )
}
