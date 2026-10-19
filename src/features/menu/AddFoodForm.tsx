import { useRef, useState, type FormEvent } from 'react'
import { Button, useToast } from '@/components/ui'
import { celebrate } from '@/lib/celebrate'
import { formatDue, formatLongDay, parisHour, todayISO } from '@/lib/dates'
import { CATALOG } from './catalog'
import {
  defaultMeal,
  gramsFor,
  grams as g,
  inputToDg,
  mealLabel,
  MEALS,
  parseFoodInput,
  portionText,
  scaleMacros,
  searchFoods,
  type FoodChoice,
} from './nutrition'
import { forParts, partsFor, recipeMealItem, searchRecipes } from './recipeLogic'
import type { Food, Meal, RecipeFull } from './types'
import { useFoods, useMealItems, useRecipes } from './useMenu'
import { useShoppingList } from './useShoppingList'

const chip = 'rounded-full bg-surface px-2.5 py-1 text-xs text-text'
const field = 'field min-h-11 px-3 md:min-h-10'

type Props = {
  /** Jour affiché (le menu peut être prévu à l'avance) */
  day: string
  from: string
  to: string
  onError: (m: string) => void
}

/** Valeurs d'un nouvel aliment, pour 100 g. */
export function NewFoodFields({
  name,
  onCreate,
}: {
  name: string
  onCreate: (values: Omit<Food, 'id' | 'created_at' | 'name'>) => void
}) {
  const [kcal, setKcal] = useState('')
  const [p, setP] = useState('')
  const [c, setC] = useState('')
  const [f, setF] = useState('')
  const [portion, setPortion] = useState('')
  const [invalid, setInvalid] = useState(false)

  function create() {
    const k = Number(kcal)
    const values = [inputToDg(p), inputToDg(c), inputToDg(f)]
    const portionG = portion.trim() ? Number(portion) : null
    if (
      !kcal.trim() ||
      !Number.isInteger(k) ||
      k < 0 ||
      k > 950 ||
      values.some((v) => v === null || v > 1000) ||
      (portionG !== null && (!Number.isInteger(portionG) || portionG < 1 || portionG > 2000))
    ) {
      setInvalid(true)
      return
    }
    onCreate({
      kcal: k,
      protein_dg: values[0]!,
      carbs_dg: values[1]!,
      fat_dg: values[2]!,
      portion_g: portionG,
      portion_label: null,
    })
  }

  const input = (label: string, value: string, set: (v: string) => void, width = 'w-20') => (
    <label className="flex flex-col gap-1 text-xs text-muted">
      {label}
      <input
        value={value}
        onChange={(e) => {
          set(e.target.value)
          setInvalid(false)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            create()
          }
        }}
        inputMode="decimal"
        className={`${field} ${width} text-text ${invalid ? '!border-danger' : ''}`}
      />
    </label>
  )

  return (
    <section
      aria-label={`Nouvel aliment « ${name} »`}
      className="flex flex-col gap-2 rounded-2xl bg-surface p-3"
    >
      <p className="text-sm">
        Nouvel aliment <strong>« {name} »</strong> : ses valeurs pour 100 g, une seule fois.
      </p>
      <div className="flex flex-wrap items-end gap-2">
        {input('kcal', kcal, setKcal)}
        {input('Protéines (g)', p, setP)}
        {input('Glucides (g)', c, setC)}
        {input('Lipides (g)', f, setF)}
        {input('Portion (g, facultatif)', portion, setPortion, 'w-28')}
        <Button onClick={create}>Créer et ajouter</Button>
      </div>
      {invalid && (
        <p role="alert" className="text-xs text-danger">
          Vérifiez les valeurs : kcal entières (0 à 950), grammes avec une décimale au plus.
        </p>
      )}
    </section>
  )
}

/** Ce que la saisie peut désigner : une recette (la tienne) ou un aliment. */
type Choice = { kind: 'recipe'; recipe: RecipeFull } | FoodChoice

