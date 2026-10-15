import { Select, type SelectOption } from '@/components/ui'
import { WEEKDAYS } from '@/lib/naturalDate'
import type { Habit } from './types'

type Frequency = Pick<Habit, 'target_per_week' | 'days'>
type Props = { value: Frequency; onChange: (value: Frequency) => void; label?: string }

const INITIALS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const MODES: SelectOption<string>[] = [
  { value: '7', label: 'Tous les jours' },
  ...[6, 5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} fois par semaine` })),
  { value: 'days', label: 'Certains jours' },
]

/** Fréquence : tous les jours, X fois par semaine, ou certains jours précis. */
export function FrequencyPicker({ value, onChange, label = 'Fréquence' }: Props) {
  const mode = value.days ? 'days' : String(value.target_per_week)

  function setMode(next: string) {
    if (next === 'days') onChange({ target_per_week: 3, days: [1, 3, 5] })
    else onChange({ target_per_week: Number(next), days: null })
  }

  function toggleDay(day: number) {
    const days = value.days ?? []
    const next = days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort()
    if (next.length > 0) onChange({ target_per_week: next.length, days: next })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        label={label}
        value={mode}
        onChange={setMode}
        options={MODES}
        className="min-h-11 px-3 md:min-h-10"
      />
      {value.days && (
        <div role="group" aria-label="Jours prévus" className="flex gap-1">
          {INITIALS.map((initial, i) => (
            <button
              key={i}
              type="button"
              aria-pressed={value.days!.includes(i + 1)}
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
