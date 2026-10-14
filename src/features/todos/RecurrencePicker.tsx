import { WEEKDAYS } from '@/lib/naturalDate'
import { parseRecurrence, serializeRecurrence, type Recurrence } from './recurrence'

type Kind = 'none' | Recurrence['kind']

type Props = {
  value: string | null
  onChange: (value: string | null) => void
  /** Jour ISO proposé par défaut pour une récurrence hebdomadaire (jour de l'échéance). */
  defaultWeekday: number
}

const INITIALS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

/** Choix de la récurrence : aucune, quotidienne, jours de la semaine, mensuelle. */
export function RecurrencePicker({ value, onChange, defaultWeekday }: Props) {
  const current = parseRecurrence(value)
  const kind: Kind = current?.kind ?? 'none'
  const days = current?.kind === 'weekly' ? current.days : []

  function setKind(next: Kind) {
    if (next === 'none') onChange(null)
    else if (next === 'weekly')
      onChange(serializeRecurrence({ kind: 'weekly', days: [defaultWeekday] }))
    else onChange(next)
  }

  function toggleDay(day: number) {
    const nextDays = days.includes(day) ? days.filter((d) => d !== day) : [...days, day]
    // Retirer le dernier jour revient à « aucune récurrence »
    onChange(serializeRecurrence({ kind: 'weekly', days: nextDays }))
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="Récurrence"
        value={kind}
        onChange={(e) => setKind(e.target.value as Kind)}
        className="field min-h-11 px-3 md:min-h-9"
      >
        <option value="none">Ne se répète pas</option>
        <option value="daily">Tous les jours</option>
        <option value="weekly">Certains jours</option>
        <option value="monthly">Tous les mois</option>
      </select>
      {kind === 'weekly' && (
        <div role="group" aria-label="Jours de la semaine" className="flex gap-1">
          {INITIALS.map((initial, i) => (
            <button
              key={i}
              type="button"
              aria-pressed={days.includes(i + 1)}
              aria-label={WEEKDAYS[i]}
              onClick={() => toggleDay(i + 1)}
              className="pill size-9 border border-[var(--field-border)] text-xs"
            >
              {initial}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
