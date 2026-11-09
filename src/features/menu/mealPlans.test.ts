import { parseMealPlanMd } from './mealPlanMd'
import { choiceValue, parseChoice, planTypes, planWeekChanges, repeatedDays } from './mealPlans'
import type { MealItem } from './types'

const meal = (id: string, over: Partial<MealItem>): MealItem => ({
  id,
  day: '2026-11-10',
  meal: 'lunch',
  food_id: null,
  recipe_id: null,
  name: id,
  grams: 100,
  kcal: 100,
  protein_dg: 0,
  carbs_dg: 0,
  fat_dg: 0,
  plan_id: 'old',
  eaten: false,
  position: 0,
  created_at: '',
  ...over,
})

describe('plan de chaque semaine', () => {
  it('lit les types de semaine et encode le choix', () => {
    const md = parseMealPlanMd(
      '## Semaine B\n### Lundi\n- Déjeuner : X (1 kcal)\n## Semaine A\n### Lundi\n- Dîner : Y (1 kcal)\n',
    )
    expect(planTypes(md)).toEqual(['A', 'B'])
    expect(parseChoice(choiceValue('p1', 'A'))).toEqual({ planId: 'p1', weekType: 'A' })
    expect(parseChoice(choiceValue('p1', null))).toEqual({ planId: 'p1', weekType: null })
    expect(parseChoice('')).toBeNull()
  })

  it('remplace les repas du plan pas encore mangés à partir du jour donné, garde le reste', () => {
    const existing = [
      meal('passé', { day: '2026-11-09' }), // avant aujourd'hui : on n'y touche pas
      meal('ancien', {}), // remplacé
      meal('à la main', { plan_id: null, position: 1 }),
      meal('mangé', { meal: 'dinner', eaten: true }),
    ]
    const planned = [
      meal('n-lundi', { day: '2026-11-09', plan_id: 'new' }),
      meal('n-dej', { plan_id: 'new' }),
      meal('n-diner', { meal: 'dinner', plan_id: 'new' }),
      meal('n-jeudi', { day: '2026-11-12', plan_id: 'new' }),
      meal('n-hors', { day: '2026-11-16', plan_id: 'new' }),
    ]
    const { removeIds, add } = planWeekChanges(existing, planned, '2026-11-10', '2026-11-15')
    expect(removeIds).toEqual(['ancien'])
    // le dîner déjà mangé n'est pas reposé ; le déjeuner passe après l'ajout à la main
    expect(add.map((m) => [m.id, m.position])).toEqual([
      ['n-dej', 2],
      ['n-jeudi', 0],
    ])
  })

  it('aucun plan : retire seulement les repas de plan pas encore mangés', () => {
    const existing = [meal('a', {}), meal('b', { plan_id: null }), meal('c', { eaten: true })]
    expect(planWeekChanges(existing, [], '2026-11-10', '2026-11-15')).toEqual({
      removeIds: ['a'],
      add: [],
    })
  })
})

describe('titres de semaine', () => {
  const cycles = (title: string) =>
    parseMealPlanMd(`## ${title}\n### Lundi\n- Déjeuner : X (1 kcal)\n`).days.map((d) => d.cycle)

  it('reconnaît un type suivi d’un nom, ou numéroté', () => {
    expect(cycles('Semaine A')).toEqual(['A'])
    expect(cycles('Semaine A — sèche')).toEqual(['A'])
    expect(cycles('Semaine B (prise de masse)')).toEqual(['B'])
    expect(cycles('Semaine A :')).toEqual(['A'])
    expect(cycles('Semaine type C')).toEqual(['C'])
    expect(cycles('Semaine 2')).toEqual(['B'])
    expect(cycles('Semaine')).toEqual([null])
    expect(cycles('Semaine actuelle')).toEqual([null])
  })

  it('signale un jour décrit deux fois pour les mêmes semaines', () => {
    const md = parseMealPlanMd(
      '## Semaine\n### Lundi\n- Déjeuner : X (1 kcal)\n## Semaine\n### Lundi\n- Déjeuner : Y (1 kcal)\n## Semaine A\n### Mardi\n- Dîner : Z (1 kcal)\n## Semaine B\n### Mardi\n- Dîner : W (1 kcal)\n',
    )
    expect(repeatedDays(md)).toEqual([expect.stringMatching(/^« Lundi » est décrit 2 fois/)])
  })
})