const choiceName = (c: Choice) => (c.kind === 'recipe' ? c.recipe.name : c.food.name)

/** Phrase de proposition pour la liste de courses. */
function proposalText(names: string[]): string {
  if (names.length === 1) return `« ${names[0]} »`
  const list = names.slice(0, 3).join(', ')
  return `les ${names.length} ingrédients manquants (${list}${names.length > 3 ? '…' : ''})`
}

/** Ajout en langage naturel : « 200 g poulet midi », « 2 œufs demain matin », « 2 parts curry ». */
export function AddFoodForm({ day, from, to, onError }: Props) {
  const toast = useToast()
  const { foods, makeFood } = useFoods({ onError })
  const { recipes } = useRecipes({ onError })
  const { addItem, deleteItem } = useMealItems(from, to, { onError })
  const shopping = useShoppingList({ onError })
  const [text, setText] = useState('')
  const [pickedMeal, setPickedMeal] = useState<Meal | null>(null)
  const [choiceIndex, setChoiceIndex] = useState(0)
  const [proposal, setProposal] = useState<string[] | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const today = todayISO()
  const parsed = text.trim() ? parseFoodInput(text, today) : null
  const targetDay = parsed?.day ?? day
  const meal =
    pickedMeal ?? parsed?.meal ?? (targetDay === today ? defaultMeal(parisHour()) : 'lunch')
  // « parts » n'est qu'une unité pour les recettes : « 2 parts curry » cherche « curry »
  const query = parsed?.query.replace(/^parts?\s+(?:de\s+|d['’])?/i, '') ?? ''
  const choices: Choice[] = parsed
    ? [
        ...searchRecipes(query, recipes).map((recipe) => ({ kind: 'recipe' as const, recipe })),
        ...searchFoods(query, foods, CATALOG),
      ].slice(0, 6)
    : []
  const chosen: Choice | undefined = choices[choiceIndex] ?? choices[0]
  const parts = chosen?.kind === 'recipe' && parsed ? partsFor(parsed, chosen.recipe) : null
  const values =
    chosen && parsed
      ? chosen.kind === 'recipe'
        ? forParts(chosen.recipe, parts!)
        : (() => {
            const q = gramsFor(parsed, chosen.food)
            return { grams: q, ...scaleMacros(chosen.food, q) }
          })()
      : null
  const unknown = parsed && query.length >= 2 && choices.length === 0 ? query : null

  function reset() {
    setText('')
    setPickedMeal(null)
    setChoiceIndex(0)
    inputRef.current?.focus()
  }

  function added(toBuy: string[], mealId: Meal, onDay: string, undo: () => void) {
    celebrate(0.4)
    toast.show(
      `Ajouté : ${mealLabel(mealId).toLowerCase()}${onDay === today ? '' : `, ${formatDue(onDay, today).toLowerCase()}`}`,
      undo,
    )
    // On propose la liste de courses pour ce qui est prévu (aujourd'hui ou plus tard)
    const missing = onDay >= today ? shopping.missing(toBuy) : []
    setProposal(missing.length > 0 ? missing : null)
    reset()
  }

  function addFood(food: Food, newFood?: Food) {
    if (!parsed) return
    const q = gramsFor(parsed, food)
    const item = addItem(
      {
        day: targetDay,
        meal,
        food_id: food.id,
        recipe_id: null,
        name: food.name,
        grams: q,
        ...scaleMacros(food, q),
      },
      newFood,
    )
    added([food.name], meal, targetDay, () => deleteItem(item))
  }

  function addRecipe(recipe: RecipeFull, n: number) {
    const item = addItem(recipeMealItem(recipe, n, targetDay, meal))
    added(
      recipe.items.map((i) => i.name),
      meal,
      targetDay,
      () => deleteItem(item),
    )
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!chosen) return
    if (chosen.kind === 'recipe') addRecipe(chosen.recipe, parts!)
    else if (chosen.kind === 'food') addFood(chosen.food)
    else {
      const copy = makeFood({ ...chosen.food })
      addFood(copy, copy)
    }
  }

  function addToShopping(names: string[]) {
    const { added: list, undo } = shopping.add(names)
    setProposal(null)
    if (list.length > 0)
      toast.show(
        list.length === 1
          ? `« ${list[0]} » ajouté à la liste de courses`
          : `${list.length} ingrédients ajoutés à la liste de courses`,
        undo,
      )
  }

  return (
    <div className="mb-5 flex flex-col gap-2">
      <form onSubmit={submit} className="flex gap-2">
        <input
          enterKeyHint="send"
          ref={inputRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setChoiceIndex(0)
            setProposal(null)
          }}
          aria-label="Ajouter un aliment"
          aria-describedby="food-hint"
          placeholder="200 g poulet midi, 2 œufs demain matin…"
          className="field min-h-11 min-w-0 flex-1 px-4 text-base md:min-h-10"
        />
        <Button type="submit" disabled={!chosen}>
          Ajouter
        </Button>
      </form>

      <div role="group" aria-label="Repas" className="flex flex-wrap gap-1.5">
        {MEALS.map((m) => (
          <button
            key={m.id}
            type="button"
            aria-pressed={meal === m.id}
            onClick={() => setPickedMeal(m.id)}
            className="pill min-h-9 border border-[var(--field-border)] px-3 text-xs"
          >
            {m.label}
          </button>
        ))}
      </div>

      <div
        id="food-hint"
        aria-live="polite"
        className="flex min-h-7 flex-wrap items-center gap-1.5"
      >
        {chosen && values && (
          <>
            <span className="sr-only">Compris :</span>
            <span className={`${chip} font-semibold`}>{choiceName(chosen)}</span>
            <span className={chip}>
              {chosen.kind === 'recipe'
                ? `${portionText(parts!, 'part')} · ${values.grams} g`
                : `${values.grams} g${
                    parsed?.count != null && chosen.food.portion_label
                      ? ` (${portionText(parsed.count, chosen.food.portion_label)})`
                      : ''
                  }`}
            </span>
            <span className={chip}>{values.kcal} kcal</span>
            <span className={chip}>
              P {g(values.protein_dg)} · G {g(values.carbs_dg)} · L {g(values.fat_dg)}
            </span>
            {targetDay !== day && (
              <span className={`${chip} text-accent`}>{formatLongDay(targetDay)}</span>
            )}
            {chosen.kind === 'catalog' && (
              <span className="text-xs text-muted">valeurs indicatives, modifiables ensuite</span>
            )}
          </>
        )}
      </div>

      {choices.length > 1 && (
        <div role="group" aria-label="Aliments trouvés" className="flex flex-wrap gap-1.5">
          {choices.map((c, i) => (
            <button
              key={`${c.kind}-${choiceName(c)}`}
              type="button"
              aria-pressed={chosen === c}
              onClick={() => {
                setChoiceIndex(i)
                inputRef.current?.focus()
              }}
              className="pill min-h-9 border border-[var(--field-border)] px-3 text-xs"
            >
              {choiceName(c)}
              {c.kind === 'recipe' && <span className="text-muted"> · recette</span>}
            </button>
          ))}
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
            addFood(food, food)
          }}
        />
      )}

      {proposal && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-surface px-3 py-2 text-sm">
          <span className="min-w-0 flex-1">
            Ajouter <strong>{proposalText(proposal)}</strong> à la liste de courses ?
          </span>
          <button
            type="button"
            onClick={() => addToShopping(proposal)}
            className="min-h-11 rounded-full px-3 font-semibold text-accent transition-colors hover:bg-surface md:min-h-9"
          >
            Ajouter
          </button>
          <button
            type="button"
            onClick={() => setProposal(null)}
            className="min-h-11 rounded-full px-3 text-muted transition-colors hover:text-text md:min-h-9"
          >
            Non merci
          </button>
        </div>
      )}
    </div>
  )
}
