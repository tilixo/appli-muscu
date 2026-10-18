import type { Macros } from '../../db/types'
import { fmtInt } from '../../lib/format'

interface Props {
  eaten: Macros
  goals: Macros
  onEditGoals: () => void
}

const MACROS = [
  { key: 'protein', label: 'Protéines', color: 'bg-sky-400' },
  { key: 'carbs', label: 'Glucides', color: 'bg-amber-400' },
  { key: 'fat', label: 'Lipides', color: 'bg-rose-400' },
] as const

export function DayGauge({ eaten, goals, onEditGoals }: Props) {
  const remaining = goals.kcal - eaten.kcal
  const ratio = goals.kcal > 0 ? eaten.kcal / goals.kcal : 0
  const over = remaining < 0
  const R = 52
  const C = 2 * Math.PI * R

  return (
    <button type="button" onClick={onEditGoals} className="block w-full rounded-2xl bg-zinc-900 p-4 text-left active:bg-zinc-800" aria-label="Modifier les objectifs">
      <div className="flex items-center gap-4">
        <svg viewBox="0 0 120 120" className="h-32 w-32 shrink-0 -rotate-90">
          <circle cx="60" cy="60" r={R} fill="none" stroke="#27272a" strokeWidth="12" />
          <circle
            cx="60"
            cy="60"
            r={R}
            fill="none"
            stroke={over ? '#f87171' : '#a3e635'}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${Math.min(1, ratio) * C} ${C}`}
          />
          <text x="60" y="58" textAnchor="middle" transform="rotate(90 60 60)" className="fill-zinc-100 font-mono text-[22px] font-semibold">
            {fmtInt(Math.abs(remaining))}
          </text>
          <text x="60" y="78" textAnchor="middle" transform="rotate(90 60 60)" className="fill-zinc-500 text-[11px]">
            {over ? 'kcal en trop' : 'kcal restantes'}
          </text>
        </svg>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="text-sm text-zinc-400">
            <span className="font-mono text-lg font-semibold text-zinc-100">{fmtInt(eaten.kcal)}</span> / {fmtInt(goals.kcal)} kcal
          </div>
          {MACROS.map((m) => {
            const v = eaten[m.key]
            const g = goals[m.key]
            return (
              <div key={m.key}>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">{m.label}</span>
                  <span className="font-mono">
                    {fmtInt(v)}
                    <span className="text-zinc-500">/{fmtInt(g)} g</span>
                  </span>
                </div>
                <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                  <div className={`h-full rounded-full ${v > g ? 'bg-red-400' : m.color}`} style={{ width: `${Math.min(100, g > 0 ? (v / g) * 100 : 0)}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </button>
  )
}
