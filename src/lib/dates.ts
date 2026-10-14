const TIMEZONE = 'Europe/Paris'

const dayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Jour courant au format ISO `YYYY-MM-DD`, fuseau Europe/Paris. */
export function todayISO(now: Date = new Date()): string {
  return dayFormat.format(now)
}

// Les jours sont manipulés comme des chaînes ISO ; le calcul se fait en UTC pour éviter tout décalage DST.
const toDate = (iso: string) => new Date(`${iso}T12:00:00Z`)
const toISO = (d: Date) => d.toISOString().slice(0, 10)

export function addDays(iso: string, n: number): string {
  const d = toDate(iso)
  d.setUTCDate(d.getUTCDate() + n)
  return toISO(d)
}

/** `n` jours consécutifs se terminant à `end` (inclus), du plus ancien au plus récent. */
export function lastNDays(end: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addDays(end, i - (n - 1)))
}

/** Lundi de la semaine contenant `iso`. */
export function startOfWeek(iso: string): string {
  const weekday = (toDate(iso).getUTCDay() + 6) % 7 // lundi = 0
  return addDays(iso, -weekday)
}

/** Mois `YYYY-MM` d'un jour ISO. */
export function monthOf(iso: string): string {
  return iso.slice(0, 7)
}

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number) as [number, number]
  const d = new Date(Date.UTC(y, m - 1 + n, 1))
  return d.toISOString().slice(0, 7)
}

/** Bornes `[from, to[` d'un mois, pour filtrer des jours ISO. */
export function monthBounds(month: string): { from: string; to: string } {
  return { from: `${month}-01`, to: `${addMonths(month, 1)}-01` }
}

const weekdayShort = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' })
const monthLong = new Intl.DateTimeFormat('fr-FR', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})
const dayMonth = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
})

export const formatWeekdayShort = (iso: string) => weekdayShort.format(toDate(iso)).replace('.', '')
export const formatMonthLabel = (month: string) => monthLong.format(toDate(`${month}-01`))
export const formatDayMonth = (iso: string) => dayMonth.format(toDate(iso))

/** Nombre de jours de `from` à `to` (jours ISO). */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000)
}

const weekdayLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', timeZone: 'UTC' })

/** Échéance lisible : « Aujourd'hui », « Demain », « Hier », « Lundi » (sous 7 jours) ou « 12 nov. ». */
export function formatDue(iso: string, today: string): string {
  const diff = daysBetween(today, iso)
  if (diff === 0) return "Aujourd'hui"
  if (diff === 1) return 'Demain'
  if (diff === -1) return 'Hier'
  if (diff > 1 && diff < 7) {
    const day = weekdayLong.format(new Date(`${iso}T12:00:00Z`))
    return day.charAt(0).toUpperCase() + day.slice(1)
  }
  return formatDayMonth(iso)
}

const hourFormat = new Intl.DateTimeFormat('fr-FR', {
  hour: 'numeric',
  hourCycle: 'h23',
  timeZone: TIMEZONE,
})

/** Heure courante à Paris (0 à 23). */
export function parisHour(now: Date = new Date()): number {
  return Number(hourFormat.format(now).replace(/\D/g, ''))
}
