import { addDays, lastNDays, startOfWeek } from '@/lib/dates'
import { isoWeekday } from '@/lib/naturalDate'
import type { DayEntries, HabitLog, HeatCell, Schedule, Streak } from './types'

const NONE: ReadonlySet<string> = new Set()

/** Regroupe les logs : habit_id → (jour → quantité). */
export function groupLogs(logs: HabitLog[]): Map<string, DayEntries> {
  const map = new Map<string, DayEntries>()
  for (const log of logs) {
    const entries = map.get(log.habit_id) ?? new Map<string, number | null>()
    entries.set(log.day, log.amount ?? null)
    map.set(log.habit_id, entries)
  }
  return map
}

/** Jour prévu pour cette habitude ? (toujours vrai hors « jours précis ») */
export function isScheduled(schedule: Schedule, day: string): boolean {
  return !schedule.days || schedule.days.includes(isoWeekday(day))
}

/** Avancement du jour, entre 0 et 1 (une case cochée sans quantité vaut 1). */
export function dayRatio(schedule: Schedule, entries: DayEntries, day: string): number {
  if (!entries.has(day)) return 0
  const amount = entries.get(day) ?? null
  if (!schedule.goal_amount || amount === null) return 1
  return Math.min(1, amount / schedule.goal_amount)
}

export function isDayDone(schedule: Schedule, entries: DayEntries, day: string): boolean {
  return dayRatio(schedule, entries, day) >= 1
}

/** Mode de suivi : jours consécutifs (quotidien ou jours précis) ou semaines (X fois/semaine). */
const isWeekly = (s: Schedule) => !s.days && s.target_per_week < 7

/**
 * Série en cours. Les jours off et les jours non prévus sont sautés (ils ne cassent pas la série) ;
 * aujourd'hui ne la casse pas non plus tant qu'il n'est pas fini.
 * En mode « X fois par semaine », on compte les semaines où l'objectif est atteint ;
 * l'objectif d'une semaine est réduit au prorata de ses jours off.
 */
export function currentStreak(
  schedule: Schedule,
  entries: DayEntries,
  today: string,
  offDays: ReadonlySet<string> = NONE,
): Streak {
  const done = (day: string) => isDayDone(schedule, entries, day)

  if (!isWeekly(schedule)) {
    let count = 0
    let cursor = today
    for (let i = 0; i < 3650; i++, cursor = addDays(cursor, -1)) {
      if (offDays.has(cursor) || !isScheduled(schedule, cursor)) continue
      if (done(cursor)) count++
      else if (cursor !== today) break
    }
    return { count, unit: 'day' }
  }

  let count = 0
  let monday = startOfWeek(today)
  for (let w = 0; w < 520; w++, monday = addDays(monday, -7)) {
    const week = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
    const activeDays = week.filter((d) => !offDays.has(d)).length
    if (activeDays === 0) continue
    const required = Math.ceil((schedule.target_per_week * activeDays) / 7)
    const met = week.filter(done).length >= required
    if (met) count++
    else if (w > 0) break // la semaine en cours n'interrompt pas la série
  }
  return { count, unit: 'week' }
}

/**
 * Taux de réussite sur 30 jours (0..1), hors jours off.
 * Quotidien / jours précis : jours faits ÷ jours prévus (aujourd'hui ne compte que s'il est fait).
 * X fois par semaine : jours faits ÷ objectif au prorata des jours actifs.
 */
export function successRate30(
  schedule: Schedule,
  entries: DayEntries,
  today: string,
  offDays: ReadonlySet<string> = NONE,
): number {
  const window = lastNDays(today, 30).filter((d) => !offDays.has(d))
  const done = window.filter((d) => isDayDone(schedule, entries, d))
  if (isWeekly(schedule)) {
    const expected = (schedule.target_per_week * window.length) / 7
    return expected > 0 ? Math.min(1, done.length / expected) : 0
  }
  const planned = window.filter(
    (d) => isScheduled(schedule, d) && (d !== today || isDayDone(schedule, entries, d)),
  )
  if (planned.length === 0) return 0
  return Math.min(1, done.filter((d) => isScheduled(schedule, d)).length / planned.length)
}

/** Grille de heatmap : colonnes = semaines (lundi→dimanche), se terminant à la semaine courante. */
export function heatmapWeeks(
  schedule: Schedule,
  entries: DayEntries,
  today: string,
  offDays: ReadonlySet<string> = NONE,
  weeks = 53,
): HeatCell[][] {
  const firstMonday = addDays(startOfWeek(today), -7 * (weeks - 1))
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const day = addDays(firstMonday, w * 7 + d)
      const ratio = dayRatio(schedule, entries, day)
      return {
        day,
        done: ratio >= 1,
        ratio,
        future: day > today,
        off: offDays.has(day),
        scheduled: isScheduled(schedule, day),
      }
    }),
  )
}

/** « 1 fois par semaine », « Tous les jours », « Lun, mer, ven » */
export function frequencyLabel(schedule: Pick<Schedule, 'target_per_week' | 'days'>): string {
  if (schedule.days) {
    const names = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim']
    if (schedule.days.length === 7) return 'Tous les jours'
    if ([...schedule.days].sort().join() === '1,2,3,4,5') return 'En semaine'
    const label = [...schedule.days]
      .sort()
      .map((d) => names[d - 1])
      .join(', ')
    return label.charAt(0).toUpperCase() + label.slice(1)
  }
  return schedule.target_per_week >= 7
    ? 'Tous les jours'
    : `${schedule.target_per_week} fois par semaine`
}

/** Objectif chiffré lu dans le nom : « Boire 8 verres d'eau » → 8 verres. */
export function parseHabitGoal(name: string): { goal_amount: number; unit: string } | null {
  const m =
    /(?<![\p{L}\d])(\d{1,6})\s*(verres?|min(?:utes)?|pages?|km|kilom[eè]tres?|pas|fois|heures?|h|litres?|l|séries|series|pompes)(?![\p{L}\d])/iu.exec(
      name,
    )
  if (!m) return null
  const amount = Number(m[1])
  return amount > 0 ? { goal_amount: amount, unit: m[2]!.toLowerCase() } : null
}

/** Regroupe des jours en périodes consécutives : [{ from, to, days }]. */
export function groupPeriods(days: string[]): { from: string; to: string; days: string[] }[] {
  const sorted = [...new Set(days)].sort()
  const periods: { from: string; to: string; days: string[] }[] = []
  for (const day of sorted) {
    const last = periods.at(-1)
    if (last && addDays(last.to, 1) === day) {
      last.to = day
      last.days.push(day)
    } else {
      periods.push({ from: day, to: day, days: [day] })
    }
  }
  return periods
}
