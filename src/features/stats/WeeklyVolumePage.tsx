import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { PageHeader } from '../../components/PageHeader'
import { card } from '../../components/ui'
import { db } from '../../db/db'
import { MUSCLE_GROUPS, type MuscleGroup } from '../../db/types'
import { addDays, startOfWeek } from '../../lib/dates'
import { fmtInt, fmtShortDate } from '../../lib/format'

interface GroupVolume {
  group: MuscleGroup
  sets: number
  tonnage: number
}

async function weekVolume(monday: Date) {
  const from = monday.toISOString()
  const to = addDays(monday, 7).toISOString()
  const sets = await db.sets.where('doneAt').between(from, to, true, false).toArray()
  const exercises = await db.exercises.toArray()
  const groupOf = new Map(exercises.map((e) => [e.id, e.muscleGroup]))
  const byGroup = new Map<MuscleGroup, GroupVolume>()
  for (const s of sets) {
    const group = groupOf.get(s.exerciseId)
    if (!group) continue
    const g = byGroup.get(group) ?? { group, sets: 0, tonnage: 0 }
    g.sets += 1
    g.tonnage += s.weight * s.reps
    byGroup.set(group, g)
  }
  return {
    groups: MUSCLE_GROUPS.map((g) => byGroup.get(g)).filter((g): g is GroupVolume => !!g),
    totalSets: sets.length,
    sessions: new Set(sets.map((s) => s.workoutId)).size,
  }
}

export default function WeeklyVolumePage() {
  const [offset, setOffset] = useState(0)
  const monday = addDays(startOfWeek(new Date()), offset * 7)
  const data = useLiveQuery(() => weekVolume(monday), [monday.getTime()])
  const maxSets = Math.max(1, ...(data?.groups.map((g) => g.sets) ?? []))

  const navBtn = 'flex h-11 w-11 items-center justify-center rounded-full bg-zinc-800 text-xl active:bg-zinc-700 disabled:opacity-30'

  return (
    <div>
      <PageHeader title="Volume hebdomadaire" backTo="/" />
      <div className="space-y-4 px-3 pb-6">
        <div className="flex items-center justify-between gap-2">
          <button type="button" className={navBtn} onClick={() => setOffset(offset - 1)} aria-label="Semaine précédente">‹</button>
          <div className="text-center">
            <div className="font-semibold">{offset === 0 ? 'Cette semaine' : offset === -1 ? 'Semaine dernière' : `Semaine du ${fmtShortDate(monday)}`}</div>
            <div className="text-sm text-zinc-500">{fmtShortDate(monday)} – {fmtShortDate(addDays(monday, 6))}</div>
          </div>
          <button type="button" className={navBtn} onClick={() => setOffset(offset + 1)} disabled={offset >= 0} aria-label="Semaine suivante">›</button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-center">
          <div className={`${card} p-3`}>
            <div className="font-mono text-2xl font-semibold">{data?.sessions ?? 0}</div>
            <div className="text-xs text-zinc-500">séances</div>
          </div>
          <div className={`${card} p-3`}>
            <div className="font-mono text-2xl font-semibold">{data?.totalSets ?? 0}</div>
            <div className="text-xs text-zinc-500">séries</div>
          </div>
        </div>

        <section className={`${card} space-y-3 p-4`}>
          <h2 className="text-sm font-semibold tracking-wide text-zinc-400 uppercase">Séries par groupe musculaire</h2>
          {data?.groups.length === 0 && <p className="text-zinc-500">Aucune série cette semaine.</p>}
          {data?.groups.map((g) => (
            <div key={g.group}>
              <div className="flex items-baseline justify-between text-sm">
                <span>{g.group}</span>
                <span className="text-zinc-400">
                  <span className="font-mono font-semibold text-zinc-100">{g.sets}</span> séries · {fmtInt(g.tonnage)} kg
                </span>
              </div>
              <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-zinc-800">
                <div className="h-full rounded-full bg-lime-400" style={{ width: `${(g.sets / maxSets) * 100}%` }} />
              </div>
            </div>
          ))}
        </section>
        <p className="px-1 text-xs text-zinc-500">Chaque série compte pour le groupe principal de l'exercice. Repère courant : 10 à 20 séries par groupe et par semaine.</p>
      </div>
    </div>
  )
}
