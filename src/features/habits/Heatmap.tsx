import type { CSSProperties } from 'react'
import { formatDayMonth, formatWeekdayShort } from '@/lib/dates'
import { heatmapWeeks } from './habitLogic'
import type { DayEntries, Schedule } from './types'

type Props = {
  schedule: Schedule
  entries: DayEntries
  offDays: ReadonlySet<string>
  today: string
  onToggle: (day: string) => void
}

/** Heatmap annuelle : une colonne par semaine, cliquable pour cocher/décocher un jour passé. */
export function Heatmap({ schedule, entries, offDays, today, onToggle }: Props) {
  const weeks = heatmapWeeks(schedule, entries, today, offDays)
  return (
    <div className="overflow-x-auto pb-2" role="group" aria-label="Historique sur un an">
      <div className="flex w-max gap-[3px]">
        {weeks.map((week) => (
          <div key={week[0]!.day} className="flex flex-col gap-[3px]">
            {week.map((cell) => {
              const label = `${formatWeekdayShort(cell.day)} ${formatDayMonth(cell.day)}${cell.off ? ', jour off' : ''}`
              return (
                <button
                  key={cell.day}
                  type="button"
                  disabled={cell.future}
                  aria-pressed={cell.done}
                  aria-label={label}
                  title={label}
                  onClick={() => onToggle(cell.day)}
                  style={
                    cell.ratio > 0 && !cell.done
                      ? ({ '--ratio': cell.ratio } as CSSProperties)
                      : undefined
                  }
                  className={`size-3 rounded-[4px] border transition-colors ${
                    cell.future
                      ? 'border-transparent'
                      : cell.done
                        ? 'border-accent bg-accent'
                        : cell.ratio > 0
                          ? 'heat-partial border-accent'
                          : cell.off
                            ? 'border-dashed border-[var(--check-border)]'
                            : cell.scheduled
                              ? 'border-border bg-surface'
                              : 'border-transparent bg-surface opacity-40'
                  }`}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
