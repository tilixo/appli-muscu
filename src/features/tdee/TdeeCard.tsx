import { lazy, Suspense, useState } from 'react'
import { Link } from 'react-router'
import { btnPrimary, card } from '../../components/ui'
import type { Macros } from '../../db/types'
import { localDay } from '../../lib/dates'
import { fmtInt, fmtNumber } from '../../lib/format'
import { setGoals } from '../nutrition/foodService'
import { GOALS } from './tdee'
import { TdeeInfo } from './TdeeInfo'
import { useTdee } from './useTdee'

const TdeeChart = lazy(() => import('./TdeeChart'))

const CONFIDENCE_STYLE = { faible: 'text-red-300 bg-red-400/15', moyen: 'text-amber-300 bg-amber-400/15', bon: 'text-lime-300 bg-lime-400/15' }

/** Carte TDEE de l'onglet Nutrition. `goals` : objectifs en vigueur aujourd'hui. */
export function TdeeCard({ goals }: { goals: Macros }) {
  const t = useTdee()
  const [showChart, setShowChart] = useState(false)
  if (!t) return null

  const { theoretical, adaptive, target, basis, profile } = t
  const gap = theoretical.status === 'ok' && adaptive.status === 'ok' ? adaptive.tdee - theoretical.tdee : null
  const hasHistory = t.weekly.filter((p) => p.tdee !== null).length >= 2
  const goalLabel = GOALS.find((g) => g.key === profile.goal)?.label.toLowerCase()
  const adj = profile.goalAdjustments[profile.goal]

  const apply = async () => {
    if (target === null) return
    if (!confirm(`Remplacer l'objectif calorique de ${fmtInt(goals.kcal)} kcal par ${fmtInt(target)} kcal à partir d'aujourd'hui ?`)) return
    await setGoals(localDay(), { ...goals, kcal: target })
  }

  return (
    <section className={`${card} space-y-3 p-4`}>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">TDEE</h2>
        <TdeeInfo />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-zinc-950/60 p-3">
          <div className="text-xs text-zinc-500">Théorique</div>
          {theoretical.status === 'ok' ? (
            <div className="font-mono text-xl font-semibold">{fmtInt(theoretical.tdee)}</div>
          ) : (
            <Link to="/reglages" className="text-sm text-lime-400">Compléter le profil</Link>
          )}
        </div>
        <div className="rounded-xl bg-zinc-950/60 p-3">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Adaptatif</span>
            {adaptive.status === 'ok' && <span className={`rounded px-1.5 font-medium ${CONFIDENCE_STYLE[adaptive.confidence]}`}>{adaptive.confidence}</span>}
          </div>
          {adaptive.status === 'ok' ? <div className="font-mono text-xl font-semibold">{fmtInt(adaptive.tdee)}</div> : <div className="text-sm text-zinc-400">Pas assez de données</div>}
        </div>
      </div>

      {adaptive.status === 'insufficient' ? (
        <p className="text-xs text-zinc-500">
          Il manque {adaptive.missing.join(', ')} (sur les {profile.adaptiveWindowDays} derniers jours).
        </p>
      ) : (
        <p className="text-xs text-zinc-500">
          Apport moyen {fmtInt(adaptive.avgIntake)} kcal · poids {adaptive.weightChangePerWeek >= 0 ? '+' : ''}
          {fmtNumber(Math.round(adaptive.weightChangePerWeek * 100) / 100)} kg/sem. · {adaptive.loggedDays} j loggés, {adaptive.weighInDays} pesées
          {gap !== null && ` · écart ${gap >= 0 ? '+' : ''}${fmtInt(gap)} kcal (${gap >= 0 ? '+' : ''}${fmtInt((gap / (theoretical.status === 'ok' ? theoretical.tdee : 1)) * 100)} %) vs théorique`}
        </p>
      )}

      {target !== null && basis && (
        <div className="space-y-2 rounded-xl bg-zinc-950/60 p-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm text-zinc-400">Cible suggérée ({goalLabel})</span>
            <span className="font-mono text-xl font-semibold text-lime-400">{fmtInt(target)}</span>
          </div>
          <p className="text-xs text-zinc-500">
            TDEE {basis.source} {fmtInt(basis.tdee)} {adj >= 0 ? '+' : '−'} {fmtInt(Math.abs(adj))} kcal · objectif actuel {fmtInt(goals.kcal)} kcal
          </p>
          <button type="button" className={`${btnPrimary} w-full`} disabled={target === goals.kcal} onClick={() => void apply()}>
            {target === goals.kcal ? 'Déjà appliqué' : 'Appliquer comme objectif calorique'}
          </button>
        </div>
      )}

      {hasHistory && (
        <div>
          <button type="button" className="min-h-11 text-sm text-lime-400" onClick={() => setShowChart(!showChart)}>
            {showChart ? 'Masquer' : 'Voir'} l'évolution
          </button>
          {showChart && (
            <Suspense fallback={<div className="h-44" />}>
              <TdeeChart points={t.weekly} />
            </Suspense>
          )}
        </div>
      )}
    </section>
  )
}
