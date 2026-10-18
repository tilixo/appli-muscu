// Calculs de dépense énergétique (TDEE). Module pur : aucune dépendance UI ni base de données.
// Les jours sont des chaînes 'YYYY-MM-DD' (date locale).

export type Sex = 'homme' | 'femme'
export type Goal = 'perte' | 'maintien' | 'prise'
export type ActivityLevel = 'sedentaire' | 'leger' | 'modere' | 'actif' | 'extreme'
export type Confidence = 'faible' | 'moyen' | 'bon'

export const ACTIVITY_LEVELS: { key: ActivityLevel; label: string; factor: number; hint: string }[] = [
  { key: 'sedentaire', label: 'Sédentaire', factor: 1.2, hint: 'Peu ou pas de sport, travail assis' },
  { key: 'leger', label: 'Légèrement actif', factor: 1.375, hint: 'Sport 1 à 3 fois par semaine' },
  { key: 'modere', label: 'Modérément actif', factor: 1.55, hint: 'Sport 3 à 5 fois par semaine' },
  { key: 'actif', label: 'Très actif', factor: 1.725, hint: 'Sport 6 à 7 fois par semaine' },
  { key: 'extreme', label: 'Extrêmement actif', factor: 1.9, hint: 'Sport intense quotidien ou travail physique' },
]

export const GOALS: { key: Goal; label: string }[] = [
  { key: 'perte', label: 'Perte' },
  { key: 'maintien', label: 'Maintien' },
  { key: 'prise', label: 'Prise' },
]

export const DEFAULT_GOAL_ADJUSTMENTS: Record<Goal, number> = { perte: -400, maintien: 0, prise: 300 }

export const KCAL_PER_KG = 7700
/** En dessous, une journée est considérée comme non (ou mal) loggée. */
export const MIN_LOGGED_KCAL = 800
export const MIN_COVERED_DAYS = 14
export const MIN_LOGGED_DAYS = 10
export const MIN_WEIGH_INS = 6
export const DEFAULT_WINDOW_DAYS = 21
export const MIN_WINDOW_DAYS = 14
export const MAX_WINDOW_DAYS = 28

export interface WeighIn {
  date: string
  kg: number
}

export interface DailyIntake {
  date: string
  kcal: number
}

// ---------- Dates ----------

/** 'YYYY-MM-DD' → nombre de jours depuis l'epoch (sans fuseau horaire). */
export function dayNumber(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000)
}

export function fromDayNumber(n: number): string {
  return new Date(n * 86_400_000).toISOString().slice(0, 10)
}

export function addDays(date: string, n: number): string {
  return fromDayNumber(dayNumber(date) + n)
}

/** Lundi de la semaine contenant `date`. */
export function mondayOf(date: string): string {
  const n = dayNumber(date)
  const weekday = (((n + 3) % 7) + 7) % 7 // 1970-01-01 était un jeudi ; lundi = 0
  return fromDayNumber(n - weekday)
}

export function ageOn(birthDate: string, today: string): number {
  const [by, bm, bd] = birthDate.split('-').map(Number)
  const [ty, tm, td] = today.split('-').map(Number)
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0)
}

// ---------- TDEE théorique ----------

/** Métabolisme de base, formule de Mifflin-St Jeor (kcal/jour). */
export function bmrMifflin(p: { sex: Sex; weightKg: number; heightCm: number; age: number }): number {
  return 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === 'homme' ? 5 : -161)
}

export function activityFactor(level: ActivityLevel): number {
  return ACTIVITY_LEVELS.find((a) => a.key === level)?.factor ?? 1.2
}

export function theoreticalTdee(bmr: number, level: ActivityLevel): number {
  return bmr * activityFactor(level)
}

export function suggestedTarget(tdee: number, goal: Goal, adjustments: Record<Goal, number> = DEFAULT_GOAL_ADJUSTMENTS): number {
  return Math.round(tdee + adjustments[goal])
}

// ---------- Poids lissé ----------

/** Une valeur par jour (moyenne si plusieurs pesées le même jour), triée. */
function dailyWeights(weighIns: WeighIn[]): WeighIn[] {
  const byDay = new Map<string, number[]>()
  for (const w of weighIns) {
    if (!(w.kg > 0)) continue
    const list = byDay.get(w.date)
    if (list) list.push(w.kg)
    else byDay.set(w.date, [w.kg])
  }
  return [...byDay]
    .map(([date, kgs]) => ({ date, kg: mean(kgs) }))
    .sort((a, b) => (a.date < b.date ? -1 : 1))
}

interface SmoothedPoint extends WeighIn {
  /** Date moyenne (en numéro de jour) des pesées moyennées. */
  center: number
}

