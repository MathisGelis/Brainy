import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui'
import { centsToInput, parseAmountToCents } from '@/lib/money'
import type { Category, CategoryPatch } from './types'

type Props = {
  categories: Category[]
  onAdd: (name: string) => void
  onAddDefaults: () => void
  onUpdate: (id: string, patch: CategoryPatch) => void
  /** Supprime la catégorie (ses dépenses restent, sans catégorie) */
  onDelete: (category: Category) => void
}

/** Gestion discrète : nom, budget mensuel (optionnel) et archivage de chaque catégorie. */
export function CategoriesManager({ categories, onAdd, onAddDefaults, onUpdate, onDelete }: Props) {
  const [name, setName] = useState('')
  const field = 'field min-h-11 px-3 md:min-h-10'

  function submit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setName('')
  }

  return (
    <details className="mt-8">
      <summary className="min-h-11 cursor-pointer content-center text-muted hover:text-text">
        Catégories et budgets
      </summary>
      <div className="mt-2 flex flex-col gap-3">
        {categories.length === 0 && (
          <Button variant="ghost" onClick={onAddDefaults} className="self-start">
            Ajouter les catégories suggérées
          </Button>
        )}
        <ul className="flex flex-col gap-2">
          {categories.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-2">
              <input
                defaultValue={c.name}
                aria-label={`Nom de la catégorie ${c.name}`}
                onBlur={(e) => {
                  const value = e.target.value.trim()
                  if (value && value !== c.name) onUpdate(c.id, { name: value })
                  else e.target.value = c.name
                }}
                className={`${field} min-w-0 flex-1 basis-32 ${c.archived ? 'text-muted' : ''}`}
              />
              <input
                defaultValue={
                  c.monthly_budget_cents === null ? '' : centsToInput(c.monthly_budget_cents)
                }
                inputMode="decimal"
                aria-label={`Budget mensuel de ${c.name}`}
                placeholder="Budget (€)"
                onBlur={(e) => {
                  const raw = e.target.value.trim()
                  const cents = raw === '' ? null : parseAmountToCents(raw)
                  if (raw !== '' && cents === null) {
                    e.target.value =
                      c.monthly_budget_cents === null ? '' : centsToInput(c.monthly_budget_cents)
                    return
                  }
                  if (cents !== c.monthly_budget_cents)
                    onUpdate(c.id, { monthly_budget_cents: cents })
                }}
                className={`${field} w-28`}
              />
              <button
                type="button"
                onClick={() => onUpdate(c.id, { archived: !c.archived })}
                className="min-h-11 rounded-full px-3 text-xs text-muted transition-colors hover:text-text md:min-h-9"
              >
                {c.archived ? 'Restaurer' : 'Archiver'}
              </button>
              <button
                type="button"
                onClick={() => onDelete(c)}
                aria-label={`Supprimer la catégorie ${c.name}`}
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
            aria-label="Nouvelle catégorie"
            placeholder="Nouvelle catégorie…"
            className={`${field} min-w-0 flex-1`}
          />
          <Button type="submit" variant="ghost">
            Ajouter
          </Button>
        </form>
      </div>
    </details>
  )
}
