import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Checkbox, useToast } from '@/components/ui'
import { useBudget } from '@/features/budget/useBudget'
import type { Todo } from '@/features/todos/types'
import { monthOf, todayISO } from '@/lib/dates'
import { formatCents, parseAmountToCents } from '@/lib/money'
import { fold } from '@/lib/naturalDate'
import {
  formatGrams,
  pantryKey,
  parseShoppingTitle,
  shoppingNeeds,
  shoppingTitle,
  type NeedLine,
  type Quantity,
} from './shopping'
import { usePantry } from './useMealPlans'
import { useShoppingList } from './useShoppingList'

/** « Combien avez-vous payé ? » : la dépense part dans Budget, catégorie Courses si elle existe. */
function PaymentPrompt({ onDone, onError }: { onDone: () => void; onError: (m: string) => void }) {
  const toast = useToast()
  const today = todayISO()
  const { categories, addExpense, deleteExpense } = useBudget(monthOf(today), { onError })
  const [amount, setAmount] = useState('')
  const [invalid, setInvalid] = useState(false)
  const category = categories.find((c) => !c.archived && fold(c.name).startsWith('course'))

  function submit(e: FormEvent) {
    e.preventDefault()
    const cents = parseAmountToCents(amount)
    if (cents === null) {
      setInvalid(true)
      return
    }
    const id = addExpense({
      amount_cents: cents,
      category_id: category?.id ?? null,
      spent_on: today,
      note: 'Courses',
    })
    toast.show(
      `Dépense de ${formatCents(cents)} ajoutée${category ? ` dans ${category.name}` : ''}`,
      () => deleteExpense(id),
    )
    onDone()
  }

  return (
    <form
      onSubmit={submit}
      aria-label="Dépense des courses"
      className="flex flex-col gap-2 rounded-2xl bg-surface p-3 text-sm"
    >
      <p className="font-semibold">Courses terminées ! Combien avez-vous payé ?</p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value)
            setInvalid(false)
          }}
          inputMode="decimal"
          aria-label="Montant des courses en euros"
          aria-invalid={invalid}
          placeholder="54,30"
          autoFocus
          className={`field min-h-11 w-28 px-3 md:min-h-10 ${invalid ? '!border-danger' : ''}`}
        />
        <button
          type="submit"
          className="btn-primary min-h-11 rounded-full px-4 text-sm font-semibold md:min-h-10"
        >
          Ajouter la dépense
        </button>
        <button
          type="button"
          onClick={onDone}
          className="min-h-11 rounded-full px-3 text-muted transition-colors hover:text-text md:min-h-9"
        >
          Non merci
        </button>
      </div>
      {invalid && (
        <p role="alert" className="text-xs text-danger">
          Montant invalide. Exemple : 54,30
        </p>
      )}
    </form>
  )
}

/** Quantité à la maison, enregistrée en quittant le champ (ou Entrée). */
function StockInput({ line, onSave }: { line: NeedLine; onSave: (grams: number) => void }) {
  const [invalid, setInvalid] = useState(false)
  function commit(text: string) {
    const t = text.trim().replace(',', '.')
    if (t === '' && line.stock === null) return
    const n = t === '' ? 0 : Number(t)
    if (!Number.isFinite(n) || n < 0) {
      setInvalid(true)
      return
    }
    setInvalid(false)
    if (Math.round(n) !== line.stock) onSave(n)
  }
  return (
    <input
      defaultValue={line.stock ?? ''}
      inputMode="numeric"
      enterKeyHint="done"
      aria-label={`${line.name} à la maison, en grammes`}
      aria-invalid={invalid}
      placeholder="0"
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
      }}
      className={`field min-h-11 w-20 px-2 text-right tabular-nums md:min-h-9 ${invalid ? '!border-danger' : ''}`}
    />
  )
}

