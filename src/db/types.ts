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
