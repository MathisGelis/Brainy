import { lastNDays } from '@/lib/dates'
import {
  currentStreak,
  dayRatio,
  frequencyLabel,
  groupPeriods,
  groupLogs,
  heatmapWeeks,
  isDayDone,
  parseHabitGoal,
  successRate30,
} from './habitLogic'
import type { DayEntries, Schedule } from './types'

const TODAY = '2026-03-11' // mercredi
const daily: Schedule = { target_per_week: 7, days: null, goal_amount: null }
const weekly2: Schedule = { target_per_week: 2, days: null, goal_amount: null }
const entries = (...days: string[]): DayEntries => new Map(days.map((d) => [d, null]))

describe('currentStreak (quotidien)', () => {
  it('compte les jours consécutifs jusqu’à aujourd’hui', () => {
    expect(currentStreak(daily, entries('2026-03-09', '2026-03-10', '2026-03-11'), TODAY)).toEqual({
      count: 3,
      unit: 'day',
    })
  })

  it('ne casse pas la série si aujourd’hui n’est pas encore coché', () => {
    expect(currentStreak(daily, entries('2026-03-09', '2026-03-10'), TODAY).count).toBe(2)
  })

  it('tombe à 0 si hier est manqué', () => {
    expect(currentStreak(daily, entries('2026-03-08', '2026-03-09'), TODAY).count).toBe(0)
  })

  it('les jours off ne cassent pas la série', () => {
    const off = new Set(['2026-03-09', '2026-03-10'])
    expect(
      currentStreak(daily, entries('2026-03-07', '2026-03-08', '2026-03-11'), TODAY, off).count,
    ).toBe(3)
  })
})

describe('currentStreak (jours précis)', () => {
  const mwf: Schedule = { target_per_week: 3, days: [1, 3, 5], goal_amount: null } // lun, mer, ven

  it('saute les jours non prévus', () => {
    // ven 6, lun 9, mer 11 faits ; mar 10 non prévu
    expect(currentStreak(mwf, entries('2026-03-06', '2026-03-09', '2026-03-11'), TODAY).count).toBe(
      3,
    )
  })

  it('un jour prévu manqué casse la série', () => {
    expect(currentStreak(mwf, entries('2026-03-06', '2026-03-11'), TODAY).count).toBe(1)
  })
})

describe('currentStreak (hebdomadaire)', () => {
  // objectif 2 fois / semaine ; semaines : 2-8 mars, 9-15 mars (en cours)
  it('compte les semaines consécutives où l’objectif est atteint', () => {
    expect(
      currentStreak(
        weekly2,
        entries('2026-03-02', '2026-03-05', '2026-02-23', '2026-02-24'),
        TODAY,
      ),
    ).toEqual({
      count: 2,
      unit: 'week',
    })
  })

  it('ajoute la semaine en cours si l’objectif y est atteint', () => {
    expect(
      currentStreak(weekly2, entries('2026-03-09', '2026-03-10', '2026-03-02', '2026-03-03'), TODAY)
        .count,
    ).toBe(2)
  })

  it('s’arrête à la première semaine manquée', () => {
    expect(
      currentStreak(weekly2, entries('2026-03-02', '2026-03-03', '2026-02-16', '2026-02-17'), TODAY)
        .count,
    ).toBe(1)
  })

  it('une semaine entièrement off est sautée, une semaine partiellement off a un objectif réduit', () => {
    const offWeek = new Set(lastNDays('2026-03-08', 7)) // 2-8 mars
    expect(currentStreak(weekly2, entries('2026-02-23', '2026-02-24'), TODAY, offWeek).count).toBe(
      1,
    )
    const fourOff = new Set(['2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05'])
    // 3 jours actifs → objectif ceil(2×3/7) = 1
    expect(currentStreak(weekly2, entries('2026-03-06'), TODAY, fourOff).count).toBe(1)
  })
})

describe('habitudes chiffrées', () => {
  const water: Schedule = { target_per_week: 7, days: null, goal_amount: 8 }
  const e: DayEntries = new Map([
    ['2026-03-10', 8],
    ['2026-03-11', 3],
  ])

  it('un jour est fait quand l’objectif est atteint', () => {
    expect(isDayDone(water, e, '2026-03-10')).toBe(true)
    expect(isDayDone(water, e, '2026-03-11')).toBe(false)
    expect(dayRatio(water, e, '2026-03-11')).toBe(3 / 8)
  })

  it('une case cochée sans quantité compte comme faite', () => {
    expect(isDayDone(water, new Map([['2026-03-11', null]]), '2026-03-11')).toBe(true)
  })

  it('série : aujourd’hui partiel ne casse pas, hier compte', () => {
    expect(currentStreak(water, e, TODAY).count).toBe(1)
  })
})

