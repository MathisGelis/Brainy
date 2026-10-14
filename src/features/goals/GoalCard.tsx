import { useState, type FormEvent } from 'react'
import { Checkbox, ProgressBar } from '@/components/ui'
import { celebrate } from '@/lib/celebrate'
import { formatDayMonth } from '@/lib/dates'
import { HORIZONS, STATUSES, goalProgress } from './goalLogic'
import type { Goal, GoalPatch, GoalStatus, Horizon, Milestone, MilestonePatch } from './types'

type Props = {
  goal: Goal
  milestones: Milestone[]
  onUpdate: (id: string, patch: GoalPatch) => void
  onDelete: (goal: Goal) => void
  onAddMilestone: (goalId: string, title: string) => void
  onUpdateMilestone: (id: string, patch: MilestonePatch) => void
  onDeleteMilestone: (id: string) => void
}

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
          onUpdate(milestone.id, { done: !milestone.done })
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
  onUpdate,
  onDelete,
  onAddMilestone,
  onUpdateMilestone,
  onDeleteMilestone,
}: Props) {
  const [open, setOpen] = useState(false)
  const [newMilestone, setNewMilestone] = useState('')
  const progress = goalProgress(milestones)
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
            : `${progress.done}/${progress.total} jalons · ${percent} %`}
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
            <select
              aria-label="Horizon"
              value={goal.horizon}
              onChange={(e) => onUpdate(goal.id, { horizon: e.target.value as Horizon })}
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
              aria-label="Échéance"
              value={goal.target_date ?? ''}
              onChange={(e) => onUpdate(goal.id, { target_date: e.target.value || null })}
              className={field}
            />
            <select
              aria-label="Statut"
              value={goal.status}
              onChange={(e) => {
                const status = e.target.value as GoalStatus
                if (status === 'achieved') celebrate(1.5)
                onUpdate(goal.id, { status })
              }}
              className={field}
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
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
