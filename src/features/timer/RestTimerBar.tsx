import { useEffect, useRef, useState } from 'react'
import { beep } from '../../lib/sound'
import { fmtDuration } from '../../lib/format'
import { useSettings } from '../../lib/settings'
import { timer, useTimer } from './timerStore'

/** Délai après la fin pendant lequel l'alerte "Repos terminé" reste affichée. */
const DONE_DISPLAY_MS = 60_000

export function RestTimerBar() {
  const { endAt, duration, label } = useTimer()
  const { sound } = useSettings()
  const [now, setNow] = useState(() => Date.now())
  const beepedFor = useRef<number | null>(null)

  useEffect(() => {
    if (endAt === null) return
    const tick = () => setNow(Date.now())
    tick()
    const id = window.setInterval(tick, 250)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [endAt])

  const remainingMs = endAt === null ? 0 : endAt - now
  const done = endAt !== null && remainingMs <= 0

  // Bip unique à la fin, seulement si la page est visible au moment où ça se termine.
  useEffect(() => {
    if (!done || endAt === null || beepedFor.current === endAt) return
    beepedFor.current = endAt
    const justFinished = -remainingMs < 2000
    if (sound && justFinished && document.visibilityState === 'visible') beep()
  }, [done, endAt, remainingMs, sound])

  useEffect(() => {
    if (done && -remainingMs > DONE_DISPLAY_MS) timer.stop()
  }, [done, remainingMs])

  if (endAt === null) return null

  if (done) {
    return (
      <button
        type="button"
        onClick={() => timer.stop()}
        className="animate-done flex min-h-14 w-full items-center justify-between gap-3 bg-lime-400 px-4 text-left font-semibold text-zinc-950"
      >
        <span>Repos terminé · {label}</span>
        <span className="text-sm font-medium">OK</span>
      </button>
    )
  }

  const progress = duration > 0 ? 1 - remainingMs / (duration * 1000) : 0

  return (
    <div className="relative flex min-h-14 items-center gap-2 overflow-hidden bg-zinc-800 px-2">
      <div
        className="absolute inset-y-0 left-0 bg-lime-400/15"
        style={{ width: `${Math.min(100, progress * 100)}%` }}
      />
      <button type="button" onClick={() => timer.add(-15)} className="relative h-11 min-w-12 rounded-lg bg-zinc-700 text-sm font-medium active:bg-zinc-600">
        −15
      </button>
      <div className="relative flex-1 text-center">
        <div className="font-mono text-2xl leading-none font-semibold tabular-nums">{fmtDuration(remainingMs / 1000)}</div>
        <div className="truncate text-xs text-zinc-400">Repos · {label}</div>
      </div>
      <button type="button" onClick={() => timer.add(15)} className="relative h-11 min-w-12 rounded-lg bg-zinc-700 text-sm font-medium active:bg-zinc-600">
        +15
      </button>
      <button type="button" onClick={() => timer.stop()} className="relative h-11 min-w-14 rounded-lg bg-zinc-700 text-sm font-medium active:bg-zinc-600">
        Passer
      </button>
    </div>
  )
}