describe('successRate30', () => {
  it('vaut 1 quand les jours passés sont faits (aujourd’hui ne pénalise pas)', () => {
    const all = entries(...lastNDays('2026-03-10', 29))
    expect(successRate30(daily, all, TODAY)).toBe(1)
  })

  it('exclut les jours off du calcul', () => {
    const off = new Set(lastNDays('2026-03-10', 29).slice(0, 28))
    expect(successRate30(daily, entries('2026-03-10'), TODAY, off)).toBe(1)
  })

  it('hebdomadaire : plafonné à 1', () => {
    const days = entries('2026-03-11', '2026-03-10', '2026-03-09', '2026-03-08', '2026-03-07')
    expect(successRate30({ target_per_week: 1, days: null, goal_amount: null }, days, TODAY)).toBe(
      1,
    )
  })

  it('jours précis : ne compte que les jours prévus', () => {
    const mon: Schedule = { target_per_week: 1, days: [1], goal_amount: null }
    // lundis des 30 derniers jours : 9 mars, 2 mars, 23 fév, 16 fév ; un seul fait
    expect(successRate30(mon, entries('2026-03-09'), TODAY)).toBe(1 / 4)
  })
})

describe('heatmapWeeks', () => {
  const grid = heatmapWeeks(daily, entries('2026-03-10'), TODAY, new Set(['2026-03-09']), 4)

  it('a 4 colonnes de 7 jours, commençant un lundi', () => {
    expect(grid).toHaveLength(4)
    expect(grid.every((w) => w.length === 7)).toBe(true)
    expect(grid[0]![0]!.day).toBe('2026-02-16')
  })

  it('marque faits, futurs et jours off', () => {
    const flat = grid.flat()
    expect(flat.find((c) => c.day === '2026-03-10')?.done).toBe(true)
    expect(flat.find((c) => c.day === '2026-03-12')?.future).toBe(true)
    expect(flat.find((c) => c.day === '2026-03-09')?.off).toBe(true)
  })
})

describe('groupLogs', () => {
  it('regroupe les quantités par habitude', () => {
    const map = groupLogs([
      { id: '1', habit_id: 'a', day: '2026-03-01', amount: null },
      { id: '2', habit_id: 'a', day: '2026-03-02', amount: 5 },
      { id: '3', habit_id: 'b', day: '2026-03-01', amount: null },
    ])
    expect(map.get('a')?.get('2026-03-02')).toBe(5)
    expect(map.get('a')?.has('2026-03-01')).toBe(true)
    expect(map.get('b')?.size).toBe(1)
  })
})

describe('libellés et objectif chiffré', () => {
  it.each([
    [{ target_per_week: 7, days: null }, 'Tous les jours'],
    [{ target_per_week: 3, days: null }, '3 fois par semaine'],
    [{ target_per_week: 3, days: [5, 1, 3] }, 'Lun, mer, ven'],
    [{ target_per_week: 5, days: [1, 2, 3, 4, 5] }, 'En semaine'],
  ])('%j → %s', (schedule, label) => {
    expect(frequencyLabel(schedule)).toBe(label)
  })

  it('lit un objectif chiffré dans le nom', () => {
    expect(parseHabitGoal("Boire 8 verres d'eau")).toEqual({ goal_amount: 8, unit: 'verres' })
    expect(parseHabitGoal('Lire 20 pages')).toEqual({ goal_amount: 20, unit: 'pages' })
    expect(parseHabitGoal('Méditer 10 min')).toEqual({ goal_amount: 10, unit: 'min' })
    expect(parseHabitGoal('Lecture')).toBeNull()
  })
})

describe('groupPeriods', () => {
  it('regroupe les jours consécutifs', () => {
    expect(groupPeriods(['2026-03-12', '2026-03-10', '2026-03-11', '2026-03-20'])).toEqual([
      { from: '2026-03-10', to: '2026-03-12', days: ['2026-03-10', '2026-03-11', '2026-03-12'] },
      { from: '2026-03-20', to: '2026-03-20', days: ['2026-03-20'] },
    ])
  })
})
