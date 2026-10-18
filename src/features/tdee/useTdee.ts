import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import type { Profile } from '../../db/types'
import { localDay } from '../../lib/dates'
import { useProfile } from '../../lib/profile'
import { dailyIntakes } from '../nutrition/nutrition'
import { adaptiveTdee, addDays, suggestedTarget, theoreticalFromProfile, weeklyAdaptiveTdee, type AdaptiveResult, type TheoreticalResult, type WeeklyPoint, type WeighIn } from './tdee'

/** Nombre de semaines affichées dans la courbe d'évolution. */
export const HISTORY_WEEKS = 12

export interface TdeeData {
  profile: Profile
  theoretical: TheoreticalResult
  adaptive: AdaptiveResult
  weekly: WeeklyPoint[]
  /** TDEE retenu pour la cible : adaptatif s'il est disponible, sinon théorique. */
  basis: { source: 'adaptatif' | 'théorique'; tdee: number } | null
  target: number | null
}

// Les pesées arrivent avec le suivi du corps (phase 3).
async function loadWeighIns(): Promise<WeighIn[]> {
  return []
}

export function useTdee(): TdeeData | undefined {
  const profile = useProfile()
  const today = localDay()
  const data = useLiveQuery(async () => {
    const from = addDays(today, -(HISTORY_WEEKS * 7 + profile.adaptiveWindowDays))
    const [entries, weighIns] = await Promise.all([db.foodEntries.where('date').between(from, today, true, true).toArray(), loadWeighIns()])
    return { intakes: dailyIntakes(entries), weighIns }
  }, [today, profile.adaptiveWindowDays])
  if (!data) return undefined

  const windowDays = profile.adaptiveWindowDays
  const theoretical = theoreticalFromProfile(profile, data.weighIns, today)
  const adaptive = adaptiveTdee({ ...data, endDate: today, windowDays })
  const weekly = weeklyAdaptiveTdee({ ...data, windowDays, from: addDays(today, -(HISTORY_WEEKS - 1) * 7), to: today })
  const basis =
    adaptive.status === 'ok'
      ? { source: 'adaptatif' as const, tdee: adaptive.tdee }
      : theoretical.status === 'ok'
        ? { source: 'théorique' as const, tdee: theoretical.tdee }
        : null
  return {
    profile,
    theoretical,
    adaptive,
    weekly,
    basis,
    target: basis ? suggestedTarget(basis.tdee, profile.goal, profile.goalAdjustments) : null,
  }
}
