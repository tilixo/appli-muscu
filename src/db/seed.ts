import type { Transaction } from 'dexie'
import type { Exercise, MuscleGroup, PlanItem, Template } from './types'

const EXERCISES: [string, MuscleGroup][] = [
  // Pectoraux
  ['Développé couché', 'Pectoraux'],
  ['Développé couché haltères', 'Pectoraux'],
  ['Développé incliné', 'Pectoraux'],
  ['Développé incliné haltères', 'Pectoraux'],
  ['Développé décliné', 'Pectoraux'],
  ['Écarté haltères', 'Pectoraux'],
  ['Écarté poulie vis-à-vis', 'Pectoraux'],
  ['Pec deck', 'Pectoraux'],
  ['Pompes', 'Pectoraux'],
  ['Dips', 'Pectoraux'],
  // Dos
  ['Tractions', 'Dos'],
  ['Tractions supination', 'Dos'],
  ['Tirage vertical', 'Dos'],
  ['Tirage horizontal', 'Dos'],
  ['Rowing barre', 'Dos'],
  ['Rowing haltère', 'Dos'],
  ['Rowing T-bar', 'Dos'],
  ['Soulevé de terre', 'Dos'],
  ['Pull-over poulie', 'Dos'],
  ['Shrugs', 'Dos'],
  // Épaules
  ['Développé militaire', 'Épaules'],
  ['Développé haltères assis', 'Épaules'],
  ['Élévations latérales', 'Épaules'],
  ['Élévations latérales poulie', 'Épaules'],
  ['Oiseau', 'Épaules'],
  ['Face pull', 'Épaules'],
  ['Élévations frontales', 'Épaules'],
  ['Rowing menton', 'Épaules'],
  // Biceps
  ['Curl barre', 'Biceps'],
  ['Curl haltères', 'Biceps'],
  ['Curl marteau', 'Biceps'],
  ['Curl incliné', 'Biceps'],
  ['Curl pupitre', 'Biceps'],
  ['Curl poulie', 'Biceps'],
  // Triceps
  ['Extension triceps poulie', 'Triceps'],
  ['Barre au front', 'Triceps'],
  ['Extension nuque haltère', 'Triceps'],
  ['Développé couché prise serrée', 'Triceps'],
  ['Kickback', 'Triceps'],
  ['Dips banc', 'Triceps'],
  // Avant-bras
  ['Curl poignets', 'Avant-bras'],
  // Quadriceps
  ['Squat', 'Quadriceps'],
  ['Squat avant', 'Quadriceps'],
  ['Presse à cuisses', 'Quadriceps'],
  ['Hack squat', 'Quadriceps'],
  ['Leg extension', 'Quadriceps'],
  ['Fentes', 'Quadriceps'],
  ['Squat bulgare', 'Quadriceps'],
  ['Goblet squat', 'Quadriceps'],
  // Ischio-jambiers
  ['Soulevé de terre roumain', 'Ischio-jambiers'],
  ['Leg curl allongé', 'Ischio-jambiers'],
  ['Leg curl assis', 'Ischio-jambiers'],
  ['Good morning', 'Ischio-jambiers'],
  // Fessiers
  ['Hip thrust', 'Fessiers'],
  ['Abducteurs machine', 'Fessiers'],
  ['Kickback poulie', 'Fessiers'],
  // Mollets
  ['Mollets debout', 'Mollets'],
  ['Mollets assis', 'Mollets'],
  // Abdominaux
  ['Crunch', 'Abdominaux'],
  ['Crunch poulie', 'Abdominaux'],
  ['Relevés de jambes', 'Abdominaux'],
  ['Gainage', 'Abdominaux'],
  ['Roue abdominale', 'Abdominaux'],
]

const TEMPLATES: [string, [string, number][]][] = [
  ['Push', [
    ['Développé couché', 4],
    ['Développé incliné haltères', 3],
    ['Développé militaire', 3],
    ['Élévations latérales', 3],
    ['Extension triceps poulie', 3],
  ]],
  ['Pull', [
    ['Tractions', 4],
    ['Rowing barre', 3],
    ['Tirage horizontal', 3],
    ['Face pull', 3],
    ['Curl haltères', 3],
  ]],
  ['Legs', [
    ['Squat', 4],
    ['Soulevé de terre roumain', 3],
    ['Presse à cuisses', 3],
    ['Leg curl assis', 3],
    ['Mollets debout', 4],
  ]],
]

/** Contenu initial, inséré une seule fois à la création de la base. */
export async function seedDatabase(tx: Transaction) {
  const exercises: Omit<Exercise, 'id'>[] = EXERCISES.map(([name, muscleGroup]) => ({
    name,
    muscleGroup,
    isCustom: false,
  }))
  const ids = (await tx.table('exercises').bulkAdd(exercises, { allKeys: true })) as number[]
  const idByName = new Map(EXERCISES.map(([name], i) => [name, ids[i]]))

  const now = new Date().toISOString()
  const templates: Omit<Template, 'id'>[] = TEMPLATES.map(([name, items]) => ({
    name,
    updatedAt: now,
    items: items.map(([ex, targetSets]): PlanItem => ({ exerciseId: idByName.get(ex)!, targetSets })),
  }))
  await tx.table('templates').bulkAdd(templates)
}
