import { useState, type FormEvent } from 'react'
import { useToast } from '@/components/ui'
import { NewFoodFields } from './AddFoodForm'
import { CATALOG } from './catalog'
import {
  grams as g,
  gramsFor,
  parseFoodInput,
  rescaleItem,
  scaleMacros,
  searchFoods,
} from './nutrition'
import { forParts } from './recipeLogic'
import type { Food, RecipeFull, RecipeItem } from './types'
import { useFoods, useRecipes } from './useMenu'

const field = 'field min-h-11 px-3 md:min-h-10'
const small =
  'min-h-11 rounded-full px-3 text-xs text-muted transition-colors hover:bg-surface hover:text-text md:min-h-9'

type Api = ReturnType<typeof useRecipes>

/** Ajout d'un ingrédient en une phrase : « 150 g poulet cuit », « 2 œufs ». */
function IngredientInput({
  recipe,
  api,
  onError,
}: {
  recipe: RecipeFull
  api: Api
  onError: (m: string) => void
}) {
  const { foods, makeFood } = useFoods({ onError })
  const [text, setText] = useState('')
  const [index, setIndex] = useState(0)
  const parsed = text.trim() ? parseFoodInput(text, '2000-01-01') : null
  const choices = parsed ? searchFoods(parsed.query, foods, CATALOG) : []
  const chosen = choices[index] ?? choices[0]
  const unknown = parsed && parsed.query.length >= 2 && choices.length === 0 ? parsed.query : null

  function add(food: Food, newFood?: Food) {
    if (!parsed) return
    const q = gramsFor(parsed, food)
    api.addIngredient(
      recipe,
      { food_id: food.id, name: food.name, grams: q, ...scaleMacros(food, q) },
      newFood,
    )
    setText('')
    setIndex(0)
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!chosen) return
    if (chosen.kind === 'food') add(chosen.food)
    else {
      const copy = makeFood({ ...chosen.food })
      add(copy, copy)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={submit}>
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setIndex(0)
          }}
          aria-label={`Ajouter un ingrédient à « ${recipe.name} »`}
          placeholder="Ingrédient : 150 g poulet cuit, 2 œufs…"
          className={`${field} w-full px-4`}
        />
      </form>
      {chosen && parsed && (
        <div
          role="group"
          aria-label="Ingrédients trouvés"
          className="flex flex-wrap items-center gap-1.5"
        >
          {choices.map((c, i) => (
            <button
              key={`${c.kind}-${c.food.name}`}
              type="button"
              aria-pressed={c === chosen}
              onClick={() => setIndex(i)}
              className="pill min-h-9 border border-[var(--field-border)] px-3 text-xs"
            >
              {c.food.name}
            </button>
          ))}
          <span className="text-xs text-muted">
            {gramsFor(parsed, chosen.food)} g · Entrée pour ajouter
          </span>
        </div>
      )}
      {unknown && (
        <NewFoodFields
          key={unknown}
          name={unknown.charAt(0).toUpperCase() + unknown.slice(1)}
          onCreate={(values) => {
            const food = makeFood({
              name: unknown.charAt(0).toUpperCase() + unknown.slice(1),
              ...values,
            })
            add(food, food)
          }}
        />
      )}
    </div>
  )
}

function IngredientRow({ item, api }: { item: RecipeItem; api: Api }) {
  const toast = useToast()
  const [invalid, setInvalid] = useState(false)
  return (
    <li className="flex items-center gap-2 border-b border-border py-1 last:border-b-0">
      <span className="min-w-0 flex-1 truncate text-sm">{item.name}</span>
      <label className="flex items-center gap-1 text-xs text-muted">
        <input
          defaultValue={item.grams}
          inputMode="numeric"
          aria-label={`Quantité de « ${item.name} » en grammes`}
          aria-invalid={invalid}
          onBlur={(e) => {
            const n = Number(e.target.value)
            const ok = Number.isInteger(n) && n >= 1 && n <= 10000
            setInvalid(!ok)
            if (ok && n !== item.grams)
              api.updateIngredient(item, { grams: n, ...rescaleItem(item, n) })
          }}
          className={`${field} w-20 text-text ${invalid ? '!border-danger' : ''}`}
        />
        g
      </label>
      <span className="w-16 text-right text-xs text-muted tabular-nums">{item.kcal} kcal</span>
      <button
        type="button"
        onClick={() => toast.show(`« ${item.name} » retiré`, api.removeIngredient(item))}
        aria-label={`Retirer « ${item.name} » de la recette`}
        className="min-h-11 min-w-11 rounded-full text-muted transition-colors hover:text-danger md:min-h-9 md:min-w-9"
      >
        ×
      </button>
    </li>
  )
}

