import { CATALOG } from './catalog'
import {
  baseName,
  defaultMeal,
  dgToInput,
  gramsFor,
  inputToDg,
  missingFromShopping,
  nextPlannedMeal,
  normalizeName,
  parseFoodInput,
  portionText,
  rescaleItem,
  scaleMacros,
  searchFoods,
  sumMacros,
} from './nutrition'
import type { Food, MealItem } from './types'

const TODAY = '2026-10-14' // mercredi

const food = (name: string, over: Partial<Food> = {}): Food => ({
  id: name,
  name,
  kcal: 100,
  protein_dg: 100,
  carbs_dg: 0,
  fat_dg: 0,
  portion_g: null,
  portion_label: null,
  created_at: '',
  ...over,
})

describe('parseFoodInput', () => {
  it('comprend quantité, unité, repas et jour', () => {
    expect(parseFoodInput('200 g de poulet midi', TODAY)).toEqual({
      query: 'poulet',
      grams: 200,
      count: null,
      meal: 'lunch',
      day: null,
    })
    expect(parseFoodInput('2 œufs demain matin', TODAY)).toMatchObject({
      query: 'œufs',
      grams: null,
      count: 2,
      meal: 'breakfast',
      day: '2026-10-15',
    })
    expect(parseFoodInput('1,5 kg pommes de terre', TODAY)).toMatchObject({
      query: 'pommes de terre',
      grams: 1500,
    })
    expect(parseFoodInput('25 cl lait', TODAY)).toMatchObject({ query: 'lait', grams: 250 })
    expect(parseFoodInput('riz 150', TODAY)).toMatchObject({ query: 'riz', grams: 150 })
    expect(parseFoodInput('une banane au goûter', TODAY)).toMatchObject({
      query: 'banane',
      count: 1,
      meal: 'snack',
    })
    expect(parseFoodInput('pâtes ce soir', TODAY)).toMatchObject({
      query: 'pâtes',
      grams: null,
      count: null,
      meal: 'dinner',
    })
  })

  it('garde un pourcentage dans le nom', () => {
    expect(parseFoodInput('bœuf haché 5 % 125 g', TODAY)).toMatchObject({
      query: 'bœuf haché 5 %',
      grams: 125,
    })
    expect(parseFoodInput('bœuf haché 5 %', TODAY)).toMatchObject({ count: null, grams: null })
  })
})

describe('searchFoods', () => {
  it('trouve dans la base malgré accents, ligatures et pluriels', () => {
    expect(normalizeName('Œufs')).toBe('oeuf')
    const [egg] = searchFoods('oeufs', [], CATALOG)
    expect(egg).toMatchObject({ kind: 'catalog', food: { name: 'Œuf' } })
    expect(searchFoods('poulet', [], CATALOG).map((c) => c.food.name)).toEqual([
      'Poulet (filet cru)',
      'Poulet (filet cuit)',
    ])
    expect(searchFoods('pates cuites', [], CATALOG)[0]?.food.name).toBe('Pâtes (cuites)')
  })

  it('propose tes aliments avant la base à pertinence égale, sans doublon', () => {
    const mine = [food('Poulet (filet cuit)'), food('Poulet curry maison')]
    const names = searchFoods('poulet', mine, CATALOG).map((c) => `${c.kind}:${c.food.name}`)
    expect(names).toEqual([
      'food:Poulet (filet cuit)',
      'catalog:Poulet (filet cru)', // même nom de base que la recherche
      'food:Poulet curry maison',
    ])
  })

  it('ne cherche pas avant deux lettres', () => {
    expect(searchFoods('p', [], CATALOG)).toEqual([])
  })
})

describe('calculs', () => {
  const egg = food('Œuf', { kcal: 143, protein_dg: 126, carbs_dg: 7, fat_dg: 95, portion_g: 55 })

  it('déduit la quantité : grammes, sinon portions', () => {
    expect(gramsFor({ grams: 30, count: null }, egg)).toBe(30)
    expect(gramsFor({ grams: null, count: 2 }, egg)).toBe(110)
    expect(gramsFor({ grams: null, count: null }, egg)).toBe(55)
    expect(gramsFor({ grams: null, count: null }, food('Riz'))).toBe(100)
  })

  it('met les valeurs à l’échelle et les additionne', () => {
    const two = scaleMacros(egg, 110)
    expect(two).toEqual({ kcal: 157, protein_dg: 139, carbs_dg: 8, fat_dg: 105 })
    const item = { ...two, grams: 110 } as MealItem
    expect(rescaleItem(item, 55)).toEqual({ kcal: 79, protein_dg: 70, carbs_dg: 4, fat_dg: 53 })
    expect(sumMacros([two, two])).toEqual({ kcal: 314, protein_dg: 278, carbs_dg: 16, fat_dg: 210 })
  })

  it('convertit les dixièmes de gramme pour la saisie', () => {
    expect(dgToInput(125)).toBe('12,5')
    expect(dgToInput(130)).toBe('13')
    expect(inputToDg('12,5')).toBe(125)
    expect(inputToDg('')).toBe(0)
    expect(inputToDg('abc')).toBeNull()
  })

  it('choisit le repas selon l’heure', () => {
    expect([7, 12, 16, 20].map(defaultMeal)).toEqual(['breakfast', 'lunch', 'snack', 'dinner'])
  })
})

describe('portionText', () => {
  it('accorde la portion', () => {
    expect(portionText(1, 'œuf')).toBe('1 œuf')
    expect(portionText(2, 'œuf')).toBe('2 œufs')
    expect(portionText(3, 'cuillère à soupe')).toBe('3 cuillères à soupe')
    expect(portionText(2, 'pain au chocolat')).toBe('2 pains au chocolat')
    expect(portionText(1.5, 'bol')).toBe('1,5 bols')
  })
})

describe('liste de courses', () => {
  it('ne propose que les aliments absents, par nom de base et sans doublon', () => {
    expect(baseName('Poulet (filet cru)')).toBe('Poulet')
    expect(
      missingFromShopping(
        ['Poulet (filet cru)', 'Poulet (filet cuit)', 'Riz blanc (cuit)', 'Œuf', 'Banane'],
        ['oeufs', 'Riz blanc'],
      ),
    ).toEqual(['Poulet', 'Banane'])
  })
})

describe('nextPlannedMeal', () => {
  const items = [
    { meal: 'breakfast' as const, name: 'Flocons d’avoine' },
    { meal: 'dinner' as const, name: 'Saumon' },
    { meal: 'dinner' as const, name: 'Riz blanc (cuit)' },
  ]
  it('donne le repas en cours ou le suivant qui a des aliments', () => {
    expect(nextPlannedMeal(items, 8)).toEqual({ meal: 'breakfast', names: ['Flocons d’avoine'] })
    expect(nextPlannedMeal(items, 12)).toEqual({
      meal: 'dinner',
      names: ['Saumon', 'Riz blanc (cuit)'],
    })
    expect(nextPlannedMeal([items[0]!], 20)).toBeNull()
  })
})
