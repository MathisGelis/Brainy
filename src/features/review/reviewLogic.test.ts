import type { Expense } from '@/features/budget/types'
import type { Habit } from '@/features/habits/types'
import type { Todo } from '@/features/todos/types'
import { defaultReviewWeek, summarizeWeek } from './reviewLogic'

const todo = (id: string, extra: Partial<Todo>): Todo => ({
  id,
  list_id: null,
  goal_id: null,
  title: id,
  done: false,
  done_at: null,
  due_date: null,
  priority: 'normal',
  recurrence: null,
  position: 0,
  created_at: '',
  ...extra,
})
const habit = (id: string, extra: Partial<Habit> = {}): Habit => ({
  id,
  name: id,
  target_per_week: 7,
  days: null,
  goal_amount: null,
  unit: null,
  goal_id: null,
  archived: false,
  position: 0,
  created_at: '',
  ...extra,
})
const expense = (cents: number, day: string, category: string | null): Expense => ({
  id: `${cents}-${day}`,
  category_id: category,
  amount_cents: cents,
  spent_on: day,
  note: null,
  recurring_id: null,
  created_at: '',
})

// Semaine du lundi 5 au dimanche 11 octobre 2026, revue le dimanche
const base = {
  monday: '2026-10-05',
  today: '2026-10-11',
  todos: [] as Todo[],
  habits: [] as Habit[],
  entries: new Map(),
  offDays: new Set<string>(),
  expenses: [] as Expense[],
  categories: [
    {
      id: 'c1',
      name: 'Courses',
      color: null,
      monthly_budget_cents: null,
      position: 0,
      archived: false,
    },
    {
      id: 'c2',
      name: 'Restaurants',
      color: null,
      monthly_budget_cents: null,
      position: 1,
      archived: false,
    },
  ],
  milestones: [],
  goals: [],
}

describe('defaultReviewWeek', () => {
  it('semaine en cours à partir du vendredi, précédente sinon', () => {
    expect(defaultReviewWeek('2026-10-11')).toBe('2026-10-05') // dimanche
    expect(defaultReviewWeek('2026-10-09')).toBe('2026-10-05') // vendredi
    expect(defaultReviewWeek('2026-10-12')).toBe('2026-10-05') // lundi suivant
  })
})

describe('summarizeWeek', () => {
  it('todos terminées dans la semaine (heure de Paris) et retards', () => {
    const r = summarizeWeek({
      ...base,
      todos: [
        todo('dans', { done: true, done_at: '2026-10-07T09:00:00Z' }),
        todo('dimanche soir', { done: true, done_at: '2026-10-11T21:30:00Z' }), // 23 h 30 à Paris
        todo('lundi 0 h 30', { done: true, done_at: '2026-10-11T22:30:00Z' }), // déjà lundi à Paris
        todo('avant', { done: true, done_at: '2026-10-01T09:00:00Z' }),
        todo('en retard', { due_date: '2026-10-08' }),
      ],
    })
    expect(r.todosDone.map((t) => t.title)).toEqual(['dans', 'dimanche soir'])
    expect(r.overdue).toBe(1)
  })

  it('habitudes : objectif réel de la semaine (jours prévus, jours off)', () => {
    const r = summarizeWeek({
      ...base,
      habits: [
        habit('quotidienne'),
        habit('2/sem', { target_per_week: 2 }),
        habit('lun-mer', { days: [1, 3] }),
      ],
      entries: new Map([
        [
          'quotidienne',
          new Map([
            ['2026-10-05', null],
            ['2026-10-06', null],
          ]),
        ],
        [
          '2/sem',
          new Map([
            ['2026-10-07', null],
            ['2026-10-08', null],
          ]),
        ],
        ['lun-mer', new Map([['2026-10-05', null]])],
      ]),
      offDays: new Set(['2026-10-10', '2026-10-11']),
    })
    const byName = Object.fromEntries(r.habits.map((h) => [h.name, `${h.done}/${h.expected}`]))
    expect(byName).toEqual({ quotidienne: '2/5', '2/sem': '2/2', 'lun-mer': '1/2' })
    expect(r.habitRate).toBeCloseTo((2 / 5 + 1 + 1 / 2) / 3)
  })

  it('dépenses de la semaine et principales catégories', () => {
    const r = summarizeWeek({
      ...base,
      expenses: [
        expense(3000, '2026-10-06', 'c1'),
        expense(4500, '2026-10-09', 'c2'),
        expense(1000, '2026-10-10', 'c1'),
        expense(9999, '2026-10-12', 'c1'), // hors semaine
      ],
    })
    expect(r.spent).toBe(8500)
    expect(r.topCategories).toEqual([
      { name: 'Restaurants', cents: 4500 },
      { name: 'Courses', cents: 4000 },
    ])
  })

  it('jalons atteints dans la semaine', () => {
    const r = summarizeWeek({
      ...base,
      goals: [
        {
          id: 'g1',
          title: 'Semi',
          description: null,
          horizon: 'medium',
          target_date: null,
          status: 'active',
          created_at: '',
          updated_at: '',
        },
      ],
      milestones: [
        {
          id: 'm1',
          goal_id: 'g1',
          title: '15 km',
          done: true,
          done_at: '2026-10-08T10:00:00Z',
          position: 0,
          created_at: '',
        },
        {
          id: 'm2',
          goal_id: 'g1',
          title: '10 km',
          done: true,
          done_at: '2026-09-20T10:00:00Z',
          position: 0,
          created_at: '',
        },
      ],
    })
    expect(r.milestonesDone).toEqual([{ id: 'm1', title: '15 km', goal: 'Semi' }])
  })
})
