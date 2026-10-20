import { addDays, daysBetween, formatDayMonth, startOfWeek } from '@/lib/dates'
import { addMonthsClamped, isoWeekday, WEEKDAYS } from '@/lib/naturalDate'
import type { CalendarEvent, Occurrence } from './types'

/** Garde-fou : au plus ce nombre d'occurrences examinées par événement et par calcul. */
const GUARD = 2000

/** Durée en jours en plus du premier (0 pour un événement d'un jour). */
export const extraDays = (e: Pick<CalendarEvent, 'start_on' | 'end_on'>) =>
  daysBetween(e.start_on, e.end_on)

export const weeklyDays = (e: CalendarEvent) =>
  e.repeat_days && e.repeat_days.length > 0
    ? [...new Set(e.repeat_days)].sort()
    : [isoWeekday(e.start_on)]

/**
 * Premiers jours des occurrences de `e` qui recouvrent `[from, to]` (bornes incluses),
 * sans les occurrences supprimées. Un événement de plusieurs jours garde sa durée à chaque fois.
 */
export function occurrenceStarts(e: CalendarEvent, from: string, to: string): string[] {
  const span = extraDays(e)
  // une occurrence commencée avant `from` peut encore le couvrir
  const lo = addDays(from, -span)
  const last = e.repeat_until && e.repeat_until < to ? e.repeat_until : to
  const skipped = new Set(e.skipped)
  const out: string[] = []
  const keep = (d: string) => {
    if (d >= lo && d >= e.start_on && d <= last && !skipped.has(d)) out.push(d)
  }

  if (!e.repeat) {
    keep(e.start_on)
    return out
  }
  const every = Math.max(1, e.repeat_every)

  if (e.repeat === 'daily') {
    const gap = Math.max(0, daysBetween(e.start_on, lo))
    let d = addDays(e.start_on, Math.floor(gap / every) * every)
    for (let i = 0; d <= last && i < GUARD; i++, d = addDays(d, every)) keep(d)
    return out
  }

  if (e.repeat === 'weekly') {
    const days = weeklyDays(e)
    const anchor = startOfWeek(e.start_on)
    const weeksToLo = Math.max(0, Math.floor(daysBetween(anchor, startOfWeek(lo)) / 7))
    let week = addDays(anchor, Math.floor(weeksToLo / every) * every * 7)
    for (let i = 0; week <= last && i < GUARD; i++, week = addDays(week, 7 * every))
      for (const day of days) keep(addDays(week, day - 1))
    return out
  }

  // mois et années : même quantième (borné à la fin du mois : le 31 devient le 30, le 29 février le 28)
  const months = e.repeat === 'monthly' ? every : every * 12
  const anchorDay = Number(e.start_on.slice(8))
  const monthsToLo = Math.max(
    0,
    (Number(lo.slice(0, 4)) - Number(e.start_on.slice(0, 4))) * 12 +
      Number(lo.slice(5, 7)) -
      Number(e.start_on.slice(5, 7)) -
      1,
  )
  let k = Math.floor(monthsToLo / months)
  for (let i = 0; i < GUARD; i++, k++) {
    const d = addMonthsClamped(e.start_on, k * months, anchorDay)
    if (d > last) break
    keep(d)
  }
  return out
}

/** Les occurrences qui recouvrent `[from, to]`, rangées par jour couvert. */
export function occurrencesByDay(
  events: CalendarEvent[],
  from: string,
  to: string,
): Map<string, Occurrence[]> {
  const map = new Map<string, Occurrence[]>()
  for (const event of events) {
    const span = extraDays(event)
    for (const start of occurrenceStarts(event, from, to)) {
      const occ: Occurrence = { event, start, end: addDays(start, span) }
      for (let d = start; d <= occ.end; d = addDays(d, 1)) {
        if (d < from || d > to) continue
        const list = map.get(d)
        if (list) list.push(occ)
        else map.set(d, [occ])
      }
    }
  }
  for (const list of map.values()) list.sort(compareOccurrences)
  return map
}

/** Ordre dans une journée : sur plusieurs jours, puis journée entière, puis par heure, puis par titre. */
export function compareOccurrences(a: Occurrence, b: Occurrence): number {
  const rank = (o: Occurrence) => (o.start !== o.end ? 0 : o.event.start_time ? 2 : 1)
  return (
    rank(a) - rank(b) ||
    (a.event.start_time ?? '').localeCompare(b.event.start_time ?? '') ||
    a.event.title.localeCompare(b.event.title, 'fr')
  )
}

export function occurrencesOn(events: CalendarEvent[], day: string): Occurrence[] {
  return occurrencesByDay(events, day, day).get(day) ?? []
}

/** « 14:30:00 » → « 14h30 », « 09:00 » → « 9h ». */
export function formatTime(time: string): string {
  const [h = '0', m = '00'] = time.split(':')
  return `${Number(h)}h${m === '00' ? '' : m}`
}

/** Ce qu'on affiche à côté du titre, pour un jour donné de l'occurrence. */
export function occurrenceWhen(o: Occurrence, day: string): string {
  const { start_time, end_time } = o.event
  if (o.start !== o.end) {
    const total = daysBetween(o.start, o.end) + 1
    const index = daysBetween(o.start, day) + 1
    const range = `du ${formatDayMonth(o.start)} au ${formatDayMonth(o.end)}`
    if (day === o.start && start_time) return `dès ${formatTime(start_time)} · ${range}`
    if (day === o.end && end_time) return `jusqu’à ${formatTime(end_time)} · ${range}`
    return `jour ${index}/${total} · ${range}`
  }
  if (!start_time) return 'Toute la journée'
  return end_time ? `${formatTime(start_time)}–${formatTime(end_time)}` : formatTime(start_time)
}

function joinFr(words: string[]): string {
  return words.length <= 1
    ? (words[0] ?? '')
    : `${words.slice(0, -1).join(', ')} et ${words.at(-1)}`
}

/** « Toutes les 2 semaines le lundi et le jeudi, jusqu'au 20 déc. » */
export function describeRepeat(e: CalendarEvent): string | null {
  if (!e.repeat) return null
  const n = e.repeat_every
  const unit = {
    daily: n === 1 ? 'Tous les jours' : `Tous les ${n} jours`,
    weekly: n === 1 ? 'Toutes les semaines' : `Toutes les ${n} semaines`,
    monthly: n === 1 ? 'Tous les mois' : `Tous les ${n} mois`,
    yearly: n === 1 ? 'Tous les ans' : `Tous les ${n} ans`,
  }[e.repeat]
  let text = unit
  if (e.repeat === 'weekly') {
    const days = weeklyDays(e)
    if (n === 1 && days.join() === '1,2,3,4,5') text = 'En semaine'
    else if (n === 1 && days.join() === '6,7') text = 'Le week-end'
    else text += ` ${joinFr(days.map((d) => `le ${WEEKDAYS[d - 1]!}`))}`
  }
  if (e.repeat_until) text += `, jusqu’au ${formatDayMonth(e.repeat_until)}`
  return text
}
