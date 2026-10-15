import { useState } from 'react'
import { useToast } from '@/components/ui'
import { addDays, formatDayMonth, formatLongDay, formatWeekdayShort } from '@/lib/dates'
import { copyMealItems } from './recipeLogic'
import { useMealItems } from './useMenu'

/** Refaire le menu d'un des 7 jours précédents, ou dupliquer toute la semaine précédente. */
export function CopyMenu({
  day,
  from,
  to,
  onError,
}: {
  day: string
  from: string
  to: string
  onError: (m: string) => void
}) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const week = useMealItems(from, to, { onError })
  const previous = useMealItems(addDays(from, -7), addDays(from, -1), { onError })
  const all = [...previous.items, ...week.items]
  const sources = Array.from({ length: 7 }, (_, i) => addDays(day, -7 + i))
    .map((d) => ({ day: d, count: all.filter((x) => x.day === d).length }))
    .filter((s) => s.count > 0)

  function copyDay(source: string) {
    const items = all.filter((i) => i.day === source)
    const copies = copyMealItems(items, () => day, week.items)
    const undo = week.addItems(copies)
    toast.show(
      `Menu du ${formatLongDay(source)} copié (${copies.length} élément${copies.length > 1 ? 's' : ''})`,
      undo,
    )
    setOpen(false)
  }

  function copyWeek() {
    const copies = copyMealItems(previous.items, (d) => addDays(d, 7), week.items)
    const undo = week.addItems(copies)
    toast.show(`Semaine précédente dupliquée (${copies.length} éléments)`, undo)
    setOpen(false)
  }

  return (
    <div className="mb-4 flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="min-h-11 self-start rounded-full px-3 text-xs text-muted transition-colors hover:bg-surface hover:text-text md:min-h-8"
      >
        Copier un menu…
      </button>
      {open && (
        <div className="flex flex-col gap-2 rounded-2xl bg-surface p-3 text-sm">
          {sources.length === 0 && previous.items.length === 0 ? (
            <p className="text-muted">Rien à copier sur les sept jours précédents.</p>
          ) : (
            <>
              {sources.length > 0 && (
                <div
                  role="group"
                  aria-label="Refaire le menu de"
                  className="flex flex-wrap items-center gap-1.5"
                >
                  <span className="text-xs text-muted">Refaire le menu de</span>
                  {sources.map((s) => (
                    <button
                      key={s.day}
                      type="button"
                      onClick={() => copyDay(s.day)}
                      aria-label={`Copier le menu du ${formatLongDay(s.day)} vers le ${formatLongDay(day)}`}
                      className="pill min-h-9 border border-[var(--field-border)] px-3 text-xs first-letter:uppercase"
                    >
                      {formatWeekdayShort(s.day)} {formatDayMonth(s.day)} · {s.count}
                    </button>
                  ))}
                </div>
              )}
              {previous.items.length > 0 && (
                <button
                  type="button"
                  onClick={copyWeek}
                  className="min-h-11 self-start rounded-full px-3 text-xs font-semibold text-accent transition-colors hover:bg-bg md:min-h-9"
                >
                  Dupliquer la semaine précédente ({previous.items.length} éléments)
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
