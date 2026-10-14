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
        className="field min-h-11 min-w-0 flex-1 basis-60 px-4 md:min-h-10"
      />
      <input
        type="date"
        value={due ?? defaultDue ?? ''}
        onChange={(e) => setDue(e.target.value || null)}
        aria-label="Échéance"
        className="field min-h-11 px-3 text-muted md:min-h-10"
      />
      <button
        type="button"
        aria-pressed={high}
        aria-label="Priorité haute"
        onClick={() => setHigh((v) => !v)}
        className="pill min-h-11 min-w-11 border border-[var(--field-border)] font-semibold md:min-h-10 md:min-w-10"
      >
        !
      </button>
      <Button type="submit">Ajouter</Button>
    </form>
  )
}
