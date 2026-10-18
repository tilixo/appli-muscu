import Dexie, { type EntityTable } from 'dexie'
import type { AppSettings, Exercise, Template, Workout, WorkoutSet } from './types'
import { seedDatabase } from './seed'

export const db = new Dexie('carnet-muscu') as Dexie & {
  exercises: EntityTable<Exercise, 'id'>
  workouts: EntityTable<Workout, 'id'>
  sets: EntityTable<WorkoutSet, 'id'>
  templates: EntityTable<Template, 'id'>
  settings: EntityTable<AppSettings, 'key'>
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

db.on('populate', (tx) => seedDatabase(tx))
