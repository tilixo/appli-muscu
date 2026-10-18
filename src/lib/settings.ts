import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { DEFAULT_SETTINGS, type AppSettings } from '../db/types'

export function useSettings(): AppSettings {
  const stored = useLiveQuery(() => db.settings.get('app'), [])
  return { ...DEFAULT_SETTINGS, ...stored }
}

export async function getSettings(): Promise<AppSettings> {
  return { ...DEFAULT_SETTINGS, ...(await db.settings.get('app')) }
}

export async function updateSettings(patch: Partial<Omit<AppSettings, 'key'>>) {
  const current = await getSettings()
  await db.settings.put({ ...current, ...patch, key: 'app' })
}
