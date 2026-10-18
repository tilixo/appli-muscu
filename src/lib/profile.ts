import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { DEFAULT_PROFILE, type Profile } from '../db/types'

export function useProfile(): Profile {
  const stored = useLiveQuery(() => db.profile.get('profile'), [])
  return { ...DEFAULT_PROFILE, ...stored }
}

export async function updateProfile(patch: Partial<Omit<Profile, 'key'>>) {
  const current = { ...DEFAULT_PROFILE, ...(await db.profile.get('profile')) }
  await db.profile.put({ ...current, ...patch, key: 'profile' })
}
