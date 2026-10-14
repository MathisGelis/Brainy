import { useRef, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui'
import { todayISO } from '@/lib/dates'
import { parseAmountToCents } from '@/lib/money'
import type { NewExpenseInput } from './useBudget'
import type { Category } from './types'

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

type Props = { categories: Category[]; onAdd: (expense: NewExpenseInput) => void }

/** Saisie rapide : montant + puces de catégorie (dernière utilisée présélectionnée) + date du jour. */
export function ExpenseForm({ categories, onAdd }: Props) {
  const active = categories.filter((c) => !c.archived)
  const [amount, setAmount] = useState('')
  const [chosen, setChosen] = useState<string | null>(readLastCategory)
  const [date, setDate] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [invalid, setInvalid] = useState(false)
  const amountRef = useRef<HTMLInputElement>(null)

  const categoryId = active.some((c) => c.id === chosen) ? chosen : null

  function submit(e: FormEvent) {
    e.preventDefault()
    const cents = parseAmountToCents(amount)
    if (cents === null) {
      setInvalid(true)
      amountRef.current?.focus()
      return
    }
    onAdd({
      amount_cents: cents,
      category_id: categoryId,
      spent_on: date ?? todayISO(),
      note: note.trim() || null,
    })
    saveLastCategory(categoryId)
    setAmount('')
    setNote('')
    setDate(null)
    setInvalid(false)
    amountRef.current?.focus()
  }

  return (
    <form onSubmit={submit} className="mb-6 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={amountRef}
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value)
            setInvalid(false)
          }}
          inputMode="decimal"
          aria-label="Montant en euros"
          aria-invalid={invalid}
          placeholder="Montant (€)"
          autoFocus
          className={`field min-h-11 w-36 px-4 text-base font-semibold placeholder:font-normal md:min-h-10 ${invalid ? '!border-danger' : ''}`}
        />
        <input
          type="date"
          value={date ?? todayISO()}
          onChange={(e) => setDate(e.target.value || null)}
          aria-label="Date de la dépense"
          className="field min-h-11 px-3 text-muted md:min-h-10"
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          aria-label="Note"
          placeholder="Note (optionnel)"
          className="field min-h-11 min-w-0 flex-1 basis-40 px-4 md:min-h-10"
        />
        <Button type="submit">Ajouter</Button>
      </div>
      {invalid && (
        <p role="alert" className="text-danger">
          Montant invalide. Exemple : 12,50
        </p>
      )}
      <div role="group" aria-label="Catégorie" className="flex flex-wrap gap-2">
        {active.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={categoryId === c.id}
            onClick={() => setChosen(categoryId === c.id ? null : c.id)}
            className="pill min-h-10 border border-[var(--field-border)] px-4 md:min-h-9"
          >
            {c.name}
          </button>
        ))}
      </div>
    </form>
  )
}
