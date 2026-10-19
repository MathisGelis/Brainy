import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button, Select, useToast } from '@/components/ui'
import { PageHeader } from '@/components/ui/PageHeader'
import { useGoals } from '@/features/goals/useGoals'
import { formatDayMonth, formatWeekdayShort, lastNDays, todayISO } from '@/lib/dates'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { FrequencyPicker } from './FrequencyPicker'
import { HabitStats } from './HabitWeekRow'
import { Heatmap } from './Heatmap'
import { useDaysOff, useHabits } from './useHabits'

const field = 'field min-h-11 px-3 md:min-h-10'

export default function HabitDetailPage() {
  const { habitId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const onError = (m: string) => toast.show(m)
  const { habits, entries, isLoading, updateHabit, toggleDay, setAmount, deleteHabit } = useHabits({
    onError,
  })
  const { offDays } = useDaysOff({ onError })
  const { goals } = useGoals({ onError })
  const habit = habits.find((h) => h.id === habitId)
  const today = todayISO()
  useDocumentTitle(habit?.name ?? 'Habitudes')

  if (isLoading) return <div aria-hidden className="h-24 animate-pulse rounded-2xl bg-surface" />
  if (!habit) {
    return (
      <>
        <PageHeader title="Habitude introuvable" />
        <Link to="/habitudes" className="text-accent">
          ← Retour aux habitudes
        </Link>
      </>
    )
  }

  const habitEntries = entries.get(habit.id) ?? new Map<string, number | null>()
  const goalOptions = goals.filter((g) => g.status === 'active' || g.id === habit.goal_id)

  async function onDelete() {
    if (!habit) return
    try {
      const undo = await deleteHabit(habit)
      navigate('/habitudes')
      toast.show(`Habitude « ${habit.name} » supprimée`, undo)
    } catch {
      toast.show('La suppression a échoué. Réessayez.')
    }
  }

  return (
    <>
      <Link
        to="/habitudes"
        className="mb-2 inline-flex min-h-11 items-center text-muted hover:text-text"
      >
        ← Habitudes
      </Link>
      <h1 className="mb-4">
        <input
          key={habit.name}
          defaultValue={habit.name}
          aria-label="Nom de l'habitude"
          onBlur={(e) => {
            const name = e.target.value.trim()
            if (name && name !== habit.name) updateHabit(habit.id, { name })
            else e.target.value = habit.name
          }}
          className="w-full rounded-xl border border-transparent bg-transparent px-1 text-[28px] leading-tight font-semibold tracking-tight hover:border-[var(--field-border)] md:text-[34px]"
        />
      </h1>

      <div className="mb-4 flex flex-col gap-3">
        <FrequencyPicker value={habit} onChange={(frequency) => updateHabit(habit.id, frequency)} />
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-muted">
            Objectif par jour
            <input
              key={`goal-${habit.goal_amount}`}
              type="number"
              min={1}
              defaultValue={habit.goal_amount ?? ''}
              placeholder="—"
              aria-label="Objectif chiffré par jour"
              onBlur={(e) => {
                const value = e.target.value === '' ? null : Math.round(Number(e.target.value))
                const next = value && value > 0 ? value : null
                if (next !== habit.goal_amount) updateHabit(habit.id, { goal_amount: next })
              }}
              className={`${field} w-24 text-text`}
            />
          </label>
          <input
            key={`unit-${habit.unit}`}
            defaultValue={habit.unit ?? ''}
            placeholder="unité (verres, min…)"
            aria-label="Unité"
            onBlur={(e) => {
              const unit = e.target.value.trim() || null
              if (unit !== habit.unit) updateHabit(habit.id, { unit })
            }}
            className={`${field} w-40`}
          />
          <Select
            label="Objectif lié"
            value={habit.goal_id ?? ''}
            onChange={(v) => updateHabit(habit.id, { goal_id: v || null })}
            options={[
              { value: '', label: 'Aucun objectif lié' },
              ...goalOptions.map((g) => ({ value: g.id, label: g.title })),
            ]}
            className={`${field} max-w-full`}
          />
        </div>
        <HabitStats habit={habit} entries={habitEntries} offDays={offDays} today={today} />
      </div>

      {habit.goal_amount && (
        <section aria-labelledby="entries-title" className="card mb-4 p-4">
          <h2 id="entries-title" className="mb-2 text-xs font-semibold text-muted uppercase">
            Saisies des 7 derniers jours
          </h2>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {lastNDays(today, 7)
              .reverse()
              .map((day) => (
                <li key={day} className="flex items-center gap-2">
                  <label htmlFor={`amount-${day}`} className="w-20 text-xs text-muted">
                    {formatWeekdayShort(day)} {formatDayMonth(day)}
                  </label>
                  <input
                    id={`amount-${day}`}
                    key={`${day}-${habitEntries.get(day) ?? ''}`}
                    type="number"
                    min={0}
                    defaultValue={
                      habitEntries.get(day) ??
                      (habitEntries.has(day) ? habit.goal_amount : '') ??
                      ''
                    }
                    placeholder="0"
                    onBlur={(e) => {
                      const value =
                        e.target.value === '' ? 0 : Math.max(0, Math.round(Number(e.target.value)))
                      const current = habitEntries.has(day)
                        ? (habitEntries.get(day) ?? habit.goal_amount)
                        : 0
                      if (value !== current) setAmount(habit, day, value)
                    }}
                    className={`${field} w-20`}
                  />
                </li>
              ))}
          </ul>
        </section>
      )}

      <Heatmap
        schedule={habit}
        entries={habitEntries}
        offDays={offDays}
        today={today}
        onToggle={(day) => toggleDay(habit, day)}
      />
      <div className="mt-8 flex flex-wrap gap-2">
        <Button
          variant="ghost"
          onClick={() => {
            updateHabit(habit.id, { archived: true })
            toast.show('Habitude archivée', () => updateHabit(habit.id, { archived: false }))
            navigate('/habitudes')
          }}
        >
          Archiver
        </Button>
        <button
          type="button"
          onClick={() => void onDelete()}
          className="min-h-11 rounded-full px-4 text-muted transition-colors hover:text-danger md:min-h-10"
        >
          Supprimer définitivement
        </button>
      </div>
    </>
  )
}
