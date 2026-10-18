import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { Stepper } from '../../components/Stepper'
import { card, input } from '../../components/ui'
import { db } from '../../db/db'
import type { Profile } from '../../db/types'
import { localDay } from '../../lib/dates'
import { fmtInt, fmtNumber, parseDecimal } from '../../lib/format'
import { updateProfile, useProfile } from '../../lib/profile'
import { TdeeInfo } from '../tdee/TdeeInfo'
import {
  ACTIVITY_LEVELS,
  GOALS,
  MAX_WINDOW_DAYS,
  MIN_WINDOW_DAYS,
  suggestedTarget,
  theoreticalFromProfile,
  type ActivityLevel,
  type Goal,
} from '../tdee/tdee'

const segment = (active: boolean) =>
  `min-h-11 flex-1 rounded-lg text-sm font-medium ${active ? 'bg-lime-400 text-zinc-950' : 'text-zinc-300 active:bg-zinc-700'}`

export function ProfileSection() {
  const profile = useProfile()
  const weighIns = useLiveQuery(() => db.weighIns.toArray(), []) ?? []
  const theoretical = theoreticalFromProfile(profile, weighIns, localDay())

  return (
    <section className={`${card} space-y-4 p-4`}>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Profil</h2>
        <TdeeInfo />
      </div>

      <div className="flex gap-1 rounded-xl bg-zinc-800 p-1">
        {(['homme', 'femme'] as const).map((s) => (
          <button key={s} type="button" className={segment(profile.sex === s)} onClick={() => void updateProfile({ sex: s })}>
            {s === 'homme' ? 'Homme' : 'Femme'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="col-span-2 block space-y-1">
          <span className="text-sm text-zinc-400">Date de naissance</span>
          <input
            type="date"
            className={input}
            value={profile.birthDate ?? ''}
            max={localDay()}
            onChange={(e) => void updateProfile({ birthDate: e.target.value || undefined })}
          />
        </label>
        <NumberField label="Taille (cm)" value={profile.heightCm} onCommit={(v) => updateProfile({ heightCm: v })} />
        {weighIns.length === 0 && <NumberField label="Poids (kg)" value={profile.weightKg} decimal onCommit={(v) => updateProfile({ weightKg: v })} />}
      </div>
      <p className="-mt-2 text-xs text-zinc-500">
        {weighIns.length === 0
          ? 'Ce poids sera remplacé par ta moyenne lissée dès ta première pesée (onglet Corps).'
          : 'Poids : moyenne lissée sur 7 jours de tes pesées (onglet Corps).'}
      </p>

      <label className="block space-y-1">
        <span className="text-sm text-zinc-400">Niveau d'activité</span>
        <select className={input} value={profile.activity} onChange={(e) => void updateProfile({ activity: e.target.value as ActivityLevel })}>
          {ACTIVITY_LEVELS.map((a) => (
            <option key={a.key} value={a.key}>
              {a.label} ({fmtNumber(a.factor)})
            </option>
          ))}
        </select>
        <span className="block text-xs text-zinc-500">{ACTIVITY_LEVELS.find((a) => a.key === profile.activity)?.hint}</span>
      </label>

      <div className="space-y-2">
        <span className="text-sm text-zinc-400">Objectif</span>
        <div className="flex gap-1 rounded-xl bg-zinc-800 p-1">
          {GOALS.map((g) => (
            <button key={g.key} type="button" className={segment(profile.goal === g.key)} onClick={() => void updateProfile({ goal: g.key })}>
              {g.label}
            </button>
          ))}
        </div>
        <GoalAdjustment profile={profile} goal={profile.goal} />
      </div>

      <div>
        <div className="mb-1 text-sm text-zinc-400">Fenêtre du TDEE adaptatif (jours)</div>
        <Stepper
          value={profile.adaptiveWindowDays}
          step={1}
          min={MIN_WINDOW_DAYS}
          max={MAX_WINDOW_DAYS}
          onChange={(v) => void updateProfile({ adaptiveWindowDays: v })}
          label="fenêtre en jours"
        />
      </div>

      <div className="rounded-xl bg-zinc-950/60 p-3">
        {theoretical.status === 'ok' ? (
          <dl className="grid grid-cols-3 gap-2 text-center">
            <Result label="Métabolisme de base" value={fmtInt(theoretical.bmr)} />
            <Result label="TDEE théorique" value={fmtInt(theoretical.tdee)} />
            <Result label="Cible suggérée" value={fmtInt(suggestedTarget(theoretical.tdee, profile.goal, profile.goalAdjustments))} highlight />
            <p className="col-span-3 text-xs text-zinc-500">
              kcal/jour · {theoretical.age} ans · {fmtNumber(Math.round(theoretical.weightKg * 10) / 10)} kg
              {theoretical.weightSource === 'lisse' ? ' (moyenne 7 jours)' : ' (profil)'}
            </p>
          </dl>
        ) : (
          <p className="text-sm text-zinc-500">Renseigne {theoretical.missing.join(', ')} pour calculer ton TDEE théorique.</p>
        )}
      </div>
    </section>
  )
}

function GoalAdjustment({ profile, goal }: { profile: Profile; goal: Goal }) {
  if (goal === 'maintien' && profile.goalAdjustments.maintien === 0) {
    return <p className="text-xs text-zinc-500">Cible = TDEE.</p>
  }
  return (
    <div>
      <div className="mb-1 text-sm text-zinc-400">Ajustement (kcal/jour)</div>
      <Stepper
        value={profile.goalAdjustments[goal]}
        step={50}
        min={-1500}
        max={1500}
        onChange={(v) => void updateProfile({ goalAdjustments: { ...profile.goalAdjustments, [goal]: v } })}
        label="ajustement calorique"
      />
    </div>
  )
}

function Result({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <dd className={`font-mono text-xl font-semibold ${highlight ? 'text-lime-400' : ''}`}>{value}</dd>
      <dt className="text-xs leading-tight text-zinc-500">{label}</dt>
    </div>
  )
}

function NumberField({ label, value, decimal, onCommit }: { label: string; value?: number; decimal?: boolean; onCommit: (v: number | undefined) => unknown }) {
  const [draft, setDraft] = useState(value === undefined ? '' : fmtNumber(value))
  useEffect(() => setDraft(value === undefined ? '' : fmtNumber(value)), [value])
  return (
    <label className="block space-y-1">
      <span className="text-sm text-zinc-400">{label}</span>
      <input
        className={input}
        inputMode={decimal ? 'decimal' : 'numeric'}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const n = parseDecimal(draft)
          void onCommit(draft.trim() === '' || Number.isNaN(n) || n <= 0 ? undefined : n)
        }}
      />
    </label>
  )
}
