import { useState, type FormEvent } from 'react'
import { Button, useToast } from '@/components/ui'
import { PageHeader } from '@/components/ui/PageHeader'
import { celebrate } from '@/lib/celebrate'
import { lastNDays, todayISO } from '@/lib/dates'
import { DaysOffManager } from './DaysOffManager'
import { FrequencyPicker } from './FrequencyPicker'
import { HabitWeekRow } from './HabitWeekRow'
import { isDayDone, parseHabitGoal } from './habitLogic'
import type { Habit } from './types'
import { useDaysOff, useHabits } from './useHabits'

export default function HabitsPage() {
  const toast = useToast()
  const onError = (m: string) => toast.show(m)
  const { habits, entries, isLoading, isError, refetch, addHabit, updateHabit, toggleDay } =
    useHabits({ onError })
  const { daysOff, offDays, addPeriod, removeDays, toggleDay: toggleOff } = useDaysOff({ onError })
  const [name, setName] = useState('')
  const [frequency, setFrequency] = useState<Pick<Habit, 'target_per_week' | 'days'>>({
    target_per_week: 7,
    days: null,
  })
  const [showArchived, setShowArchived] = useState(false)

  const today = todayISO()
  const week = lastNDays(today, 7)
  const active = habits.filter((h) => !h.archived)
  const archived = habits.filter((h) => h.archived)
  const goal = parseHabitGoal(name)

  function submit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    // « Boire 8 verres d'eau » : objectif chiffré lu dans le nom (modifiable ensuite)
    addHabit({
      name: trimmed,
      ...frequency,
      goal_amount: goal?.goal_amount ?? null,
      unit: goal?.unit ?? null,
    })
    setName('')
  }

  function onToggle(habit: Habit, day: string) {
    if (!isDayDone(habit, entries.get(habit.id) ?? new Map(), day)) celebrate()
    toggleDay(habit, day)
  }

  const todayOff = offDays.has(today)

  return (
    <>
      <PageHeader title="Habitudes" />
      <form onSubmit={submit} className="mb-4 flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Nouvelle habitude"
            aria-describedby="habit-hint"
            placeholder="Ajouter une habitude… (« Boire 8 verres d'eau »)"
            className="field min-h-11 min-w-0 flex-1 basis-60 px-4 md:min-h-10"
          />
          <Button type="submit">Ajouter</Button>
        </div>
        <FrequencyPicker value={frequency} onChange={setFrequency} />
        <p id="habit-hint" aria-live="polite" className="min-h-5 text-xs text-muted">
          {goal && `Objectif chiffré : ${goal.goal_amount} ${goal.unit} par jour`}
        </p>
      </form>

      <div className="mb-4 flex items-center justify-end">
        <button
          type="button"
          aria-pressed={todayOff}
          onClick={() => toggleOff(today)}
          className="pill min-h-9 border border-[var(--field-border)] px-3 text-xs"
        >
          {todayOff ? "Aujourd'hui : jour off" : "Marquer aujourd'hui comme jour off"}
        </button>
      </div>

      {isError ? (
        <p role="alert" className="text-danger">
          Impossible de charger les habitudes.{' '}
          <button
            type="button"
            onClick={() => void refetch()}
            className="min-h-11 font-semibold underline"
          >
            Réessayer
          </button>
        </p>
      ) : isLoading ? (
        <div aria-hidden className="h-24 animate-pulse rounded-2xl bg-surface" />
      ) : active.length === 0 ? (
        <p className="text-muted">Aucune habitude. Tapez un nom ci-dessus puis Entrée.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {active.map((habit) => (
            <HabitWeekRow
              key={habit.id}
              habit={habit}
              entries={entries.get(habit.id) ?? new Map()}
              offDays={offDays}
              week={week}
              today={today}
              onToggle={onToggle}
            />
          ))}
        </ul>
      )}

      <DaysOffManager daysOff={daysOff} onAddPeriod={addPeriod} onRemove={removeDays} />

      {archived.length > 0 && (
        <section className="mt-4">
          <button
            type="button"
            aria-expanded={showArchived}
            onClick={() => setShowArchived((v) => !v)}
            className="min-h-11 text-muted hover:text-text"
          >
            Archivées ({archived.length})
          </button>
          {showArchived && (
            <ul className="mt-2 flex flex-col gap-2">
              {archived.map((h) => (
                <li key={h.id} className="card flex items-center justify-between px-4">
                  <span className="text-muted">{h.name}</span>
                  <button
                    type="button"
                    className="min-h-11 text-accent"
                    onClick={() => updateHabit(h.id, { archived: false })}
                  >
                    Restaurer
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  )
}