function smoothWithCenter(weighIns: WeighIn[], days: number): SmoothedPoint[] {
  const daily = dailyWeights(weighIns)
  return daily.map((w, i) => {
    const from = dayNumber(w.date) - (days - 1)
    const kgs: number[] = []
    const xs: number[] = []
    for (let j = i; j >= 0 && dayNumber(daily[j].date) >= from; j--) {
      kgs.push(daily[j].kg)
      xs.push(dayNumber(daily[j].date))
    }
    return { date: w.date, kg: mean(kgs), center: mean(xs) }
  })
}

/**
 * Moyenne glissante sur 7 jours, évaluée chaque jour de pesée :
 * moyenne des pesées des jours [J-6, J].
 */
export function smoothedWeights(weighIns: WeighIn[], days = 7): WeighIn[] {
  return smoothWithCenter(weighIns, days).map(({ date, kg }) => ({ date, kg }))
}

/** Dernier poids lissé connu au jour `until` inclus (ou null). */
export function latestSmoothedWeight(weighIns: WeighIn[], until?: string): number | null {
  const s = smoothedWeights(until ? weighIns.filter((w) => w.date <= until) : weighIns)
  return s.length ? s[s.length - 1].kg : null
}

// ---------- Statistiques ----------

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length
}

/** Pente de la droite des moindres carrés (null si incalculable). */
export function linearSlope(points: { x: number; y: number }[]): number | null {
  if (points.length < 2) return null
  const mx = mean(points.map((p) => p.x))
  const my = mean(points.map((p) => p.y))
  let num = 0
  let den = 0
  for (const p of points) {
    num += (p.x - mx) * (p.y - my)
    den += (p.x - mx) ** 2
  }
  return den === 0 ? null : num / den
}

// ---------- TDEE adaptatif ----------

export interface AdaptiveInput {
  /** Apports journaliers (plusieurs entrées le même jour sont additionnées). */
  intakes: DailyIntake[]
  weighIns: WeighIn[]
  /** Dernier jour de la fenêtre (inclus). */
  endDate: string
  windowDays?: number
}

export interface AdaptiveCounts {
  /** Jours de la fenêtre couverts par l'historique (depuis la première donnée). */
  coveredDays: number
  loggedDays: number
  weighInDays: number
}

export type AdaptiveResult =
  | (AdaptiveCounts & {
      status: 'ok'
      tdee: number
      avgIntake: number
      /** Variation du poids lissé, en kg par semaine. */
      weightChangePerWeek: number
      confidence: Confidence
    })
  | (AdaptiveCounts & { status: 'insufficient'; missing: string[] })

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`

/**
 * TDEE = apport moyen − (pente du poids lissé en kg/jour × 7700),
 * sur une fenêtre glissante se terminant à `endDate`.
 */
export function adaptiveTdee({ intakes, weighIns, endDate, windowDays = DEFAULT_WINDOW_DAYS }: AdaptiveInput): AdaptiveResult {
  const end = dayNumber(endDate)
  const start = end - windowDays + 1
  const inWindow = (date: string) => {
    const n = dayNumber(date)
    return n >= start && n <= end
  }

  // Totaux par jour, puis on ne garde que les jours réellement loggés.
  const totals = new Map<string, number>()
  for (const i of intakes) totals.set(i.date, (totals.get(i.date) ?? 0) + i.kcal)
  const logged = [...totals].filter(([date, kcal]) => inWindow(date) && kcal >= MIN_LOGGED_KCAL).map(([, kcal]) => kcal)

  const pastWeighIns = weighIns.filter((w) => dayNumber(w.date) <= end)
  const smoothed = smoothWithCenter(pastWeighIns, 7).filter((w) => inWindow(w.date))

  // Historique disponible : depuis la première donnée connue (repas loggé ou pesée).
  const firstDates = [
    ...[...totals].filter(([date, kcal]) => kcal >= MIN_LOGGED_KCAL && dayNumber(date) <= end).map(([date]) => dayNumber(date)),
    ...pastWeighIns.map((w) => dayNumber(w.date)),
  ]
  const first = firstDates.length ? Math.min(...firstDates) : end + 1
  const counts: AdaptiveCounts = {
    coveredDays: Math.max(0, end - Math.max(start, first) + 1),
    loggedDays: logged.length,
    weighInDays: smoothed.length,
  }

  const missing: string[] = []
  if (counts.coveredDays < MIN_COVERED_DAYS) missing.push(`${plural(MIN_COVERED_DAYS - counts.coveredDays, 'jour')} d'historique`)
  if (counts.loggedDays < MIN_LOGGED_DAYS) missing.push(`${plural(MIN_LOGGED_DAYS - counts.loggedDays, 'jour')} de repas loggés`)
  if (counts.weighInDays < MIN_WEIGH_INS) missing.push(plural(MIN_WEIGH_INS - counts.weighInDays, 'pesée'))

  // Chaque moyenne est placée à la date moyenne de ses pesées : sans ça, les premières
  // moyennes (moins de 7 jours d'historique) sont moins en retard et biaisent la pente.
  const slope = linearSlope(smoothed.map((w) => ({ x: w.center, y: w.kg })))
  if (missing.length || slope === null) return { status: 'insufficient', missing, ...counts }

  const avgIntake = mean(logged)
  return {
    status: 'ok',
    tdee: Math.round(avgIntake - slope * KCAL_PER_KG),
    avgIntake: Math.round(avgIntake),
    weightChangePerWeek: slope * 7,
    confidence: confidenceOf(counts, smoothed, windowDays),
    ...counts,
  }
}

