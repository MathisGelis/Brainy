import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui'
import { formatDayMonth, todayISO } from '@/lib/dates'
import { centsToInput, formatCents, parseAmountToCents } from '@/lib/money'
import { nextOccurrenceOf } from './recurringLogic'
import type { Category, EntryKind, RecurringEntry, RecurringPatch } from './types'
import type { NewRecurringInput } from './useBudgetExtras'

type Props = {
  rules: RecurringEntry[]
  categories: Category[]
  onAdd: (input: NewRecurringInput) => void
  onUpdate: (id: string, patch: RecurringPatch) => void
  onDelete: (rule: RecurringEntry) => void
}

const field = 'field min-h-11 px-3 md:min-h-10'

function DayInput({
  value,
  onChange,
  label,
}: {
  value: number
  onChange: (day: number) => void
  label: string
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-muted">
      le
      <input
        type="number"
        min={1}
        max={31}
        defaultValue={value}
        aria-label={label}
        onBlur={(e) => {
          const day = Math.round(Number(e.target.value))
          if (day >= 1 && day <= 31 && day !== value) onChange(day)
          else e.target.value = String(value)
        }}
        className={`${field} w-16 text-text`}
      />
    </label>
  )
}

function RuleRow({
  rule,
  categories,
  onUpdate,
  onDelete,
}: { rule: RecurringEntry } & Omit<Props, 'rules' | 'onAdd'>) {
  const [invalid, setInvalid] = useState(false)
  const label =
    rule.note ||
    (rule.kind === 'income'
      ? 'Revenu'
      : (categories.find((c) => c.id === rule.category_id)?.name ?? 'Dépense'))
  return (
    <li className="card flex flex-col gap-2 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-muted uppercase">
          {rule.kind === 'income' ? 'Revenu' : 'Dépense'}
        </span>
        <input
          defaultValue={centsToInput(rule.amount_cents)}
          inputMode="decimal"
          aria-label={`Montant de « ${label} »`}
          aria-invalid={invalid}
          onBlur={(e) => {
            const cents = parseAmountToCents(e.target.value)
            setInvalid(cents === null)
            if (cents !== null && cents !== rule.amount_cents)
              onUpdate(rule.id, { amount_cents: cents })
          }}
          className={`${field} w-28 ${invalid ? '!border-danger' : ''}`}
        />
        <DayInput
          label={`Jour du mois de « ${label} »`}
          value={rule.day_of_month}
          onChange={(day_of_month) => onUpdate(rule.id, { day_of_month })}
        />
        {rule.kind === 'expense' && (
          <select
            aria-label={`Catégorie de « ${label} »`}
            value={rule.category_id ?? ''}
            onChange={(e) => onUpdate(rule.id, { category_id: e.target.value || null })}
            className={field}
          >
            <option value="">Sans catégorie</option>
            {categories
              .filter((c) => !c.archived || c.id === rule.category_id)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        )}
        <input
          defaultValue={rule.note ?? ''}
          aria-label={`Note de « ${label} »`}
          placeholder="Note (ex. Loyer)"
          onBlur={(e) => {
            const note = e.target.value.trim() || null
            if (note !== rule.note) onUpdate(rule.id, { note })
          }}
          className={`${field} min-w-0 flex-1 basis-32`}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <span>
          {rule.active
            ? `${formatCents(rule.amount_cents)} · prochaine : ${formatDayMonth(nextOccurrenceOf(rule, todayISO()))}`
            : 'En pause'}
        </span>
        <span className="ml-auto flex gap-1">
          <button
            type="button"
            aria-pressed={!rule.active}
            onClick={() => onUpdate(rule.id, { active: !rule.active })}
            className="pill min-h-9 border border-[var(--field-border)] px-3"
          >
            {rule.active ? 'Mettre en pause' : 'En pause'}
          </button>
          <button
            type="button"
            onClick={() => onDelete(rule)}
            aria-label={`Supprimer la récurrence « ${label} »`}
            className="min-h-9 rounded-full px-3 transition-colors hover:text-danger"
          >
            Supprimer
          </button>
        </span>
      </div>
    </li>
  )
}

/** Dépenses et revenus mensuels (loyer, abonnements, salaire) : générés automatiquement. */
export function RecurringManager({ rules, categories, onAdd, onUpdate, onDelete }: Props) {
  const today = todayISO()
  const [kind, setKind] = useState<EntryKind>('expense')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [day, setDay] = useState(Number(today.slice(8)))
  const [note, setNote] = useState('')
  const [thisMonth, setThisMonth] = useState(false)
  const [invalid, setInvalid] = useState(false)

  function submit(e: FormEvent) {
    e.preventDefault()
    const cents = parseAmountToCents(amount)
    if (cents === null || day < 1 || day > 31) {
      setInvalid(true)
      return
    }
    onAdd({
      kind,
      amount_cents: cents,
      category_id: kind === 'expense' ? categoryId || null : null,
      note: note.trim() || null,
      day_of_month: day,
      includeThisMonth: thisMonth,
    })
    setAmount('')
    setNote('')
    setThisMonth(false)
    setInvalid(false)
  }

  return (
    <details className="mt-8">
      <summary className="min-h-11 cursor-pointer content-center text-muted hover:text-text">
        Dépenses et revenus récurrents{rules.length > 0 && ` (${rules.length})`}
      </summary>
      <div className="mt-2 flex flex-col gap-3">
        {rules.length > 0 && (
          <ul className="flex flex-col gap-2">
            {rules.map((rule) => (
              <RuleRow
                key={rule.id}
                rule={rule}
                categories={categories}
                onUpdate={onUpdate}
                onDelete={onDelete}
              />
            ))}
          </ul>
        )}
        <form onSubmit={submit} className="card flex flex-col gap-2 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div
              role="group"
              aria-label="Type de récurrence"
              className="flex gap-1 rounded-full bg-surface p-1"
            >
              {(['expense', 'income'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={kind === k}
                  onClick={() => setKind(k)}
                  className="pill min-h-9 px-3"
                >
                  {k === 'expense' ? 'Dépense' : 'Revenu'}
                </button>
              ))}
            </div>
            <input
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value)
                setInvalid(false)
              }}
              inputMode="decimal"
              aria-label="Montant récurrent"
              aria-invalid={invalid}
              placeholder="Montant (€)"
              className={`${field} w-32 ${invalid ? '!border-danger' : ''}`}
            />
            <label className="flex items-center gap-1.5 text-xs text-muted">
              le
              <input
                type="number"
                min={1}
                max={31}
                value={day}
                onChange={(e) => setDay(Math.round(Number(e.target.value)))}
                aria-label="Jour du mois"
                className={`${field} w-16 text-text`}
              />
              du mois
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {kind === 'expense' && (
              <select
                aria-label="Catégorie récurrente"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={field}
              >
                <option value="">Sans catégorie</option>
                {categories
                  .filter((c) => !c.archived)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            )}
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              aria-label="Note récurrente"
              placeholder={kind === 'expense' ? 'Ex. Loyer, Netflix' : 'Ex. Salaire'}
              className={`${field} min-w-0 flex-1 basis-40`}
            />
            <Button type="submit" variant="ghost">
              Ajouter
            </Button>
          </div>
          {day <= Number(today.slice(8)) && (
            <label className="flex min-h-9 items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                className="check"
                checked={thisMonth}
                onChange={(e) => setThisMonth(e.target.checked)}
              />
              Le {day} est passé : compter aussi ce mois-ci
            </label>
          )}
        </form>
      </div>
    </details>
  )
}
