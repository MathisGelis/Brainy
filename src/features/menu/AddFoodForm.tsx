import { useRef, useState, type FormEvent } from 'react'
import { Button, useToast } from '@/components/ui'
import { celebrate } from '@/lib/celebrate'
import { formatDue, formatLongDay, parisHour, todayISO } from '@/lib/dates'
import { CATALOG } from './catalog'
import {
  baseName,
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
import type { Food, Meal } from './types'
import { useFoods, useMealItems } from './useMenu'
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
function NewFoodFields({
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

/** Ajout en langage naturel : « 200 g poulet midi », « 2 œufs demain matin ». */
export function AddFoodForm({ day, from, to, onError }: Props) {
  const toast = useToast()
  const { foods, makeFood } = useFoods({ onError })
  const { addItem, deleteItem } = useMealItems(from, to, { onError })
  const shopping = useShoppingList({ onError })
  const [text, setText] = useState('')
  const [pickedMeal, setPickedMeal] = useState<Meal | null>(null)
  const [choiceIndex, setChoiceIndex] = useState(0)
  const [proposal, setProposal] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const today = todayISO()
  const parsed = text.trim() ? parseFoodInput(text, today) : null
  const targetDay = parsed?.day ?? day
  const meal =
    pickedMeal ?? parsed?.meal ?? (targetDay === today ? defaultMeal(parisHour()) : 'lunch')
  const choices = parsed ? searchFoods(parsed.query, foods, CATALOG) : []
  const chosen: FoodChoice | undefined = choices[choiceIndex] ?? choices[0]
  const grams = chosen && parsed ? gramsFor(parsed, chosen.food) : null
  const macros = chosen && grams ? scaleMacros(chosen.food, grams) : null
  const unknown = parsed && parsed.query.length >= 2 && choices.length === 0 ? parsed.query : null

  function reset() {
    setText('')
    setPickedMeal(null)
    setChoiceIndex(0)
    inputRef.current?.focus()
  }

  function added(name: string, mealId: Meal, onDay: string, undo: () => void) {
    celebrate(0.4)
    toast.show(
      `Ajouté : ${mealLabel(mealId).toLowerCase()}${onDay === today ? '' : `, ${formatDue(onDay, today).toLowerCase()}`}`,
      undo,
    )
    // On propose la liste de courses pour ce qui est prévu (aujourd'hui ou plus tard)
    setProposal(onDay >= today && shopping.missing([name]).length > 0 ? baseName(name) : null)
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
        name: food.name,
        grams: q,
        ...scaleMacros(food, q),
      },
      newFood,
    )
    added(food.name, meal, targetDay, () => deleteItem(item))
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!chosen) return
    if (chosen.kind === 'food') addFood(chosen.food)
    else {
      const copy = makeFood({ ...chosen.food })
      addFood(copy, copy)
    }
  }

  function addToShopping(name: string) {
    const { added: list, undo } = shopping.add([name])
    setProposal(null)
    if (list.length > 0) toast.show(`« ${name} » ajouté à la liste de courses`, undo)
  }

  return (
    <div className="mb-5 flex flex-col gap-2">
      <form onSubmit={submit} className="flex gap-2">
        <input
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
        {chosen && grams !== null && macros && (
          <>
            <span className="sr-only">Compris :</span>
            <span className={`${chip} font-semibold`}>{chosen.food.name}</span>
            <span className={chip}>
              {grams} g
              {parsed?.count != null && chosen.food.portion_label
                ? ` (${portionText(parsed.count, chosen.food.portion_label)})`
                : ''}
            </span>
            <span className={chip}>{macros.kcal} kcal</span>
            <span className={chip}>
              P {g(macros.protein_dg)} · G {g(macros.carbs_dg)} · L {g(macros.fat_dg)}
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
              key={`${c.kind}-${c.food.name}`}
              type="button"
              aria-pressed={chosen === c}
              onClick={() => {
                setChoiceIndex(i)
                inputRef.current?.focus()
              }}
              className="pill min-h-9 border border-[var(--field-border)] px-3 text-xs"
            >
              {c.food.name}
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
            Ajouter <strong>« {proposal} »</strong> à la liste de courses ?
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
