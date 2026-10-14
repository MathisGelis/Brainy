import { useState, type FormEvent } from 'react'
import { Button, useToast } from '@/components/ui'
import { PageHeader } from '@/components/ui/PageHeader'
import { celebrate } from '@/lib/celebrate'
import { lastNDays, todayISO } from '@/lib/dates'
import { HabitWeekRow } from './HabitWeekRow'
import { TargetSelect } from './TargetSelect'
import { useHabits } from './useHabits'

export default function HabitsPage() {
  const toast = useToast()
  const { habits, logDays, isLoading, isError, refetch, addHabit, updateHabit, toggleDay } =
    useHabits({ onError: (m) => toast.show(m) })
  const [name, setName] = useState('')
  const [target, setTarget] = useState(7)
  const [showArchived, setShowArchived] = useState(false)

  const today = todayISO()
  const week = lastNDays(today, 7)
  const active = habits.filter((h) => !h.archived)
  const archived = habits.filter((h) => h.archived)

  function submit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    addHabit(trimmed, target)
    setName('')
  }

  return (
    <>
      <PageHeader title="Habitudes" />
      <form onSubmit={submit} className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Nouvelle habitude"
          placeholder="Ajouter une habitude…"
          className="field min-h-11 min-w-0 flex-1 basis-60 px-4 md:min-h-10"
        />
        <TargetSelect value={target} onChange={setTarget} />
        <Button type="submit">Ajouter</Button>
      </form>

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
              days={logDays.get(habit.id) ?? new Set()}
              week={week}
              today={today}
              onToggle={(habitId, day) => {
                if (!logDays.get(habitId)?.has(day)) celebrate()
                toggleDay(habitId, day)
              }}
            />
          ))}
        </ul>
      )}

      {archived.length > 0 && (
        <section className="mt-8">
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
