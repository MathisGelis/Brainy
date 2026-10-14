import { lastNDays } from '@/lib/dates'
import { currentStreak, groupLogs, heatmapWeeks, successRate30 } from './habitLogic'

const TODAY = '2026-03-11' // mercredi

describe('currentStreak (quotidien)', () => {
  it('compte les jours consécutifs jusqu’à aujourd’hui', () => {
    const days = new Set(['2026-03-09', '2026-03-10', '2026-03-11'])
    expect(currentStreak(days, TODAY, 7)).toEqual({ count: 3, unit: 'day' })
  })

  it('ne casse pas la série si aujourd’hui n’est pas encore coché', () => {
    const days = new Set(['2026-03-09', '2026-03-10'])
    expect(currentStreak(days, TODAY, 7).count).toBe(2)
  })

  it('tombe à 0 si hier est manqué', () => {
    const days = new Set(['2026-03-08', '2026-03-09'])
    expect(currentStreak(days, TODAY, 7).count).toBe(0)
  })
})

describe('currentStreak (hebdomadaire)', () => {
  // objectif 2 fois / semaine ; semaines : 2-8 mars, 9-15 mars (en cours)
  it('compte les semaines consécutives où l’objectif est atteint', () => {
    const days = new Set(['2026-03-02', '2026-03-05', '2026-02-23', '2026-02-24'])
    expect(currentStreak(days, TODAY, 2)).toEqual({ count: 2, unit: 'week' })
  })

  it('ajoute la semaine en cours si l’objectif y est atteint', () => {
    const days = new Set(['2026-03-09', '2026-03-10', '2026-03-02', '2026-03-03'])
    expect(currentStreak(days, TODAY, 2).count).toBe(2)
  })

  it('s’arrête à la première semaine manquée', () => {
    const days = new Set(['2026-03-02', '2026-03-03', '2026-02-16', '2026-02-17'])
    expect(currentStreak(days, TODAY, 2).count).toBe(1)
  })
})

describe('successRate30', () => {
  it('vaut 1 quand les 30 jours sont faits, et 1/30 pour un seul jour', () => {
    const all = new Set(lastNDays(TODAY, 30))
    expect(successRate30(all, TODAY, 7)).toBe(1)
    expect(successRate30(new Set([TODAY]), TODAY, 7)).toBeCloseTo(1 / 30)
  })

  it('est plafonné à 1 et tient compte de l’objectif hebdomadaire', () => {
    const days = new Set(['2026-03-11', '2026-03-10', '2026-03-09', '2026-03-08', '2026-03-07'])
    // objectif 1/semaine → attendu ≈ 4,29 ; 5 faits → plafonné à 1
    expect(successRate30(days, TODAY, 1)).toBe(1)
  })
})

describe('heatmapWeeks', () => {
  const grid = heatmapWeeks(new Set(['2026-03-10']), TODAY, 4)

  it('a 4 colonnes de 7 jours, commençant un lundi', () => {
    expect(grid).toHaveLength(4)
    expect(grid.every((w) => w.length === 7)).toBe(true)
    expect(grid[0]![0]!.day).toBe('2026-02-16')
  })

  it('marque les jours faits et les jours futurs', () => {
    const flat = grid.flat()
    expect(flat.find((c) => c.day === '2026-03-10')?.done).toBe(true)
    expect(flat.find((c) => c.day === '2026-03-12')?.future).toBe(true)
    expect(flat.find((c) => c.day === TODAY)?.future).toBe(false)
  })
})

describe('groupLogs', () => {
  it('regroupe les jours par habitude', () => {
    const map = groupLogs([
      { id: '1', habit_id: 'a', day: '2026-03-01' },
      { id: '2', habit_id: 'a', day: '2026-03-02' },
      { id: '3', habit_id: 'b', day: '2026-03-01' },
    ])
    expect([...map.get('a')!]).toEqual(['2026-03-01', '2026-03-02'])
    expect(map.get('b')?.size).toBe(1)
  })
})
