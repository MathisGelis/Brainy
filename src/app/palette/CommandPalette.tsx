import { useEffect, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/components/ui'
import { parseEntryInput } from '@/features/budget/parseEntryInput'
import { useBudget } from '@/features/budget/useBudget'
import { useIncomes, useMonthExpenses } from '@/features/budget/useBudgetExtras'
import { useGoals } from '@/features/goals/useGoals'
import { useHabits } from '@/features/habits/useHabits'
import { snippet } from '@/features/notes/notesLogic'
import { useNotes } from '@/features/notes/useNotes'
import { parseTodoInput } from '@/features/todos/parseTodoInput'
import { serializeRecurrence } from '@/features/todos/recurrence'
import { useQuickTodo, useTodos } from '@/features/todos/useTodos'
import { addMonths, formatDayMonth, formatDue, monthOf, todayISO } from '@/lib/dates'
import { formatCents } from '@/lib/money'
import { useTheme } from '@/lib/theme'
import { navItems } from '../navItems'
import type { QuickAddTab } from '../QuickAdd'
import { searchPalette, type PaletteItem } from './paletteSearch'

type Props = {
  onClose: () => void
  onQuickAdd: (tab: QuickAddTab) => void
  onHelp: () => void
}

/** Palette de commandes (Cmd/Ctrl+K) : aller à, créer, rechercher dans tout. */
export default function CommandPalette({ onClose, onQuickAdd, onHelp }: Props) {
  const navigate = useNavigate()
  const toast = useToast()
  const onError = (m: string) => toast.show(m)
  const today = todayISO()
  const month = monthOf(today)

  const { todos } = useTodos({ onError })
  const addTodo = useQuickTodo({ onError })
  const { notes, createNote, openDailyNote } = useNotes({ onError })
  const { goals } = useGoals({ onError })
  const { habits } = useHabits({ onError })
  const { expenses, categories, addExpense } = useBudget(month, { onError })
  const previousExpenses = useMonthExpenses(addMonths(month, -1))
  const { addIncome } = useIncomes(month, { onError })
  const { toggle: toggleTheme } = useTheme()

  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  const go = (path: string) => () => {
    navigate(path)
    onClose()
  }
  const then = (action: () => void) => () => {
    onClose()
    action()
  }
  const categoryName = (id: string | null) => categories.find((c) => c.id === id)?.name

  const commands: PaletteItem[] = [
    ...navItems.map((n) => ({
      id: `go-${n.to}`,
      group: 'Commandes' as const,
      label: `Aller à ${n.label}`,
      run: go(n.to),
    })),
    {
      id: 'new-todo',
      group: 'Commandes',
      label: 'Nouvelle todo',
      keywords: 'ajouter créer tâche',
      run: then(() => onQuickAdd('todo')),
    },
    {
      id: 'new-note',
      group: 'Commandes',
      label: 'Nouvelle note',
      keywords: 'ajouter créer',
      run: then(() => onQuickAdd('note')),
    },
    {
      id: 'new-expense',
      group: 'Commandes',
      label: 'Nouvelle dépense ou revenu',
      keywords: 'ajouter budget',
      run: then(() => onQuickAdd('expense')),
    },
    {
      id: 'daily-note',
      group: 'Commandes',
      label: 'Note du jour',
      keywords: 'journal',
      // la note n'est créée qu'à l'exécution
      run: () => {
        navigate(`/notes/${openDailyNote(today)}`)
        onClose()
      },
    },
    {
      id: 'review',
      group: 'Commandes',
      label: 'Revue de la semaine',
      keywords: 'bilan hebdomadaire',
      run: go('/revue'),
    },
    {
      id: 'calendar',
      group: 'Commandes',
      label: 'Calendrier',
      keywords: 'mois agenda jour planning',
      run: go('/calendrier'),
    },
    {
      id: 'top3',
      group: 'Commandes',
      label: 'Top 3 du jour',
      keywords: 'priorités focus',
      run: go('/'),
    },
    {
      id: 'ritual',
      group: 'Commandes',
      label: 'Rituel du soir',
      keywords: 'journée demain bilan',
      run: go('/rituel'),
    },
    {
      id: 'theme',
      group: 'Commandes',
      label: 'Basculer le thème',
      keywords: 'sombre clair dark light',
      run: then(toggleTheme),
    },
    {
      id: 'help',
      group: 'Commandes',
      label: 'Raccourcis clavier',
      keywords: 'aide',
      run: then(onHelp),
    },
  ]

  const data: PaletteItem[] = [
    ...todos
      .filter((t) => !t.done)
      .map((t) => ({
        id: `todo-${t.id}`,
        group: 'Todos' as const,
        label: t.title,
        hint: t.due_date ? formatDue(t.due_date, today) : undefined,
        run: go('/todo'),
      })),
    ...notes.map((n) => ({
      id: `note-${n.id}`,
      group: 'Notes' as const,
      label: n.title || 'Sans titre',
      hint: snippet(n.content, 40) || undefined,
      keywords: `${n.content.slice(0, 2000)} ${n.tags.join(' ')}`,
      run: go(`/notes/${n.id}`),
    })),
    ...goals.map((g) => ({
      id: `goal-${g.id}`,
      group: 'Objectifs' as const,
      label: g.title,
      run: go('/objectifs'),
    })),
    ...habits
      .filter((h) => !h.archived)
      .map((h) => ({
        id: `habit-${h.id}`,
        group: 'Habitudes' as const,
        label: h.name,
        run: go(`/habitudes/${h.id}`),
      })),
    ...[...expenses, ...previousExpenses].map((e) => ({
      id: `expense-${e.id}`,
      group: 'Dépenses' as const,
      label: e.note || categoryName(e.category_id) || 'Dépense',
      hint: `${formatCents(e.amount_cents)} · ${formatDayMonth(e.spent_on)}`,
      keywords: categoryName(e.category_id),
      run: go('/budget'),
    })),
  ]

  const text = query.trim()
  const create: PaletteItem[] = []
  if (text) {
    const todo = parseTodoInput(text, today)
    create.push({
      id: 'create-todo',
      group: 'Créer',
      label: `Créer la todo « ${todo.title} »`,
      hint: todo.due_date ? formatDue(todo.due_date, today) : undefined,
      run: then(() => {
        addTodo({
          title: todo.title,
          due_date: todo.due_date,
          priority: todo.priority,
          recurrence: serializeRecurrence(todo.recurrence),
          listName: todo.listName,
        })
        toast.show('Todo ajoutée')
      }),
    })
    create.push({
      id: 'create-note',
      group: 'Créer',
      label: `Créer la note « ${text} »`,
      run: () => {
        navigate(`/notes/${createNote(text)}`)
        onClose()
      },
    })
    const entry = parseEntryInput(text, categories, today)
    if (entry.amount_cents !== null) {
      const amount = entry.amount_cents
      const income = entry.kind === 'income'
      create.push({
        id: 'create-entry',
        group: 'Créer',
        label: `${income ? 'Ajouter le revenu' : 'Ajouter la dépense'} de ${formatCents(amount)}`,
        hint:
          [categoryName(entry.category_id), entry.note].filter(Boolean).join(' · ') || undefined,
        run: then(() => {
          if (income)
            addIncome({
              amount_cents: amount,
              received_on: entry.spent_on ?? today,
              note: entry.note,
            })
          else
            addExpense({
              amount_cents: amount,
              category_id: entry.category_id,
              spent_on: entry.spent_on ?? today,
              note: entry.note,
            })
          toast.show(income ? 'Revenu ajouté' : 'Dépense ajoutée')
        }),
      })
    }
  }

  const results = searchPalette([...commands, ...data], create, query)
  const current = Math.min(active, Math.max(results.length - 1, 0))

  useEffect(() => {
    document.getElementById(`palette-opt-${current}`)?.scrollIntoView?.({ block: 'nearest' })
  }, [current])

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((current + 1) % Math.max(results.length, 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((current - 1 + results.length) % Math.max(results.length, 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      results[current]?.run()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/25 px-3 pt-[10vh] backdrop-blur-[3px]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Palette de commandes"
        className="glass-strong w-full max-w-xl animate-pop rounded-[26px] p-2"
      >
        <input
          autoFocus
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-list"
          aria-autocomplete="list"
          aria-activedescendant={results.length > 0 ? `palette-opt-${current}` : undefined}
          aria-label="Rechercher ou créer"
          placeholder="Rechercher, aller à, créer… (« Appeler Léa demain », « 12 resto »)"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
          }}
          onKeyDown={onKeyDown}
          className="field min-h-12 w-full px-4 text-base"
        />
        <ul
          id="palette-list"
          role="listbox"
          aria-label="Résultats"
          className="mt-2 max-h-[55vh] overflow-y-auto"
        >
          {results.length === 0 && <li className="px-4 py-3 text-muted">Aucun résultat.</li>}
          {results.map((item, i) => {
            const header = i === 0 || results[i - 1]!.group !== item.group
            return (
              <li key={item.id} role="presentation">
                {header && (
                  <p
                    role="presentation"
                    className="px-3 pt-2 pb-1 text-xs font-semibold text-muted uppercase"
                  >
                    {item.group}
                  </p>
                )}
                <div
                  id={`palette-opt-${i}`}
                  role="option"
                  aria-selected={i === current}
                  onMouseMove={() => setActive(i)}
                  onClick={() => item.run()}
                  className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl px-3 ${
                    i === current ? 'bg-surface text-text' : ''
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.hint && (
                    <span className="shrink-0 truncate text-xs text-muted">{item.hint}</span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
        <p className="hidden px-3 pt-2 pb-1 text-xs text-muted md:block">
          ↑ ↓ naviguer · Entrée valider · Échap fermer
        </p>
      </div>
    </div>
  )
}
