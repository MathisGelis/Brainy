import { useState } from 'react'
import { formatDayMonth } from '@/lib/dates'
import { centsToInput, formatCents, parseAmountToCents } from '@/lib/money'
import type { Income, IncomePatch } from './types'

type RowProps = {
  income: Income
  onUpdate: (id: string, patch: IncomePatch) => void
  onDelete: (income: Income) => void
}

function IncomeRow({ income, onUpdate, onDelete }: RowProps) {
  const [editing, setEditing] = useState(false)
  const [invalid, setInvalid] = useState(false)
  const field = 'field min-h-11 px-3 md:min-h-10'

  if (!editing) {
    return (
      <li className="flex items-center gap-3 border-b border-border last:border-b-0">
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={`Modifier le revenu de ${formatCents(income.amount_cents)}`}
          className="-mx-2 flex min-h-12 flex-1 items-center gap-3 rounded-xl px-2 text-left transition-colors hover:bg-surface"
        >
          <span className="w-14 shrink-0 text-xs text-muted">
            {formatDayMonth(income.received_on)}
          </span>
          <span className="min-w-0 flex-1 truncate">
            {income.recurring_id && <span className="text-muted">↻ </span>}
            {income.note || 'Revenu'}
          </span>
          <span className="font-semibold text-success">+{formatCents(income.amount_cents)}</span>
        </button>
      </li>
    )
  }

  return (
    <li className="card my-2 flex flex-wrap items-center gap-2 p-3">
      <input
        defaultValue={centsToInput(income.amount_cents)}
        inputMode="decimal"
        aria-label="Montant du revenu"
        aria-invalid={invalid}
        onBlur={(e) => {
          const cents = parseAmountToCents(e.target.value)
          setInvalid(cents === null)
          if (cents !== null && cents !== income.amount_cents)
            onUpdate(income.id, { amount_cents: cents })
        }}
        className={`${field} w-28 ${invalid ? '!border-danger' : ''}`}
      />
      <input
        type="date"
        defaultValue={income.received_on}
        aria-label="Date du revenu"
        onChange={(e) => e.target.value && onUpdate(income.id, { received_on: e.target.value })}
        className={field}
      />
      <input
        defaultValue={income.note ?? ''}
        aria-label="Note du revenu"
        placeholder="Note"
        onBlur={(e) => {
          const note = e.target.value.trim() || null
          if (note !== income.note) onUpdate(income.id, { note })
        }}
        className={`${field} min-w-0 flex-1 basis-32`}
      />
      <button
        type="button"
        className="min-h-11 rounded-full px-4 font-semibold text-accent transition-colors hover:bg-surface md:min-h-9"
        onClick={() => setEditing(false)}
      >
        OK
      </button>
      <button
        type="button"
        className="min-h-11 rounded-full px-3 text-muted transition-colors hover:text-danger md:min-h-9"
        onClick={() => onDelete(income)}
      >
        Supprimer
      </button>
    </li>
  )
}

export function IncomeList({ incomes, ...rest }: Omit<RowProps, 'income'> & { incomes: Income[] }) {
  if (incomes.length === 0) return null
  return (
    <section aria-labelledby="incomes-title" className="mt-6">
      <h3 id="incomes-title" className="mb-1 text-xs font-semibold text-muted uppercase">
        Revenus du mois
      </h3>
      <ul>
        {incomes.map((income) => (
          <IncomeRow key={income.id} income={income} {...rest} />
        ))}
      </ul>
    </section>
  )
}
