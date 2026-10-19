import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { addMonths, monthOf, todayISO } from '@/lib/dates'
import * as api from './budgetApi'
import type { RecurringEntry } from './types'
import { useRecurringGeneration } from './useBudgetExtras'

vi.mock('./budgetApi')

const today = todayISO()
const twoMonthsAgo = `${addMonths(monthOf(today), -2)}-01`

const rule: RecurringEntry = {
  id: 'r1',
  kind: 'expense',
  amount_cents: 90000,
  category_id: 'c1',
  note: 'Loyer',
  day_of_month: 1,
  start_on: twoMonthsAgo,
  last_generated_on: null,
  active: true,
  created_at: '',
}

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return renderHook(() => useRecurringGeneration(), { wrapper })
}

describe('useRecurringGeneration', () => {
  it('génère les occurrences dues puis avance la règle', async () => {
    vi.mocked(api.fetchRecurring).mockResolvedValue([rule])
    vi.mocked(api.insertGenerated).mockResolvedValue()
    vi.mocked(api.patchRecurring).mockResolvedValue()
    setup()

    await waitFor(() => expect(api.patchRecurring).toHaveBeenCalled())
    const [, dates] = vi.mocked(api.insertGenerated).mock.calls[0]!
    expect(dates).toHaveLength(3) // il y a deux mois, le mois dernier, ce mois-ci
    expect(dates.at(-1)).toBe(`${monthOf(today)}-01`)
    expect(api.patchRecurring).toHaveBeenCalledWith('r1', {
      last_generated_on: `${monthOf(today)}-01`,
    })
  })

  it('ne fait rien quand tout est à jour', async () => {
    vi.mocked(api.fetchRecurring).mockResolvedValue([
      { ...rule, last_generated_on: `${monthOf(today)}-01` },
    ])
    setup()
    await waitFor(() => expect(api.fetchRecurring).toHaveBeenCalled())
    await new Promise((r) => setTimeout(r, 50))
    expect(api.insertGenerated).not.toHaveBeenCalled()
  })
})
