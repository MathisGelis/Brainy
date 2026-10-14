import type { Habit } from '@/features/habits/types'
import type { Todo } from '@/features/todos/types'
import { formatCents } from '@/lib/money'
import { describeDay, monthGrid, moveDay, summarizeDays } from './calendarLogic'

const todo = (over: Partial<Todo>): Todo => ({
  id: 't',
  list_id: null,
  goal_id: null,
  recurrence: null,
  focus_on: null,
  title: 'T',
  done: false,
  done_at: null,
  due_date: null,
  priority: 'normal',
  position: 0,
  created_at: '',
  ...over,
})

const habit: Habit = {
  id: 'h1',
  name: 'Lecture',
  target_per_week: 7,
  days: null,
  goal_amount: null,
  unit: null,
  goal_id: null,
  archived: false,
  position: 0,
  created_at: '',
}

describe('monthGrid', () => {
  it('commence un lundi, finit un dimanche et couvre tout le mois', () => {
    const days = monthGrid('2026-10') // 1er octobre 2026 : jeudi
    expect(days[0]).toBe('2026-09-28')
    expect(days.at(-1)).toBe('2026-11-01')
    expect(days).toHaveLength(35)
    expect(days).toContain('2026-10-31')
  })

  it('gère un mois de 6 semaines', () => {
    const days = monthGrid('2026-08') // 1er août 2026 : samedi, 31 jours
    expect(days[0]).toBe('2026-07-27')
    expect(days).toHaveLength(42)
  })
})

describe('summarizeDays', () => {
  it('compte todos, habitudes, dépenses, jalons, échéances et humeur', () => {
    const days = ['2026-10-13', '2026-10-14']
    const map = summarizeDays(days, {
      todos: [
        todo({ id: 'a', due_date: '2026-10-14' }),
        todo({ id: 'b', due_date: '2026-10-14' }),
        todo({ id: 'c', due_date: '2026-10-14', done: true, done_at: '2026-10-13T09:00:00Z' }),
      ],
      habits: [habit, { ...habit, id: 'h2', archived: true }],
      entries: new Map([
        ['h1', new Map([['2026-10-13', null]])],
        ['h2', new Map([['2026-10-13', null]])],
      ]),
      expenses: [
        {
          id: 'e1',
          category_id: null,
          amount_cents: 1250,
          spent_on: '2026-10-14',
          note: null,
          recurring_id: null,
          created_at: '',
        },
        {
          id: 'e2',
          category_id: null,
          amount_cents: 750,
          spent_on: '2026-10-14',
          note: null,
          recurring_id: null,
          created_at: '',
        },
      ],
      milestones: [
        {
          id: 'm1',
          goal_id: 'g1',
          title: '10 km',
          done: true,
          done_at: '2026-10-14T18:00:00Z',
          position: 0,
          created_at: '',
        },
      ],
      goals: [
        {
          id: 'g1',
          title: 'Semi',
          description: null,
          horizon: 'medium',
          target_date: '2026-10-13',
          status: 'active',
          created_at: '',
          updated_at: '',
        },
      ],
      checkins: [{ day: '2026-10-14', mood: 4, energy: null, win: 'Semi bouclé' }],
    })
    expect(map.get('2026-10-13')).toMatchObject({
      todosOpen: 0,
      todosDone: 1,
      habitsDone: 1,
      goalsDue: 1,
      mood: null,
    })
    expect(map.get('2026-10-14')).toMatchObject({
      todosOpen: 2,
      spent: 2000,
      milestones: 1,
      mood: 4,
    })
    expect(describeDay(map.get('2026-10-14')!, formatCents)).toMatch(
      /^2 todos à faire, 20,00\s€ dépensés, 1 jalon atteint, humeur 4 sur 5, victoire notée$/,
    )
  })
})

describe('moveDay', () => {
  it('suit les flèches et Début/Fin de semaine', () => {
    expect(moveDay('2026-10-14', 'ArrowRight')).toBe('2026-10-15')
    expect(moveDay('2026-10-14', 'ArrowUp')).toBe('2026-10-07')
    expect(moveDay('2026-10-31', 'ArrowDown')).toBe('2026-11-07')
    expect(moveDay('2026-10-14', 'Home')).toBe('2026-10-12')
    expect(moveDay('2026-10-14', 'End')).toBe('2026-10-18')
    expect(moveDay('2026-10-14', 'a')).toBeNull()
  })
})
