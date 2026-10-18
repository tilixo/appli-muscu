// Agrégations hebdomadaires pour l'écran Progression (fonctions pures).
import { addDays, dayNumber, linearSlope, mondayOf, type WeighIn } from '../tdee/tdee'

export interface DatedValue {
  date: string // 'YYYY-MM-DD'
  value: number
}

/** Lundis des semaines couvrant [from, to]. */
export function weekStarts(from: string, to: string): string[] {
  const out: string[] = []
  for (let m = mondayOf(from); m <= to; m = addDays(m, 7)) out.push(m)
  return out
}

function bucket(points: DatedValue[], weeks: string[], pick: (values: DatedValue[]) => number): (number | null)[] {
  return weeks.map((monday) => {
    const sunday = addDays(monday, 6)
    const inWeek = points.filter((p) => p.date >= monday && p.date <= sunday)
    return inWeek.length ? pick(inWeek) : null
  })
}

/** Dernière valeur de chaque semaine (ex. poids lissé en fin de semaine). */
export function weeklyLast(points: DatedValue[], weeks: string[]): (number | null)[] {
  return bucket(points, weeks, (vs) => vs.reduce((a, b) => (b.date >= a.date ? b : a)).value)
}

/** Meilleure valeur de chaque semaine (ex. meilleur 1RM estimé). */
export function weeklyMax(points: DatedValue[], weeks: string[]): (number | null)[] {
  return bucket(points, weeks, (vs) => Math.max(...vs.map((v) => v.value)))
}

/** Écart entre la première et la dernière valeur connue de la série. */
export function seriesChange(values: (number | null)[]): { from: number; to: number; delta: number } | null {
  const known = values.filter((v): v is number => v !== null)
  if (known.length < 2) return null
  const from = known[0]
  const to = known[known.length - 1]
  return { from, to, delta: to - from }
}

/**
 * Tendance du poids en kg/semaine : régression linéaire sur les pesées
 * des `days` derniers jours (au moins 3 pesées).
 */
export function weightTrendPerWeek(weighIns: WeighIn[], today: string, days = 14): number | null {
  const from = addDays(today, -(days - 1))
  const pts = weighIns.filter((w) => w.date >= from && w.date <= today).map((w) => ({ x: dayNumber(w.date), y: w.kg }))
  if (pts.length < 3) return null
  const slope = linearSlope(pts)
  return slope === null ? null : slope * 7
}
