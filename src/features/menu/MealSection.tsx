import { useState, type FormEvent } from 'react'
import { grams as g, MEALS, rescaleItem } from './nutrition'
import type { Meal, MealItem, MealItemPatch } from './types'

const small =
  'min-h-11 rounded-full px-3 text-xs text-muted transition-colors hover:bg-surface hover:text-text md:min-h-9'
const field = 'field min-h-11 px-3 md:min-h-10'

type RowProps = {
  item: MealItem
  /** À acheter pour cet élément et absent de la liste de courses (vide : rien à proposer) */
  missing: string[]
  onUpdate: (id: string, patch: MealItemPatch) => void
  onDelete: (item: MealItem) => void
  onShop: (names: string[]) => void
}

function MealItemRow({ item, missing, onUpdate, onDelete, onShop }: RowProps) {
  const [editing, setEditing] = useState(false)
  const [invalid, setInvalid] = useState(false)

  if (!editing) {
    return (
      <li className="flex items-center gap-1 border-b border-border last:border-b-0">
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={`Modifier « ${item.name} », ${item.grams} g`}
          className="-mx-2 flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-xl px-2 text-left transition-colors hover:bg-surface"
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate">
              {item.name}
              {item.recipe_id && <span className="text-xs text-muted"> · recette</span>}
            </span>
            <span className="block text-xs text-muted">
              {item.grams} g · P {g(item.protein_dg)} · G {g(item.carbs_dg)} · L {g(item.fat_dg)}
            </span>
          </span>
          <span className="text-sm font-semibold tabular-nums">{item.kcal} kcal</span>
        </button>
        {missing.length > 0 && (
          <button
            type="button"
            onClick={() => onShop(missing)}
            aria-label={
              item.recipe_id
                ? `Ajouter les ingrédients de « ${item.name} » à la liste de courses`
                : `Ajouter « ${missing[0]} » à la liste de courses`
            }
            title="Ajouter à la liste de courses"
            className={`${small} text-accent`}
          >
            + Courses
          </button>
        )}
      </li>
    )
  }

  return (
    <li className="my-1 flex flex-wrap items-center gap-2 rounded-2xl bg-surface p-2">
      <span className="min-w-0 flex-1 basis-full truncate text-sm font-semibold md:basis-auto">
        {item.name}
      </span>
      <label className="flex items-center gap-1 text-xs text-muted">
        <input
          defaultValue={item.grams}
          inputMode="numeric"
          aria-label={`Quantité de « ${item.name} » en grammes`}
          aria-invalid={invalid}
          onBlur={(e) => {
            const n = Number(e.target.value)
            const ok = Number.isInteger(n) && n >= 1 && n <= 5000
            setInvalid(!ok)
            if (ok && n !== item.grams) onUpdate(item.id, { grams: n, ...rescaleItem(item, n) })
          }}
          className={`${field} w-24 text-text ${invalid ? '!border-danger' : ''}`}
        />
        g
      </label>
      <select
        aria-label={`Repas de « ${item.name} »`}
        value={item.meal}
        onChange={(e) => onUpdate(item.id, { meal: e.target.value as Meal })}
        className={field}
      >
        {MEALS.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </select>
      <button type="button" onClick={() => onDelete(item)} className={`${small} hover:text-danger`}>
        Supprimer
      </button>
      <button type="button" onClick={() => setEditing(false)} className={small}>
        OK
      </button>
    </li>
  )
}

/** « Enregistrer comme repas type » : un nom, et le repas devient une recette d'une part. */
function SaveTemplate({ label, onSave }: { label: string; onSave: (name: string) => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(`${label} habituel`)

  function submit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim().slice(0, 80)
    if (!trimmed) return
    onSave(trimmed)
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-11 rounded-full px-2 text-xs font-normal text-muted normal-case transition-colors hover:bg-surface hover:text-text md:min-h-8"
      >
        Enregistrer comme repas type
      </button>
    )
  }
  return (
    <form onSubmit={submit} className="flex items-center gap-1 normal-case">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        aria-label="Nom du repas type"
        autoFocus
        className="field min-h-9 w-44 px-3 text-xs font-normal text-text"
      />
      <button type="submit" className="min-h-9 rounded-full px-2 text-xs text-accent">
        OK
      </button>
    </form>
  )
}

type Props = {
  meal: Meal
  label: string
  items: MealItem[]
  missingOf: (item: MealItem) => string[]
  onUpdate: (id: string, patch: MealItemPatch) => void
  onDelete: (item: MealItem) => void
  onShop: (names: string[]) => void
  onSaveTemplate: (name: string, items: MealItem[]) => void
}

/** Un repas du jour : ses aliments, son total, et de quoi le garder comme repas type. */
export function MealSection({
  meal,
  label,
  items,
  missingOf,
  onUpdate,
  onDelete,
  onShop,
  onSaveTemplate,
}: Props) {
  const kcal = items.reduce((s, i) => s + i.kcal, 0)
  return (
    <section aria-labelledby={`meal-${meal}`} className="flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-x-2 text-xs font-semibold text-muted uppercase">
        <h3 id={`meal-${meal}`}>{label}</h3>
        <span className="flex items-center gap-1">
          {items.length > 0 && (
            <SaveTemplate label={label} onSave={(name) => onSaveTemplate(name, items)} />
          )}
          {items.length > 0 && <span className="normal-case tabular-nums">{kcal} kcal</span>}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="py-2 text-sm text-muted">Rien pour l’instant.</p>
      ) : (
        <ul>
          {items.map((item) => (
            <MealItemRow
              key={item.id}
              item={item}
              missing={missingOf(item)}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onShop={onShop}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
