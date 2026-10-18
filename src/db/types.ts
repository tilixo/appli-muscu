import { DEFAULT_GOAL_ADJUSTMENTS, DEFAULT_WINDOW_DAYS, type ActivityLevel, type Goal, type Sex } from '../features/tdee/tdee'

export const MUSCLE_GROUPS = [
  'Pectoraux',
  'Dos',
  'Épaules',
  'Biceps',
  'Triceps',
  'Avant-bras',
  'Quadriceps',
  'Ischio-jambiers',
  'Fessiers',
  'Mollets',
  'Abdominaux',
] as const

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number]

export interface Exercise {
  id: number
  name: string
  muscleGroup: MuscleGroup
  /** Durée de repos spécifique (s). Sinon : réglage par défaut. */
  restSeconds?: number
  /** Pas des boutons +/- du poids (kg). */
  weightStep?: number
  isCustom: boolean
  archived?: boolean
}

export interface PlanItem {
  exerciseId: number
  targetSets: number
}

export interface Workout {
  id: number
  name: string
  templateId?: number
  startedAt: string // ISO
  endedAt?: string // ISO, absent = séance en cours
  items: PlanItem[]
}

export interface WorkoutSet {
  id: number
  workoutId: number
  exerciseId: number
  reps: number
  weight: number // kg
  doneAt: string // ISO
}

export interface Template {
  id: number
  name: string
  items: PlanItem[]
  updatedAt: string // ISO
}

export interface AppSettings {
  key: 'app'
  defaultRestSeconds: number
  sound: boolean
  wakeLock: boolean
  /** Exercices suivis dans l'écran Progression. */
  keyExerciseIds?: number[]
}

export const DEFAULT_SETTINGS: AppSettings = {
  key: 'app',
  defaultRestSeconds: 90,
  sound: true,
  wakeLock: true,
}

export interface Profile {
  key: 'profile'
  sex?: Sex
  birthDate?: string // 'YYYY-MM-DD'
  heightCm?: number
  /** Poids de référence, utilisé tant qu'aucune pesée n'est enregistrée. */
  weightKg?: number
  activity: ActivityLevel
  goal: Goal
  goalAdjustments: Record<Goal, number>
  adaptiveWindowDays: number
}

export const DEFAULT_PROFILE: Profile = {
  key: 'profile',
  activity: 'modere',
  goal: 'maintien',
  goalAdjustments: { ...DEFAULT_GOAL_ADJUSTMENTS },
  adaptiveWindowDays: DEFAULT_WINDOW_DAYS,
}

// ---------- Nutrition (v3) ----------

export interface Macros {
  kcal: number
  protein: number // g
  carbs: number // g
  fat: number // g
}

export type Meal = 'petit-dej' | 'dejeuner' | 'diner' | 'collation'

export const MEALS: { key: Meal; label: string }[] = [
  { key: 'petit-dej', label: 'Petit-déjeuner' },
  { key: 'dejeuner', label: 'Déjeuner' },
  { key: 'diner', label: 'Dîner' },
  { key: 'collation', label: 'Collations' },
]

/** Aliment connu : produit scanné (cache Open Food Facts) ou créé à la main. Valeurs pour 100 g. */
export interface Food {
  id: number
  name: string
  brand?: string
  code?: string // code-barres
  per100: Macros
  /** Portion indiquée sur l'emballage (g). */
  servingGrams?: number
  source: 'off' | 'manuel'
  favorite: 0 | 1 // nombre : les booléens ne sont pas indexables
  lastUsedAt?: string // ISO
  lastGrams?: number
}

/** Ligne du journal. Les valeurs sont copiées : modifier un aliment ne réécrit pas l'historique. */
export interface FoodEntry {
  id: number
  date: string // 'YYYY-MM-DD'
  meal: Meal
  name: string
  foodId?: number
  grams?: number // absent pour une saisie rapide
  per100?: Macros
  total: Macros
  createdAt: string // ISO
}

export interface MealPresetItem {
  name: string
  foodId?: number
  grams?: number
  per100?: Macros
  total: Macros
}

export interface MealPreset {
  id: number
  name: string
  items: MealPresetItem[]
  lastUsedAt?: string
}

/** Objectifs applicables à partir de la date `from` (incluse). */
export interface NutritionGoals extends Macros {
  from: string // 'YYYY-MM-DD'
}

export const DEFAULT_GOALS: Macros = { kcal: 2200, protein: 150, carbs: 250, fat: 70 }

// ---------- Corps (v4) ----------

/** Une pesée par jour (la saisie remplace celle du même jour). */
export interface WeighInRow {
  date: string // 'YYYY-MM-DD'
  kg: number
}

export const MEASURES = [
  { key: 'taille', label: 'Tour de taille', unit: 'cm' },
  { key: 'hanches', label: 'Hanches', unit: 'cm' },
  { key: 'poitrine', label: 'Poitrine', unit: 'cm' },
  { key: 'epaules', label: 'Épaules', unit: 'cm' },
  { key: 'bras', label: 'Bras', unit: 'cm' },
  { key: 'cuisse', label: 'Cuisse', unit: 'cm' },
  { key: 'mollet', label: 'Mollet', unit: 'cm' },
  { key: 'cou', label: 'Cou', unit: 'cm' },
  { key: 'masseGrasse', label: 'Masse grasse', unit: '%' },
] as const

export type MeasureKey = (typeof MEASURES)[number]['key']

/** Mensurations d'un jour : seuls les champs mesurés sont présents. */
export interface MeasurementRow {
  date: string // 'YYYY-MM-DD'
  values: Partial<Record<MeasureKey, number>>
}
