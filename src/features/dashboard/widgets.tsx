import { Link } from 'react-router-dom'
import { Checkbox, ProgressBar, useToast } from '@/components/ui'
import { projectMonthEnd } from '@/features/budget/recurringLogic'
import { useBudget } from '@/features/budget/useBudget'
import { useRecurring } from '@/features/budget/useBudgetExtras'
import { goalProgress, milestonesOf, nextMilestone } from '@/features/goals/goalLogic'
import type { Goal, Milestone } from '@/features/goals/types'
import { useGoals } from '@/features/goals/useGoals'
import { RetryLine, rowClass, skeleton } from '@/features/today/parts'
import { useTodos } from '@/features/todos/useTodos'
import { celebrate } from '@/lib/celebrate'
import { monthOf } from '@/lib/dates'
import { formatCents } from '@/lib/money'

/* Cartes reprises de l'ancien accueil : prochains jalons (cochables) et budget du mois. */

export function GoalsWidget({ onError }: { onError: (m: string) => void }) {
  const toast = useToast()
  const { goals, milestones, isLoading, isError, refetch, setMilestoneDone } = useGoals({ onError })
  const { todos } = useTodos({ onError })
  if (isError) return <RetryLine label="les objectifs" onRetry={refetch} />
  if (isLoading) return skeleton

  const items = goals
    .filter((g) => g.status === 'active')
    .map((goal) => ({ goal, next: nextMilestone(milestones, goal.id) }))
    .filter((x): x is { goal: Goal; next: Milestone } => x.next !== undefined)
    .slice(0, 5)

  if (items.length === 0) {
    return (
      <p className="text-muted">
        Aucun jalon à venir.{' '}
        <Link to="/objectifs" className="text-accent">
          Planifier un objectif
        </Link>
      </p>
    )
  }
  return (
    <ul>
      {items.map(({ goal, next }) => {
        const linked = todos
          .filter((t) => t.goal_id === goal.id)
          .map((t) => ({ id: t.id, title: t.title, done: t.done, recurrence: t.recurrence }))
        const percent = Math.round(
          goalProgress(milestonesOf(milestones, goal.id), linked).ratio * 100,
        )
        return (
          <li key={goal.id} className={rowClass}>
            <Checkbox
              hideLabel
              label={`Jalon « ${next.title} » de « ${goal.title} » fait`}
              checked={false}
              onChange={() => {
                setMilestoneDone(next.id, true)
                celebrate(0.8)
                toast.show('Jalon atteint', () => setMilestoneDone(next.id, false))
              }}
            />
            <span className="min-w-0 flex-1">
              {next.title}
              <span className="block truncate text-xs text-muted">{goal.title}</span>
            </span>
            <span className="text-xs text-muted">{percent} %</span>
          </li>
        )
      })}
    </ul>
  )
}

export function MonthBudgetWidget({
  today,
  onError,
}: {
  today: string
  onError: (m: string) => void
}) {
  const { summary, expenses, isLoading, isError, refetch } = useBudget(monthOf(today), { onError })
  const { rules } = useRecurring({ onError })
  if (isError) return <RetryLine label="le budget" onRetry={refetch} />
  if (isLoading) return skeleton
  const { totalSpent, totalBudget, remaining, over } = summary
  const projection = projectMonthEnd(expenses, rules, monthOf(today), today)
  return (
    <div className="flex flex-col gap-2">
      <p>
        <span className="text-[34px] leading-none font-semibold tracking-tight">
          {formatCents(totalSpent)}
        </span>{' '}
        <span className="text-muted">
          {totalBudget > 0 ? `/ ${formatCents(totalBudget)}` : 'dépensés ce mois-ci'}
        </span>
      </p>
      {remaining !== null && (
        <>
          <ProgressBar
            ratio={Math.min(1, totalSpent / totalBudget)}
            over={over}
            label="Budget du mois consommé"
          />
          <p className={`text-xs ${over ? 'text-danger' : 'text-muted'}`}>
            {over ? `Dépassement de ${formatCents(-remaining)}` : `Reste ${formatCents(remaining)}`}
          </p>
        </>
      )}
      {projection !== null && (
        <p
          className={`text-xs ${totalBudget > 0 && projection > totalBudget ? 'text-danger' : 'text-muted'}`}
        >
          À ce rythme : {formatCents(projection)} en fin de mois
        </p>
      )}
    </div>
  )
}
