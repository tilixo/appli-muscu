import { describe, expect, it } from 'vitest'
import {
  adaptiveTdee,
  addDays,
  ageOn,
  bmrMifflin,
  latestSmoothedWeight,
  linearSlope,
  mondayOf,
  smoothedWeights,
  suggestedTarget,
  theoreticalFromProfile,
  theoreticalTdee,
  weeklyAdaptiveTdee,
  type DailyIntake,
  type WeighIn,
} from './tdee'

const END = '2026-10-18'

/** `days` jours se terminant à END, avec un poids qui évolue linéairement. */
function scenario(opts: { days: number; kcal: number; startKg: number; kgPerWeek: number; skipIntake?: (i: number) => boolean; skipWeigh?: (i: number) => boolean }) {
  const intakes: DailyIntake[] = []
  const weighIns: WeighIn[] = []
  for (let i = 0; i < opts.days; i++) {
    const date = addDays(END, i - opts.days + 1)
    if (!opts.skipIntake?.(i)) intakes.push({ date, kcal: opts.kcal })
    if (!opts.skipWeigh?.(i)) weighIns.push({ date, kg: opts.startKg + (opts.kgPerWeek / 7) * i })
  }
  return { intakes, weighIns }
}

describe('TDEE théorique', () => {
  it('Mifflin-St Jeor homme et femme', () => {
    expect(bmrMifflin({ sex: 'homme', weightKg: 80, heightCm: 180, age: 30 })).toBe(1780)
    expect(bmrMifflin({ sex: 'femme', weightKg: 60, heightCm: 165, age: 25 })).toBeCloseTo(1345.25)
  })

  it('applique le coefficient d’activité et l’objectif', () => {
    expect(theoreticalTdee(1780, 'modere')).toBeCloseTo(2759)
    expect(suggestedTarget(2759, 'perte')).toBe(2359)
    expect(suggestedTarget(2759, 'maintien')).toBe(2759)
    expect(suggestedTarget(2759, 'prise', { perte: -500, maintien: 0, prise: 200 })).toBe(2959)
  })

  it('calcule l’âge à partir de la date de naissance', () => {
    expect(ageOn('1990-10-19', END)).toBe(35)
    expect(ageOn('1990-10-18', END)).toBe(36)
  })
})

describe('TDEE théorique depuis le profil', () => {
  const profile = { sex: 'homme' as const, birthDate: '1996-01-01', heightCm: 180, weightKg: 90, activity: 'modere' as const }

  it('utilise le poids lissé en priorité', () => {
    const weighIns = [80, 81, 79, 80, 82, 78, 80].map((kg, i) => ({ date: addDays(END, i - 6), kg }))
    const r = theoreticalFromProfile(profile, weighIns, END)
    expect(r).toMatchObject({ status: 'ok', weightKg: 80, weightSource: 'lisse', age: 30, bmr: 1780, tdee: 2759 })
  })

  it('se rabat sur le poids du profil sans pesée', () => {
    expect(theoreticalFromProfile(profile, [], END)).toMatchObject({ status: 'ok', weightKg: 90, weightSource: 'profil' })
  })

  it('liste les champs manquants', () => {
    expect(theoreticalFromProfile({ activity: 'leger' }, [], END)).toEqual({ status: 'incomplete', missing: ['sexe', 'date de naissance', 'taille', 'poids'] })
  })
})

describe('outils', () => {
  it('mondayOf renvoie le lundi', () => {
    expect(mondayOf('2026-10-18')).toBe('2026-10-12') // dimanche
    expect(mondayOf('2026-10-12')).toBe('2026-10-12') // lundi
    expect(mondayOf('2026-10-14')).toBe('2026-10-12')
  })

  it('régression linéaire', () => {
    expect(linearSlope([{ x: 0, y: 1 }, { x: 1, y: 3 }, { x: 2, y: 5 }])).toBeCloseTo(2)
    expect(linearSlope([{ x: 0, y: 1 }])).toBeNull()
  })

  it('lissage sur 7 jours et moyenne des pesées du même jour', () => {
    const s = smoothedWeights([
      { date: '2026-10-01', kg: 80 },
      { date: '2026-10-01', kg: 82 },
      { date: '2026-10-03', kg: 84 },
      { date: '2026-10-09', kg: 90 }, // le 01 sort de la fenêtre [03, 09]
    ])
    expect(s).toEqual([
      { date: '2026-10-01', kg: 81 },
      { date: '2026-10-03', kg: 82.5 },
      { date: '2026-10-09', kg: 87 },
    ])
    expect(latestSmoothedWeight([])).toBeNull()
  })
})

