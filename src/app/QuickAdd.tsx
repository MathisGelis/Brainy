import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, useToast } from '@/components/ui'
import { ExpenseForm } from '@/features/budget/ExpenseForm'
import { useBudget } from '@/features/budget/useBudget'
import { useNotes } from '@/features/notes/useNotes'
import { AddTodoForm } from '@/features/todos/AddTodoForm'
import { useTodos } from '@/features/todos/useTodos'
import { monthOf, todayISO } from '@/lib/dates'

export type QuickAddTab = 'todo' | 'note' | 'expense'

const TABS: { value: QuickAddTab; label: string }[] = [
  { value: 'todo', label: 'Todo' },
  { value: 'note', label: 'Note' },
  { value: 'expense', label: 'Dépense' },
]

function TodoTab() {
  const toast = useToast()
  const { addTodo } = useTodos({ onError: (m) => toast.show(m) })
  return (
    <AddTodoForm
      defaultDue={null}
      onAdd={(todo) => {
        addTodo(todo)
        toast.show('Todo ajoutée')
      }}
    />
  )
}

function NoteTab({ onDone }: { onDone: () => void }) {
  const toast = useToast()
  const navigate = useNavigate()
  const { createNote } = useNotes({ onError: (m) => toast.show(m) })
  const [title, setTitle] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    navigate(`/notes/${createNote(title.trim())}`)
    onDone()
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        aria-label="Titre de la nouvelle note"
        placeholder="Titre de la note…"
        autoFocus
        className="min-h-11 min-w-0 flex-1 rounded border border-border bg-bg px-3 text-text placeholder:text-muted md:min-h-9"
      />
      <Button type="submit">Créer</Button>
    </form>
  )
}

function ExpenseTab() {
  const toast = useToast()
  const { categories, addExpense } = useBudget(monthOf(todayISO()), {
    onError: (m) => toast.show(m),
  })
  return (
    <ExpenseForm
      categories={categories}
      onAdd={(expense) => {
        addExpense(expense)
        toast.show('Dépense ajoutée')
      }}
    />
  )
}

/** Panneau d'ajout rapide (non modal) : todo, note ou dépense en quelques touches. */
export default function QuickAdd({
  initialTab,
  onClose,
}: {
  initialTab: QuickAddTab
  onClose: () => void
}) {
  const [tab, setTab] = useState<QuickAddTab>(initialTab)

  return (
    <div
      role="dialog"
      aria-label="Ajout rapide"
      className="fixed inset-x-4 bottom-36 z-50 mx-auto max-w-lg rounded border border-border bg-bg p-4 md:right-6 md:bottom-24 md:left-auto md:w-[32rem]"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div role="group" aria-label="Type d'élément" className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              aria-pressed={tab === t.value}
              onClick={() => setTab(t.value)}
              className={`min-h-11 rounded px-3 md:min-h-9 ${
                tab === t.value
                  ? 'bg-surface font-semibold text-accent'
                  : 'text-muted hover:text-text'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 px-2 text-muted hover:text-text md:min-h-9"
        >
          Fermer
        </button>
      </div>
      {tab === 'todo' && <TodoTab />}
      {tab === 'note' && <NoteTab onDone={onClose} />}
      {tab === 'expense' && <ExpenseTab />}
    </div>
  )
}
