const LOCALE = 'fr-FR'

const numberFmt = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 })
const intFmt = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 })

export const fmtNumber = (n: number) => numberFmt.format(n)
export const fmtInt = (n: number) => intFmt.format(n)

/** "80 kg", "PDC" pour 0 (poids du corps). */
export const fmtWeight = (kg: number) => (kg === 0 ? 'PDC' : `${fmtNumber(kg)} kg`)

/** "80 × 8" ou "PDC × 12" */
export const fmtSet = (s: { weight: number; reps: number }) =>
  `${s.weight === 0 ? 'PDC' : fmtNumber(s.weight)} × ${s.reps}`

/** Accepte "77,5" comme "77.5". */
export const parseDecimal = (s: string) => {
  const n = Number(s.replace(',', '.').trim())
  return Number.isFinite(n) ? n : NaN
}

/** 90 → "1:30" */
export const fmtDuration = (seconds: number) => {
  const s = Math.max(0, Math.round(seconds))
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

/** Durée longue : "1 h 05" ou "42 min" */
export const fmtLongDuration = (ms: number) => {
  const min = Math.round(ms / 60000)
  if (min < 60) return `${min} min`
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`
}

const dayFmt = new Intl.DateTimeFormat(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' })
const shortFmt = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short' })
const shortYearFmt = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', year: '2-digit' })
const timeFmt = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit' })

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** "Samedi 18 octobre" */
export const fmtDay = (iso: string | Date) => capitalize(dayFmt.format(new Date(iso)))
/** "18 oct." (ajoute l'année si elle diffère de l'année en cours) */
export const fmtShortDate = (iso: string | Date) => {
  const d = new Date(iso)
  return d.getFullYear() === new Date().getFullYear() ? shortFmt.format(d) : shortYearFmt.format(d)
}
export const fmtTime = (iso: string | Date) => timeFmt.format(new Date(iso))
