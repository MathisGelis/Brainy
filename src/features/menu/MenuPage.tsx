import { useState } from 'react'
import { useToast } from '@/components/ui'
import { PageHeader } from '@/components/ui/PageHeader'
import { addDays, formatLongDay, formatWeekdayShort, startOfWeek, todayISO } from '@/lib/dates'
import { AddFoodForm } from './AddFoodForm'
import { CopyMenu } from './CopyMenu'
import { FoodsManager } from './FoodsManager'
import { MacroSummary } from './MacroSummary'
import { MealSection } from './MealSection'
import { baseName, MEALS, sumMacros } from './nutrition'
import { RecipesManager } from './RecipesManager'
import { ingredientsFromMeal, shoppingNames } from './recipeLogic'
import { ShoppingCard } from './ShoppingCard'
import type { MealItem } from './types'
import { useMacroTargets, useMealItems, useRecipes } from './useMenu'
import { useShoppingList } from './useShoppingList'

const nav =
  'flex min-h-11 min-w-11 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-text md:min-h-10 md:min-w-10'

/** Menu : repas du jour (mangés ou prévus), macros face aux objectifs, liste de courses. */
export default function MenuPage() {
  const toast = useToast()
  const onError = (m: string) => toast.show(m)
  const today = todayISO()
  const [day, setDay] = useState(today)
  const from = startOfWeek(day)
  const to = addDays(from, 6)
  const week = Array.from({ length: 7 }, (_, i) => addDays(from, i))

  const { items, isLoading, isError, refetch, updateItem, deleteItem } = useMealItems(from, to, {
    onError,
  })
  const { targets, hasTargets, saveTargets } = useMacroTargets({ onError })
  const shopping = useShoppingList({ onError })
  const { recipes, createRecipe, deleteRecipe } = useRecipes({ onError })

  const dayItems = items.filter((i) => i.day === day)
  const totals = sumMacros(dayItems)
  const kcalOf = (d: string) => items.filter((i) => i.day === d).reduce((s, i) => s + i.kcal, 0)
  // Pour les courses : ce qui est prévu à partir d'aujourd'hui (ingrédients pour une recette)
  const weekFoods = shoppingNames(
    items.filter((i) => i.day >= today),
    recipes,
  )
  const missingOf = (item: MealItem) =>
    item.day >= today ? shopping.missing(shoppingNames([item], recipes)) : []

  function onShop(names: string[]) {
    const { added, undo } = shopping.add(names)
    if (added.length === 0) return
    toast.show(
      added.length === 1
        ? `« ${added[0]} » ajouté à la liste de courses`
        : `${added.length} ingrédients ajoutés à la liste de courses`,
      undo,
    )
  }

  function onSaveTemplate(name: string, mealItems: MealItem[]) {
    const recipe = createRecipe(name, 1, ingredientsFromMeal(mealItems))
    toast.show(`Repas type « ${name} » enregistré`, () => deleteRecipe(recipe))
  }

  return (
    <>
      <PageHeader title="Menu" />
      <div className="-mt-3 mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-label="Jour précédent"
          className={nav}
          onClick={() => setDay(addDays(day, -1))}
        >
          ←
        </button>
        <h2
          className="min-w-44 text-center font-semibold first-letter:uppercase"
          aria-live="polite"
        >
          {formatLongDay(day)}
        </h2>
        <button
          type="button"
          aria-label="Jour suivant"
          className={nav}
          onClick={() => setDay(addDays(day, 1))}
        >
          →
        </button>
        {day !== today && (
          <button
            type="button"
            className="min-h-11 rounded-full px-4 text-accent transition-colors hover:bg-surface md:min-h-9"
            onClick={() => setDay(today)}
          >
            Aujourd'hui
          </button>
        )}
      </div>

      <ul aria-label="Calories de la semaine" className="mb-5 grid grid-cols-7 gap-1 text-center">
        {week.map((d) => {
          const kcal = kcalOf(d)
          return (
            <li key={d}>
              <button
                type="button"
                aria-pressed={d === day}
                aria-current={d === today ? 'date' : undefined}
                aria-label={`${formatLongDay(d)} : ${kcal} kcal`}
                onClick={() => setDay(d)}
                className={`flex w-full flex-col rounded-xl py-1.5 transition-colors ${
                  d === day ? 'bg-surface ring-2 ring-accent' : 'bg-surface/40 hover:bg-surface'
                }`}
              >
                <span
                  className={`text-xs first-letter:uppercase ${d === today ? 'font-semibold text-accent' : 'text-muted'}`}
                >
                  {formatWeekdayShort(d)}
                </span>
                <span className="text-sm tabular-nums">{kcal > 0 ? kcal : '–'}</span>
              </button>
            </li>
          )
        })}
      </ul>

      <CopyMenu day={day} from={from} to={to} onError={onError} />
      <AddFoodForm day={day} from={from} to={to} onError={onError} />

      <MacroSummary
        totals={totals}
        targets={targets}
        hasTargets={hasTargets}
        onSaveTargets={saveTargets}
      />

      {isError ? (
        <p role="alert" className="mb-5 text-danger">
          Impossible de charger le menu.{' '}
          <button
            type="button"
            onClick={() => void refetch()}
            className="min-h-11 font-semibold underline"
          >
            Réessayer
          </button>
        </p>
      ) : isLoading ? (
        <div aria-hidden className="mb-5 h-32 animate-pulse rounded-2xl bg-surface" />
      ) : (
        <div className="card mb-5 flex flex-col gap-4 p-5">
          {MEALS.map((m) => (
            <MealSection
              key={m.id}
              meal={m.id}
              label={m.label}
              items={dayItems.filter((i) => i.meal === m.id)}
              missingOf={missingOf}
              onUpdate={updateItem}
              onDelete={(item) =>
                toast.show(`« ${baseName(item.name)} » retiré du menu`, deleteItem(item))
              }
              onShop={onShop}
              onSaveTemplate={onSaveTemplate}
            />
          ))}
        </div>
      )}

      <ShoppingCard weekFoods={weekFoods} onError={onError} />
      <RecipesManager onError={onError} />
      <FoodsManager onError={onError} />
    </>
  )
}
