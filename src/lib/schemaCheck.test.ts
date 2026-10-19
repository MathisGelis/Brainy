import { missingMigrations } from './schemaCheck'
import { isSchemaError, saveErrorMessage } from './schemaErrors'

const responses = vi.hoisted(() => new Map<string, { code: string; message: string } | null>())

vi.mock('./supabase', () => ({
  supabase: {
    from: (table: string) => ({
      select: (columns: string) => ({
        limit: async () => ({ data: [], error: responses.get(`${table}.${columns}`) ?? null }),
      }),
    }),
  },
}))

describe('isSchemaError', () => {
  it('reconnaît une colonne ou une table inconnue', () => {
    expect(isSchemaError({ code: 'PGRST204' })).toBe(true) // colonne absente d'un insert
    expect(isSchemaError({ code: 'PGRST205' })).toBe(true) // table absente
    expect(isSchemaError({ code: '42703' })).toBe(true)
    expect(isSchemaError({ code: '23505' })).toBe(false) // doublon : autre problème
    expect(isSchemaError(new Error('réseau'))).toBe(false)
    expect(isSchemaError(null)).toBe(false)
  })

  it('donne un message explicite', () => {
    expect(saveErrorMessage({ code: 'PGRST204' })).toMatch(/la base n'est pas à jour/)
    expect(saveErrorMessage(new Error('x'))).toMatch(/L'enregistrement a échoué/)
  })

  it('dit quand l’échec vient du hors ligne', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    expect(saveErrorMessage(new TypeError('Failed to fetch'))).toMatch(/^Hors ligne/)
    vi.restoreAllMocks()
  })
})

describe('missingMigrations', () => {
  beforeEach(() => responses.clear())

  it('liste les migrations absentes, dans l’ordre', async () => {
    responses.set('expenses.recurring_id', { code: '42703', message: 'column does not exist' })
    responses.set('todos.focus_on', { code: '42703', message: 'column does not exist' })
    responses.set('todos.focus_week', { code: '42703', message: 'column does not exist' })
    responses.set('foods.id', { code: 'PGRST205', message: 'table not found' })
    responses.set('meal_items.recipe_id', { code: '42P01', message: 'relation does not exist' })
    expect(await missingMigrations()).toEqual([
      '0002_enrichissements.sql',
      '0003_rituels_epargne.sql',
      '0004_victoires_semaine.sql',
      '0005_menu.sql',
      '0006_recettes.sql',
    ])
  })

  it('ne signale rien quand la base est à jour, ni sur une erreur réseau', async () => {
    expect(await missingMigrations()).toEqual([])
    responses.set('foods.id', { code: '', message: 'Failed to fetch' })
    expect(await missingMigrations()).toEqual([])
  })
})
