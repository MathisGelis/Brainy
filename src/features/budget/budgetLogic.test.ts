import { summarizeMonth } from './budgetLogic'
import type { Category, Expense } from './types'

const cat = (id: string, budget: number | null, extra: Partial<Category> = {}): Category => ({
  id,
  name: id,
  color: null,
  monthly_budget_cents: budget,
  position: 0,
  archived: false,
  ...extra,
})

const exp = (id: string, categoryId: string | null, cents: number): Expense => ({
  id,
  category_id: categoryId,
  amount_cents: cents,
  spent_on: '2026-03-10',
  note: null,
  created_at: '2026-03-10T10:00:00Z',
})

describe('summarizeMonth', () => {
  const categories = [
    cat('courses', 30000, { position: 0 }),
    cat('loisirs', 10000, { position: 1 }),
    cat('autre', null, { position: 2 }),
  ]

  it('calcule total, budget total et reste', () => {
    const s = summarizeMonth(categories, [exp('1', 'courses', 12050), exp('2', 'loisirs', 999)])
    expect(s.totalSpent).toBe(13049)
    expect(s.totalBudget).toBe(40000)
    expect(s.remaining).toBe(26951)
    expect(s.over).toBe(false)
  })

  it('additionne exactement en centimes (pas de dérive flottante)', () => {
    const expenses = Array.from({ length: 10 }, (_, i) => exp(String(i), 'courses', 10))
    expect(summarizeMonth(categories, expenses).totalSpent).toBe(100)
  })

  it('détecte un dépassement par catégorie et au total', () => {
    const s = summarizeMonth(categories, [exp('1', 'loisirs', 12000), exp('2', 'courses', 31000)])
    const loisirs = s.byCategory.find((c) => c.category?.id === 'loisirs')!
    expect(loisirs.over).toBe(true)
    expect(loisirs.remaining).toBe(-2000)
    expect(loisirs.ratio).toBe(1) // plafonné
    expect(s.over).toBe(true)
    expect(s.remaining).toBe(-3000)
  })

  it('sans budget défini : pas de reste, jamais en dépassement', () => {
    const s = summarizeMonth([cat('autre', null)], [exp('1', 'autre', 500)])
    expect(s.remaining).toBeNull()
    expect(s.over).toBe(false)
    expect(s.byCategory[0]!.ratio).toBe(0)
  })

  it('regroupe les dépenses sans catégorie', () => {
    const s = summarizeMonth(categories, [exp('1', null, 700), exp('2', 'inconnue', 300)])
    const orphan = s.byCategory.at(-1)!
    expect(orphan.category).toBeNull()
    expect(orphan.spent).toBe(1000)
  })

  it('masque les catégories archivées sans dépense, garde celles avec dépenses', () => {
    const cats = [
      cat('a', 100, { archived: true }),
      cat('b', 100, { archived: true }),
      cat('c', 100),
    ]
    const s = summarizeMonth(cats, [exp('1', 'b', 50)])
    expect(s.byCategory.map((c) => c.category?.id)).toEqual(['b', 'c'])
    expect(s.totalBudget).toBe(100) // les archivées ne comptent pas dans le budget
  })

  it('mois vide', () => {
    const s = summarizeMonth(categories, [])
    expect(s.totalSpent).toBe(0)
    expect(s.remaining).toBe(40000)
  })
})
