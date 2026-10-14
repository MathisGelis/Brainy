import { useRef, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui'
import { formatDue, todayISO } from '@/lib/dates'
import { formatCents } from '@/lib/money'
import { parseEntryInput } from './parseEntryInput'
import { occurrenceIn } from './recurringLogic'
import type { NewIncomeInput, NewRecurringEntryInput } from './useBudgetExtras'
import type { NewExpenseInput } from './useBudget'
import type { Category, EntryKind } from './types'
import { useCategoryGuess } from './useCategoryGuess'

const LAST_CATEGORY_KEY = 'cockpit.lastCategory'

function readLastCategory(): string | null {
  try {
    return localStorage.getItem(LAST_CATEGORY_KEY)
  } catch {
    return null
  }
}

function saveLastCategory(id: string | null) {
  try {
    if (id) localStorage.setItem(LAST_CATEGORY_KEY, id)
  } catch {
    /* stockage indisponible : on ignore */
  }
}

type Props = {
  categories: Category[]
  onAdd: (expense: NewExpenseInput) => void
  /** Absent : formulaire limité aux dépenses */
  onAddIncome?: (income: NewIncomeInput) => void
  /** Absent : pas d'option « Chaque mois » */
  onAddRecurring?: (entry: NewRecurringEntryInput) => void
}

const chip = 'rounded-full bg-surface px-2.5 py-1 text-xs text-text'

/**
 * Saisie rapide en langage naturel : « 12,50 resto hier », « +2400 salaire ».
 * Catégorie : choix manuel > mot-clé tapé > habitude tirée de l'historique > dernière utilisée.
 * Date du jour par défaut.
 */
export function ExpenseForm({ categories, onAdd, onAddIncome, onAddRecurring }: Props) {
  const active = categories.filter((c) => !c.archived)
  const [kind, setKind] = useState<EntryKind>('expense')
  const [text, setText] = useState('')
  const [lastUsed, setLastUsed] = useState<string | null>(readLastCategory)
  // Puce choisie pour cette saisie (undefined : pas encore touché aux puces)
  const [picked, setPicked] = useState<string | null | undefined>(undefined)
  const [date, setDate] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [invalid, setInvalid] = useState(false)
  const [monthlyToggle, setMonthlyToggle] = useState(false)
  const amountRef = useRef<HTMLInputElement>(null)

  const today = todayISO()
  const parsed = text.trim() ? parseEntryInput(text, categories, today) : null
  const effectiveKind: EntryKind =
    parsed?.kind === 'income' || (kind === 'income' && onAddIncome) ? 'income' : 'expense'
  const guess = useCategoryGuess(categories)
  const isActive = (id: string | null | undefined) => active.some((c) => c.id === id)
  // Tes habitudes passent avant les mots-clés génériques, jamais avant le nom exact d'une catégorie
  const guessedId =
    parsed?.category_source === 'name' ? null : guess(note.trim() || parsed?.note || null)
  const autoId = guessedId ?? parsed?.category_id ?? null
  const categoryId =
    picked !== undefined
      ? isActive(picked)
        ? picked
        : null
      : (autoId ?? (isActive(lastUsed) ? lastUsed : null))
  const shownCategory = picked === undefined ? categories.find((c) => c.id === autoId) : undefined
  const monthly = Boolean(onAddRecurring) && (monthlyToggle || Boolean(parsed?.monthly))
  const monthDay = parsed?.dayOfMonth ?? Number((parsed?.spent_on ?? date ?? today).slice(8))

  function submit(e: FormEvent) {
    e.preventDefault()
    const cents = parsed?.amount_cents ?? null
    if (cents === null) {
      setInvalid(true)
      amountRef.current?.focus()
      return
    }
    const when = parsed?.spent_on ?? date ?? today
    const finalNote = note.trim() || parsed?.note || null
    if (monthly && onAddRecurring) {
      // « le 20 » pas encore arrivé ce mois-ci : la récurrence démarre le 20, rien à compter aujourd'hui
      const firstOn = parsed?.dayOfMonth ? occurrenceIn(today.slice(0, 7), parsed.dayOfMonth) : when
      onAddRecurring({
        kind: effectiveKind,
        amount_cents: cents,
        category_id: effectiveKind === 'expense' ? categoryId : null,
        note: finalNote,
        day_of_month: monthDay,
        first_on: firstOn <= today ? firstOn : null,
      })
      if (effectiveKind === 'expense') remember(categoryId)
    } else if (effectiveKind === 'income' && onAddIncome) {
      onAddIncome({ amount_cents: cents, received_on: when, note: finalNote })
    } else {
      onAdd({ amount_cents: cents, category_id: categoryId, spent_on: when, note: finalNote })
      remember(categoryId)
    }
    setText('')
    setNote('')
    setDate(null)
    setInvalid(false)
    setMonthlyToggle(false)
    setPicked(undefined)
    amountRef.current?.focus()
  }

  function remember(id: string | null) {
    saveLastCategory(id)
    if (id) setLastUsed(id)
  }

  return (
    <form onSubmit={submit} className="mb-6 flex flex-col gap-3">
      {onAddIncome && (
        <div
          role="group"
          aria-label="Type"
          className="flex w-fit gap-1 rounded-full bg-surface p-1"
        >
          {(['expense', 'income'] as const).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={effectiveKind === k}
              onClick={() => setKind(k)}
              className="pill min-h-9 px-4"
            >
              {k === 'expense' ? 'Dépense' : 'Revenu'}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={amountRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setInvalid(false)
          }}
          aria-label="Montant en euros"
          aria-describedby="entry-hint"
          aria-invalid={invalid}
          placeholder={effectiveKind === 'income' ? '2400 salaire' : '12,50 resto hier'}
          autoFocus
          className={`field min-h-11 min-w-0 flex-1 basis-48 px-4 text-base font-semibold placeholder:font-normal md:min-h-10 ${
            invalid ? '!border-danger' : ''
          }`}
        />
        <input
          type="date"
          value={date ?? today}
          onChange={(e) => setDate(e.target.value || null)}
          aria-label="Date"
          className="field min-h-11 px-3 text-muted md:min-h-10"
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          aria-label="Note"
          placeholder="Note (optionnel)"
          className="field min-h-11 min-w-0 flex-1 basis-40 px-4 md:min-h-10"
        />
        {onAddRecurring && (
          <button
            type="button"
            aria-pressed={monthly}
            onClick={() => setMonthlyToggle((v) => !v)}
            className="pill min-h-11 border border-[var(--field-border)] px-4 md:min-h-10"
          >
            ↻ Chaque mois
          </button>
        )}
        <Button type="submit">Ajouter</Button>
      </div>
      <p id="entry-hint" aria-live="polite" className="flex min-h-7 flex-wrap items-center gap-1.5">
        {invalid ? (
          <span role="alert" className="text-danger">
            Montant invalide. Exemple : 12,50
          </span>
        ) : (
          parsed?.amount_cents != null && (
            <>
              <span className="sr-only">Compris :</span>
              <span className={`${chip} font-semibold`}>
                {effectiveKind === 'income' ? '+' : ''}
                {formatCents(parsed.amount_cents)}
              </span>
              {effectiveKind === 'income' && <span className={chip}>Revenu</span>}
              {shownCategory && (
                <span className={chip}>
                  {shownCategory.name}
                  {guessedId === shownCategory.id && (
                    <span className="text-muted"> · d'après l'historique</span>
                  )}
                </span>
              )}
              {parsed.spent_on && <span className={chip}>{formatDue(parsed.spent_on, today)}</span>}
              {parsed.note && <span className={chip}>« {parsed.note} »</span>}
              {monthly && (
                <span className={`${chip} text-accent`}>↻ Chaque mois, le {monthDay}</span>
              )}
            </>
          )
        )}
      </p>
      {effectiveKind === 'expense' && (
        <div role="group" aria-label="Catégorie" className="flex flex-wrap gap-2">
          {active.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={categoryId === c.id}
              onClick={() => setPicked(categoryId === c.id ? null : c.id)}
              className="pill min-h-10 border border-[var(--field-border)] px-4 md:min-h-9"
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
    </form>
  )
}