function RecipeEditor({
  recipe,
  api,
  onClose,
  onError,
}: {
  recipe: RecipeFull
  api: Api
  onClose: () => void
  onError: (m: string) => void
}) {
  const toast = useToast()
  const [invalid, setInvalid] = useState(false)
  const part = forParts(recipe, 1)
  return (
    <li className="my-1 flex flex-col gap-3 rounded-2xl bg-surface p-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-muted">
          Nom
          <input
            defaultValue={recipe.name}
            onBlur={(e) => {
              const name = e.target.value.trim().slice(0, 80)
              if (name && name !== recipe.name) api.updateRecipe(recipe.id, { name })
            }}
            className={`${field} text-text`}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Parts
          <input
            defaultValue={recipe.servings}
            inputMode="numeric"
            aria-invalid={invalid}
            onBlur={(e) => {
              const n = Number(e.target.value)
              const ok = Number.isInteger(n) && n >= 1 && n <= 50
              setInvalid(!ok)
              if (ok && n !== recipe.servings) api.updateRecipe(recipe.id, { servings: n })
            }}
            className={`${field} w-20 text-text ${invalid ? '!border-danger' : ''}`}
          />
        </label>
      </div>
      <p className="text-xs text-muted">
        {recipe.items.length === 0
          ? 'Ajoutez les ingrédients pour la recette entière.'
          : `Par part : ${part.grams} g · ${part.kcal} kcal · P ${g(part.protein_dg)} · G ${g(part.carbs_dg)} · L ${g(part.fat_dg)}`}
      </p>
      {recipe.items.length > 0 && (
        <ul aria-label={`Ingrédients de « ${recipe.name} »`}>
          {recipe.items.map((item) => (
            <IngredientRow key={item.id} item={item} api={api} />
          ))}
        </ul>
      )}
      <IngredientInput recipe={recipe} api={api} onError={onError} />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            onClose()
            toast.show(`Recette « ${recipe.name} » supprimée`, api.deleteRecipe(recipe))
          }}
          className={`${small} hover:text-danger`}
        >
          Supprimer la recette
        </button>
        <button type="button" onClick={onClose} className={small}>
          OK
        </button>
      </div>
    </li>
  )
}

/** Recettes et repas types : une recette d'une part est un repas type. */
export function RecipesManager({ onError }: { onError: (m: string) => void }) {
  const api = useRecipes({ onError })
  const [open, setOpen] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [servings, setServings] = useState('1')

  function create(e: FormEvent) {
    e.preventDefault()
    const n = Number(servings)
    if (!name.trim() || !Number.isInteger(n) || n < 1 || n > 50) return
    const recipe = api.createRecipe(name.trim().slice(0, 80), n)
    setOpen(recipe.id)
    setName('')
    setServings('1')
  }

  return (
    <section aria-labelledby="recipes-title" className="card mb-5 flex flex-col gap-2 p-5">
      <h2 id="recipes-title" className="font-semibold">
        Recettes et repas types
      </h2>
      {api.recipes.length === 0 && (
        <p className="text-sm text-muted">
          Une recette s’ajoute au menu en une phrase (« 2 parts curry ») et envoie ses ingrédients
          dans la liste de courses. Une recette d’une part est un repas type.
        </p>
      )}
      {api.recipes.length > 0 && (
        <ul className="flex flex-col">
          {api.recipes.map((r) =>
            open === r.id ? (
              <RecipeEditor
                key={r.id}
                recipe={r}
                api={api}
                onClose={() => setOpen(null)}
                onError={onError}
              />
            ) : (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setOpen(r.id)}
                  aria-label={`Modifier la recette « ${r.name} »`}
                  className="-mx-2 flex min-h-11 w-[calc(100%+1rem)] items-center gap-3 rounded-xl px-2 text-left text-sm transition-colors hover:bg-surface"
                >
                  <span className="min-w-0 flex-1 truncate">{r.name}</span>
                  <span className="text-xs text-muted tabular-nums">
                    {r.servings > 1 ? `${r.servings} parts · ` : 'repas type · '}
                    {forParts(r, 1).kcal} kcal{r.servings > 1 ? ' / part' : ''}
                  </span>
                </button>
              </li>
            ),
          )}
        </ul>
      )}
      <form onSubmit={create} className="flex flex-wrap gap-2">
        <input
          enterKeyHint="send"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Nom de la nouvelle recette"
          placeholder="Nouvelle recette (Curry de poulet…)"
          className={`${field} min-w-0 flex-1 px-4`}
        />
        <input
          value={servings}
          onChange={(e) => setServings(e.target.value)}
          inputMode="numeric"
          aria-label="Nombre de parts"
          className={`${field} w-20`}
        />
        <button
          type="submit"
          className="min-h-11 rounded-full border border-[var(--field-border)] px-4 text-sm transition-colors hover:bg-surface md:min-h-10"
        >
          Créer
        </button>
      </form>
    </section>
  )
}
