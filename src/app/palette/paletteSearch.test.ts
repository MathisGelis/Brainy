import { scoreItem, searchPalette, type PaletteItem } from './paletteSearch'

const item = (
  group: PaletteItem['group'],
  label: string,
  extra: Partial<PaletteItem> = {},
): PaletteItem => ({
  id: `${group}-${label}`,
  group,
  label,
  run: () => {},
  ...extra,
})

const items = [
  item('Commandes', 'Aller à Budget', { keywords: 'dépenses' }),
  item('Commandes', 'Basculer le thème', { keywords: 'sombre clair' }),
  item('Todos', 'Payer le loyer'),
  item('Todos', 'Rappeler le garagiste'),
  item('Notes', 'Idées de voyage', { keywords: 'lisbonne porto' }),
  item('Dépenses', 'Dîner entre amis', { hint: '132,50 €' }),
]
const create = [item('Créer', 'Créer la todo')]

describe('searchPalette', () => {
  it('sans requête : uniquement les commandes', () => {
    expect(searchPalette(items, create, '  ').map((i) => i.label)).toEqual([
      'Aller à Budget',
      'Basculer le thème',
    ])
  })

  it('cherche sans accents ni casse, dans le libellé et les mots-clés', () => {
    expect(searchPalette(items, [], 'diner').map((i) => i.label)).toEqual(['Dîner entre amis'])
    expect(searchPalette(items, [], 'LISBONNE').map((i) => i.label)).toEqual(['Idées de voyage'])
    expect(searchPalette(items, [], 'sombre').map((i) => i.label)).toEqual(['Basculer le thème'])
  })

  it('exige tous les mots', () => {
    expect(searchPalette(items, [], 'payer loyer').map((i) => i.label)).toEqual(['Payer le loyer'])
    expect(searchPalette(items, [], 'payer garagiste')).toEqual([])
  })

  it('classe par groupe puis place les actions de création à la fin', () => {
    const labels = searchPalette(items, create, 'le').map((i) => i.group)
    expect(labels.at(-1)).toBe('Créer')
    expect(labels.indexOf('Commandes')).toBeLessThan(labels.indexOf('Todos'))
  })

  it('favorise un libellé qui commence par la requête', () => {
    expect(scoreItem(item('Todos', 'Payer le loyer'), 'pay')).toBeGreaterThan(
      scoreItem(item('Todos', 'Re-payer'), 'pay'),
    )
  })
})
