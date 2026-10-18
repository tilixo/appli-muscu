import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { PageHeader } from '../../components/PageHeader'
import { Sheet } from '../../components/Sheet'
import { btnPrimary, btnSecondary, card, input } from '../../components/ui'
import { db } from '../../db/db'
import { MEALS, type FoodEntry, type Meal } from '../../db/types'
import { localDay } from '../../lib/dates'
import { fmtDay, fmtInt, fmtNumber } from '../../lib/format'
import { TdeeCard } from '../tdee/TdeeCard'
import { addDays } from '../tdee/tdee'
import { DayGauge } from './DayGauge'
import { EntrySheet } from './EntrySheet'
import { saveMealAsPreset } from './foodService'
import { GoalsSheet } from './GoalsSheet'
import { goalsForDate, sumMacros } from './nutrition'
import { fmtKcal, MacroLine } from './ui'

export default function NutritionPage() {
  const [params, setParams] = useSearchParams()
  const today = localDay()
  const date = params.get('d') ?? today
  const setDate = (d: string) => setParams(d === today ? {} : { d }, { replace: true })

  const entries = useLiveQuery(() => db.foodEntries.where('date').equals(date).sortBy('createdAt'), [date]) ?? []
  const allGoals = useLiveQuery(() => db.nutritionGoals.toArray(), []) ?? []
  const goals = goalsForDate(allGoals, date)
  const eaten = sumMacros(entries.map((e) => e.total))

  const [editingGoals, setEditingGoals] = useState(false)
  const [editing, setEditing] = useState<FoodEntry | null>(null)

  const navBtn = 'flex h-11 w-11 items-center justify-center rounded-full bg-zinc-800 text-xl active:bg-zinc-700 disabled:opacity-30'
  const dayLabel = date === today ? "Aujourd'hui" : date === addDays(today, -1) ? 'Hier' : fmtDay(date + 'T12:00:00')

  return (
    <div>
      <PageHeader title="Nutrition" />
      <div className="space-y-4 px-3 pb-6">
        <div className="flex items-center justify-between gap-2">
          <button type="button" className={navBtn} onClick={() => setDate(addDays(date, -1))} aria-label="Jour précédent">‹</button>
          <button type="button" className="min-h-11 flex-1 font-semibold" onClick={() => setDate(today)}>
            {dayLabel}
          </button>
          <button type="button" className={navBtn} onClick={() => setDate(addDays(date, 1))} disabled={date >= today} aria-label="Jour suivant">›</button>
        </div>

        <DayGauge eaten={eaten} goals={goals} onEditGoals={() => setEditingGoals(true)} />

        {MEALS.map((m) => (
          <MealSection key={m.key} meal={m.key} label={m.label} date={date} entries={entries.filter((e) => e.meal === m.key)} onEdit={setEditing} />
        ))}

        {date === today && <TdeeCard goals={goals} />}
      </div>

      <GoalsSheet open={editingGoals} onClose={() => setEditingGoals(false)} goals={goals} from={date} />
      <EntrySheet entry={editing} onClose={() => setEditing(null)} />
    </div>
  )
}

function MealSection({ meal, label, date, entries, onEdit }: { meal: Meal; label: string; date: string; entries: FoodEntry[]; onEdit: (e: FoodEntry) => void }) {
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const total = sumMacros(entries.map((e) => e.total))

  return (
    <section className={`${card} overflow-hidden`}>
      <div className="flex min-h-12 items-center gap-2 px-4">
        <h2 className="flex-1 font-semibold">{label}</h2>
        {entries.length > 0 && <span className="font-mono text-sm text-zinc-400">{fmtInt(total.kcal)} kcal</span>}
        {entries.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setName(label)
              setSaving(true)
            }}
            className="flex h-11 w-11 items-center justify-center text-zinc-400 active:text-zinc-100"
            aria-label={`Enregistrer ${label} comme repas type`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" /></svg>
          </button>
        )}
      </div>
      {entries.length > 0 && (
        <ul className="divide-y divide-zinc-800 border-t border-zinc-800">
          {entries.map((e) => (
            <li key={e.id}>
              <button type="button" onClick={() => onEdit(e)} className="flex min-h-12 w-full items-center gap-3 px-4 py-2 text-left active:bg-zinc-800">
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{e.name}</span>
                  <span className="block text-xs text-zinc-500">
                    {e.grams ? `${fmtNumber(e.grams)} g · ` : ''}
                    <MacroLine m={e.total} />
                  </span>
                </span>
                <span className="shrink-0 font-mono text-sm">{fmtKcal(e.total.kcal)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <Link to={`/nutrition/ajouter?d=${date}&m=${meal}`} className="flex min-h-12 items-center border-t border-zinc-800 px-4 font-medium text-lime-400 active:bg-zinc-800">
        + Ajouter
      </Link>

      <Sheet open={saving} onClose={() => setSaving(false)} title="Enregistrer comme repas type">
        <form
          className="space-y-3"
          onSubmit={async (ev) => {
            ev.preventDefault()
            if (!name.trim()) return
            await saveMealAsPreset(name.trim(), entries)
            setSaving(false)
          }}
        >
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom du repas type" />
          <p className="text-sm text-zinc-500">
            {entries.length} aliment(s) · {fmtKcal(total.kcal)}. Tu pourras l'ajouter en un tap depuis « Repas types ».
          </p>
          <div className="flex gap-2">
            <button type="button" className={`${btnSecondary} flex-1`} onClick={() => setSaving(false)}>Annuler</button>
            <button type="submit" className={`${btnPrimary} flex-1`}>Enregistrer</button>
          </div>
        </form>
      </Sheet>
    </section>
  )
}
