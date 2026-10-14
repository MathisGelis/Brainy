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
