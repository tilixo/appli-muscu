import { describe, expect, it } from 'vitest'
import { DEFAULT_GOALS } from '../../db/types'
import { dailyIntakes, goalsForDate, macrosFor, parseOffProduct, sumMacros } from './nutrition'

describe('macros', () => {
  it('calcule pour une quantité en grammes', () => {
    expect(macrosFor({ kcal: 350, protein: 12.5, carbs: 60, fat: 5 }, 150)).toEqual({ kcal: 525, protein: 18.8, carbs: 90, fat: 7.5 })
  })

  it('additionne', () => {
    expect(sumMacros([{ kcal: 100, protein: 1.15, carbs: 2, fat: 3 }, { kcal: 50.4, protein: 1.1, carbs: 0, fat: 0 }])).toEqual({ kcal: 150, protein: 2.3, carbs: 2, fat: 3 })
  })
})

describe('objectifs datés', () => {
  const goals = [
    { from: '2026-10-01', kcal: 2500, protein: 160, carbs: 280, fat: 80 },
    { from: '2026-10-15', kcal: 2200, protein: 160, carbs: 220, fat: 70 },
  ]
  it('prend le dernier objectif en vigueur', () => {
    expect(goalsForDate(goals, '2026-10-14').kcal).toBe(2500)
    expect(goalsForDate(goals, '2026-10-15').kcal).toBe(2200)
    expect(goalsForDate(goals, '2026-10-30').kcal).toBe(2200)
  })
  it('valeurs par défaut avant tout objectif', () => {
    expect(goalsForDate(goals, '2026-09-01')).toEqual(DEFAULT_GOALS)
  })
})

it('totaux journaliers pour le TDEE', () => {
  const t = (kcal: number) => ({ kcal, protein: 0, carbs: 0, fat: 0 })
  expect(dailyIntakes([{ date: '2026-10-02', total: t(500) }, { date: '2026-10-01', total: t(800) }, { date: '2026-10-02', total: t(700) }])).toEqual([
    { date: '2026-10-01', kcal: 800 },
    { date: '2026-10-02', kcal: 1200 },
  ])
})

describe('Open Food Facts', () => {
  it('lit un produit complet', () => {
    const p = {
      code: '3017620422003',
      product_name: 'Nutella',
      product_name_fr: 'Nutella',
      brands: 'Ferrero, Nutella',
      serving_quantity: 15,
      nutriments: { 'energy-kcal_100g': 539, proteins_100g: 6.3, carbohydrates_100g: 57.5, fat_100g: 30.9 },
    }
    expect(parseOffProduct(p)).toEqual({
      name: 'Nutella',
      brand: 'Ferrero',
      code: '3017620422003',
      per100: { kcal: 539, protein: 6.3, carbs: 57.5, fat: 30.9 },
      servingGrams: 15,
    })
  })

  it('convertit les kJ quand les kcal manquent', () => {
    const r = parseOffProduct({ product_name: 'X', nutriments: { 'energy-kj_100g': 418.4 } }, '123')
    expect(r?.per100.kcal).toBe(100)
    expect(r?.code).toBe('123')
  })

  it('refuse un produit sans énergie', () => {
    expect(parseOffProduct({ product_name: 'Eau', nutriments: {} })).toBeNull()
    expect(parseOffProduct(undefined)).toBeNull()
  })
})
