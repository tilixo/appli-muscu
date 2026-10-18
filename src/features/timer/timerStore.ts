import { useSyncExternalStore } from 'react'

// Le minuteur ne stocke que l'heure de fin : le temps restant est toujours
// recalculé depuis Date.now(), donc il reste juste même si iOS a suspendu la page.

export interface TimerState {
  endAt: number | null // timestamp ms
  duration: number // s, pour la barre de progression
  label: string
}

const KEY = 'rest-timer'
const IDLE: TimerState = { endAt: null, duration: 0, label: '' }

function load(): TimerState {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...IDLE, ...JSON.parse(raw) } : IDLE
  } catch {
    return IDLE
  }
}

let state: TimerState = load()
const listeners = new Set<() => void>()

function set(next: TimerState) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // stockage indisponible : le minuteur fonctionne quand même en mémoire
  }
  listeners.forEach((l) => l())
}

export const timer = {
  start(seconds: number, label: string) {
    set({ endAt: Date.now() + seconds * 1000, duration: seconds, label })
  },
  add(seconds: number) {
    if (state.endAt === null) return
    const endAt = Math.max(Date.now(), state.endAt) + seconds * 1000
    set({ ...state, endAt, duration: Math.max(1, state.duration + seconds) })
  },
  stop() {
    set(IDLE)
  },
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useTimer(): TimerState {
  return useSyncExternalStore(subscribe, () => state)
}
