import { useState } from 'react'
import { grams as g, MEALS, rescaleItem } from './nutrition'
import type { Meal, MealItem, MealItemPatch } from './types'

const small =
  'min-h-11 rounded-full px-3 text-xs text-muted transition-colors hover:bg-surface hover:text-text md:min-h-9'
const field = 'field min-h-11 px-3 md:min-h-10'

type RowProps = {
  item: MealItem
  /** Libellé si l'aliment manque à la liste de courses (null : déjà dedans, ou jour passé) */
  missing: string | null
  onUpdate: (id: string, patch: MealItemPatch) => void
  onDelete: (item: MealItem) => void
  onShop: (name: string) => void
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
            <span className="block truncate">{item.name}</span>
            <span className="block text-xs text-muted">
              {item.grams} g · P {g(item.protein_dg)} · G {g(item.carbs_dg)} · L {g(item.fat_dg)}
            </span>
          </span>
          <span className="text-sm font-semibold tabular-nums">{item.kcal} kcal</span>
        </button>
        {missing && (
          <button
            type="button"
            onClick={() => onShop(missing)}
            aria-label={`Ajouter « ${missing} » à la liste de courses`}
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

type Props = {
  meal: Meal
  label: string
  items: MealItem[]
  missingOf: (item: MealItem) => string | null
  onUpdate: (id: string, patch: MealItemPatch) => void
  onDelete: (item: MealItem) => void
  onShop: (name: string) => void
}

/** Un repas du jour : ses aliments et son total. */
export function MealSection({ meal, label, items, missingOf, onUpdate, onDelete, onShop }: Props) {
  const kcal = items.reduce((s, i) => s + i.kcal, 0)
  return (
    <section aria-labelledby={`meal-${meal}`} className="flex flex-col">
      <h3
        id={`meal-${meal}`}
        className="flex items-baseline justify-between text-xs font-semibold text-muted uppercase"
      >
        <span>{label}</span>
        {items.length > 0 && <span className="normal-case tabular-nums">{kcal} kcal</span>}
      </h3>
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
