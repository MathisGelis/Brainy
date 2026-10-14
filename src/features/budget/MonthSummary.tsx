import { ProgressBar } from '@/components/ui'
import { formatCents } from '@/lib/money'
import type { MonthSummary as Summary } from './types'

type Props = {
  summary: Summary
  totalIncome: number
  /** Projection de fin de mois (mois en cours uniquement) */
  projection: number | null
  /** Variation en % par catégorie vs mois précédent (à date égale pour le mois en cours) */
  trends: Map<string | null, number | null>
  previousLabel: string
}

const signed = (cents: number) =>
  `${cents > 0 ? '+' : cents < 0 ? '−' : ''}${formatCents(Math.abs(cents))}`

export function MonthSummary({ summary, totalIncome, projection, trends, previousLabel }: Props) {
  const { totalSpent, totalBudget, remaining, over, byCategory } = summary
  const balance = totalIncome - totalSpent
  const projectionOver = projection !== null && totalBudget > 0 && projection > totalBudget

  return (
    <section aria-label="Synthèse du mois" className="card mb-6 p-5">
      <div className="mb-4 flex flex-col gap-1">
        <p>
          <span className="text-[34px] leading-none font-semibold tracking-tight">
            {formatCents(totalSpent)}
          </span>{' '}
          <span className="text-muted">dépensés</span>
        </p>
        {remaining !== null && (
          <p className={over ? 'text-danger' : 'text-muted'}>
            {over
              ? `Dépassement de ${formatCents(-remaining)}`
              : `Reste ${formatCents(remaining)} sur ${formatCents(totalBudget)}`}
          </p>
        )}
        {projection !== null && (
          <p className={projectionOver ? 'text-danger' : 'text-muted'}>
            À ce rythme : {formatCents(projection)} en fin de mois
          </p>
        )}
        {totalIncome > 0 && (
          <p className="text-muted">
            Revenus {formatCents(totalIncome)} · Solde{' '}
            <span className={`font-semibold ${balance < 0 ? 'text-danger' : 'text-success'}`}>
              {signed(balance)}
            </span>
          </p>
        )}
      </div>
      {byCategory.length > 0 && (
        <ul className="flex flex-col gap-3">
          {byCategory
            .filter((c) => c.spent > 0 || c.budget !== null)
            .map((c) => {
              const name = c.category?.name ?? 'Sans catégorie'
              const trend = trends.get(c.category?.id ?? null) ?? null
              return (
                <li key={c.category?.id ?? 'none'}>
                  <div className="mb-1 flex justify-between gap-2 text-xs">
                    <span>
                      {name}
                      {trend !== null && trend !== 0 && (
                        <span className="text-muted">
                          {' '}
                          · {trend > 0 ? '+' : '−'}
                          {Math.abs(trend)} % vs {previousLabel}
                        </span>
                      )}
                    </span>
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
