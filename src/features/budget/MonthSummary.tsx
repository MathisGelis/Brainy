import { formatCents } from '@/lib/money'
import type { MonthSummary as Summary } from './types'

/** Barre de progression : accent normalement, rouge uniquement en cas de dépassement. */
export function ProgressBar({
  ratio,
  over,
  label,
}: {
  ratio: number
  over: boolean
  label: string
}) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(ratio * 100)}
      className="h-2 overflow-hidden rounded-full bg-surface"
    >
      <div
        className={`h-full ${over ? 'bg-danger' : 'bg-accent'}`}
        style={{ width: `${Math.round(ratio * 100)}%` }}
      />
    </div>
  )
}

export function MonthSummary({ summary }: { summary: Summary }) {
  const { totalSpent, totalBudget, remaining, over, byCategory } = summary
  return (
    <section aria-label="Synthèse du mois" className="mb-6">
      <div className="mb-4 flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <p>
          <span className="text-2xl font-semibold">{formatCents(totalSpent)}</span>{' '}
          <span className="text-muted">dépensés</span>
        </p>
        {remaining !== null && (
          <p className={over ? 'text-danger' : 'text-muted'}>
            {over
              ? `Dépassement de ${formatCents(-remaining)}`
              : `Reste ${formatCents(remaining)} sur ${formatCents(totalBudget)}`}
          </p>
        )}
      </div>
      {byCategory.length > 0 && (
        <ul className="flex flex-col gap-3">
          {byCategory
            .filter((c) => c.spent > 0 || c.budget !== null)
            .map((c) => {
              const name = c.category?.name ?? 'Sans catégorie'
              return (
                <li key={c.category?.id ?? 'none'}>
                  <div className="mb-1 flex justify-between gap-2 text-xs">
                    <span>{name}</span>
                    <span className={c.over ? 'text-danger' : 'text-muted'}>
                      {formatCents(c.spent)}
                      {c.budget !== null && ` / ${formatCents(c.budget)}`}
                    </span>
                  </div>
                  {c.budget !== null && <ProgressBar ratio={c.ratio} over={c.over} label={name} />}
                </li>
              )
            })}
        </ul>
      )}
    </section>
  )
}
