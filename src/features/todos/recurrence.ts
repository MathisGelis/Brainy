import { addDays } from '@/lib/dates'
import { addMonthsClamped, isoWeekday, WEEKDAYS } from '@/lib/naturalDate'

/** Récurrence d'une todo. Stockage texte : 'daily' | 'weekly:1,3,5' (jours ISO) | 'monthly'. */
export type Recurrence =
  { kind: 'daily' } | { kind: 'weekly'; days: number[] } | { kind: 'monthly' }

const normalizeDays = (days: number[]) => [...new Set(days)].filter((d) => d >= 1 && d <= 7).sort()

export function parseRecurrence(value: string | null): Recurrence | null {
  if (!value) return null
  if (value === 'daily') return { kind: 'daily' }
  if (value === 'monthly') return { kind: 'monthly' }
  const m = /^weekly:([1-7](?:,[1-7])*)$/.exec(value)
  if (!m) return null
  return { kind: 'weekly', days: normalizeDays(m[1]!.split(',').map(Number)) }
}

export function serializeRecurrence(r: Recurrence | null): string | null {
  if (!r) return null
  if (r.kind !== 'weekly') return r.kind
  const days = normalizeDays(r.days)
  if (days.length === 0) return null
  if (days.length === 7) return 'daily'
  return `weekly:${days.join(',')}`
}

function joinFr(words: string[]): string {
  return words.length <= 1
    ? (words[0] ?? '')
    : `${words.slice(0, -1).join(', ')} et ${words.at(-1)}`
}

/** Libellé court : « Tous les jours », « En semaine », « Chaque lundi et jeudi »… */
export function describeRecurrence(r: Recurrence): string {
  if (r.kind === 'daily') return 'Tous les jours'
  if (r.kind === 'monthly') return 'Tous les mois'
  const days = normalizeDays(r.days)
  if (days.join() === '1,2,3,4,5') return 'En semaine'
  if (days.join() === '6,7') return 'Le week-end'
  return `Chaque ${joinFr(days.map((d) => WEEKDAYS[d - 1]!))}`
}

function step(r: Recurrence, from: string, anchorDay: number): string {
  if (r.kind === 'daily') return addDays(from, 1)
  if (r.kind === 'monthly') return addMonthsClamped(from, 1, anchorDay)
  for (let i = 1; i <= 7; i++) {
    const candidate = addDays(from, i)
    if (r.days.includes(isoWeekday(candidate))) return candidate
  }
  return addDays(from, 7)
}

/** Première échéance d'une todo récurrente sans date : aujourd'hui ou le prochain jour prévu. */
export function firstOccurrence(r: Recurrence, today: string): string {
  if (r.kind !== 'weekly' || r.days.includes(isoWeekday(today))) return today
  return step(r, today, Number(today.slice(8)))
}

/**
 * Échéance suivante quand on termine une occurrence : toujours après aujourd'hui
 * (terminer une todo quotidienne en retard de 3 jours la replanifie à demain).
 */
export function nextOccurrence(r: Recurrence, due: string | null, today: string): string {
  const start = due ?? today
  const anchorDay = Number(start.slice(8))
  let next = step(r, start, anchorDay)
  for (let guard = 0; next <= today && guard < 5000; guard++) next = step(r, next, anchorDay)
  return next
}
