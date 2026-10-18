import { useEffect } from 'react'

/** Garde l'écran allumé tant que `active` est vrai (si le navigateur le permet). */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let sentinel: WakeLockSentinel | null = null
    let cancelled = false

    const acquire = async () => {
      try {
        const s = await navigator.wakeLock.request('screen')
        if (cancelled) void s.release()
        else sentinel = s
      } catch {
        // refusé (batterie faible, onglet masqué...) : sans gravité
      }
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') void acquire()
    }

    void acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      void sentinel?.release()
    }
  }, [active])
}
