import type { DayEntries, Habit } from '@/features/habits/types'
import { addDays } from '@/lib/dates'
import {
  average,
  describe as describeValue,
  formatDiff,
  formatScore,
  habitLinks,
} from './checkinLogic'
import type { DayCheckin } from './types'

const habit = (over: Partial<Habit> = {}): Habit => ({
  id: 'h1',
  name: 'Course',
  target_per_week: 3,
  days: null,
  goal_amount: null,
  unit: null,
  goal_id: null,
  archived: false,
  position: 0,
  created_at: '2026-01-01T00:00:00Z',
  ...over,
})

// Lundi 5 octobre 2026 → dimanche 18 octobre : 14 jours
const START = '2026-10-05'
const days = Array.from({ length: 14 }, (_, i) => addDays(START, i))
const TO = days[13]!

/** Jours pairs : course faite, énergie 4 ; jours impairs : pas de course, énergie 3 (humeur constante). */
function sample() {
  const done: DayEntries = new Map(days.filter((_, i) => i % 2 === 0).map((d) => [d, null]))
  const checkins: DayCheckin[] = days.map((day, i) => ({
    day,
    mood: 3,
    energy: i % 2 === 0 ? 4 : 3,
    win: null,
  }))
  return { done, checkins }
}

describe('describe', () => {
  it('donne un libellé lisible', () => {
    expect(describeValue('mood', 4)).toBe('Humeur : bonne (4 sur 5)')
    expect(describeValue('energy', 1)).toBe('Énergie : à plat (1 sur 5)')
  })
})

describe('average', () => {
  it('ignore les valeurs absentes et les jours hors période', () => {
    const checkins: DayCheckin[] = [
      { day: '2026-10-05', mood: 4, energy: null, win: null },
      { day: '2026-10-06', mood: 2, energy: 5, win: null },
      { day: '2026-10-20', mood: 1, energy: 1, win: null },
    ]
    expect(average(checkins, 'mood', '2026-10-05', '2026-10-11')).toBe(3)
    expect(average(checkins, 'energy', '2026-10-05', '2026-10-11')).toBe(5)
    expect(average([], 'mood', '2026-10-05', '2026-10-11')).toBeNull()
  })
})

describe('habitLinks', () => {
  it('repère « les jours de course, énergie +1 » et ignore un écart nul', () => {
    const { done, checkins } = sample()
    const links = habitLinks({
      checkins,
      habits: [habit()],
      entries: new Map([['h1', done]]),
      offDays: new Set(),
      to: TO,
    })
    expect(links).toEqual([
      expect.objectContaining({
        habit: 'Course',
        field: 'energy',
        withHabit: 4,
        without: 3,
        diff: 1,
      }),
    ])
  })

  it('ne compare que les jours prévus, hors jours off', () => {
    const { done, checkins } = sample()
    // Habitude prévue le lundi seulement : trop peu de jours pour conclure
    const mondays = habitLinks({
      checkins,
      habits: [habit({ days: [1] })],
      entries: new Map([['h1', done]]),
      offDays: new Set(),
      to: TO,
    })
    expect(mondays).toEqual([])

    // Les jours off (ici tous les jours sans course) sortent de la comparaison
    const off = new Set(days.filter((_, i) => i % 2 === 1))
    expect(
      habitLinks({
        checkins,
        habits: [habit()],
        entries: new Map([['h1', done]]),
        offDays: off,
        to: TO,
      }),
    ).toEqual([])
  })

  it('exige assez de saisies de chaque côté et ignore les habitudes archivées', () => {
    const { done, checkins } = sample()
    const few = checkins.slice(0, 4)
    const entries = new Map([['h1', done]])
    expect(
      habitLinks({ checkins: few, habits: [habit()], entries, offDays: new Set(), to: TO }),
    ).toEqual([])
    expect(
      habitLinks({
        checkins,
        habits: [habit({ archived: true })],
        entries,
        offDays: new Set(),
        to: TO,
      }),
    ).toEqual([])
  })
})

describe('formatage', () => {
  it('affiche une décimale à la française, avec le signe', () => {
    expect(formatScore(3.84)).toBe('3,8')
    expect(formatDiff(0.8)).toBe('+0,8')
    expect(formatDiff(-0.62)).toBe('−0,6')
  })
})
