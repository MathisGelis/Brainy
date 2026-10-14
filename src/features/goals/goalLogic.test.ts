import { goalProgress, groupGoals, milestonesOf, nextMilestone } from './goalLogic'
import type { Goal, Milestone } from './types'

const goal = (id: string, overrides: Partial<Goal> = {}): Goal => ({
  id,
  title: id,
  description: null,
  horizon: 'short',
  target_date: null,
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

const ms = (id: string, goalId: string, done: boolean, position = 0): Milestone => ({
  id,
  goal_id: goalId,
  title: id,
  done,
  done_at: null,
  position,
  created_at: '2026-01-01T00:00:00Z',
})

describe('goalProgress', () => {
  it('vaut 0 sans jalon', () => {
    expect(goalProgress([])).toEqual({ done: 0, total: 0, ratio: 0 })
  })

  it('calcule le pourcentage de jalons faits', () => {
    const p = goalProgress([
      ms('a', 'g', true),
      ms('b', 'g', false),
      ms('c', 'g', true),
      ms('d', 'g', false),
    ])
    expect(p).toEqual({ done: 2, total: 4, ratio: 0.5 })
  })
})

describe('milestonesOf', () => {
  it('filtre par objectif et trie par position', () => {
    const all = [ms('b', 'g1', false, 1), ms('x', 'g2', false, 0), ms('a', 'g1', false, 0)]
    expect(milestonesOf(all, 'g1').map((m) => m.id)).toEqual(['a', 'b'])
  })
})

describe('groupGoals', () => {
  const goals = [
    goal('long1', { horizon: 'long' }),
    goal('short-late', { target_date: '2026-06-01' }),
    goal('short-soon', { target_date: '2026-02-01' }),
    goal('short-nodate'),
    goal('done', { status: 'achieved', updated_at: '2026-01-05T00:00:00Z' }),
    goal('dropped', { status: 'abandoned', updated_at: '2026-01-09T00:00:00Z' }),
  ]

  it('regroupe les objectifs en cours par horizon, groupes vides omis', () => {
    const { active } = groupGoals(goals)
    expect(active.map((g) => g.horizon)).toEqual(['short', 'long'])
  })

  it('trie par échéance, sans échéance en dernier', () => {
    const short = groupGoals(goals).active[0]!.goals.map((g) => g.id)
    expect(short).toEqual(['short-soon', 'short-late', 'short-nodate'])
  })

  it('met les objectifs atteints ou abandonnés à part, plus récents d’abord', () => {
    expect(groupGoals(goals).closed.map((g) => g.id)).toEqual(['dropped', 'done'])
  })
})

describe('progression avec todos liées', () => {
  it('compte les todos liées non récurrentes', () => {
    const p = goalProgress(
      [ms('a', 'g', true)],
      [
        { id: 't1', title: 'Inscription', done: true, recurrence: null },
        { id: 't2', title: 'Chaussures', done: false, recurrence: null },
        { id: 't3', title: 'Footing', done: true, recurrence: 'weekly:1' },
      ],
    )
    expect(p).toEqual({ done: 2, total: 3, ratio: 2 / 3 })
  })

  it('prochain jalon dans l’ordre manuel', () => {
    const all = [ms('c', 'g', false, 2), ms('a', 'g', true, 0), ms('b', 'g', false, 1)]
    expect(nextMilestone(all, 'g')?.id).toBe('b')
    expect(nextMilestone([ms('a', 'g', true)], 'g')).toBeUndefined()
  })
})
