import { CATALOG } from './catalog'
import { MEAL_PLAN_TEMPLATE, parseItem, parseMealPlanMd, splitItems } from './mealPlanMd'
import { resolveMealPlan } from './mealPlanResolve'
import type { Food, RecipeFull } from './types'

describe('parseItem', () => {
  it('lit quantités, portions, parts et valeurs données sur la ligne', () => {
    expect(parseItem('150 g Saumon')).toMatchObject({ name: 'Saumon', grams: 150, count: null })
    expect(parseItem('Saumon 150 g')).toMatchObject({ name: 'Saumon', grams: 150 })
    expect(parseItem('250 ml de Lait demi-écrémé')).toMatchObject({
      name: 'Lait demi-écrémé',
      grams: 250,
    })
    expect(parseItem('1,5 l Eau')).toMatchObject({ name: 'Eau', grams: 1500 })
    expect(parseItem('2 Œufs')).toMatchObject({ name: 'Œufs', grams: null, count: 2 })
    expect(parseItem('200 g Riz basmati (cuit)')).toMatchObject({
      name: 'Riz basmati (cuit)',
      grams: 200,
    })
    expect(parseItem('Curry de poulet (2 parts)')).toMatchObject({
      name: 'Curry de poulet',
      count: 2,
    })
    expect(parseItem('Curry de poulet x2')).toMatchObject({ name: 'Curry de poulet', count: 2 })
    expect(parseItem('Salade composée (520 kcal, P 30 g, G 40, L 25,5)')).toMatchObject({
      name: 'Salade composée',
      macros: { kcal: 520, protein_dg: 300, carbs_dg: 400, fat_dg: 255 },
    })
    expect(
      parseItem('Bowl (650 kcal, 350 g, Protéines 40, Glucides 70, Lipides 20)'),
    ).toMatchObject({
      grams: 350,
      macros: { kcal: 650, protein_dg: 400, carbs_dg: 700, fat_dg: 200 },
    })
  })

  it('sépare les éléments sans couper un plat ni des parenthèses', () => {
    expect(splitItems('150 g Saumon, 200 g Riz (cuit) + 1 Pomme')).toEqual([
      '150 g Saumon',
      '200 g Riz (cuit)',
      '1 Pomme',
    ])
    expect(splitItems('Pâtes poulet et brocoli (600 kcal, P 40, G 70, L 15)')).toHaveLength(1)
  })
})

describe('parseMealPlanMd', () => {
  it('lit le modèle sans rien laisser de côté', () => {
    const md = parseMealPlanMd(MEAL_PLAN_TEMPLATE)
    expect(md.problems).toEqual([])
    expect(md.targets).toEqual({ kcal: 2200, protein_g: 150, carbs_g: 240, fat_g: 70 })
    expect(md.foods).toHaveLength(7)
    expect(md.foods.find((f) => f.name === 'Œuf')).toEqual({
      name: 'Œuf',
      kcal: 140,
      protein_dg: 125,
      carbs_dg: 7,
      fat_dg: 98,
      portion_g: 55,
      portion_label: '1 œuf',
    })
    expect(md.recipes.map((r) => [r.name, r.servings, r.items.length])).toEqual([
      ['Porridge banane', 1, 3],
      ['Poulet riz', 2, 2],
    ])
    expect(md.days.map((d) => d.key)).toEqual([
      { kind: 'weekday', weekday: 1 },
      { kind: 'weekday', weekday: 2 },
      { kind: 'every' },
    ])
    expect(md.days[0]!.meals.map((m) => m.meal)).toEqual(['breakfast', 'lunch', 'dinner'])
  })

  it('accepte jours en gras, repas en sous-titres, dates précises, et signale le reste', () => {
    const md = parseMealPlanMd(`## Menus
**Vendredi**
#### Midi
- 120 g Poulet (filet cru)
- 100 g Riz basmati (cuit)
### 2026-12-24
- Dîner : Foie gras (300 kcal, P 4, G 2, L 30)
### Samedi
- Brunch : 2 œufs
`)
    expect(md.days.map((d) => d.key)).toEqual([
      { kind: 'weekday', weekday: 5 },
      { kind: 'date', date: '2026-12-24' },
    ])
    expect(md.days[0]!.meals[0]).toMatchObject({ meal: 'lunch' })
    expect(md.days[0]!.meals[0]!.items).toHaveLength(2)
    expect(md.problems).toEqual([expect.stringMatching(/^Ligne 9 : repas non reconnu.*Brunch/)])
  })
})

