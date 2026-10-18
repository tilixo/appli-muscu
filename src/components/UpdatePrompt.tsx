import { useRegisterSW } from 'virtual:pwa-register/react'

/** Propose la mise à jour plutôt que de recharger l'app en pleine séance. */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null
  return (
    <div className="flex items-center gap-2 bg-sky-500/15 px-4 py-2 text-sm text-sky-200">
      <span className="flex-1">Nouvelle version disponible.</span>
      <button type="button" className="min-h-11 rounded-lg px-3 text-zinc-400" onClick={() => setNeedRefresh(false)}>Plus tard</button>
      <button type="button" className="min-h-11 rounded-lg bg-sky-500 px-3 font-semibold text-zinc-950" onClick={() => void updateServiceWorker(true)}>Mettre à jour</button>
    </div>
  )
}