/** Liste de courses (liste de todos « Courses ») : cocher en magasin, ajouter, compléter depuis le menu. */
export function ShoppingCard({
  needs,
  onError,
}: {
  /** Ce que demandent les repas pas encore mangés de la semaine (à partir d'aujourd'hui) */
  needs: Quantity[]
  onError: (m: string) => void
}) {
  const toast = useToast()
  const shopping = useShoppingList({ onError })
  const { pantry, setStock, adjust } = usePantry({ onError })
  const [text, setText] = useState('')
  const [paying, setPaying] = useState(false)
  const lines = shoppingNeeds(needs, pantry)
  const toBuy = lines.filter((l) => l.toBuy > 0)
  const missing = shopping.missing(toBuy.map((l) => shoppingTitle(l.name, l.toBuy)))

  /** Un article avec quantité (« Riz — 400 g ») entre dans le stock une fois acheté. */
  const bought = (todos: Todo[], sign: 1 | -1) =>
    adjust(
      todos.flatMap((todo) => {
        const { name, grams } = parseShoppingTitle(todo.title)
        return grams ? [{ key: pantryKey(name), name, grams: sign * grams }] : []
      }),
    )

  function check(todo: Todo) {
    const last = shopping.items.length === 1
    const undo = shopping.check(todo)
    bought([todo], 1)
    toast.show(`« ${todo.title} » acheté`, () => {
      undo()
      bought([todo], -1)
    })
    if (last) setPaying(true)
  }

  function checkAll() {
    const todos = shopping.items
    const undos = todos.map((todo) => shopping.check(todo))
    bought(todos, 1)
    toast.show(`${undos.length} article${undos.length > 1 ? 's' : ''} cochés`, () => {
      undos.forEach((undo) => undo())
      bought(todos, -1)
    })
    setPaying(true)
  }

  function add(e: FormEvent) {
    e.preventDefault()
    const name = text.trim()
    if (!name) return
    const { added, undo } = shopping.add([name])
    if (added.length === 0) toast.show(`« ${name} » est déjà sur la liste`)
    else toast.show('Ajouté à la liste de courses', undo)
    setText('')
  }

  function addAll() {
    const { added, undo } = shopping.add(missing)
    toast.show(
      `${added.length} aliment${added.length > 1 ? 's' : ''} ajouté${added.length > 1 ? 's' : ''} à la liste`,
      undo,
    )
  }

  return (
    <section aria-labelledby="shopping-title" className="card mb-5 flex flex-col gap-2 p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 id="shopping-title" className="font-semibold">
          Liste de courses
        </h2>
        {shopping.list && (
          <Link
            to="/todo"
            className="flex min-h-11 items-center rounded-full px-3 text-xs text-muted transition-colors hover:bg-surface hover:text-text md:min-h-8"
          >
            Dans Todo
          </Link>
        )}
      </div>
      {missing.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-surface px-3 py-2 text-sm">
          <span className="min-w-0 flex-1">
            {missing.length === 1
              ? `À acheter pour les repas prévus : ${missing[0]}.`
              : `${missing.length} aliments à acheter pour les repas prévus : ${missing.slice(0, 4).join(', ')}${missing.length > 4 ? '…' : ''}`}
          </span>
          <button
            type="button"
            onClick={addAll}
            className="min-h-11 rounded-full px-3 font-semibold text-accent transition-colors hover:bg-surface md:min-h-9"
          >
            {missing.length === 1 ? 'Ajouter' : 'Tout ajouter'}
          </button>
        </div>
      )}
      {lines.length > 0 && (
        <details className="text-sm">
          <summary className="flex min-h-11 cursor-pointer items-center text-xs text-muted md:min-h-8">
            Quantités pour les repas prévus
            {toBuy.length === 0 ? ' · tout est à la maison' : ` · ${toBuy.length} à acheter`}
          </summary>
          <table className="mt-1 w-full text-sm">
            <caption className="sr-only">
              Besoin des repas prévus, quantité à la maison et reste à acheter
            </caption>
            <thead>
              <tr className="text-left text-xs text-muted">
                <th scope="col" className="py-1 font-normal">
                  Aliment
                </th>
                <th scope="col" className="py-1 text-right font-normal">
                  Il faut
                </th>
                <th scope="col" className="py-1 text-right font-normal">
                  À la maison (g)
                </th>
                <th scope="col" className="py-1 text-right font-normal">
                  À acheter
                </th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.key} className="border-t border-border">
                  <th scope="row" className="py-1 pr-2 text-left font-normal">
                    {l.name}
                  </th>
                  <td className="py-1 text-right tabular-nums">{formatGrams(l.grams)}</td>
                  <td className="py-1 text-right">
                    <StockInput
                      key={`${l.key}:${l.stock ?? ''}`}
                      line={l}
                      onSave={(grams) => setStock(l.name, grams)}
                    />
                  </td>
                  <td
                    className={`py-1 text-right tabular-nums ${l.toBuy > 0 ? 'font-semibold' : 'text-muted'}`}
                  >
                    {l.toBuy > 0 ? formatGrams(l.toBuy) : 'Assez'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
      {paying && <PaymentPrompt onDone={() => setPaying(false)} onError={onError} />}
      {shopping.items.length === 0 ? (
        !paying && <p className="text-sm text-muted">La liste est vide.</p>
      ) : (
        <ul>
          {shopping.items.map((todo) => (
            <li
              key={todo.id}
              className="flex items-center gap-1 border-b border-border last:border-b-0"
            >
              <Checkbox
                hideLabel
                label={`Acheté : ${todo.title}`}
                checked={false}
                onChange={() => check(todo)}
              />
              <span className="min-w-0 flex-1">{todo.title}</span>
              <button
                type="button"
                onClick={() => toast.show('Retiré de la liste', shopping.remove(todo))}
                aria-label={`Retirer « ${todo.title} » de la liste de courses`}
                className="min-h-11 min-w-11 rounded-full text-muted transition-colors hover:text-danger md:min-h-9 md:min-w-9"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      {shopping.items.length > 1 && (
        <button
          type="button"
          onClick={checkAll}
          className="min-h-11 self-start rounded-full px-3 text-xs text-muted transition-colors hover:bg-surface hover:text-text md:min-h-8"
        >
          Tout acheté
        </button>
      )}
      <form onSubmit={add}>
        <input
          enterKeyHint="send"
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="Ajouter à la liste de courses"
          placeholder="Ajouter un article…"
          className="field min-h-11 w-full px-4 md:min-h-10"
        />
      </form>
    </section>
  )
}
