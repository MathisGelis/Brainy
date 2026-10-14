import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui'
import * as todosApi from '@/features/todos/todosApi'
import type { Todo, TodoList } from '@/features/todos/types'
import { addDays, todayISO } from '@/lib/dates'
import * as api from './menuApi'
import MenuPage from './MenuPage'
import type { Food, MacroTargets, MealItem } from './types'

vi.mock('./menuApi')
vi.mock('@/features/todos/todosApi')

const today = todayISO()
const rice: Food = {
  id: 'f-rice',
  name: 'Riz blanc (cuit)',
  kcal: 130,
  protein_dg: 27,
  carbs_dg: 280,
  fat_dg: 3,
  portion_g: null,
  portion_label: null,
  created_at: '',
}
const riceLunch: MealItem = {
  id: 'm1',
  day: today,
  meal: 'lunch',
  food_id: rice.id,
  name: rice.name,
  grams: 200,
  kcal: 260,
  protein_dg: 54,
  carbs_dg: 560,
  fat_dg: 6,
  position: 0,
  created_at: '',
}

let foods: Food[] = []
let items: MealItem[] = []
let targets: MacroTargets | null = null
let todos: Todo[] = []
let lists: TodoList[] = []

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter>
          <MenuPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('MenuPage', () => {
  beforeEach(() => {
    foods = [rice]
    items = [riceLunch]
    targets = null
    todos = []
    lists = []
    vi.mocked(api.fetchFoods).mockImplementation(async () => foods.map((f) => ({ ...f })))
    vi.mocked(api.insertFood).mockImplementation(async (f) => {
      foods = [...foods, f]
    })
    vi.mocked(api.patchFood).mockImplementation(async (id, patch) => {
      foods = foods.map((f) => (f.id === id ? { ...f, ...patch } : f))
    })
    vi.mocked(api.removeFood).mockImplementation(async (id) => {
      foods = foods.filter((f) => f.id !== id)
      items = items.map((i) => (i.food_id === id ? { ...i, food_id: null } : i))
    })
    vi.mocked(api.fetchMealItems).mockImplementation(async (from, to) =>
      items.filter((i) => i.day >= from && i.day <= to).map((i) => ({ ...i })),
    )
    vi.mocked(api.insertMealItems).mockImplementation(async (added) => {
      items = [...items, ...added]
    })
    vi.mocked(api.patchMealItem).mockImplementation(async (id, patch) => {
      items = items.map((i) => (i.id === id ? { ...i, ...patch } : i))
    })
    vi.mocked(api.removeMealItem).mockImplementation(async (id) => {
      items = items.filter((i) => i.id !== id)
    })
    vi.mocked(api.fetchTargets).mockImplementation(async () => targets)
    vi.mocked(api.upsertTargets).mockImplementation(async (t) => {
      targets = t
    })
    vi.mocked(todosApi.fetchTodos).mockImplementation(async () => todos.map((t) => ({ ...t })))
    vi.mocked(todosApi.fetchLists).mockImplementation(async () => lists)
    vi.mocked(todosApi.insertList).mockImplementation(async (l) => {
      lists = [...lists, l]
    })
    vi.mocked(todosApi.insertTodo).mockImplementation(async (t) => {
      todos = [...todos, t]
    })
    vi.mocked(todosApi.patchTodo).mockImplementation(async (id, patch) => {
      todos = todos.map((t) => (t.id === id ? { ...t, ...patch } : t))
    })
    vi.mocked(todosApi.removeTodo).mockImplementation(async (id) => {
      todos = todos.filter((t) => t.id !== id)
    })
  })

  it('ajoute « 2 œufs midi » depuis la base, puis propose la liste de courses', async () => {
    renderPage()
    const input = await screen.findByLabelText('Ajouter un aliment')
    await userEvent.type(input, '2 oeufs midi')
    const hint = screen.getByText('Compris :').parentElement!
    expect(hint).toHaveTextContent('Œuf')
    expect(hint).toHaveTextContent('110 g (2 œuf)')
    expect(hint).toHaveTextContent('157 kcal')
    await userEvent.keyboard('{Enter}')

    // l'aliment copié de la base part avant l'élément de repas qui le cite
    await waitFor(() =>
      expect(api.insertMealItems).toHaveBeenCalledWith([
        expect.objectContaining({ name: 'Œuf', grams: 110, kcal: 157, meal: 'lunch', day: today }),
      ]),
    )
    const egg = vi.mocked(api.insertFood).mock.calls[0]![0]
    expect(egg).toMatchObject({ name: 'Œuf', kcal: 143, portion_g: 55 })
    expect(vi.mocked(api.insertMealItems).mock.calls[0]![0][0]!.food_id).toBe(egg.id)
    expect(input).toHaveValue('')
    expect(input).toHaveFocus()

    const lunch = screen.getByRole('region', { name: /Déjeuner/ })
    expect(await within(lunch).findByText('Œuf')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Macros du jour' })).toHaveTextContent('417')

    const proposal = screen.getByText(/à la liste de courses \?/).closest('div')!
    expect(proposal).toHaveTextContent('Ajouter « Œuf » à la liste de courses ?')
    await userEvent.click(within(proposal).getByRole('button', { name: 'Ajouter' }))
    await waitFor(() => expect(todosApi.insertTodo).toHaveBeenCalled())
    const list = vi.mocked(todosApi.insertList).mock.calls[0]![0]
    expect(list.name).toBe('Courses')
    expect(todosApi.insertTodo).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Œuf', list_id: list.id }),
    )
    const shopping = screen.getByRole('region', { name: 'Liste de courses' })
    expect(await within(shopping).findByText('Œuf')).toBeInTheDocument()
  })

  it('crée un aliment inconnu avec ses valeurs, une seule fois', async () => {
    renderPage()
    await userEvent.type(await screen.findByLabelText('Ajouter un aliment'), '120 g tofu fumé')
    const form = screen.getByRole('region', { name: 'Nouvel aliment « Tofu fumé »' })
    await userEvent.type(within(form).getByLabelText('kcal'), '180')
    await userEvent.type(within(form).getByLabelText('Protéines (g)'), '16,5')
    await userEvent.type(within(form).getByLabelText('Glucides (g)'), '2')
    await userEvent.type(within(form).getByLabelText('Lipides (g)'), '12')
    await userEvent.click(within(form).getByRole('button', { name: 'Créer et ajouter' }))

    await waitFor(() =>
      expect(api.insertFood).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Tofu fumé',
          kcal: 180,
          protein_dg: 165,
          carbs_dg: 20,
          fat_dg: 120,
        }),
      ),
    )
    await waitFor(() =>
      expect(api.insertMealItems).toHaveBeenCalledWith([
        expect.objectContaining({ name: 'Tofu fumé', grams: 120, kcal: 216, protein_dg: 198 }),
      ]),
    )
  })

  it('refuse des valeurs invalides pour un nouvel aliment', async () => {
    renderPage()
    await userEvent.type(await screen.findByLabelText('Ajouter un aliment'), 'quinoa soufflé')
    const form = screen.getByRole('region', { name: 'Nouvel aliment « Quinoa soufflé »' })
    await userEvent.type(within(form).getByLabelText('kcal'), 'beaucoup')
    await userEvent.click(within(form).getByRole('button', { name: 'Créer et ajouter' }))
    expect(within(form).getByRole('alert')).toHaveTextContent('Vérifiez les valeurs')
    expect(api.insertFood).not.toHaveBeenCalled()
  })

  it('modifie la quantité (valeurs recalculées), change de repas, supprime avec « Annuler »', async () => {
    renderPage()
    await userEvent.click(
      await screen.findByRole('button', { name: 'Modifier « Riz blanc (cuit) », 200 g' }),
    )
    const qty = screen.getByLabelText('Quantité de « Riz blanc (cuit) » en grammes')
    await userEvent.clear(qty)
    await userEvent.type(qty, '100')
    await userEvent.tab()
    await waitFor(() =>
      expect(api.patchMealItem).toHaveBeenCalledWith('m1', {
        grams: 100,
        kcal: 130,
        protein_dg: 27,
        carbs_dg: 280,
        fat_dg: 3,
      }),
    )

    await userEvent.selectOptions(screen.getByLabelText('Repas de « Riz blanc (cuit) »'), 'dinner')
    await waitFor(() => expect(api.patchMealItem).toHaveBeenCalledWith('m1', { meal: 'dinner' }))

    // la ligne passe au dîner : on la rouvre pour la supprimer
    const dinner = screen.getByRole('region', { name: /Dîner/ })
    await userEvent.click(
      await within(dinner).findByRole('button', { name: 'Modifier « Riz blanc (cuit) », 100 g' }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Supprimer' }))
    await waitFor(() => expect(api.removeMealItem).toHaveBeenCalledWith('m1'))
    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    await waitFor(() =>
      expect(api.insertMealItems).toHaveBeenLastCalledWith([
        expect.objectContaining({ id: 'm1', grams: 100, meal: 'dinner' }),
      ]),
    )
  })

  it('suit les macros face aux objectifs, modifiables', async () => {
    targets = { kcal: 2000, protein_g: 120, carbs_g: null, fat_g: null }
    renderPage()
    const summary = await screen.findByRole('region', { name: 'Macros du jour' })
    await waitFor(() => expect(summary).toHaveTextContent('/ 2000 kcal'))
    expect(within(summary).getByText('Reste 1740 kcal')).toBeInTheDocument()
    expect(within(summary).getByRole('progressbar', { name: 'Calories du jour' })).toHaveAttribute(
      'aria-valuenow',
      '13',
    )
    expect(summary).toHaveTextContent('5 / 120 g')

    await userEvent.click(within(summary).getByRole('button', { name: 'Objectifs' }))
    const kcal = within(summary).getByLabelText('kcal')
    await userEvent.clear(kcal)
    await userEvent.type(kcal, '200')
    await userEvent.tab()
    expect(within(summary).getByRole('alert')).toHaveTextContent('500 à 10 000 kcal')
    await userEvent.clear(kcal)
    await userEvent.type(kcal, '1800')
    await userEvent.tab()
    await waitFor(() =>
      expect(api.upsertTargets).toHaveBeenCalledWith({
        kcal: 1800,
        protein_g: 120,
        carbs_g: null,
        fat_g: null,
      }),
    )
  })

  it('« Tout ajouter » complète la liste de courses avec le menu de la semaine, sans doublon', async () => {
    const tomorrow = addDays(today, 1)
    items = [
      riceLunch,
      { ...riceLunch, id: 'm2', day: tomorrow, name: 'Saumon', food_id: null },
      { ...riceLunch, id: 'm3', day: tomorrow, name: 'Riz blanc (cuit)', meal: 'dinner' },
      { ...riceLunch, id: 'm4', day: tomorrow, name: 'Brocoli', food_id: null },
    ]
    lists = [{ id: 'l1', name: 'courses', position: 0 }]
    todos = [
      {
        id: 't1',
        list_id: 'l1',
        goal_id: null,
        recurrence: null,
        focus_on: null,
        focus_week: null,
        title: 'Brocolis',
        done: false,
        done_at: null,
        due_date: null,
        priority: 'normal',
        position: 0,
        created_at: '',
      },
    ]
    renderPage()
    const shopping = await screen.findByRole('region', { name: 'Liste de courses' })
    await waitFor(() =>
      expect(shopping).toHaveTextContent(
        '2 aliments du menu de la semaine ne sont pas sur la liste : Riz blanc, Saumon',
      ),
    )
    await userEvent.click(within(shopping).getByRole('button', { name: 'Tout ajouter' }))
    await waitFor(() => expect(todosApi.insertTodo).toHaveBeenCalledTimes(2))
    expect(todosApi.insertList).not.toHaveBeenCalled()
    expect(vi.mocked(todosApi.insertTodo).mock.calls.map((c) => c[0].title)).toEqual([
      'Riz blanc',
      'Saumon',
    ])
    expect(
      await within(shopping).findByRole('checkbox', { name: 'Acheté : Saumon' }),
    ).toBeInTheDocument()

    await userEvent.click(within(shopping).getByRole('checkbox', { name: 'Acheté : Brocolis' }))
    await waitFor(() =>
      expect(todosApi.patchTodo).toHaveBeenCalledWith(
        't1',
        expect.objectContaining({ done: true }),
      ),
    )
  })

  it('modifie et supprime un aliment sans toucher aux repas passés', async () => {
    renderPage()
    await userEvent.click(await screen.findByText(/Mes aliments \(1\)/))
    await userEvent.click(
      screen.getByRole('button', { name: 'Modifier l’aliment « Riz blanc (cuit) »' }),
    )
    const kcal = screen.getByLabelText('kcal')
    await userEvent.clear(kcal)
    await userEvent.type(kcal, '140')
    await userEvent.tab()
    await waitFor(() => expect(api.patchFood).toHaveBeenCalledWith('f-rice', { kcal: 140 }))

    await userEvent.click(screen.getByRole('button', { name: 'Supprimer l’aliment' }))
    await waitFor(() => expect(api.removeFood).toHaveBeenCalledWith('f-rice'))
    // le repas garde ses valeurs
    expect(
      screen.getByRole('button', { name: 'Modifier « Riz blanc (cuit) », 200 g' }),
    ).toHaveTextContent('260 kcal')
    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    await waitFor(() =>
      expect(api.insertFood).toHaveBeenCalledWith(expect.objectContaining({ id: 'f-rice' })),
    )
  })
})
