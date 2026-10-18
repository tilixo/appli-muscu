import type { WorkoutSet } from '../../db/types'
import { epley } from '../../lib/oneRepMax'
import { byDate } from '../workouts/workoutService'

export interface SessionStat {
  workoutId: number
  date: string
  sets: WorkoutSet[]
  bestE1rm: number
  maxWeight: number
  volume: number
  /** Records battus pendant cette séance (jamais pour la toute première). */
  e1rmRecord: boolean
  weightRecord: boolean
}

export interface RecordSet {
  set: WorkoutSet
  value: number
}

/** Regroupe les séries d'un exercice par séance, dans l'ordre chronologique. */
export function computeSessions(allSets: WorkoutSet[]): SessionStat[] {
  const sorted = [...allSets].sort(byDate)
  const groups = new Map<number, WorkoutSet[]>()
  for (const s of sorted) {
    const g = groups.get(s.workoutId)
    if (g) g.push(s)
    else groups.set(s.workoutId, [s])
  }

  let bestE = 0
  let bestW = 0
  let first = true
  const out: SessionStat[] = []
  for (const [workoutId, sets] of groups) {
    const bestE1rm = Math.max(...sets.map((s) => epley(s.weight, s.reps)))
    const maxWeight = Math.max(...sets.map((s) => s.weight))
    out.push({
      workoutId,
      date: sets[0].doneAt,
      sets,
      bestE1rm,
      maxWeight,
      volume: sets.reduce((v, s) => v + s.weight * s.reps, 0),
      e1rmRecord: !first && bestE1rm > bestE + 1e-9,
      weightRecord: !first && maxWeight > bestW,
    })
    bestE = Math.max(bestE, bestE1rm)
    bestW = Math.max(bestW, maxWeight)
    first = false
  }
  return out
}

export function bestBy(sets: WorkoutSet[], score: (s: WorkoutSet) => number): RecordSet | null {
  let best: RecordSet | null = null
  for (const s of sets) {
    const v = score(s)
    // À égalité, on garde la première fois où le record a été atteint.
    if (v > 0 && (!best || v > best.value)) best = { set: s, value: v }
  }
  return best
}
