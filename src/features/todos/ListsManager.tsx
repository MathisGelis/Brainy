import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui'
import type { TodoList } from './types'

type Props = {
  lists: TodoList[]
  onAdd: (name: string) => void
  onRename: (id: string, name: string) => void
  onDelete: (list: TodoList) => void
}

/** Gestion discrète des listes : créer, renommer, supprimer (les todos restent, sans liste). */
export function ListsManager({ lists, onAdd, onRename, onDelete }: Props) {
  const [name, setName] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    onAdd(name)
    setName('')
  }

  return (
    <details className="mt-8">
      <summary className="min-h-11 cursor-pointer content-center text-muted hover:text-text">
        Listes et projets
      </summary>
      <div className="mt-2 flex flex-col gap-2">
        <ul className="flex flex-col gap-2">
          {lists.map((l) => (
            <li key={l.id} className="flex items-center gap-2">
              <input
                key={l.name}
                defaultValue={l.name}
                aria-label={`Nom de la liste ${l.name}`}
                onBlur={(e) => {
                  const value = e.target.value.trim()
                  if (value && value !== l.name) onRename(l.id, value)
                  else e.target.value = l.name
                }}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                className="field min-h-11 min-w-0 flex-1 px-3 md:min-h-10"
              />
              <button
                type="button"
                onClick={() => onDelete(l)}
                aria-label={`Supprimer la liste ${l.name}`}
                className="min-h-11 rounded-full px-3 text-xs text-muted transition-colors hover:text-danger md:min-h-9"
              >
                Supprimer
              </button>
            </li>
          ))}
        </ul>
        <form onSubmit={submit} className="flex gap-2">
          <input
            enterKeyHint="send"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Nouvelle liste"
            placeholder="Nouvelle liste…"
            className="field min-h-11 min-w-0 flex-1 px-3 md:min-h-10"
          />
          <Button type="submit" variant="ghost">
            Ajouter
          </Button>
        </form>
        <p className="text-xs text-muted">
          Astuce : tapez « #nom » dans une todo pour la ranger (la liste est créée au besoin).
        </p>
      </div>
    </details>
  )
}
