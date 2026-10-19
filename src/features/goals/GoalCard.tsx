import { useState, type FormEvent } from 'react'
import { Checkbox, ProgressBar, Select } from '@/components/ui'
import { celebrate } from '@/lib/celebrate'
import { formatDayMonth } from '@/lib/dates'
import { formatCents } from '@/lib/money'
import { HORIZONS, STATUSES, goalProgress } from './goalLogic'
import type { Goal, GoalPatch, LinkedTodo, Milestone, MilestonePatch } from './types'

/** Todos, habitudes et cagnottes liées à l'objectif, et celles qu'on peut lier */
export type GoalLinks = {
  todos: LinkedTodo[]
  habits: { id: string; name: string; rate: number }[]
  savings: { id: string; name: string; balance: number; target: number }[]
  availableTodos: { id: string; title: string }[]
  availableHabits: { id: string; name: string }[]
  availableSavings: { id: string; name: string }[]
}

type Props = {
  goal: Goal
  milestones: Milestone[]
  links: GoalLinks
  onUpdate: (id: string, patch: GoalPatch) => void
  onDelete: (goal: Goal) => void
  onAddMilestone: (goalId: string, title: string) => void
  onUpdateMilestone: (id: string, patch: MilestonePatch) => void
  onDeleteMilestone: (id: string) => void
  onToggleTodo: (todoId: string, done: boolean) => void
  onLinkTodo: (todoId: string, goalId: string | null) => void
  onLinkHabit: (habitId: string, goalId: string | null) => void
  onLinkSavings: (savingsId: string, goalId: string | null) => void
}

const unlink =
  'min-h-11 rounded-full px-3 text-xs text-muted transition-colors hover:text-danger md:min-h-9'

const field = 'field min-h-11 px-3 md:min-h-10'

function MilestoneRow({
  milestone,
  onUpdate,
  onDelete,
}: {
  milestone: Milestone
  onUpdate: (id: string, patch: MilestonePatch) => void
  onDelete: (id: string) => void
}) {
  return (
    <li className="flex items-center gap-1">
      <Checkbox
        hideLabel
        label={`Jalon « ${milestone.title} » fait`}
        checked={milestone.done}
        onChange={() => {
          if (!milestone.done) celebrate(0.6)
          onUpdate(milestone.id, {
            done: !milestone.done,
            done_at: milestone.done ? null : new Date().toISOString(),
          })
        }}
      />
      <input
        key={milestone.title}
        defaultValue={milestone.title}
        aria-label="Titre du jalon"
        onBlur={(e) => {
          const title = e.target.value.trim()
          if (title && title !== milestone.title) onUpdate(milestone.id, { title })
          else e.target.value = milestone.title
        }}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        className={`min-h-11 min-w-0 flex-1 rounded-xl border border-transparent bg-transparent px-2 hover:border-[var(--field-border)] md:min-h-9 ${
          milestone.done ? 'text-muted line-through' : ''
        }`}
      />
      <button
        type="button"
        onClick={() => onDelete(milestone.id)}
        aria-label={`Supprimer le jalon « ${milestone.title} »`}
        className="min-h-11 min-w-11 rounded-full text-muted transition-colors hover:text-danger md:min-h-9 md:min-w-9"
      >
        ×
      </button>
    </li>
  )
}

