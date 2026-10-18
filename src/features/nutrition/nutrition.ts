// Fonctions pures de la nutrition (sans UI ni base de données).
import { DEFAULT_GOALS, type FoodEntry, type Macros, type NutritionGoals } from '../../db/types'
import type { DailyIntake } from '../tdee/tdee'

export const ZERO: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 }

const r1 = (n: number) => Math.round(n * 10) / 10

/** Valeurs pour `grams` g à partir de valeurs pour 100 g. */
export function macrosFor(per100: Macros, grams: number): Macros {
  const f = grams / 100
  return { kcal: Math.round(per100.kcal * f), protein: r1(per100.protein * f), carbs: r1(per100.carbs * f), fat: r1(per100.fat * f) }
}

export function sumMacros(list: Macros[]): Macros {
  const s = list.reduce((a, m) => ({ kcal: a.kcal + m.kcal, protein: a.protein + m.protein, carbs: a.carbs + m.carbs, fat: a.fat + m.fat }), ZERO)
  return { kcal: Math.round(s.kcal), protein: r1(s.protein), carbs: r1(s.carbs), fat: r1(s.fat) }
}

/** Objectifs en vigueur un jour donné : le dernier défini à partir d'une date ≤ ce jour. */
export function goalsForDate(goals: NutritionGoals[], date: string): Macros {
  let best: NutritionGoals | undefined
  for (const g of goals) if (g.from <= date && (!best || g.from > best.from)) best = g
  if (!best) return DEFAULT_GOALS
  const { kcal, protein, carbs, fat } = best
  return { kcal, protein, carbs, fat }
}

/** Calories totales par jour, pour le calcul du TDEE adaptatif. */
export function dailyIntakes(entries: Pick<FoodEntry, 'date' | 'total'>[]): DailyIntake[] {
  const byDay = new Map<string, number>()
  for (const e of entries) byDay.set(e.date, (byDay.get(e.date) ?? 0) + e.total.kcal)
  return [...byDay].map(([date, kcal]) => ({ date, kcal })).sort((a, b) => (a.date < b.date ? -1 : 1))
}

// ---------- Open Food Facts ----------

export interface OffFood {
  name: string
  brand?: string
  code: string
  per100: Macros
  servingGrams?: number
}

const num = (v: unknown): number | undefined => {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : v
  return typeof n === 'number' && Number.isFinite(n) ? n : undefined
}

/**
 * Convertit un produit Open Food Facts. Renvoie null si les calories sont inconnues
 * (on préfère alors proposer une saisie manuelle).
 */
export function parseOffProduct(p: Record<string, unknown> | undefined, code?: string): OffFood | null {
  if (!p) return null
  const n = (p.nutriments ?? {}) as Record<string, unknown>
  const kj = num(n['energy-kj_100g']) ?? (n['energy_unit'] === 'kJ' || n['energy_unit'] === undefined ? num(n['energy_100g']) : undefined)
  const kcal = num(n['energy-kcal_100g']) ?? (kj !== undefined ? kj / 4.184 : undefined)
  if (kcal === undefined) return null
  const name = String(p.product_name_fr || p.product_name || p.generic_name_fr || p.generic_name || '').trim()
  const brand = String(p.brands ?? '').split(',')[0].trim()
  return {
    name: name || 'Produit sans nom',
    brand: brand || undefined,
    code: String(p.code ?? code ?? ''),
    per100: {
      kcal: Math.round(kcal),
      protein: r1(num(n['proteins_100g']) ?? 0),
      carbs: r1(num(n['carbohydrates_100g']) ?? 0),
      fat: r1(num(n['fat_100g']) ?? 0),
    },
    servingGrams: num(p.serving_quantity) || undefined,
  }
}
