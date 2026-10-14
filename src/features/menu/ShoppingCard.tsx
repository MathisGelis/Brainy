import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Checkbox, useToast } from '@/components/ui'
import { useShoppingList } from './useShoppingList'

/** Liste de courses (liste de todos « Courses ») : cocher en magasin, ajouter, compléter depuis le menu. */
export function ShoppingCard({
  weekFoods,
  onError,
}: {
  /** Aliments prévus cette semaine (à partir d'aujourd'hui) */
  weekFoods: string[]
  onError: (m: string) => void
}) {
  const toast = useToast()
  const shopping = useShoppingList({ onError })
  const [text, setText] = useState('')
  const missing = shopping.missing(weekFoods)

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
              ? `« ${missing[0]} » est au menu mais pas sur la liste.`
              : `${missing.length} aliments du menu de la semaine ne sont pas sur la liste : ${missing.slice(0, 4).join(', ')}${missing.length > 4 ? '…' : ''}`}
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
      {shopping.items.length === 0 ? (
        <p className="text-sm text-muted">La liste est vide.</p>
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
                onChange={() => toast.show(`« ${todo.title} » acheté`, shopping.check(todo))}
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
      <form onSubmit={add}>
        <input
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
