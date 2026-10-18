import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { DEFAULT_PROFILE, type Profile } from '../db/types'

export function useProfile(): Profile {
  const stored = useLiveQuery(() => db.profile.get('profile'), [])
  return { ...DEFAULT_PROFILE, ...stored }
}

// Lecture + écriture dans une même transaction : deux modifications rapprochées
// s'exécutent l'une après l'autre au lieu de s'écraser.
export function updateProfile(patch: Partial<Omit<Profile, 'key'>>) {
  return db.transaction('rw', db.profile, async () => {
    const current = { ...DEFAULT_PROFILE, ...(await db.profile.get('profile')) }
    await db.profile.put({ ...current, ...patch, key: 'profile' })
  })
}
