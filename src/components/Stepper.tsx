import { useState } from 'react'
import { fmtNumber, parseDecimal } from '../lib/format'

interface Props {
  value: number
  onChange: (v: number) => void
  step: number
  min?: number
  max?: number
  /** Autorise les décimales à la saisie clavier. */
  decimal?: boolean
  label?: string
}

const roundTo = (v: number, step: number) => Math.round(v / step) * step

/** − [valeur] +, la valeur se saisit au clavier en la touchant. */
export function Stepper({ value, onChange, step, min = 0, max = 9999, decimal, label }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const clamp = (v: number) => Math.min(max, Math.max(min, v))
  // Arrondi au pas pour éviter 77.49999 ; on garde la valeur exacte si elle est hors grille.
  const bump = (dir: 1 | -1) => {
    const next = Number.isInteger(value / step) ? value + dir * step : dir > 0 ? Math.ceil(value / step) * step : Math.floor(value / step) * step
    onChange(clamp(Number(roundTo(next, 0.01).toFixed(2))))
  }

  const commit = () => {
    const n = parseDecimal(draft)
    if (!Number.isNaN(n)) onChange(clamp(decimal ? Number(n.toFixed(2)) : Math.round(n)))
    setEditing(false)
  }

  const buttonCls = 'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-2xl font-medium active:bg-zinc-700'

  return (
    <div className="flex items-center gap-2">
      <button type="button" className={buttonCls} onClick={() => bump(-1)} aria-label={`Moins ${label ?? ''}`}>
        −
      </button>
      {editing ? (
        <input
          autoFocus
          inputMode={decimal ? 'decimal' : 'numeric'}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
          onFocus={(e) => e.target.select()}
          className="h-14 w-full min-w-0 rounded-xl bg-zinc-800 text-center font-mono text-2xl font-semibold outline-none focus:ring-2 focus:ring-lime-400"
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setDraft(String(value).replace('.', ','))
            setEditing(true)
          }}
          className="h-14 w-full min-w-0 rounded-xl text-center font-mono text-2xl font-semibold tabular-nums active:bg-zinc-800"
          aria-label={label}
        >
          {fmtNumber(value)}
        </button>
      )}
      <button type="button" className={buttonCls} onClick={() => bump(1)} aria-label={`Plus ${label ?? ''}`}>
        +
      </button>
    </div>
  )
}
