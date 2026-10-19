import { useState, type FormEvent } from 'react'
import { Button, Select } from '@/components/ui'
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
  const [editing, setEditing] = useState(false)
  const label =
    rule.note ||
    (rule.kind === 'income'
      ? 'Revenu'
      : (categories.find((c) => c.id === rule.category_id)?.name ?? 'Dépense'))
  if (!editing) {
    return (
      <li className="flex min-h-12 items-center gap-3 border-b border-border last:border-b-0">
        <span className={`min-w-0 flex-1 truncate ${rule.active ? '' : 'text-muted'}`}>
          <span className="text-muted">↻ </span>
          {label}
          {!rule.active && <span className="text-xs text-muted"> · en pause</span>}
        </span>
        <span className="shrink-0 text-xs text-muted">le {rule.day_of_month}</span>
        <span
          className={`w-24 shrink-0 text-right font-semibold ${rule.kind === 'income' ? 'text-success' : ''}`}
        >
          {rule.kind === 'income' ? '+' : ''}
          {formatCents(rule.amount_cents)}
        </span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={`Modifier la récurrence « ${label} »`}
          className="min-h-11 shrink-0 rounded-full px-3 text-xs text-muted transition-colors hover:bg-surface hover:text-text md:min-h-9"
        >
          Modifier
        </button>
      </li>
    )
  }

  return (
    <li className="card my-2 flex flex-col gap-2 p-3">
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
          <Select
            label={`Catégorie de « ${label} »`}
            value={rule.category_id ?? ''}
            onChange={(v) => onUpdate(rule.id, { category_id: v || null })}
            options={[
              { value: '', label: 'Sans catégorie' },
              ...categories
                .filter((c) => !c.archived || c.id === rule.category_id)
                .map((c) => ({ value: c.id, label: c.name })),
            ]}
            className={field}
          />
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
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="min-h-9 rounded-full px-3 font-semibold text-accent transition-colors hover:bg-surface"
          >
            OK
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

  const active = rules.filter((r) => r.active)
  const fixedOut = active
    .filter((r) => r.kind === 'expense')
    .reduce((sum, r) => sum + r.amount_cents, 0)
  const fixedIn = active
    .filter((r) => r.kind === 'income')
    .reduce((sum, r) => sum + r.amount_cents, 0)

  return (
    <section aria-labelledby="recurring-title" className="mt-8">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="recurring-title" className="text-xs font-semibold text-muted uppercase">
          Dépenses et revenus récurrents
        </h3>
        {rules.length > 0 && (
          <p className="text-xs text-muted">
            Charges fixes {formatCents(fixedOut)} / mois
            {fixedIn > 0 && ` · revenus fixes ${formatCents(fixedIn)} / mois`}
          </p>
        )}
      </div>
      {rules.length === 0 && (
        <p className="text-muted">
          Aucune récurrence. Tapez « 900 loyer le 5 tous les mois » ou activez « ↻ Chaque mois » en
          haut.
        </p>
      )}
      <div className="flex flex-col gap-3">
        {rules.length > 0 && (
          <ul className="flex flex-col">
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
        <details>
          <summary className="min-h-11 cursor-pointer content-center text-xs text-muted hover:text-text">
            Ajouter une récurrence en détail
          </summary>
          <form onSubmit={submit} className="card mt-2 flex flex-col gap-2 p-3">
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
                <Select
                  label="Catégorie récurrente"
                  value={categoryId}
                  onChange={setCategoryId}
                  options={[
                    { value: '', label: 'Sans catégorie' },
                    ...categories
                      .filter((c) => !c.archived)
                      .map((c) => ({ value: c.id, label: c.name })),
                  ]}
                  className={field}
                />
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
        </details>
      </div>
    </section>
  )
}
