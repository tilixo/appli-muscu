/** Lundi 00:00 (heure locale) de la semaine contenant `d`. */
export function startOfWeek(d: Date): Date {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  const day = (r.getDay() + 6) % 7 // lundi = 0
  r.setDate(r.getDate() - day)
  return r
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}
