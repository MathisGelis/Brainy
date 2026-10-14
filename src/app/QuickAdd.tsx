import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, useToast } from '@/components/ui'
import { ExpenseForm } from '@/features/budget/ExpenseForm'
import { useBudget } from '@/features/budget/useBudget'
import { useIncomes, useRecurring } from '@/features/budget/useBudgetExtras'
import { useNotes } from '@/features/notes/useNotes'
import { AddTodoForm } from '@/features/todos/AddTodoForm'
import { useQuickTodo } from '@/features/todos/useTodos'
import { monthOf, todayISO } from '@/lib/dates'

export type QuickAddTab = 'todo' | 'note' | 'expense'

const TABS: { value: QuickAddTab; label: string }[] = [
  { value: 'todo', label: 'Todo' },
  { value: 'note', label: 'Note' },
  { value: 'expense', label: 'Budget' },
]

function TodoTab() {
  const toast = useToast()
  const addQuick = useQuickTodo({ onError: (m) => toast.show(m) })
  return (
    <AddTodoForm
      defaultDue={null}
      onAdd={(todo) => {
        addQuick(todo)
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
        className="field min-h-11 min-w-0 flex-1 px-4 md:min-h-10"
      />
      <Button type="submit">Créer</Button>
    </form>
  )
}

function ExpenseTab() {
  const toast = useToast()
  const month = monthOf(todayISO())
  const onError = (m: string) => toast.show(m)
  const { categories, addExpense } = useBudget(month, { onError })
  const { addIncome } = useIncomes(month, { onError })
  const { addRecurringEntry } = useRecurring({ onError })
  return (
    <ExpenseForm
      categories={categories}
      onAdd={(expense) => {
        addExpense(expense)
        toast.show('Dépense ajoutée')
      }}
      onAddIncome={(income) => {
        addIncome(income)
        toast.show('Revenu ajouté')
      }}
      onAddRecurring={(entry) => {
        const { rule } = addRecurringEntry(entry)
        toast.show(`Ajoutée chaque mois, le ${rule.day_of_month}`)
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
      className="glass-strong fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+160px)] z-50 mx-auto max-w-lg animate-pop rounded-[28px] p-4 md:right-8 md:bottom-28 md:left-auto md:w-[34rem] md:p-5"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div
          role="group"
          aria-label="Type d'élément"
          className="flex gap-1 rounded-full bg-surface p-1"
        >
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              aria-pressed={tab === t.value}
              onClick={() => setTab(t.value)}
              className="pill min-h-9 px-4"
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="min-h-10 rounded-full px-3 text-muted transition-colors hover:bg-surface hover:text-text"
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
