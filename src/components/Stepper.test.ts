import { expect, it } from 'vitest'
import { stepValue } from './Stepper'

it('incrémente au pas, y compris avec des décimales', () => {
  expect(stepValue(80.3, 0.1, 1)).toBe(80.4)
  expect(stepValue(80.3, 0.1, -1)).toBe(80.2)
  expect(stepValue(77.5, 2.5, 1)).toBe(80)
  expect(stepValue(20, 0.5, -1)).toBe(19.5)
})

it('ramène une valeur hors grille au cran le plus proche dans le sens demandé', () => {
  expect(stepValue(77.3, 2.5, 1)).toBe(77.5)
  expect(stepValue(77.3, 2.5, -1)).toBe(75)
})
