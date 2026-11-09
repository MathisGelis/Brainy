import { missingFromShopping } from './nutrition'
import {
  adjustPantry,
  formatGrams,
  needsOf,
  parseShoppingTitle,
  shoppingNeeds,
  shoppingTitle,
} from './shopping'
import type { MealItem, PantryItem, RecipeFull } from './types'

const item = (over: Partial<MealItem>): MealItem => ({
  id: 'i',
  day: '2026-11-09',
  meal: 'lunch',
  food_id: null,
  recipe_id: null,
  name: 'Riz basmati (cuit)',
  grams: 200,
  kcal: 0,
  protein_dg: 0,
  carbs_dg: 0,
  fat_dg: 0,
  plan_id: null,
  eaten: false,
  position: 0,
  created_at: '',
  ...over,
})
const recipe: RecipeFull = {
  id: 'r',
  name: 'Poulet riz',
  servings: 2,
  created_at: '',
  items: [
    {
      id: 'a',
      recipe_id: 'r',
      food_id: null,
      name: 'Poulet (filet cru)',
      grams: 300,
      kcal: 0,
      protein_dg: 0,
      carbs_dg: 0,
      fat_dg: 0,
      position: 0,
      created_at: '',
    },
    {
      id: 'b',
      recipe_id: 'r',
      food_id: null,
      name: 'Riz basmati (cuit)',
      grams: 400,
      kcal: 0,
      protein_dg: 0,
      carbs_dg: 0,
      fat_dg: 0,
      position: 1,
      created_at: '',
    },
  ],
}
const stock = (key: string, grams: number): PantryItem => ({
  id: key,
  key,
  name: key,
  grams,
  updated_at: '',
})

describe('besoins de la semaine', () => {
  it('additionne aliments et ingrédients des recettes au prorata, par nom de base', () => {
    const needs = needsOf(
      [item({}), item({ recipe_id: 'r', name: 'Poulet riz', grams: 350 })],
      [recipe],
    )
    expect(needs).toEqual([
      { key: 'riz basmati', name: 'Riz basmati', grams: 400 },
      { key: 'poulet', name: 'Poulet', grams: 150 },
    ])
  })

  it('reste à acheter = besoin − stock, arrondi aux 10 g supérieurs', () => {
    const lines = shoppingNeeds(
      [
        { key: 'riz basmati', name: 'Riz basmati', grams: 400 },
        { key: 'poulet', name: 'Poulet', grams: 150 },
        { key: 'skyr', name: 'Skyr', grams: 300 },
      ],
      [stock('riz basmati', 155), stock('poulet', 500)],
    )
    expect(lines.map((l) => [l.name, l.stock, l.toBuy])).toEqual([
      ['Riz basmati', 155, 250],
      ['Poulet', 500, 0],
      ['Skyr', null, 300],
    ])
  })
})

describe('articles avec quantité', () => {
  it('écrit et relit « Nom — quantité »', () => {
    expect(formatGrams(400)).toBe('400 g')
    expect(formatGrams(1250)).toBe('1,25 kg')
    expect(shoppingTitle('Riz', 1250)).toBe('Riz — 1,25 kg')
    expect(parseShoppingTitle('Riz — 1,25 kg')).toEqual({ name: 'Riz', grams: 1250 })
    expect(parseShoppingTitle('Skyr — 300 g')).toEqual({ name: 'Skyr', grams: 300 })
    expect(parseShoppingTitle('Lessive')).toEqual({ name: 'Lessive', grams: null })
  })

  it('la liste compare les noms sans la quantité', () => {
    expect(missingFromShopping(['Riz — 200 g', 'Saumon — 100 g'], ['riz', 'Pain'])).toEqual([
      'Saumon — 100 g',
    ])
    expect(missingFromShopping(['Riz basmati (cuit)'], ['Riz basmati — 400 g'])).toEqual([])
  })
})

describe('stock', () => {
  it('entrées et sorties, jamais sous zéro ; une sortie sans stock ne crée rien', () => {
    const rows = adjustPantry(
      [stock('riz', 100)],
      [
        { key: 'riz', name: 'Riz', grams: -150 },
        { key: 'saumon', name: 'Saumon', grams: 200 },
        { key: 'skyr', name: 'Skyr', grams: -150 },
        { key: 'saumon', name: 'Saumon', grams: -50 },
      ],
      () => 'new',
      'now',
    )
    expect(rows).toEqual([
      { id: 'riz', key: 'riz', name: 'riz', grams: 0, updated_at: 'now' },
      { id: 'new', key: 'saumon', name: 'Saumon', grams: 150, updated_at: 'now' },
    ])
  })
})
