import { describe, expect, it } from 'vitest'
import { seriesChange, weekStarts, weeklyLast, weeklyMax, weightTrendPerWeek } from './progression'

const weeks = weekStarts('2026-10-01', '2026-10-18')

describe('progression', () => {
  it('découpe en semaines du lundi', () => {
    expect(weeks).toEqual(['2026-09-28', '2026-10-05', '2026-10-12'])
  })

  it('dernière valeur et maximum par semaine, null si vide', () => {
    const pts = [
      { date: '2026-09-29', value: 80 },
      { date: '2026-10-04', value: 79.5 },
      { date: '2026-10-13', value: 79 },
      { date: '2026-10-12', value: 81 },
    ]
    expect(weeklyLast(pts, weeks)).toEqual([79.5, null, 79])
    expect(weeklyMax(pts, weeks)).toEqual([80, null, 81])
  })

  it('variation sur la période', () => {
    expect(seriesChange([null, 80, null, 78.5])).toEqual({ from: 80, to: 78.5, delta: -1.5 })
    expect(seriesChange([null, 80])).toBeNull()
  })

  it('tendance de poids hebdomadaire', () => {
    const w = Array.from({ length: 14 }, (_, i) => ({ date: `2026-10-${String(5 + i).padStart(2, '0')}`, kg: 80 - (0.5 / 7) * i }))
    expect(weightTrendPerWeek(w, '2026-10-18')).toBeCloseTo(-0.5)
    expect(weightTrendPerWeek(w.slice(0, 2), '2026-10-18')).toBeNull()
  })
})
