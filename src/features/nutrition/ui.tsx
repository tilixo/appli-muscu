import type { Macros } from '../../db/types'
import { fmtInt, fmtNumber } from '../../lib/format'

/** "P 32 g · G 45 g · L 12 g" */
export function MacroLine({ m, className = '' }: { m: Macros; className?: string }) {
  const f = (n: number) => fmtNumber(Math.round(n))
  return (
    <span className={`text-xs text-zinc-500 ${className}`}>
      P {f(m.protein)} · G {f(m.carbs)} · L {f(m.fat)}
    </span>
  )
}

export const fmtKcal = (n: number) => `${fmtInt(n)} kcal`

/** Champ numérique libre (accepte la virgule). Valide à la sortie du champ. */
export function NumInput({ label, value, onChange, suffix, decimal = true }: { label: string; value: string; onChange: (v: string) => void; suffix?: string; decimal?: boolean }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm text-zinc-400">{label}</span>
      <span className="relative block">
        <input
          className="min-h-11 w-full rounded-xl bg-zinc-800 px-3 pr-12 text-base outline-none focus:ring-2 focus:ring-lime-400"
          inputMode={decimal ? 'decimal' : 'numeric'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {suffix && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-zinc-500">{suffix}</span>}
      </span>
    </label>
  )
}
