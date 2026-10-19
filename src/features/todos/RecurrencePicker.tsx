import { Select, type SelectOption } from '@/components/ui'
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
const KINDS: SelectOption<Kind>[] = [
  { value: 'none', label: 'Ne se répète pas' },
  { value: 'daily', label: 'Tous les jours' },
  { value: 'weekly', label: 'Certains jours' },
  { value: 'monthly', label: 'Tous les mois' },
]

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
      <Select
        label="Récurrence"
        value={kind}
        onChange={setKind}
        options={KINDS}
        className="min-h-11 px-3 md:min-h-9"
      />
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
