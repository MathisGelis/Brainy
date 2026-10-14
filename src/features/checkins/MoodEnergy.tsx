import { useToast } from '@/components/ui'
import { describe, FIELD_NAMES, SCALE } from './checkinLogic'
import type { CheckinField } from './types'
import { useCheckins } from './useCheckins'

/** Visage au trait : la bouche passe de la moue au sourire (1 → 5). */
export function MoodFace({ value, size = 22 }: { value: number; size?: number }) {
  const curve = (value - 3) * 2.2 // < 0 : moue, > 0 : sourire
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="9" />
      <circle cx="9" cy="10" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10" r="0.9" fill="currentColor" stroke="none" />
      <path d={`M8 ${15 - curve / 2} Q12 ${15 + curve} 16 ${15 - curve / 2}`} />
    </svg>
  )
}

/** Jauge de batterie : autant de barres que de niveau d'énergie. */
export function EnergyBars({ value, size = 22 }: { value: number; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="2.5" y="7" width="17" height="10" rx="2.5" />
      <path d="M21.5 10.5v3" />
      {SCALE.slice(0, value).map((i) => (
        <rect
          key={i}
          x={2.5 + 1.6 + (i - 1) * 2.9}
          y="9.3"
          width="1.9"
          height="5.4"
          rx="0.6"
          fill="currentColor"
          stroke="none"
        />
      ))}
    </svg>
  )
}

const ICONS: Record<CheckinField, typeof MoodFace> = { mood: MoodFace, energy: EnergyBars }

function Scale({
  field,
  value,
  onPick,
}: {
  field: CheckinField
  value: number | null
  onPick: (value: number | null) => void
}) {
  const Icon = ICONS[field]
  return (
    <div role="group" aria-label={FIELD_NAMES[field]} className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-xs text-muted">{FIELD_NAMES[field]}</span>
      <div className="flex gap-1">
        {SCALE.map((v) => {
          const on = value === v
          return (
            <button
              key={v}
              type="button"
              aria-pressed={on}
              aria-label={describe(field, v)}
              title={describe(field, v)}
              onClick={() => onPick(on ? null : v)}
              className={`flex size-11 items-center justify-center rounded-full transition-colors md:size-9 ${
                on ? 'btn-primary' : 'text-muted hover:bg-surface hover:text-text'
              }`}
            >
              <Icon value={v} size={20} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

type Props = {
  day: string
  onError: (m: string) => void
  /** Titre affiché au-dessus (rien dans le détail d'un jour du calendrier) */
  title?: string
}

/** Humeur et énergie d'un jour en un geste ; retoucher la valeur choisie la retire. */
export function MoodEnergy({ day, onError, title }: Props) {
  const toast = useToast()
  const { checkinsByDay, isLoading, setValue, clearMood } = useCheckins({ onError })
  const checkin = checkinsByDay.get(day)

  return (
    <div className="flex flex-col gap-2">
      {title && (
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">{title}</h2>
          {(checkin?.mood != null || checkin?.energy != null) && (
            <button
              type="button"
              onClick={() => toast.show('Saisie effacée', clearMood(day))}
              className="min-h-11 rounded-full px-3 text-xs text-muted transition-colors hover:bg-surface hover:text-text md:min-h-8"
            >
              Effacer
            </button>
          )}
        </div>
      )}
      {isLoading ? (
        <div aria-hidden className="h-11 animate-pulse rounded-2xl bg-surface" />
      ) : (
        <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:gap-x-6">
          <Scale
            field="mood"
            value={checkin?.mood ?? null}
            onPick={(v) => setValue(day, 'mood', v)}
          />
          <Scale
            field="energy"
            value={checkin?.energy ?? null}
            onPick={(v) => setValue(day, 'energy', v)}
          />
        </div>
      )}
    </div>
  )
}
