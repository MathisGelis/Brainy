import { useState } from 'react'
import { formatDayMonth } from '@/lib/dates'
import { centsToInput, formatCents, parseAmountToCents } from '@/lib/money'
import type { Category, Expense, ExpensePatch } from './types'

type RowProps = {
  expense: Expense
  categories: Category[]
  onUpdate: (id: string, patch: ExpensePatch) => void
  onDelete: (expense: Expense) => void
}

function ExpenseRow({ expense, categories, onUpdate, onDelete }: RowProps) {
  const [editing, setEditing] = useState(false)
  const [amountInvalid, setAmountInvalid] = useState(false)
  const category = categories.find((c) => c.id === expense.category_id)
  const field = 'min-h-11 rounded border border-border bg-bg px-2 text-text md:min-h-9'

  if (!editing) {
    return (
      <li className="flex items-center gap-3 border-b border-border">
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={`Modifier la dépense de ${formatCents(expense.amount_cents)}`}
          className="flex min-h-11 flex-1 items-center gap-3 text-left"
        >
          <span className="w-14 shrink-0 text-xs text-muted">
            {formatDayMonth(expense.spent_on)}
          </span>
          <span className="min-w-0 flex-1 truncate">
            {expense.note || category?.name || 'Sans catégorie'}
            {expense.note && category && <span className="text-muted"> · {category.name}</span>}
          </span>
          <span className="font-semibold">{formatCents(expense.amount_cents)}</span>
        </button>
      </li>
    )
  }

  return (
    <li className="flex flex-wrap items-center gap-2 border-b border-border py-2">
      <input
        defaultValue={centsToInput(expense.amount_cents)}
        inputMode="decimal"
        aria-label="Montant"
        aria-invalid={amountInvalid}
        onBlur={(e) => {
          const cents = parseAmountToCents(e.target.value)
          if (cents === null) {
            setAmountInvalid(true)
            return
          }
          setAmountInvalid(false)
          if (cents !== expense.amount_cents) onUpdate(expense.id, { amount_cents: cents })
        }}
        className={`${field} w-28 ${amountInvalid ? 'border-danger' : ''}`}
      />
      <input
        type="date"
        defaultValue={expense.spent_on}
        aria-label="Date"
        onChange={(e) => e.target.value && onUpdate(expense.id, { spent_on: e.target.value })}
        className={field}
      />
      <select
        aria-label="Catégorie"
        value={expense.category_id ?? ''}
        onChange={(e) => onUpdate(expense.id, { category_id: e.target.value || null })}
        className={field}
      >
        <option value="">Sans catégorie</option>
        {categories
          .filter((c) => !c.archived || c.id === expense.category_id)
          .map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
      </select>
      <input
        defaultValue={expense.note ?? ''}
        aria-label="Note"
        placeholder="Note"
        onBlur={(e) => {
          const note = e.target.value.trim() || null
          if (note !== expense.note) onUpdate(expense.id, { note })
        }}
        className={`${field} min-w-0 flex-1 basis-32`}
      />
      <button
        type="button"
        className="min-h-11 px-2 text-accent md:min-h-9"
        onClick={() => setEditing(false)}
      >
        OK
      </button>
      <button
        type="button"
        className="min-h-11 px-2 text-muted hover:text-danger md:min-h-9"
        onClick={() => onDelete(expense)}
      >
        Supprimer
      </button>
    </li>
  )
}

export function ExpenseList(props: Omit<RowProps, 'expense'> & { expenses: Expense[] }) {
  const { expenses, ...rest } = props
  if (expenses.length === 0) {
    return (
      <p className="text-muted">
        Aucune dépense ce mois-ci. Saisissez un montant ci-dessus puis Entrée.
      </p>
    )
  }
  return (
    <ul>
      {expenses.map((expense) => (
        <ExpenseRow key={expense.id} expense={expense} {...rest} />
      ))}
    </ul>
  )
}
