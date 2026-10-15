import {
  copyMealItems,
  forParts,
  ingredientsFromMeal,
  partsFor,
  recipeMealItem,
  recipeTotals,
  searchRecipes,
  shoppingNames,
} from './recipeLogic'
import type { MealItem, RecipeFull, RecipeItem } from './types'

const ing = (name: string, grams: number, kcal: number, p = 0): RecipeItem => ({
  id: name,
  recipe_id: 'r1',
  food_id: null,
  name,
  grams,
  kcal,
  protein_dg: p,
  carbs_dg: 0,
  fat_dg: 0,
  position: 0,
  created_at: '',
})

const curry: RecipeFull = {
  id: 'r1',
  name: 'Curry de poulet',
  servings: 4,
  created_at: '',
  items: [
    ing('Poulet (filet cru)', 600, 720, 1350),
    ing('Riz blanc (cru)', 300, 1065, 210),
    ing('Lait de coco', 400, 720, 80),
  ],
}

const item = (over: Partial<MealItem>): MealItem => ({
  id: 'm',
  day: '2026-10-12',
  meal: 'lunch',
  food_id: null,
  recipe_id: null,
  name: 'Banane',
  grams: 120,
  kcal: 108,
  protein_dg: 13,
  carbs_dg: 240,
  fat_dg: 4,
  position: 0,
  created_at: '',
  ...over,
})

describe('recettes', () => {
  it('calcule le total et les valeurs par part', () => {
    expect(recipeTotals(curry.items)).toMatchObject({ grams: 1300, kcal: 2505, protein_dg: 1640 })
    expect(forParts(curry, 1)).toEqual({
      grams: 325,
      kcal: 626,
      protein_dg: 410,
      carbs_dg: 0,
      fat_dg: 0,
    })
    expect(forParts(curry, 2).kcal).toBe(1253)
  })

  it('déduit les parts : compte, poids, sinon une', () => {
    expect(partsFor({ count: 2, grams: null }, curry)).toBe(2)
    expect(partsFor({ count: null, grams: 400 }, curry)).toBe(1.25) // 400 g / 325 g par part, au quart près
    expect(partsFor({ count: null, grams: null }, curry)).toBe(1)
  })

  it('ajoute une recette au menu en une ligne, liée à la recette', () => {
    expect(recipeMealItem(curry, 2, '2026-10-15', 'dinner')).toEqual({
      day: '2026-10-15',
      meal: 'dinner',
      food_id: null,
      recipe_id: 'r1',
      name: 'Curry de poulet',
      grams: 650,
      kcal: 1253,
      protein_dg: 820,
      carbs_dg: 0,
      fat_dg: 0,
    })
  })

  it('trouve une recette par le début de son nom ou ses mots', () => {
    const other: RecipeFull = { ...curry, id: 'r2', name: 'Petit-déjeuner habituel', items: [] }
    expect(searchRecipes('curry', [other, curry]).map((r) => r.id)).toEqual(['r1'])
    expect(searchRecipes('dej hab', [other, curry]).map((r) => r.id)).toEqual(['r2'])
    expect(searchRecipes('c', [curry])).toEqual([])
  })

  it('remplace une recette par ses ingrédients pour les courses', () => {
    const items = [
      item({ name: 'Banane' }),
      item({ name: 'Curry de poulet', recipe_id: 'r1' }),
      item({ name: 'Ancienne', recipe_id: 'supprimée' }),
    ]
    expect(shoppingNames(items, [curry])).toEqual([
      'Banane',
      'Poulet (filet cru)',
      'Riz blanc (cru)',
      'Lait de coco',
    ])
  })

  it('fait d’un repas un repas type, valeurs reprises', () => {
    expect(ingredientsFromMeal([item({ food_id: 'f1' })])).toEqual([
      {
        food_id: 'f1',
        name: 'Banane',
        grams: 120,
        kcal: 108,
        protein_dg: 13,
        carbs_dg: 240,
        fat_dg: 4,
      },
    ])
  })
})

describe('copyMealItems', () => {
  it('copie vers un autre jour, après ce qui existe déjà, avec de nouveaux ids', () => {
    let n = 0
    const source = [
      item({ id: 'a', meal: 'lunch', position: 0 }),
      item({ id: 'b', meal: 'lunch', position: 1, name: 'Riz' }),
      item({ id: 'c', meal: 'dinner', position: 0, name: 'Saumon' }),
    ]
    const existing = [item({ id: 'x', day: '2026-10-15', meal: 'lunch', position: 4 })]
    const copies = copyMealItems(
      source,
      () => '2026-10-15',
      existing,
      () => `n${n++}`,
      'maintenant',
    )
    expect(copies.map((c) => [c.id, c.day, c.meal, c.position, c.name])).toEqual([
      ['n0', '2026-10-15', 'lunch', 5, 'Banane'],
      ['n1', '2026-10-15', 'lunch', 6, 'Riz'],
      ['n2', '2026-10-15', 'dinner', 0, 'Saumon'],
    ])
    expect(copies[0]!.created_at).toBe('maintenant')
  })

  it('décale une semaine entière jour pour jour', () => {
    const source = [item({ day: '2026-10-05' }), item({ day: '2026-10-11', meal: 'dinner' })]
    const copies = copyMealItems(
      source,
      (d) => (d === '2026-10-05' ? '2026-10-12' : '2026-10-18'),
      [],
    )
    expect(copies.map((c) => c.day)).toEqual(['2026-10-12', '2026-10-18'])
  })
})
