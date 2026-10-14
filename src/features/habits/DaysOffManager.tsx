import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui'
import { formatDayMonth, todayISO } from '@/lib/dates'
import { groupPeriods } from './habitLogic'
import type { DayOff } from './types'

type Props = {
  daysOff: DayOff[]
  onAddPeriod: (from: string, to: string) => void
  onRemove: (days: string[]) => void
}

/** Jours off (vacances, maladie) : ne cassent pas les séries et ne comptent pas dans le taux. */
export function DaysOffManager({ daysOff, onAddPeriod, onRemove }: Props) {
  const today = todayISO()
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const periods = groupPeriods(daysOff.map((d) => d.day)).reverse()
  const field = 'field min-h-11 px-3 md:min-h-10'

  function submit(e: FormEvent) {
    e.preventDefault()
    if (from && to) onAddPeriod(from, to)
  }

  const label = (p: { from: string; to: string }) =>
    p.from === p.to
      ? formatDayMonth(p.from)
      : `du ${formatDayMonth(p.from)} au ${formatDayMonth(p.to)}`

  return (
    <details className="mt-8">
      <summary className="min-h-11 cursor-pointer content-center text-muted hover:text-text">
        Jours off{periods.length > 0 && ` (${daysOff.length})`}
      </summary>
      <div className="mt-2 flex flex-col gap-3">
        <p className="text-xs text-muted">
          Vacances, maladie… Ces jours ne cassent pas vos séries et sortent du taux de réussite.
        </p>
        <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            aria-label="Premier jour off"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className={field}
          />
          <input
            type="date"
            aria-label="Dernier jour off"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className={field}
          />
          <Button type="submit" variant="ghost">
            Ajouter
          </Button>
        </form>
        {periods.length > 0 && (
          <ul className="flex flex-col gap-1">
            {periods.map((p) => (
              <li key={p.from} className="flex items-center justify-between gap-2">
                <span>{label(p)}</span>
                <button
                  type="button"
                  onClick={() => onRemove(p.days)}
                  aria-label={`Retirer les jours off ${label(p)}`}
                  className="min-h-11 rounded-full px-3 text-xs text-muted transition-colors hover:text-danger md:min-h-9"
                >
                  Retirer
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  )
}
