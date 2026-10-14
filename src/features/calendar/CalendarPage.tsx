import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useToast } from '@/components/ui'
import { PageHeader } from '@/components/ui/PageHeader'
import { useBudget } from '@/features/budget/useBudget'
import { useExpensesBetween } from '@/features/budget/useBudgetExtras'
import { MoodFace } from '@/features/checkins/MoodEnergy'
import { useCheckins } from '@/features/checkins/useCheckins'
import { useGoals } from '@/features/goals/useGoals'
import { useHabits } from '@/features/habits/useHabits'
import { useTodos } from '@/features/todos/useTodos'
import {
  addMonths,
  formatLongDay,
  formatMonthLabel,
  formatWeekdayShort,
  monthOf,
  todayISO,
} from '@/lib/dates'
import { formatCents } from '@/lib/money'
import { describeDay, monthGrid, moveDay, summarizeDays, type DaySummary } from './calendarLogic'
import { DayDetail } from './DayDetail'

const euros = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

function DayCell({
  day,
  summary,
  inMonth,
  isToday,
  selected,
  onSelect,
  onKeyDown,
}: {
  day: string
  summary: DaySummary
  inMonth: boolean
  isToday: boolean
  selected: boolean
  onSelect: (day: string) => void
  onKeyDown: (e: KeyboardEvent<HTMLButtonElement>, day: string) => void
}) {
  const description = describeDay(summary, formatCents)
  const dots = Math.min(3, summary.todosOpen)
  return (
    <button
      type="button"
      data-day={day}
      tabIndex={selected ? 0 : -1}
      aria-pressed={selected}
      aria-current={isToday ? 'date' : undefined}
      aria-label={`${formatLongDay(day)}${description ? ` : ${description}` : ''}`}
      onClick={() => onSelect(day)}
      onKeyDown={(e) => onKeyDown(e, day)}
      className={`flex min-h-14 w-full flex-col justify-between rounded-xl p-1 text-left transition-colors md:min-h-20 md:p-2 ${
        selected ? 'bg-surface ring-2 ring-accent' : 'bg-surface/40 hover:bg-surface'
      } ${inMonth ? '' : 'opacity-40'}`}
    >
      <span className="flex items-start justify-between gap-0.5">
        <span
          className={`flex size-6 items-center justify-center rounded-full text-xs tabular-nums ${
            isToday ? 'btn-primary font-semibold' : ''
          }`}
        >
          {Number(day.slice(8))}
        </span>
        {summary.mood !== null && (
          <span className="text-accent">
            <MoodFace value={summary.mood} size={14} />
          </span>
        )}
      </span>
      <span className="flex flex-wrap items-center gap-0.5 md:gap-1">
        {Array.from({ length: dots }, (_, i) => (
          <span key={i} className="size-1.5 rounded-full bg-accent" />
        ))}
        {summary.habitsDone > 0 && <span className="size-1.5 rounded-full border border-accent" />}
        {summary.milestones + summary.goalsDue > 0 && (
          <span className="text-[10px] leading-none text-accent">◎</span>
        )}
        {summary.spent > 0 && (
          <span className="ml-auto hidden text-[11px] leading-none text-muted md:inline">
            {euros.format(summary.spent / 100)}
          </span>
        )}
      </span>
    </button>
  )
}

/** Vue du mois : échéances, habitudes, dépenses, jalons, humeur ; le détail d'un jour est actionnable. */
export default function CalendarPage() {
  const toast = useToast()
  const onError = (m: string) => toast.show(m)
  const today = todayISO()
  const [selected, setSelected] = useState(today)
  const month = monthOf(selected)
  const days = monthGrid(month)
  const focusSelected = useRef(false)

  const { todos } = useTodos({ onError })
  const { habits, entries } = useHabits({ onError })
  const { goals, milestones } = useGoals({ onError })
  const { checkins } = useCheckins({ onError })
  const { categories } = useBudget(month, { onError })
  const { expenses } = useExpensesBetween(days[0]!, days[days.length - 1]!)

  const summaries = summarizeDays(days, {
    todos,
    habits,
    entries,
    expenses,
    milestones,
    goals,
    checkins,
  })

  // Après un déplacement au clavier, le focus suit le jour choisi (même s'il change de mois).
  useEffect(() => {
    if (!focusSelected.current) return
    focusSelected.current = false
    document.querySelector<HTMLButtonElement>(`[data-day="${selected}"]`)?.focus()
  }, [selected])

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, day: string) {
    const next = moveDay(day, e.key)
    if (!next) return
    e.preventDefault()
    focusSelected.current = true
    setSelected(next)
  }

  function goToMonth(target: string) {
    setSelected(target === monthOf(today) ? today : `${target}-01`)
  }

  const nav =
    'flex min-h-11 min-w-11 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-text md:min-h-10 md:min-w-10'

  return (
    <>
      <PageHeader title="Calendrier" />
      <div className="-mt-3 mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-label="Mois précédent"
          className={nav}
          onClick={() => goToMonth(addMonths(month, -1))}
        >
          ←
        </button>
        <h2 className="min-w-36 text-center font-semibold capitalize" aria-live="polite">
          {formatMonthLabel(month)}
        </h2>
        <button
          type="button"
          aria-label="Mois suivant"
          className={nav}
          onClick={() => goToMonth(addMonths(month, 1))}
        >
          →
        </button>
        {selected !== today && (
          <button
            type="button"
            className="min-h-11 rounded-full px-4 text-accent transition-colors hover:bg-surface md:min-h-9"
            onClick={() => setSelected(today)}
          >
            Aujourd'hui
          </button>
        )}
      </div>

      <div aria-hidden className="mb-1 grid grid-cols-7 gap-1 px-1 text-xs text-muted md:px-2">
        {days.slice(0, 7).map((d) => (
          <span key={d} className="first-letter:uppercase">
            {formatWeekdayShort(d)}
          </span>
        ))}
      </div>
      <ol
        aria-label={`Jours de ${formatMonthLabel(month)} (flèches pour se déplacer)`}
        className="mb-2 grid grid-cols-7 gap-1"
      >
        {days.map((day) => (
          <li key={day}>
            <DayCell
              day={day}
              summary={summaries.get(day)!}
              inMonth={monthOf(day) === month}
              isToday={day === today}
              selected={day === selected}
              onSelect={setSelected}
              onKeyDown={onKeyDown}
            />
          </li>
        ))}
      </ol>
      <p className="mb-5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span className="flex items-center gap-1">
          <span aria-hidden className="size-1.5 rounded-full bg-accent" /> Todo à faire
        </span>
        <span className="flex items-center gap-1">
          <span aria-hidden className="size-1.5 rounded-full border border-accent" /> Habitude faite
        </span>
        <span className="flex items-center gap-1">
          <span aria-hidden className="text-accent">
            ◎
          </span>{' '}
          Jalon ou objectif
        </span>
      </p>

      <DayDetail
        key={selected}
        day={selected}
        onError={onError}
        expenses={expenses}
        categories={categories}
        milestones={milestones}
        goals={goals}
      />
    </>
  )
}
