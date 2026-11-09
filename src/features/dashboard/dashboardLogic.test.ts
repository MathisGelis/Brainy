import type { DayCheckin } from '@/features/checkins/types'
import type { Habit } from '@/features/habits/types'
import type { Todo } from '@/features/todos/types'
import {
  habitDay,
  habitGrid,
  habitRate,
  heatLevel,
  mean,
  moodSeries,
  todosLastDays,
} from './dashboardLogic'

// Mercredi 11 novembre 2026
const today = '2026-11-11'

const todo = (done_at: string | null): Todo =>
  ({ id: done_at ?? 'x', done: done_at !== null, done_at }) as Todo
const habit = (over: Partial<Habit>): Habit => ({
  id: 'h',
  name: 'h',
  target_per_week: 7,
  days: null,
  goal_amount: null,
  unit: null,
  goal_id: null,
  archived: false,
  position: 0,
  created_at: '2026-01-01T00:00:00Z',
  ...over,
})

describe('dashboardLogic', () => {
  it('compte les todos terminées sur 7 jours glissants, et les 7 jours d’avant', () => {
    const r = todosLastDays(
      [
        todo('2026-11-09T09:00:00Z'),
        todo('2026-11-11T09:00:00Z'),
        todo('2026-11-11T23:30:00Z'), // 00 h 30 le 12 à Paris : demain
        todo('2026-11-05T09:00:00Z'), // il y a 6 jours : dedans
        todo('2026-11-04T09:00:00Z'), // il y a 7 jours : période d'avant
        todo(null),
      ],
      today,
    )
    expect(r.days.map((d) => d.day)).toEqual([
      '2026-11-05',
      '2026-11-06',
      '2026-11-07',
      '2026-11-08',
      '2026-11-09',
      '2026-11-10',
      '2026-11-11',
    ])
    expect(r.days.map((d) => d.value)).toEqual([1, 0, 0, 0, 1, 0, 1])
    expect(r.total).toBe(3)
    expect(r.previous).toBe(1)
  })

  it('jour d’habitudes : prévues, jours précis, « X fois par semaine » en bonus', () => {
    const entries = new Map([
      ['daily', new Map([[today, null]])],
      ['weekly', new Map([[today, null]])],
    ])
    const habits = [
      habit({ id: 'daily' }),
      habit({ id: 'monday', days: [1] }), // pas prévue un mercredi
      habit({ id: 'weekly', target_per_week: 3 }),
      habit({ id: 'skipped' }),
      habit({ id: 'new', created_at: '2026-12-01T00:00:00Z' }),
      habit({ id: 'old', archived: true }),
    ]
    expect(habitDay(habits, entries, today, today)).toEqual({
      day: today,
      done: 2,
      total: 3,
      future: false,
    })
    expect(habitDay(habits, new Map(), '2026-11-09', today)).toMatchObject({ done: 0, total: 3 })
  })

  it('grille de 12 semaines finissant par la semaine en cours, niveaux et taux', () => {
    const grid = habitGrid([habit({ id: 'a' })], new Map([['a', new Map([[today, null]])]]), today)
    expect(grid).toHaveLength(12)
    expect(grid.at(-1)!.map((c) => c.day)).toEqual([
      '2026-11-09',
      '2026-11-10',
      '2026-11-11',
      '2026-11-12',
      '2026-11-13',
      '2026-11-14',
      '2026-11-15',
    ])
    expect(grid.at(-1)![3]!.future).toBe(true)
    expect(habitRate(grid.at(-1)!)).toBeCloseTo(1 / 3)
    expect([0, 1, 2, 3, 4].map((done) => heatLevel({ done, total: 4 }))).toEqual([0, 1, 2, 3, 4])
    expect(heatLevel({ done: 0, total: 0 })).toBe(0)
    expect(habitRate([])).toBeNull()
  })

  it('humeur et énergie sur 30 jours, et moyenne des valeurs notées', () => {
    const series = moodSeries([{ day: today, mood: 4, energy: 2 } as DayCheckin], today)
    expect(series).toHaveLength(30)
    expect(series.at(-1)).toEqual({ day: today, mood: 4, energy: 2 })
    expect(series[0]).toEqual({ day: '2026-10-13', mood: null, energy: null })
    expect(mean([4, null, 2])).toBe(3)
    expect(mean([null])).toBeNull()
  })
})
