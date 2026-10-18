import { useEffect, useState } from 'react'
import { PageHeader } from '../../components/PageHeader'
import { btnSecondary, card, input } from '../../components/ui'
import { fmtDuration } from '../../lib/format'
import { updateSettings, useSettings } from '../../lib/settings'
import { beep, unlockAudio } from '../../lib/sound'
import { isStoragePersisted, requestPersistentStorage } from '../../lib/storage'
import { REST_OPTIONS } from '../exercises/ExerciseForm'

export default function SettingsPage() {
  const settings = useSettings()
  const [persisted, setPersisted] = useState<boolean | null>(null)

  useEffect(() => {
    void isStoragePersisted().then(setPersisted)
  }, [])

  return (
    <div>
      <PageHeader title="Réglages" />
      <div className="space-y-4 px-3 pb-6">
        <section className={`${card} divide-y divide-zinc-800`}>
          <label className="flex min-h-14 items-center justify-between gap-4 px-4">
            <span>Repos par défaut</span>
            <select
              className={`${input} w-28`}
              value={settings.defaultRestSeconds}
              onChange={(e) => void updateSettings({ defaultRestSeconds: Number(e.target.value) })}
            >
              {REST_OPTIONS.map((s) => (
                <option key={s} value={s}>{fmtDuration(s)}</option>
              ))}
            </select>
          </label>
          <Toggle label="Son en fin de repos" checked={settings.sound} onChange={(v) => void updateSettings({ sound: v })} />
          <Toggle label="Garder l'écran allumé pendant la séance" checked={settings.wakeLock} onChange={(v) => void updateSettings({ wakeLock: v })} />
          <div className="px-4 py-3">
            <button
              type="button"
              className={`${btnSecondary} w-full`}
              onClick={() => {
                unlockAudio()
                window.setTimeout(beep, 50)
              }}
            >
              Tester le son
            </button>
            <p className="mt-2 text-xs text-zinc-500">Le son est coupé si l'iPhone est en mode silencieux.</p>
          </div>
        </section>

        <section className={`${card} space-y-2 p-4`}>
          <h2 className="font-semibold">Stockage</h2>
          <p className="text-sm text-zinc-400">
            Toutes les données restent sur cet iPhone.{' '}
            {persisted === true && 'Le stockage est marqué persistant.'}
            {persisted === false && "Le stockage n'est pas encore persistant : Safari pourrait le purger s'il manque d'espace. Installe l'app sur l'écran d'accueil."}
          </p>
          {persisted === false && (
            <button type="button" className={`${btnSecondary} w-full`} onClick={() => void requestPersistentStorage().then(setPersisted)}>
              Demander le stockage persistant
            </button>
          )}
          <p className="text-xs text-zinc-500">Export / import de sauvegarde : phase 4.</p>
        </section>

        <p className="text-center text-xs text-zinc-600">Carnet Muscu · v{__APP_VERSION__}</p>
      </div>
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex min-h-14 w-full items-center justify-between gap-4 px-4 text-left">
      <span>{label}</span>
      <span className={`relative h-8 w-13 shrink-0 rounded-full transition-colors ${checked ? 'bg-lime-400' : 'bg-zinc-700'}`}>
        <span className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-all ${checked ? 'left-6' : 'left-1'}`} />
      </span>
    </button>
  )
}
