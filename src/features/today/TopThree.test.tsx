import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider } from '@/components/ui'
import * as todosApi from '@/features/todos/todosApi'
import type { Todo } from '@/features/todos/types'
import { addDays, todayISO } from '@/lib/dates'
import { TopThree } from './TopThree'

vi.mock('@/features/todos/todosApi')

const today = todayISO()
const base: Omit<Todo, 'id' | 'title'> = {
  list_id: null,
  goal_id: null,
  recurrence: null,
  focus_on: null,
  focus_week: null,
  done: false,
  done_at: null,
  due_date: null,
  priority: 'normal',
  position: 0,
  created_at: '2026-01-01T00:00:00Z',
}

let server: Todo[] = []

function renderTop(day = today) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <TopThree day={day} onError={() => {}} />
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('TopThree', () => {
  beforeEach(() => {
    server = [
      { ...base, id: 't1', title: 'Payer le loyer', due_date: today },
      { ...base, id: 't2', title: 'Ranger le garage', due_date: addDays(today, 10) },
    ]
    vi.mocked(todosApi.fetchTodos).mockImplementation(async () => server.map((t) => ({ ...t })))
    vi.mocked(todosApi.fetchLists).mockResolvedValue([])
    vi.mocked(todosApi.patchTodo).mockImplementation(async (id, patch) => {
      server = server.map((t) => (t.id === id ? { ...t, ...patch } : t))
    })
    vi.mocked(todosApi.insertTodo).mockImplementation(async (todo) => {
      server = [...server, todo]
    })
  })

  it('suggère les todos du jour en premier et les ajoute en un clic', async () => {
    renderTop()
    const group = await screen.findByRole('group', { name: 'Suggestions pour le Top 3' })
    const pills = within(group).getAllByRole('button')
    expect(pills[0]).toHaveAccessibleName('Ajouter « Payer le loyer » au Top 3')

    await userEvent.click(pills[0]!)
    expect(todosApi.patchTodo).toHaveBeenCalledWith('t1', { focus_on: today })
    expect(
      await screen.findByRole('checkbox', { name: 'Terminer « Payer le loyer »' }),
    ).toBeInTheDocument()
    expect(screen.getByText('0/1')).toBeInTheDocument()
  })

  it('crée une priorité directement, datée du jour', async () => {
    renderTop()
    const input = await screen.findByLabelText('Nouvelle priorité (Top 3 du jour)')
    await userEvent.type(input, 'Appeler maman{Enter}')
    await waitFor(() =>
      expect(todosApi.insertTodo).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Appeler maman', due_date: today, focus_on: today }),
      ),
    )
    expect(input).toHaveValue('')
  })

  it('retire une priorité sans supprimer la todo', async () => {
    server = server.map((t) => (t.id === 't1' ? { ...t, focus_on: today } : t))
    renderTop()
    await userEvent.click(
      await screen.findByRole('button', { name: 'Retirer « Payer le loyer » du Top 3' }),
    )
    expect(todosApi.patchTodo).toHaveBeenCalledWith('t1', { focus_on: null })
    expect(todosApi.removeTodo).not.toHaveBeenCalled()
  })

  it('félicite quand les 3 priorités sont faites, sans plus rien proposer', async () => {
    server = [
      { ...base, id: 'a', title: 'Un', focus_on: today, done: true },
      { ...base, id: 'b', title: 'Deux', focus_on: today, done: true },
      { ...base, id: 'c', title: 'Trois', focus_on: today },
      { ...base, id: 'd', title: 'Autre', due_date: today },
    ]
    renderTop()
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Terminer « Trois »' }))
    expect(await screen.findAllByText('Top 3 bouclé. Bravo !')).not.toHaveLength(0)
    expect(screen.getByText('3/3')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Suggestions pour le Top 3' })).toBeNull()
    expect(screen.queryByLabelText('Nouvelle priorité (Top 3 du jour)')).toBeNull()
  })

  it('ne propose pas les articles de la liste de courses', async () => {
    vi.mocked(todosApi.fetchLists).mockResolvedValue([{ id: 'l1', name: 'Courses', position: 0 }])
    server = [...server, { ...base, id: 'c1', title: 'Lait de coco', list_id: 'l1' }]
    renderTop()
    const group = await screen.findByRole('group', { name: 'Suggestions pour le Top 3' })
    await waitFor(() =>
      expect(within(group).queryByRole('button', { name: /Lait de coco/ })).toBeNull(),
    )
    expect(within(group).getByRole('button', { name: /Payer le loyer/ })).toBeInTheDocument()
  })
})
