import 'fake-indexeddb/auto'
import { expect, it } from 'vitest'
import { db } from '../db/db'
import { updateProfile } from './profile'
import { updateSettings, getSettings } from './settings'

it('des modifications simultanées du profil ne s’écrasent pas', async () => {
  await Promise.all([updateProfile({ sex: 'homme' }), updateProfile({ birthDate: '1996-01-01' }), updateProfile({ heightCm: 180 }), updateProfile({ weightKg: 80 })])
  expect(await db.profile.get('profile')).toMatchObject({ sex: 'homme', birthDate: '1996-01-01', heightCm: 180, weightKg: 80 })
})

it('idem pour les réglages', async () => {
  await Promise.all([updateSettings({ sound: false }), updateSettings({ defaultRestSeconds: 120 })])
  expect(await getSettings()).toMatchObject({ sound: false, defaultRestSeconds: 120 })
})
