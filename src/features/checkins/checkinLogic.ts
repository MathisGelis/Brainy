import { isDayDone, isScheduled } from '@/features/habits/habitLogic'
import type { DayEntries, Habit } from '@/features/habits/types'
import { addDays } from '@/lib/dates'
import type { CheckinField, DayCheckin } from './types'

export const SCALE = [1, 2, 3, 4, 5] as const

export const LABELS: Record<CheckinField, readonly string[]> = {
  mood: ['difficile', 'bof', 'correcte', 'bonne', 'excellente'],
  energy: ['à plat', 'basse', 'moyenne', 'bonne', 'au top'],
}

export const FIELD_NAMES: Record<CheckinField, string> = { mood: 'Humeur', energy: 'Énergie' }

/** « Humeur : bonne (4 sur 5) » */
export function describe(field: CheckinField, value: number): string {
  return `${FIELD_NAMES[field]} : ${LABELS[field][value - 1]} (${value} sur 5)`
}

const mean = (values: number[]) => values.reduce((s, v) => s + v, 0) / values.length

/** Moyenne d'une valeur sur des jours [from, to] ; null sans aucune saisie. */
export function average(
  checkins: DayCheckin[],
  field: CheckinField,
  from: string,
  to: string,
): number | null {
  const values = checkins
    .filter((c) => c.day >= from && c.day <= to)
    .map((c) => c[field])
    .filter((v): v is number => v !== null)
  return values.length === 0 ? null : mean(values)
}

export type CheckinLink = {
  habitId: string
  habit: string
  field: CheckinField
  /** Moyenne les jours où l'habitude est faite */
  withHabit: number
  /** Moyenne les jours prévus où elle ne l'est pas */
  without: number
  diff: number
}

/** Nombre minimal de jours de chaque côté pour oser une comparaison */
export const MIN_DAYS = 3
/** Écart minimal (sur 5) pour qu'un lien vaille d'être montré */
export const MIN_DIFF = 0.5

/**
 * Liens simples entre habitudes et humeur/énergie sur une fenêtre de jours finissant à `to` :
 * « les jours de sport, énergie +0,8 ». On ne compare que les jours où l'habitude était prévue
 * (hors jours off), avec assez de saisies de chaque côté ; ce sont des constats, pas des causes.
 */
export function habitLinks({
  checkins,
  habits,
  entries,
  offDays,
  to,
  days = 56,
  limit = 3,
}: {
  checkins: DayCheckin[]
  habits: Habit[]
  entries: Map<string, DayEntries>
  offDays: ReadonlySet<string>
  to: string
  days?: number
  limit?: number
}): CheckinLink[] {
  const from = addDays(to, -(days - 1))
  const window = checkins.filter((c) => c.day >= from && c.day <= to && !offDays.has(c.day))
  const links: CheckinLink[] = []
  for (const habit of habits) {
    if (habit.archived) continue
    const e = entries.get(habit.id) ?? new Map()
    for (const field of ['energy', 'mood'] as const) {
      const done: number[] = []
      const missed: number[] = []
      for (const c of window) {
        const value = c[field]
        if (value === null || c.day < habit.created_at.slice(0, 10)) continue
        if (isDayDone(habit, e, c.day)) done.push(value)
        else if (isScheduled(habit, c.day)) missed.push(value)
      }
      if (done.length < MIN_DAYS || missed.length < MIN_DAYS) continue
      const withHabit = mean(done)
      const without = mean(missed)
      const diff = withHabit - without
      if (Math.abs(diff) >= MIN_DIFF) {
        links.push({ habitId: habit.id, habit: habit.name, field, withHabit, without, diff })
      }
    }
  }
  return links.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)).slice(0, limit)
}

const oneDecimal = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

/** 3.84 → « 3,8 » */
export function formatScore(value: number): string {
  return oneDecimal.format(value)
}

/** 0.8 → « +0,8 », -0.6 → « −0,6 » */
export function formatDiff(value: number): string {
  return `${value >= 0 ? '+' : '−'}${oneDecimal.format(Math.abs(value))}`
}
