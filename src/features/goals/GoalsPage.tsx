import { useState, type FormEvent } from 'react'
import { Button, useToast } from '@/components/ui'
import { PageHeader } from '@/components/ui/PageHeader'
import { GoalCard } from './GoalCard'
import { HORIZONS, groupGoals, milestonesOf } from './goalLogic'
import type { Goal, Horizon } from './types'
import { useGoals } from './useGoals'

export default function GoalsPage() {
  const toast = useToast()
  const g = useGoals({ onError: (m) => toast.show(m) })
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
      onUpdate={g.updateGoal}
      onDelete={onDelete}
      onAddMilestone={g.addMilestone}
      onUpdateMilestone={g.updateMilestone}
      onDeleteMilestone={g.deleteMilestone}
    />
  )

  const field = 'min-h-11 rounded border border-border bg-bg px-2 text-text md:min-h-9'

  return (
    <>
      <PageHeader title="Objectifs" />
      <form onSubmit={submit} className="mb-6 flex flex-wrap items-center gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="Nouvel objectif"
          placeholder="Ajouter un objectif…"
          className={`${field} min-w-0 flex-1 basis-60 px-3 placeholder:text-muted`}
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
        <div aria-hidden className="h-24 animate-pulse rounded bg-surface" />
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
