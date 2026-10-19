import type { Todo } from '@/features/todos/types'
import {
  dayLoad,
  isPlanningTime,
  overdueTodos,
  planningMonday,
  toSchedule,
  weekDays,
} from './planningLogic'

const todo = (over: Partial<Todo>): Todo => ({
  id: 't',
  list_id: null,
  goal_id: null,
  recurrence: null,
  focus_on: null,
  focus_week: null,
  title: 'T',
  done: false,
  done_at: null,
  due_date: null,
  priority: 'normal',
  position: 0,
  created_at: '',
  ...over,
})

const ids = (todos: Todo[]) => todos.map((t) => t.id)

describe('planningLogic', () => {
  it('planifie la semaine suivante à partir du vendredi, sinon la semaine en cours', () => {
    expect(planningMonday('2026-10-14')).toBe('2026-10-12') // mercredi
    expect(planningMonday('2026-10-12')).toBe('2026-10-12') // lundi
    expect(planningMonday('2026-10-16')).toBe('2026-10-19') // vendredi
    expect(planningMonday('2026-10-18')).toBe('2026-10-19') // dimanche
  })

  it('propose de planifier du vendredi au lundi', () => {
    expect(['2026-10-12', '2026-10-14', '2026-10-16', '2026-10-18'].map(isPlanningTime)).toEqual([
      true,
      false,
      true,
      true,
    ])
  })

  it('liste les todos en retard, les plus anciennes d’abord', () => {
    const todos = [
      todo({ id: 'a', due_date: '2026-10-10' }),
      todo({ id: 'b', due_date: '2026-10-02' }),
      todo({ id: 'c', due_date: '2026-10-14' }),
      todo({ id: 'd', due_date: '2026-10-01', done: true }),
    ]
    expect(ids(overdueTodos(todos, '2026-10-14'))).toEqual(['b', 'a'])
  })

  it('répartit d’abord les priorités de la semaine sans date', () => {
    const todos = [
      todo({ id: 'a', position: 0 }),
      todo({ id: 'b', position: 1, focus_week: '2026-10-19' }),
      todo({ id: 'c', position: 2, due_date: '2026-10-20' }),
      todo({ id: 'd', position: 3, done: true }),
      todo({ id: 'e', position: 4, focus_week: '2026-10-12' }),
    ]
    expect(ids(toSchedule(todos, '2026-10-19'))).toEqual(['b', 'a', 'e'])
  })

  it('compte les todos ouvertes prévues chaque jour', () => {
    const days = weekDays('2026-10-19')
    expect(days).toHaveLength(7)
    const load = dayLoad(
      [
        todo({ id: 'a', due_date: '2026-10-19' }),
        todo({ id: 'b', due_date: '2026-10-19' }),
        todo({ id: 'c', due_date: '2026-10-19', done: true }),
        todo({ id: 'd', due_date: '2026-10-25' }),
        todo({ id: 'e', due_date: '2026-10-26' }),
      ],
      days,
    )
    expect(load.get('2026-10-19')).toBe(2)
    expect(load.get('2026-10-25')).toBe(1)
    expect(load.get('2026-10-21')).toBe(0)
  })
})
