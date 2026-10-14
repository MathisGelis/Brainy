import type { Category, Expense } from '@/features/budget/types'
import { expensesToCSV } from './exportLogic'

const cat: Category = {
  id: 'c1',
  name: 'Courses',
  color: null,
  monthly_budget_cents: null,
  position: 0,
  archived: false,
}
const exp = (
  id: string,
  day: string,
  cents: number,
  categoryId: string | null,
  note: string | null,
): Expense => ({
  id,
  category_id: categoryId,
  amount_cents: cents,
  spent_on: day,
  note,
  created_at: `${day}T10:00:00Z`,
})

describe('expensesToCSV', () => {
  it('trie par date et formate les montants en euros', () => {
    const csv = expensesToCSV(
      [
        exp('2', '2026-03-05', 1999, null, 'Cinéma; popcorn'),
        exp('1', '2026-03-01', 1250, 'c1', null),
      ],
      [cat],
    )
    expect(csv).toBe(
      'date;montant_eur;categorie;note\r\n' +
        '2026-03-01;12,50;Courses;\r\n' +
        '2026-03-05;19,99;;"Cinéma; popcorn"\r\n',
    )
  })
})