export function GoalCard({
  goal,
  milestones,
  links,
  onUpdate,
  onDelete,
  onAddMilestone,
  onUpdateMilestone,
  onDeleteMilestone,
  onToggleTodo,
  onLinkTodo,
  onLinkHabit,
  onLinkSavings,
}: Props) {
  const [open, setOpen] = useState(false)
  const [newMilestone, setNewMilestone] = useState('')
  const progress = goalProgress(milestones, links.todos)
  const steps = links.todos.some((t) => !t.recurrence) ? 'étapes' : 'jalons'
  const percent = Math.round(progress.ratio * 100)

  function addMilestone(e: FormEvent) {
    e.preventDefault()
    const title = newMilestone.trim()
    if (!title) return
    onAddMilestone(goal.id, title)
    setNewMilestone('')
  }

  return (
    <li className="card p-4">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full min-h-11 flex-col gap-2.5 text-left"
      >
        <span className="flex w-full items-baseline justify-between gap-2">
          <span className={`font-semibold ${goal.status !== 'active' ? 'text-muted' : ''}`}>
            {goal.title}
          </span>
          {goal.target_date && (
            <span className="shrink-0 text-xs text-muted">{formatDayMonth(goal.target_date)}</span>
          )}
        </span>
        <span className="w-full">
          <ProgressBar
            ratio={progress.ratio}
            over={false}
            label={`Progression de « ${goal.title} »`}
          />
        </span>
        <span className="text-xs text-muted">
          {progress.total === 0
            ? 'Aucun jalon'
            : `${progress.done}/${progress.total} ${steps} · ${percent} %`}
        </span>
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3">
          <input
            defaultValue={goal.title}
            aria-label="Titre de l'objectif"
            onBlur={(e) => {
              const title = e.target.value.trim()
              if (title && title !== goal.title) onUpdate(goal.id, { title })
              else e.target.value = goal.title
            }}
            className={field}
          />
          <textarea
            defaultValue={goal.description ?? ''}
            aria-label="Description"
            placeholder="Description courte (optionnel)"
            rows={2}
            onBlur={(e) => {
              const description = e.target.value.trim() || null
              if (description !== goal.description) onUpdate(goal.id, { description })
            }}
            className={`${field} py-2`}
          />
          <div className="flex flex-wrap gap-2">
            <Select
              label="Horizon"
              value={goal.horizon}
              onChange={(horizon) => onUpdate(goal.id, { horizon })}
              options={HORIZONS}
              className={field}
            />
            <input
              type="date"
              aria-label="Échéance"
              value={goal.target_date ?? ''}
              onChange={(e) => onUpdate(goal.id, { target_date: e.target.value || null })}
              className={field}
            />
            <Select
              label="Statut"
              value={goal.status}
              onChange={(status) => {
                if (status === 'achieved') celebrate(1.5)
                onUpdate(goal.id, { status })
              }}
              options={STATUSES}
              className={field}
            />
          </div>

          <ul className="flex flex-col">
            {milestones.map((m) => (
              <MilestoneRow
                key={m.id}
                milestone={m}
                onUpdate={onUpdateMilestone}
                onDelete={onDeleteMilestone}
              />
            ))}
          </ul>
          <form onSubmit={addMilestone} className="flex gap-2">
            <input
              enterKeyHint="send"
              value={newMilestone}
              onChange={(e) => setNewMilestone(e.target.value)}
              aria-label={`Nouveau jalon pour « ${goal.title} »`}
              placeholder="Ajouter un jalon…"
              className={`${field} min-w-0 flex-1`}
            />
            <button
              type="submit"
              className="min-h-11 rounded-full px-4 font-semibold text-accent transition-colors hover:bg-surface md:min-h-9"
            >
              Ajouter
            </button>
          </form>

          <section aria-label={`Todos liées à « ${goal.title} »`} className="flex flex-col gap-1">
            <h3 className="text-xs font-semibold text-muted uppercase">Todos liées</h3>
            {links.todos.length > 0 && (
              <ul className="flex flex-col">
                {links.todos.map((t) => (
                  <li key={t.id} className="flex items-center gap-1">
                    <Checkbox
                      hideLabel
                      label={`Todo « ${t.title} » faite`}
                      checked={t.done}
                      onChange={() => {
                        if (!t.done) celebrate(0.6)
                        onToggleTodo(t.id, !t.done)
                      }}
                    />
                    <span className={`min-w-0 flex-1 ${t.done ? 'text-muted line-through' : ''}`}>
                      {t.title}
                      {t.recurrence && <span className="text-xs text-muted"> · ↻</span>}
                    </span>
                    <button
                      type="button"
                      onClick={() => onLinkTodo(t.id, null)}
                      aria-label={`Délier la todo « ${t.title} »`}
                      className={unlink}
                    >
                      Délier
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {links.availableTodos.length > 0 && (
              <Select
                label={`Lier une todo à « ${goal.title} »`}
                value=""
                placeholder="Lier une todo…"
                onChange={(id) => onLinkTodo(id, goal.id)}
                options={links.availableTodos.map((t) => ({ value: t.id, label: t.title }))}
                className={`${field} max-w-full self-start`}
              />
            )}
          </section>

          <section
            aria-label={`Habitudes liées à « ${goal.title} »`}
            className="flex flex-col gap-1"
          >
            <h3 className="text-xs font-semibold text-muted uppercase">Habitudes liées</h3>
            {links.habits.length > 0 && (
              <ul className="flex flex-col">
                {links.habits.map((h) => (
                  <li key={h.id} className="flex min-h-11 items-center gap-2">
                    <span className="min-w-0 flex-1">{h.name}</span>
                    <span className="text-xs text-muted">30 j : {Math.round(h.rate * 100)} %</span>
                    <button
                      type="button"
                      onClick={() => onLinkHabit(h.id, null)}
                      aria-label={`Délier l'habitude « ${h.name} »`}
                      className={unlink}
                    >
                      Délier
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {links.availableHabits.length > 0 && (
              <Select
                label={`Lier une habitude à « ${goal.title} »`}
                value=""
                placeholder="Lier une habitude…"
                onChange={(id) => onLinkHabit(id, goal.id)}
                options={links.availableHabits.map((h) => ({ value: h.id, label: h.name }))}
                className={`${field} max-w-full self-start`}
              />
            )}
          </section>

          <section
            aria-label={`Cagnottes liées à « ${goal.title} »`}
            className="flex flex-col gap-1"
          >
            <h3 className="text-xs font-semibold text-muted uppercase">Cagnottes liées</h3>
            {links.savings.length > 0 && (
              <ul className="flex flex-col">
                {links.savings.map((sv) => (
                  <li key={sv.id} className="flex min-h-11 items-center gap-2">
                    <span className="min-w-0 flex-1">{sv.name}</span>
                    <span className="text-xs text-muted">
                      {formatCents(sv.balance)} / {formatCents(sv.target)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onLinkSavings(sv.id, null)}
                      aria-label={`Délier la cagnotte « ${sv.name} »`}
                      className={unlink}
                    >
                      Délier
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {links.availableSavings.length > 0 ? (
              <Select
                label={`Lier une cagnotte à « ${goal.title} »`}
                value=""
                placeholder="Lier une cagnotte…"
                onChange={(id) => onLinkSavings(id, goal.id)}
                options={links.availableSavings.map((sv) => ({ value: sv.id, label: sv.name }))}
                className={`${field} max-w-full self-start`}
              />
            ) : (
              links.savings.length === 0 && (
                <p className="text-xs text-muted">Créez une cagnotte depuis l'onglet Budget.</p>
              )
            )}
          </section>

          <button
            type="button"
            onClick={() => onDelete(goal)}
            className="min-h-11 self-start px-1 text-xs text-muted hover:text-danger"
          >
            Supprimer l'objectif
          </button>
        </div>
      )}
    </li>
  )
}
