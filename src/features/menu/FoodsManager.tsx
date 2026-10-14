import { useState } from 'react'
import { useToast } from '@/components/ui'
import { dgToInput, inputToDg } from './nutrition'
import type { Food, FoodPatch } from './types'
import { useFoods } from './useMenu'

const field = 'field min-h-11 px-3 md:min-h-10'
const small =
  'min-h-11 rounded-full px-3 text-xs text-muted transition-colors hover:bg-surface hover:text-text md:min-h-9'

function FoodRow({
  food,
  onUpdate,
  onDelete,
}: {
  food: Food
  onUpdate: (id: string, patch: FoodPatch) => void
  onDelete: (food: Food) => void
}) {
  const [editing, setEditing] = useState(false)
  const [invalid, setInvalid] = useState<string | null>(null)

  if (!editing) {
    return (
      <li>
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={`Modifier l’aliment « ${food.name} »`}
          className="-mx-2 flex min-h-11 w-[calc(100%+1rem)] items-center gap-3 rounded-xl px-2 text-left text-sm transition-colors hover:bg-surface"
        >
          <span className="min-w-0 flex-1 truncate">{food.name}</span>
          <span className="text-xs text-muted tabular-nums">
            {food.kcal} kcal · P {dgToInput(food.protein_dg)} · G {dgToInput(food.carbs_dg)} · L{' '}
            {dgToInput(food.fat_dg)}
          </span>
        </button>
      </li>
    )
  }

  // Champ numérique enregistré en quittant le champ s'il est valide
  const num = (key: 'kcal' | 'protein_dg' | 'carbs_dg' | 'fat_dg' | 'portion_g', label: string) => {
    const value =
      key === 'kcal' || key === 'portion_g' ? String(food[key] ?? '') : dgToInput(food[key])
    return (
      <label className="flex flex-col gap-1 text-xs text-muted">
        {label}
        <input
          defaultValue={value}
          inputMode="decimal"
          aria-invalid={invalid === key}
          onBlur={(e) => {
            const raw = e.target.value.trim()
            let next: number | null
            if (key === 'portion_g') next = raw === '' ? null : Number(raw)
            else if (key === 'kcal') next = Number(raw)
            else next = inputToDg(raw)
            const ok =
              key === 'portion_g'
                ? next === null || (Number.isInteger(next) && next >= 1 && next <= 2000)
                : next !== null &&
                  Number.isInteger(next) &&
                  next >= 0 &&
                  next <= (key === 'kcal' ? 950 : 1000)
            setInvalid(ok ? null : key)
            if (ok && next !== food[key]) onUpdate(food.id, { [key]: next })
          }}
          className={`${field} w-20 text-text ${invalid === key ? '!border-danger' : ''}`}
        />
      </label>
    )
  }

  return (
    <li className="my-1 flex flex-col gap-2 rounded-2xl bg-surface p-3">
      <input
        defaultValue={food.name}
        aria-label="Nom de l’aliment"
        onBlur={(e) => {
          const name = e.target.value.trim()
          if (name && name !== food.name) onUpdate(food.id, { name: name.slice(0, 80) })
        }}
        className={`${field} w-full`}
      />
      <p className="text-xs text-muted">Pour 100 g</p>
      <div className="flex flex-wrap items-end gap-2">
        {num('kcal', 'kcal')}
        {num('protein_dg', 'Protéines (g)')}
        {num('carbs_dg', 'Glucides (g)')}
        {num('fat_dg', 'Lipides (g)')}
        {num('portion_g', 'Portion (g)')}
        <label className="flex flex-col gap-1 text-xs text-muted">
          Nom de la portion
          <input
            defaultValue={food.portion_label ?? ''}
            placeholder="œuf, tranche…"
            onBlur={(e) => {
              const label = e.target.value.trim().slice(0, 40) || null
              if (label !== food.portion_label) onUpdate(food.id, { portion_label: label })
            }}
            className={`${field} w-32 text-text`}
          />
        </label>
      </div>
      {invalid && (
        <p role="alert" className="text-xs text-danger">
          Valeur invalide : kcal entières (0 à 950), grammes avec une décimale au plus.
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onDelete(food)}
          className={`${small} hover:text-danger`}
        >
          Supprimer l’aliment
        </button>
        <button type="button" onClick={() => setEditing(false)} className={small}>
          OK
        </button>
      </div>
    </li>
  )
}

/** Mes aliments : valeurs pour 100 g, modifiables ; supprimer n'efface pas les repas passés. */
export function FoodsManager({ onError }: { onError: (m: string) => void }) {
  const toast = useToast()
  const { foods, updateFood, deleteFood } = useFoods({ onError })
  return (
    <details className="mt-2">
      <summary className="min-h-11 cursor-pointer content-center text-xs text-muted hover:text-text">
        Mes aliments ({foods.length})
      </summary>
      {foods.length === 0 ? (
        <p className="py-2 text-sm text-muted">
          Chaque aliment ajouté au menu arrive ici : ses valeurs restent modifiables.
        </p>
      ) : (
        <ul className="mt-1 flex flex-col">
          {foods.map((food) => (
            <FoodRow
              key={food.id}
              food={food}
              onUpdate={updateFood}
              onDelete={(f) =>
                toast.show(
                  `Aliment « ${f.name} » supprimé (les repas gardent leurs valeurs)`,
                  deleteFood(f),
                )
              }
            />
          ))}
        </ul>
      )}
    </details>
  )
}
