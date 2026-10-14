import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button, useToast } from '@/components/ui'
import { PageHeader } from '@/components/ui/PageHeader'
import { todayISO } from '@/lib/dates'
import { HabitStats } from './HabitWeekRow'
import { Heatmap } from './Heatmap'
import { TargetSelect } from './TargetSelect'
import { useHabits } from './useHabits'

export default function HabitDetailPage() {
  const { habitId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { habits, logDays, isLoading, updateHabit, toggleDay } = useHabits({
    onError: (m) => toast.show(m),
  })
  const habit = habits.find((h) => h.id === habitId)
  const today = todayISO()

  if (isLoading) return <div aria-hidden className="h-24 animate-pulse rounded bg-surface" />
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

  const days = logDays.get(habit.id) ?? new Set<string>()

  return (
    <>
      <Link to="/habitudes" className="mb-2 inline-block min-h-11 text-muted hover:text-text">
        ← Habitudes
      </Link>
      <h1 className="mb-4">
        <input
          key={habit.id}
          defaultValue={habit.name}
          aria-label="Nom de l'habitude"
          onBlur={(e) => {
            const name = e.target.value.trim()
            if (name && name !== habit.name) updateHabit(habit.id, { name })
            else e.target.value = habit.name
          }}
          className="w-full rounded border border-transparent bg-transparent text-xl font-semibold hover:border-border"
        />
      </h1>
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <TargetSelect
          value={habit.target_per_week}
          onChange={(n) => updateHabit(habit.id, { target_per_week: n })}
        />
        <HabitStats habit={habit} days={days} today={today} />
      </div>
      <Heatmap days={days} today={today} onToggle={(day) => toggleDay(habit.id, day)} />
      <div className="mt-8">
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
      </div>
    </>
  )
}
