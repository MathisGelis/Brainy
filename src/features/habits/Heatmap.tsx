import { formatDayMonth, formatWeekdayShort } from '@/lib/dates'
import { heatmapWeeks } from './habitLogic'

type Props = {
  days: Set<string>
  today: string
  onToggle: (day: string) => void
}

/** Heatmap annuelle : une colonne par semaine, cliquable pour cocher/décocher un jour passé. */
export function Heatmap({ days, today, onToggle }: Props) {
  const weeks = heatmapWeeks(days, today)
  return (
    <div className="overflow-x-auto pb-2" role="group" aria-label="Historique sur un an">
      <div className="flex w-max gap-[3px]">
        {weeks.map((week) => (
          <div key={week[0]!.day} className="flex flex-col gap-[3px]">
            {week.map((cell) => (
              <button
                key={cell.day}
                type="button"
                disabled={cell.future}
                aria-pressed={cell.done}
                aria-label={`${formatWeekdayShort(cell.day)} ${formatDayMonth(cell.day)}`}
                title={`${formatWeekdayShort(cell.day)} ${formatDayMonth(cell.day)}`}
                onClick={() => onToggle(cell.day)}
                className={`size-3 rounded-[3px] border ${
                  cell.future
                    ? 'border-transparent'
                    : cell.done
                      ? 'border-accent bg-accent'
                      : 'border-border bg-surface'
                }`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
