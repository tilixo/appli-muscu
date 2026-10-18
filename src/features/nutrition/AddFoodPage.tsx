import { useLiveQuery } from 'dexie-react-hooks'
import { lazy, Suspense, useCallback, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { PageHeader } from '../../components/PageHeader'
import { Sheet } from '../../components/Sheet'
import { btnDanger, btnPrimary, btnSecondary, chip, input } from '../../components/ui'
import { db } from '../../db/db'
import { MEALS, type Food, type Macros, type Meal, type MealPreset } from '../../db/types'
import { localDay } from '../../lib/dates'
import { fmtNumber } from '../../lib/format'
import { beep, unlockAudio } from '../../lib/sound'
import { normalize } from '../exercises/ExercisePicker'
import { FoodForm, type FoodDraft } from './FoodForm'
import { addFoodEntry, addQuickEntry, applyPreset, lookupBarcode, OfflineError, saveOffFood, searchOnline } from './foodService'
import type { OffFood } from './nutrition'
import { sumMacros } from './nutrition'
import { QuantitySheet } from './QuantitySheet'
import { QuickAddSheet } from './QuickAddSheet'
import { fmtKcal, MacroLine } from './ui'

const BarcodeScanner = lazy(() => import('./BarcodeScanner'))

type Tab = 'recents' | 'favoris' | 'repas'
type Online = { state: 'idle' } | { state: 'loading' } | { state: 'done'; results: OffFood[] } | { state: 'error'; message: string }

export default function AddFoodPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const date = params.get('d') ?? localDay()
  const meal = (MEALS.some((m) => m.key === params.get('m')) ? params.get('m') : 'dejeuner') as Meal
  const mealLabel = MEALS.find((m) => m.key === meal)!.label
  const backTo = `/nutrition${date === localDay() ? '' : `?d=${date}`}`

  const [tab, setTab] = useState<Tab>('recents')
  const [query, setQuery] = useState('')
  const [online, setOnline] = useState<Online>({ state: 'idle' })
  const [selected, setSelected] = useState<number | null>(null)
  const [foodForm, setFoodForm] = useState<{ food?: Food; draft?: FoodDraft } | null>(null)
  const [quickAdd, setQuickAdd] = useState(false)
  const [preset, setPreset] = useState<MealPreset | null>(null)
  const [scanning, setScanning] = useState(false)
  const [lookingUp, setLookingUp] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number>(undefined)

  const foods = useLiveQuery(() => db.foods.toArray(), []) ?? []
  const presets = useLiveQuery(() => db.mealPresets.toArray(), []) ?? []

  const recents = useMemo(() => foods.filter((f) => f.lastUsedAt).sort((a, b) => (a.lastUsedAt! < b.lastUsedAt! ? 1 : -1)).slice(0, 40), [foods])
  const favorites = useMemo(() => foods.filter((f) => f.favorite).sort((a, b) => a.name.localeCompare(b.name, 'fr')), [foods])
  const localResults = useMemo(() => {
    const q = normalize(query)
    if (!q) return []
    return foods
      .filter((f) => normalize(`${f.name} ${f.brand ?? ''}`).includes(q))
      .sort((a, b) => (b.lastUsedAt ?? '').localeCompare(a.lastUsedAt ?? '') || a.name.localeCompare(b.name, 'fr'))
      .slice(0, 50)
  }, [foods, query])

  const showToast = (msg: string) => {
    setToast(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2000)
  }

  const setMeal = (m: Meal) => setParams({ d: date, m }, { replace: true })

  const add = async (food: Food, grams: number) => {
    await addFoodEntry({ date, meal, food, grams })
    setSelected(null)
    showToast(`${food.name} ajouté`)
  }

  const quick = async (name: string, total: Macros) => {
    await addQuickEntry({ date, meal, name, total })
    setQuickAdd(false)
    showToast('Ajouté')
  }

  const searchOff = async () => {
    const q = query.trim()
    if (q.length < 2) return
    setOnline({ state: 'loading' })
    try {
      setOnline({ state: 'done', results: await searchOnline(q) })
    } catch (e) {
      setOnline({
        state: 'error',
        message: e instanceof OfflineError ? 'Hors-ligne : la recherche en ligne est indisponible. Tes aliments enregistrés restent accessibles, ou crée l’aliment à la main.' : 'La recherche a échoué. Réessaie dans un instant.',
      })
    }
  }

  const pickOnline = async (off: OffFood) => {
    const food = await saveOffFood(off)
    setSelected(food.id)
  }

  const onDetected = useCallback(async (code: string) => {
    setScanning(false)
    beep()
    setLookingUp(code)
    const r = await lookupBarcode(code)
    setLookingUp(null)
    if (r.status === 'found') setSelected(r.food.id)
    else if (r.status === 'not-found')
      setFoodForm({ draft: { code, name: r.name, notice: r.name ? 'Ce produit n’a pas de valeurs nutritionnelles sur Open Food Facts. Saisis-les depuis l’emballage : elles seront retenues pour les prochains scans.' : 'Produit introuvable sur Open Food Facts. Saisis ses valeurs depuis l’emballage : elles seront retenues pour les prochains scans.' } })
    else if (r.status === 'offline')
      setFoodForm({ draft: { code, notice: 'Hors-ligne : impossible d’interroger Open Food Facts. Saisis les valeurs de l’emballage, ou réessaie le scan avec du réseau.' } })
    else setFoodForm({ draft: { code, notice: `${r.message} Saisis les valeurs de l’emballage.` } })
  }, [])

  const foodRow = (f: Food) => (
    <li key={f.id}>
      <button type="button" onClick={() => setSelected(f.id)} className="flex min-h-14 w-full items-center gap-3 py-2 text-left active:bg-zinc-800">
        <span className="min-w-0 flex-1">
          <span className="block truncate">
            {f.favorite ? <span className="text-amber-300">★ </span> : null}
            {f.name}
          </span>
          <span className="block truncate text-xs text-zinc-500">
            {f.brand ? `${f.brand} · ` : ''}
            {fmtNumber(f.per100.kcal)} kcal/100 g{f.lastGrams ? ` · dernière fois ${fmtNumber(f.lastGrams)} g` : ''}
          </span>
        </span>
        <span className="text-zinc-600">›</span>
      </button>
    </li>
  )

  return (
    <div>
      <PageHeader title="Ajouter" backTo={backTo} right={<button type="button" onClick={() => navigate(backTo)} className="min-h-11 px-3 font-medium text-lime-400">Terminé</button>} />
      <div className="space-y-3 px-3 pb-6">
        <div className="-mx-3 flex gap-2 overflow-x-auto px-3">
          {MEALS.map((m) => (
            <button key={m.key} type="button" onClick={() => setMeal(m.key)} className={`${chip} ${meal === m.key ? 'bg-lime-400 text-zinc-950' : 'bg-zinc-800'}`}>
              {m.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className={`${btnPrimary} min-h-14`}
            onClick={() => {
              unlockAudio()
              setScanning(true)
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2M7 8v8M11 8v8M14 8v8M17 8v8" /></svg>
            Scanner
          </button>
          <button type="button" className={`${btnSecondary} min-h-14`} onClick={() => setQuickAdd(true)}>
            Saisie rapide
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            void searchOff()
            ;(document.activeElement as HTMLElement | null)?.blur()
          }}
        >
          <input
            className={input}
            type="search"
            enterKeyHint="search"
            placeholder="Rechercher un aliment…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setOnline({ state: 'idle' })
            }}
          />
        </form>

        {query.trim() ? (
          <>
            {localResults.length > 0 && (
              <section>
                <h2 className="px-1 text-sm font-semibold tracking-wide text-zinc-400 uppercase">Mes aliments</h2>
                <ul className="divide-y divide-zinc-800">{localResults.map(foodRow)}</ul>
              </section>
            )}
            <section className="space-y-2">
              {online.state === 'idle' && (
                <button type="button" className={`${btnSecondary} w-full`} onClick={() => void searchOff()} disabled={query.trim().length < 2}>
                  Chercher « {query.trim()} » sur Open Food Facts
                </button>
              )}
              {online.state === 'loading' && <p className="py-4 text-center text-zinc-500">Recherche en cours…</p>}
              {online.state === 'error' && <p className="rounded-xl bg-amber-400/10 p-3 text-sm text-amber-200">{online.message}</p>}
              {online.state === 'done' && (
                <>
                  <h2 className="px-1 text-sm font-semibold tracking-wide text-zinc-400 uppercase">Open Food Facts</h2>
                  {online.results.length === 0 && <p className="px-1 text-zinc-500">Aucun résultat.</p>}
                  <ul className="divide-y divide-zinc-800">
                    {online.results.map((o) => (
                      <li key={o.code}>
                        <button type="button" onClick={() => void pickOnline(o)} className="flex min-h-14 w-full items-center gap-3 py-2 text-left active:bg-zinc-800">
                          <span className="min-w-0 flex-1">
                            <span className="block truncate">{o.name}</span>
                            <span className="block truncate text-xs text-zinc-500">
                              {o.brand ? `${o.brand} · ` : ''}
                              {fmtNumber(o.per100.kcal)} kcal/100 g
                            </span>
                          </span>
                          <span className="text-zinc-600">›</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          </>
        ) : (
          <>
            <div className="flex gap-1 rounded-xl bg-zinc-900 p-1">
              {(
                [
                  ['recents', 'Récents'],
                  ['favoris', 'Favoris'],
                  ['repas', 'Repas types'],
                ] as const
              ).map(([key, label]) => (
                <button key={key} type="button" onClick={() => setTab(key)} className={`min-h-11 flex-1 rounded-lg text-sm font-medium ${tab === key ? 'bg-zinc-700' : 'text-zinc-400'}`}>
                  {label}
                </button>
              ))}
            </div>
            {tab === 'recents' && (recents.length ? <ul className="divide-y divide-zinc-800">{recents.map(foodRow)}</ul> : <Empty text="Les aliments que tu ajoutes apparaîtront ici." />)}
            {tab === 'favoris' && (favorites.length ? <ul className="divide-y divide-zinc-800">{favorites.map(foodRow)}</ul> : <Empty text="Touche ★ sur un aliment pour l'ajouter aux favoris." />)}
            {tab === 'repas' &&
              (presets.length ? (
                <ul className="divide-y divide-zinc-800">
                  {presets.map((p) => (
                    <li key={p.id}>
                      <button type="button" onClick={() => setPreset(p)} className="flex min-h-14 w-full items-center gap-3 py-2 text-left active:bg-zinc-800">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{p.name}</span>
                          <span className="block truncate text-xs text-zinc-500">
                            {p.items.length} aliment(s) · {fmtKcal(sumMacros(p.items.map((i) => i.total)).kcal)}
                          </span>
                        </span>
                        <span className="text-zinc-600">›</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty text="Dans l'onglet Nutrition, touche l'icône signet d'un repas pour l'enregistrer comme repas type." />
              ))}
          </>
        )}

        <button type="button" onClick={() => setFoodForm({ draft: { name: query.trim() } })} className="min-h-11 w-full rounded-xl border border-dashed border-zinc-700 text-lime-400 active:bg-zinc-800">
          + Créer un aliment
        </button>
      </div>

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center px-4 pt-[calc(env(safe-area-inset-top)+4rem)]">
          <div className="max-w-full truncate rounded-full bg-lime-400 px-4 py-2 font-semibold text-zinc-950 shadow-lg">✓ {toast}</div>
        </div>
      )}

      <QuantitySheet foodId={selected} mealLabel={mealLabel} onClose={() => setSelected(null)} onAdd={(f, g) => void add(f, g)} onEditFood={(food) => setFoodForm({ food })} />
      <FoodForm
        open={foodForm !== null}
        food={foodForm?.food}
        draft={foodForm?.draft}
        onClose={() => setFoodForm(null)}
        onSaved={(f) => {
          setFoodForm(null)
          setSelected(f.id)
        }}
      />
      <QuickAddSheet open={quickAdd} onClose={() => setQuickAdd(false)} onAdd={(n, t) => void quick(n, t)} />
      <PresetSheet
        preset={preset}
        mealLabel={mealLabel}
        onClose={() => setPreset(null)}
        onApply={async (p) => {
          await applyPreset(p, date, meal)
          setPreset(null)
          showToast(`${p.name} ajouté`)
        }}
      />
      <Sheet open={lookingUp !== null} onClose={() => setLookingUp(null)} title="Recherche du produit…">
        <p className="pb-4 text-zinc-400">Code {lookingUp}</p>
      </Sheet>
      {scanning && (
        <Suspense fallback={null}>
          <BarcodeScanner onDetected={(c) => void onDetected(c)} onClose={() => setScanning(false)} />
        </Suspense>
      )}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="px-1 py-6 text-center text-sm text-zinc-500">{text}</p>
}

function PresetSheet({ preset, mealLabel, onClose, onApply }: { preset: MealPreset | null; mealLabel: string; onClose: () => void; onApply: (p: MealPreset) => void }) {
  if (!preset) return null
  const total = sumMacros(preset.items.map((i) => i.total))
  return (
    <Sheet open onClose={onClose} title={preset.name}>
      <div className="space-y-4">
        <ul className="divide-y divide-zinc-800">
          {preset.items.map((i, idx) => (
            <li key={idx} className="flex min-h-11 items-center gap-3 py-1">
              <span className="min-w-0 flex-1 truncate">{i.name}</span>
              <span className="text-sm text-zinc-500">{i.grams ? `${fmtNumber(i.grams)} g` : ''}</span>
              <span className="font-mono text-sm">{fmtKcal(i.total.kcal)}</span>
            </li>
          ))}
        </ul>
        <div className="text-center">
          <div className="font-mono text-2xl font-semibold">{fmtKcal(total.kcal)}</div>
          <MacroLine m={total} />
        </div>
        <button type="button" className={`${btnPrimary} min-h-14 w-full text-lg`} onClick={() => onApply(preset)}>
          Ajouter au {mealLabel.toLowerCase()}
        </button>
        <button
          type="button"
          className={`${btnDanger} w-full`}
          onClick={async () => {
            if (!confirm(`Supprimer le repas type « ${preset.name} » ?`)) return
            await db.mealPresets.delete(preset.id)
            onClose()
          }}
        >
          Supprimer le repas type
        </button>
      </div>
    </Sheet>
  )
}