describe('resolveMealPlan', () => {
  const myFoods: Food[] = [
    {
      id: 'f-saumon',
      name: 'Saumon',
      kcal: 180,
      protein_dg: 200,
      carbs_dg: 0,
      fat_dg: 110,
      portion_g: null,
      portion_label: null,
      created_at: '',
    },
  ]
  const myRecipes: RecipeFull[] = [
    { id: 'r-old', name: 'Poulet riz', servings: 4, created_at: '', items: [] },
  ]

  it('crée, met à jour, remplace et pose les repas sur les semaines demandées', () => {
    const md = parseMealPlanMd(MEAL_PLAN_TEMPLATE)
    const r = resolveMealPlan(
      md,
      { foods: myFoods, recipes: myRecipes, catalog: CATALOG },
      {
        monday: '2026-11-16',
        weeks: 2,
      },
    )
    expect(r.problems).toEqual([])
    // Saumon existait avec d'autres valeurs : mis à jour, pas recréé
    expect(r.updatedFoods).toEqual([
      {
        id: 'f-saumon',
        name: 'Saumon',
        patch: { kcal: 200, protein_dg: 200, carbs_dg: 0, fat_dg: 130 },
      },
    ])
    expect(r.newFoods.map((f) => f.name)).not.toContain('Saumon')
    expect(r.newFoods).toHaveLength(6)
    // « Poulet riz » garde son id et voit ses ingrédients remplacés
    const pouletRiz = r.recipes.find((x) => x.recipe.name === 'Poulet riz')!
    expect(pouletRiz.recipe).toMatchObject({ id: 'r-old', servings: 2 })
    expect(pouletRiz.replaces).toEqual([])
    // 2 semaines : lundis 16 et 23, mardis 17 et 24, collation tous les jours (14)
    expect(r.days).toHaveLength(14)
    const monday = r.mealItems.filter((m) => m.day === '2026-11-16')
    expect(monday.map((m) => [m.meal, m.name])).toEqual([
      ['breakfast', 'Porridge banane'],
      ['lunch', 'Poulet riz'],
      ['dinner', 'Saumon'],
      ['dinner', 'Riz basmati (cuit)'],
      ['snack', 'Banane'],
    ])
    // Poulet riz, 1 part sur 2 : la moitié de 300 g de poulet et 400 g de riz
    expect(monday[1]).toMatchObject({
      recipe_id: 'r-old',
      grams: 350,
      kcal: Math.round((360 + 520) / 2),
    })
    // « 2 Œufs » = 2 portions de 55 g ; la salade garde ses valeurs données
    const tuesday = r.mealItems.filter((m) => m.day === '2026-11-17')
    expect(tuesday.find((m) => m.name === 'Œuf')).toMatchObject({ grams: 110, kcal: 154 })
    expect(tuesday.find((m) => m.name === 'Salade composée')).toMatchObject({
      food_id: null,
      kcal: 520,
      protein_dg: 300,
    })
  })

  it('cherche dans la base d’aliments, signale les rapprochements et les inconnus', () => {
    const md = parseMealPlanMd(`## Semaine
### Lundi
- Déjeuner : 100 g Pomme, 50 g Zorglub
### Mardi
- Dîner : 50 g Zorglub`)
    const r = resolveMealPlan(
      md,
      { foods: [], recipes: [], catalog: CATALOG },
      { monday: '2026-11-16', weeks: 1 },
    )
    expect(r.newFoods.map((f) => f.name)).toContain('Pomme')
    expect(r.problems).toEqual([expect.stringMatching(/aliment inconnu « Zorglub »/)])
    expect(r.mealItems.map((m) => m.name)).toEqual(['Pomme'])
  })
})
