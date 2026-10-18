/** 1RM estimé, formule d'Epley : poids × (1 + reps / 30). */
export function epley(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0
  if (reps === 1) return weight
  return weight * (1 + reps / 30)
}

export const round1 = (n: number) => Math.round(n * 10) / 10
