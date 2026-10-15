import { Link } from 'react-router-dom'
import { MenuIcon, ProgressBar } from '@/components/ui'
import { parisHour } from '@/lib/dates'
import { baseName, mealLabel, nextPlannedMeal } from './nutrition'
import { useMacroTargets, useMealItems } from './useMenu'

const number = new Intl.NumberFormat('fr-FR')

/** Sur l'accueil : kcal restantes (ou du jour) et prochain repas prévu ; mène au Menu. */
export function TodayMenuCard({ today, onError }: { today: string; onError: (m: string) => void }) {
  const { items, isLoading, isError } = useMealItems(today, today, { onError })
  const { targets, isLoading: targetsLoading } = useMacroTargets({ onError })
  if (isLoading || targetsLoading || isError) return null
  if (items.length === 0 && targets.kcal === null) return null

  const kcal = items.reduce((s, i) => s + i.kcal, 0)
  const next = nextPlannedMeal(items, parisHour())
  const target = targets.kcal
  const headline =
    target === null
      ? `${number.format(kcal)} kcal aujourd'hui`
      : kcal <= target
        ? `${number.format(target - kcal)} kcal restantes`
        : `${number.format(kcal - target)} kcal au-dessus de l’objectif`

  const subline = next
    ? `${mealLabel(next.meal)} prévu : ${next.names.map(baseName).join(', ')}`
    : items.length > 0
      ? 'Rien d’autre de prévu aujourd’hui'
      : 'Aucun repas noté pour l’instant'

  return (
    <Link
      to="/menu"
      aria-label={`${headline}. ${subline}`}
      className="card mb-4 flex min-h-14 items-center gap-3 p-4 transition-colors hover:bg-surface"
    >
      <span className="text-accent">
        <MenuIcon width={20} height={20} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className={`font-semibold ${target !== null && kcal > target ? 'text-danger' : ''}`}>
          {headline}
        </span>
        {target !== null && (
          <ProgressBar
            ratio={Math.min(1, kcal / target)}
            over={kcal > target}
            label="Calories du jour"
          />
        )}
        <span className="truncate text-xs text-muted">{subline}</span>
      </span>
      <span aria-hidden className="text-accent">
        →
      </span>
    </Link>
  )
}
