import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SchemaBanner } from './SchemaBanner'

const missing = vi.hoisted(() => ({ tables: new Set<string>() }))

// Faux client : une table « manquante » répond comme PostgREST quand une migration n'est pas passée
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => ({
      select: (columns: string) => ({
        limit: async () => ({
          data: [],
          error: missing.tables.has(`${table}.${columns}`)
            ? { code: '42703', message: 'column does not exist' }
            : null,
        }),
      }),
    }),
  },
}))

function renderBanner() {
  const client = new QueryClient()
  render(
    <QueryClientProvider client={client}>
      <SchemaBanner />
    </QueryClientProvider>,
  )
}

describe('SchemaBanner', () => {
  beforeEach(() => missing.tables.clear())

  it('liste les migrations à exécuter, puis disparaît une fois la base à jour', async () => {
    missing.tables.add('expenses.recurring_id')
    missing.tables.add('foods.id')
    renderBanner()
    const banner = await screen.findByRole('alert')
    expect(banner).toHaveTextContent('La base de données n’est pas à jour')
    expect(banner).toHaveTextContent('0002_enrichissements.sql')
    expect(banner).toHaveTextContent('0005_menu.sql')
    expect(banner).not.toHaveTextContent('0003')

    missing.tables.clear()
    await userEvent.click(screen.getByRole('button', { name: 'Revérifier' }))
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
  })

  it('ne montre rien quand tout est appliqué', async () => {
    renderBanner()
    await new Promise((r) => setTimeout(r, 50))
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
