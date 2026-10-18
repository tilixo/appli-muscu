import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { describe, expect, it } from 'vitest'

describe('migration du schéma', () => {
  it('v1 → v2 conserve les données et crée le profil', async () => {
    // Base telle qu'elle existait en v1, avec une séance déjà enregistrée.
    const v1 = new Dexie('carnet-muscu')
    v1.version(1).stores({
      exercises: '++id, name, muscleGroup',
      workouts: '++id, startedAt',
      sets: '++id, workoutId, doneAt, [exerciseId+doneAt]',
      templates: '++id, name',
      settings: 'key',
    })
    await v1.table('exercises').add({ name: 'Squat', muscleGroup: 'Quadriceps', isCustom: false })
    await v1.table('workouts').add({ name: 'Legs', startedAt: '2026-10-01T10:00:00.000Z', endedAt: '2026-10-01T11:00:00.000Z', items: [] })
    await v1.table('sets').add({ workoutId: 1, exerciseId: 1, weight: 100, reps: 5, doneAt: '2026-10-01T10:10:00.000Z' })
    await v1.table('settings').put({ key: 'app', defaultRestSeconds: 120, sound: false, wakeLock: true })
    v1.close()

    const { db } = await import('./db')
    await db.open()
    expect(db.verno).toBe(2)
    expect(await db.exercises.count()).toBe(1) // pas de re-seed
    expect(await db.sets.toArray()).toMatchObject([{ weight: 100, reps: 5 }])
    expect(await db.settings.get('app')).toMatchObject({ defaultRestSeconds: 120, sound: false })
    expect(await db.profile.get('profile')).toMatchObject({ activity: 'modere', goal: 'maintien', adaptiveWindowDays: 21 })
    db.close()
  })
})
