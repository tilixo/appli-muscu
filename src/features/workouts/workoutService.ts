import Dexie from 'dexie'
import { db } from '../../db/db'
import type { PlanItem, Workout, WorkoutSet } from '../../db/types'
import { epley } from '../../lib/oneRepMax'

/** Toutes les séries d'un exercice, de la plus ancienne à la plus récente. */
export function setsForExercise(exerciseId: number) {
  return db.sets.where('[exerciseId+doneAt]').between([exerciseId, Dexie.minKey], [exerciseId, Dexie.maxKey]).toArray()
}

export async function getActiveWorkout(): Promise<Workout | undefined> {
  return db.workouts.filter((w) => !w.endedAt).first()
}

export async function startWorkout(name: string, items: PlanItem[], templateId?: number): Promise<number> {
  return db.workouts.add({
    name,
    templateId,
    items: items.map((i) => ({ ...i })),
    startedAt: new Date().toISOString(),
  })
}

export async function finishWorkout(id: number) {
  await db.workouts.update(id, { endedAt: new Date().toISOString() })
}

export async function deleteWorkout(id: number) {
  await db.transaction('rw', db.workouts, db.sets, async () => {
    await db.sets.where('workoutId').equals(id).delete()
    await db.workouts.delete(id)
  })
}

export interface PreviousSession {
  workoutId: number
  date: string
  sets: WorkoutSet[]
}

/** Dernière séance (antérieure à `workout`) où l'exercice a été fait. */
export async function getPreviousSession(exerciseId: number, workout: Workout): Promise<PreviousSession | null> {
  const last = await db.sets
    .where('[exerciseId+doneAt]')
    .between([exerciseId, Dexie.minKey], [exerciseId, workout.startedAt], true, false)
    .reverse()
    .filter((s) => s.workoutId !== workout.id)
    .first()
  if (!last) return null
  const sets = (await db.sets.where('workoutId').equals(last.workoutId).toArray())
    .filter((s) => s.exerciseId === exerciseId)
    .sort(byDate)
  return { workoutId: last.workoutId, date: last.doneAt, sets }
}

export interface Bests {
  e1rm: number
  weight: number
}

/** Meilleures perfs d'un exercice avant le début de `workout` (hors cette séance). */
export async function getBestsBefore(exerciseId: number, workout: Workout): Promise<Bests | null> {
  const sets = await db.sets
    .where('[exerciseId+doneAt]')
    .between([exerciseId, Dexie.minKey], [exerciseId, workout.startedAt], true, false)
    .filter((s) => s.workoutId !== workout.id)
    .toArray()
  if (sets.length === 0) return null
  return sets.reduce<Bests>(
    (b, s) => ({ e1rm: Math.max(b.e1rm, epley(s.weight, s.reps)), weight: Math.max(b.weight, s.weight) }),
    { e1rm: 0, weight: 0 },
  )
}

export type PRKind = 'e1rm' | 'weight'

/**
 * Pour chaque série (ordre chronologique), indique si elle bat les records
 * établis jusque-là. Sans historique préalable (`bests` null), pas de record.
 */
export function markRecords(sets: WorkoutSet[], bests: Bests | null): Map<number, PRKind[]> {
  const out = new Map<number, PRKind[]>()
  if (!bests) return out
  let { e1rm, weight } = bests
  for (const s of [...sets].sort(byDate)) {
    const kinds: PRKind[] = []
    const e = epley(s.weight, s.reps)
    if (e > e1rm + 1e-9) {
      kinds.push('e1rm')
      e1rm = e
    }
    if (s.weight > weight) {
      kinds.push('weight')
      weight = s.weight
    }
    if (kinds.length) out.set(s.id, kinds)
  }
  return out
}

export async function logSet(workout: Workout, exerciseId: number, weight: number, reps: number): Promise<number> {
  // Séance passée éditée après coup : on date la série à la fin de la séance.
  const doneAt = workout.endedAt ?? new Date().toISOString()
  return db.sets.add({ workoutId: workout.id, exerciseId, weight, reps, doneAt })
}

export function byDate(a: WorkoutSet, b: WorkoutSet) {
  return a.doneAt < b.doneAt ? -1 : a.doneAt > b.doneAt ? 1 : a.id - b.id
}

export const volumeOf = (sets: WorkoutSet[]) => sets.reduce((v, s) => v + s.weight * s.reps, 0)
