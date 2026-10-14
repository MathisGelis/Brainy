import { useState, type FormEvent } from 'react'
import { Button, useToast } from '@/components/ui'
import { PageHeader } from '@/components/ui/PageHeader'
import { successRate30 } from '@/features/habits/habitLogic'
import { useDaysOff, useHabits } from '@/features/habits/useHabits'
import { useTodos } from '@/features/todos/useTodos'
import { todayISO } from '@/lib/dates'
import { GoalCard, type GoalLinks } from './GoalCard'
import { HORIZONS, groupGoals, milestonesOf } from './goalLogic'
import type { Goal, Horizon } from './types'
import { useGoals } from './useGoals'

export default function GoalsPage() {
  const toast = useToast()
  const onError = (m: string) => toast.show(m)
  const g = useGoals({ onError })
  const { todos, updateTodo, completeTodo, setDone } = useTodos({ onError })
  const { habits, entries, updateHabit } = useHabits({ onError })
  const { offDays } = useDaysOff({ onError })
  const today = todayISO()

  const linksOf = (goalId: string): GoalLinks => ({
    todos: todos
      .filter((t) => t.goal_id === goalId)
      .map((t) => ({ id: t.id, title: t.title, done: t.done, recurrence: t.recurrence })),
    habits: habits
      .filter((h) => h.goal_id === goalId && !h.archived)
      .map((h) => ({
        id: h.id,
        name: h.name,
        rate: successRate30(h, entries.get(h.id) ?? new Map(), today, offDays),
      })),
    availableTodos: todos
      .filter((t) => !t.done && !t.goal_id)
      .map((t) => ({ id: t.id, title: t.title })),
    availableHabits: habits
      .filter((h) => !h.archived && !h.goal_id)
      .map((h) => ({ id: h.id, name: h.name })),
  })

  function onToggleTodo(todoId: string, done: boolean) {
    const todo = todos.find((t) => t.id === todoId)
    if (!todo) return
    if (done) toast.show('Todo terminée', completeTodo(todo))
    else setDone(todoId, false)
  }
  const [title, setTitle] = useState('')
  const [horizon, setHorizon] = useState<Horizon>('short')
  const [targetDate, setTargetDate] = useState('')
  const [showClosed, setShowClosed] = useState(false)

  const { active, closed } = groupGoals(g.goals)

  function submit(e: FormEvent) {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    g.addGoal({ title: trimmed, horizon, target_date: targetDate || null })
    setTitle('')
    setTargetDate('')
  }

  function onDelete(goal: Goal) {
    const goalMilestones = milestonesOf(g.milestones, goal.id)
    g.deleteGoal(goal.id)
    toast.show('Objectif supprimé', () => g.restoreGoal(goal, goalMilestones))
  }

  const renderCard = (goal: Goal) => (
    <GoalCard
      key={goal.id}
      goal={goal}
      milestones={milestonesOf(g.milestones, goal.id)}
      links={linksOf(goal.id)}
      onToggleTodo={onToggleTodo}
      onLinkTodo={(todoId, goalId) => updateTodo(todoId, { goal_id: goalId })}
      onLinkHabit={(habitId, goalId) => updateHabit(habitId, { goal_id: goalId })}
      onUpdate={g.updateGoal}
      onDelete={onDelete}
      onAddMilestone={g.addMilestone}
      onUpdateMilestone={g.updateMilestone}
      onDeleteMilestone={g.deleteMilestone}
    />
  )

  const field = 'field min-h-11 px-3 md:min-h-10'

  return (
    <>
      <PageHeader title="Objectifs" />
      <form onSubmit={submit} className="mb-6 flex flex-wrap items-center gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="Nouvel objectif"
          placeholder="Ajouter un objectif…"
          className={`${field} min-w-0 flex-1 basis-48 px-4`}
        />
        <select
          aria-label="Horizon"
          value={horizon}
          onChange={(e) => setHorizon(e.target.value as Horizon)}
          className={field}
        >
          {HORIZONS.map((h) => (
            <option key={h.value} value={h.value}>
              {h.label}
            </option>
          ))}
        </select>
        <input
          type="date"
          aria-label="Échéance (optionnel)"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          className={`${field} text-muted`}
        />
        <Button type="submit">Ajouter</Button>
      </form>

      {g.isError ? (
        <p role="alert" className="text-danger">
          Impossible de charger les objectifs.{' '}
          <button
            type="button"
            onClick={() => void g.refetch()}
            className="min-h-11 font-semibold underline"
          >
            Réessayer
          </button>
        </p>
      ) : g.isLoading ? (
        <div aria-hidden className="h-24 animate-pulse rounded-2xl bg-surface" />
      ) : active.length === 0 ? (
        <p className="text-muted">Aucun objectif en cours. Tapez un titre ci-dessus puis Entrée.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {active.map((group) => (
            <section key={group.horizon} aria-label={group.label}>
              <h2 className="mb-2 text-xs font-semibold text-muted uppercase">{group.label}</h2>
              <ul className="flex flex-col gap-3">{group.goals.map(renderCard)}</ul>
            </section>
          ))}
        </div>
      )}

      {closed.length > 0 && (
        <section className="mt-8">
          <button
            type="button"
            aria-expanded={showClosed}
            onClick={() => setShowClosed((v) => !v)}
            className="min-h-11 text-muted hover:text-text"
          >
            Atteints ou abandonnés ({closed.length})
          </button>
          {showClosed && <ul className="mt-2 flex flex-col gap-3">{closed.map(renderCard)}</ul>}
        </section>
      )}
    </>
  )
}
