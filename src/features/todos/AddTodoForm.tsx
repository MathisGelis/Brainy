import { Button } from '@/components/ui'
import { useRef, useState, type FormEvent } from 'react'
import type { Priority } from './types'

type Props = {
  /** Échéance pré-remplie (ex. aujourd'hui quand le filtre « Aujourd'hui » est actif). */
  defaultDue: string | null
  onAdd: (todo: { title: string; due_date: string | null; priority: Priority }) => void
}

/** Champ toujours visible : Entrée valide et le focus reste pour enchaîner. */
export function AddTodoForm({ defaultDue, onAdd }: Props) {
  const [title, setTitle] = useState('')
  const [due, setDue] = useState<string | null>(null)
  const [high, setHigh] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function submit(e: FormEvent) {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    onAdd({ title: trimmed, due_date: due ?? defaultDue, priority: high ? 'high' : 'normal' })
    setTitle('')
    setDue(null)
    setHigh(false)
    inputRef.current?.focus()
  }

  return (
    <form onSubmit={submit} className="mb-4 flex flex-wrap items-center gap-2">
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        aria-label="Nouvelle todo"
        placeholder="Ajouter une todo…"
        autoFocus
        className="min-h-11 min-w-0 flex-1 basis-60 rounded border border-border bg-bg px-3 text-text placeholder:text-muted md:min-h-9"
      />
      <input
        type="date"
        value={due ?? defaultDue ?? ''}
        onChange={(e) => setDue(e.target.value || null)}
        aria-label="Échéance"
        className="min-h-11 rounded border border-border bg-bg px-2 text-muted md:min-h-9"
      />
      <button
        type="button"
        aria-pressed={high}
        aria-label="Priorité haute"
        onClick={() => setHigh((v) => !v)}
        className={`min-h-11 min-w-11 rounded border font-semibold md:min-h-9 md:min-w-9 ${
          high ? 'border-accent text-accent' : 'border-border text-muted'
        }`}
      >
        !
      </button>
      <Button type="submit">Ajouter</Button>
    </form>
  )
}
