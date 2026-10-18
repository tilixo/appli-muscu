import Dexie, { type EntityTable } from 'dexie'
import {
  DEFAULT_PROFILE,
  type AppSettings,
  type Exercise,
  type Food,
  type FoodEntry,
  type MealPreset,
  type MeasurementRow,
  type NutritionGoals,
  type Profile,
  type Template,
  type Workout,
  type WeighInRow,
  type WorkoutSet,
} from './types'
import { seedDatabase } from './seed'

export const db = new Dexie('carnet-muscu') as Dexie & {
  exercises: EntityTable<Exercise, 'id'>
  workouts: EntityTable<Workout, 'id'>
  sets: EntityTable<WorkoutSet, 'id'>
  templates: EntityTable<Template, 'id'>
  settings: EntityTable<AppSettings, 'key'>
  profile: EntityTable<Profile, 'key'>
  foods: EntityTable<Food, 'id'>
  foodEntries: EntityTable<FoodEntry, 'id'>
  mealPresets: EntityTable<MealPreset, 'id'>
  nutritionGoals: EntityTable<NutritionGoals, 'from'>
  weighIns: EntityTable<WeighInRow, 'date'>
  measurements: EntityTable<MeasurementRow, 'date'>
}

// Schéma versionné : ne jamais modifier une version publiée.
// Pour évoluer, ajouter db.version(N + 1).stores({...}).upgrade(tx => ...).
db.version(1).stores({
  exercises: '++id, name, muscleGroup',
  workouts: '++id, startedAt',
  sets: '++id, workoutId, doneAt, [exerciseId+doneAt]',
  templates: '++id, name',
  settings: 'key',
})

// v2 : profil (TDEE). Ajout pur : les tables existantes sont conservées telles quelles.
db.version(2)
  .stores({ profile: 'key' })
  .upgrade((tx) => tx.table('profile').put(DEFAULT_PROFILE))

// v3 : nutrition. Ajout pur de tables.
db.version(3).stores({
  foods: '++id, &code, name, favorite, lastUsedAt',
  foodEntries: '++id, date, foodId',
  mealPresets: '++id, name, lastUsedAt',
  nutritionGoals: 'from',
})

// v4 : suivi du corps. Ajout pur de tables.
db.version(4).stores({
  weighIns: 'date',
  measurements: 'date',
})

db.on('populate', (tx) => seedDatabase(tx))