/** Régularité des données : proportion de jours loggés et pesés, trous entre pesées. */
function confidenceOf(c: AdaptiveCounts, smoothed: WeighIn[], windowDays: number): Confidence {
  const logRatio = c.loggedDays / c.coveredDays
  const weighRatio = c.weighInDays / c.coveredDays
  let maxGap = 0
  for (let i = 1; i < smoothed.length; i++) maxGap = Math.max(maxGap, dayNumber(smoothed[i].date) - dayNumber(smoothed[i - 1].date))

  let level: Confidence = 'faible'
  if (logRatio >= 0.85 && weighRatio >= 0.5 && c.coveredDays >= windowDays) level = 'bon'
  else if (logRatio >= 0.7 && weighRatio >= 0.35) level = 'moyen'

  // Une longue période sans pesée rend la tendance fragile.
  if (maxGap > 7) level = level === 'bon' ? 'moyen' : 'faible'
  return level
}

export interface WeeklyPoint {
  /** Lundi de la semaine. */
  weekStart: string
  /** TDEE adaptatif évalué en fin de semaine (ou à `to` pour la semaine en cours). */
  tdee: number | null
  /** Apport moyen des jours loggés de la semaine. */
  avgIntake: number | null
}

/** Une valeur par semaine (lundi → dimanche) entre `from` et `to`. */
export function weeklyAdaptiveTdee(input: Omit<AdaptiveInput, 'endDate'> & { from: string; to: string }): WeeklyPoint[] {
  const totals = new Map<string, number>()
  for (const i of input.intakes) totals.set(i.date, (totals.get(i.date) ?? 0) + i.kcal)

  const points: WeeklyPoint[] = []
  for (let monday = mondayOf(input.from); monday <= input.to; monday = addDays(monday, 7)) {
    const sunday = addDays(monday, 6)
    const evalDate = sunday < input.to ? sunday : input.to
    const r = adaptiveTdee({ ...input, endDate: evalDate })
    const week = [...totals].filter(([d, kcal]) => d >= monday && d <= sunday && kcal >= MIN_LOGGED_KCAL).map(([, k]) => k)
    points.push({
      weekStart: monday,
      tdee: r.status === 'ok' ? r.tdee : null,
      avgIntake: week.length ? Math.round(mean(week)) : null,
    })
  }
  return points
}

// ---------- Depuis le profil ----------

export interface ProfileInput {
  sex?: Sex
  birthDate?: string
  heightCm?: number
  /** Poids saisi dans le profil, utilisé seulement sans pesée. */
  weightKg?: number
  activity: ActivityLevel
}

export type TheoreticalResult =
  | { status: 'ok'; bmr: number; tdee: number; age: number; weightKg: number; weightSource: 'lisse' | 'profil' }
  | { status: 'incomplete'; missing: string[] }

/** TDEE théorique : poids lissé sur 7 jours en priorité, sinon poids du profil. */
export function theoreticalFromProfile(p: ProfileInput, weighIns: WeighIn[], today: string): TheoreticalResult {
  const smoothed = latestSmoothedWeight(weighIns, today)
  const weightKg = smoothed ?? p.weightKg
  const missing: string[] = []
  if (!p.sex) missing.push('sexe')
  if (!p.birthDate) missing.push('date de naissance')
  if (!p.heightCm) missing.push('taille')
  if (!weightKg) missing.push('poids')
  if (missing.length || !p.sex || !p.birthDate || !p.heightCm || !weightKg) return { status: 'incomplete', missing }

  const age = ageOn(p.birthDate, today)
  const bmr = bmrMifflin({ sex: p.sex, weightKg, heightCm: p.heightCm, age })
  return {
    status: 'ok',
    bmr: Math.round(bmr),
    tdee: Math.round(theoreticalTdee(bmr, p.activity)),
    age,
    weightKg,
    weightSource: smoothed !== null ? 'lisse' : 'profil',
  }
}