describe('TDEE adaptatif', () => {
  it('cas normal : perte de 0,5 kg/semaine à 2500 kcal', () => {
    const r = adaptiveTdee({ ...scenario({ days: 21, kcal: 2500, startKg: 85, kgPerWeek: -0.5 }), endDate: END })
    expect(r.status).toBe('ok')
    if (r.status !== 'ok') return
    // 2500 + 0,5/7 × 7700 = 3050
    expect(r.tdee).toBeCloseTo(3050, -1)
    expect(r.weightChangePerWeek).toBeCloseTo(-0.5, 2)
    expect(r.confidence).toBe('bon')
  })

  it('poids stable : TDEE = apport moyen', () => {
    const r = adaptiveTdee({ ...scenario({ days: 21, kcal: 2300, startKg: 75, kgPerWeek: 0 }), endDate: END })
    expect(r.status === 'ok' && r.tdee).toBe(2300)
  })

  it('prise de 0,25 kg/semaine à 3000 kcal', () => {
    const r = adaptiveTdee({ ...scenario({ days: 21, kcal: 3000, startKg: 70, kgPerWeek: 0.25 }), endDate: END })
    expect(r.status).toBe('ok')
    if (r.status === 'ok') expect(r.tdee).toBeCloseTo(2725, -1)
  })

  it('jours manquants et jours incomplets ignorés dans la moyenne', () => {
    const data = scenario({ days: 21, kcal: 2400, startKg: 80, kgPerWeek: 0, skipIntake: (i) => i % 4 === 0, skipWeigh: (i) => i % 2 === 1 })
    data.intakes.push({ date: addDays(END, -20), kcal: 500 }) // journée manifestement incomplète
    const r = adaptiveTdee({ ...data, endDate: END })
    expect(r.status).toBe('ok')
    if (r.status !== 'ok') return
    expect(r.avgIntake).toBe(2400)
    expect(r.tdee).toBe(2400)
    expect(r.loggedDays).toBe(15)
    expect(r.weighInDays).toBe(11)
  })

  it('les entrées d’une même journée sont additionnées', () => {
    const data = scenario({ days: 21, kcal: 1200, startKg: 80, kgPerWeek: 0 })
    data.intakes = data.intakes.flatMap((i) => [i, { ...i }]) // deux repas de 1200 par jour
    const r = adaptiveTdee({ ...data, endDate: END })
    expect(r.status === 'ok' && r.avgIntake).toBe(2400)
  })

  it('données insuffisantes : indique ce qui manque', () => {
    const r = adaptiveTdee({ ...scenario({ days: 10, kcal: 2500, startKg: 80, kgPerWeek: 0, skipWeigh: (i) => i % 3 !== 0 }), endDate: END })
    expect(r.status).toBe('insufficient')
    if (r.status !== 'insufficient') return
    expect(r.coveredDays).toBe(10)
    expect(r.missing).toEqual(["4 jours d'historique", '2 pesées'])
  })

  it('aucune donnée', () => {
    const r = adaptiveTdee({ intakes: [], weighIns: [], endDate: END })
    expect(r).toMatchObject({ status: 'insufficient', coveredDays: 0, loggedDays: 0, weighInDays: 0 })
    if (r.status === 'insufficient') expect(r.missing).toHaveLength(3)
  })

  it('assez d’historique mais trop peu de pesées', () => {
    const r = adaptiveTdee({ ...scenario({ days: 21, kcal: 2500, startKg: 80, kgPerWeek: 0, skipWeigh: (i) => i % 5 !== 0 }), endDate: END })
    expect(r.status === 'insufficient' && r.missing).toEqual(['1 pesée'])
  })

  it('ignore les données postérieures à la fin de fenêtre', () => {
    const data = scenario({ days: 21, kcal: 2500, startKg: 80, kgPerWeek: 0 })
    data.weighIns.push({ date: addDays(END, 1), kg: 95 })
    data.intakes.push({ date: addDays(END, 1), kcal: 6000 })
    const r = adaptiveTdee({ ...data, endDate: END })
    expect(r.status === 'ok' && r.tdee).toBe(2500)
  })

  it('confiance dégradée si les données sont irrégulières', () => {
    const r = adaptiveTdee({
      ...scenario({ days: 21, kcal: 2500, startKg: 80, kgPerWeek: 0, skipIntake: (i) => i % 3 === 0, skipWeigh: (i) => i > 2 && i < 12 }),
      endDate: END,
    })
    expect(r.status === 'ok' && r.confidence).toBe('faible')
  })

  it('fenêtre configurable', () => {
    const data = scenario({ days: 28, kcal: 2500, startKg: 80, kgPerWeek: 0 })
    const r = adaptiveTdee({ ...data, endDate: END, windowDays: 14 })
    expect(r).toMatchObject({ status: 'ok', coveredDays: 14, loggedDays: 14 })
  })
})

describe('évolution hebdomadaire', () => {
  it('une valeur par semaine, null tant que les données manquent', () => {
    const data = scenario({ days: 35, kcal: 2500, startKg: 80, kgPerWeek: -0.5 })
    const points = weeklyAdaptiveTdee({ ...data, from: addDays(END, -34), to: END })
    expect(points.map((p) => p.weekStart)).toEqual(['2026-09-14', '2026-09-21', '2026-09-28', '2026-10-05', '2026-10-12'])
    expect(points[0].tdee).toBeNull()
    expect(points[1].tdee).not.toBeNull() // 14 jours atteints au 27/09
    expect(points.at(-1)!.tdee).toBeCloseTo(3050, -1)
    expect(points.every((p) => p.avgIntake === 2500)).toBe(true)
  })
})
