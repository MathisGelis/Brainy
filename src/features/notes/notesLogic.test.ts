import { filterNotes, normalize, parseTags, snippet, sortNotes } from './notesLogic'
import type { Note } from './types'

const note = (id: string, overrides: Partial<Note> = {}): Note => ({
  id,
  title: id,
  content: '',
  pinned: false,
  tags: [],
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
  ...overrides,
})
const ids = (notes: Note[]) => notes.map((n) => n.id)

describe('sortNotes', () => {
  it('place les épinglées d’abord puis les plus récentes', () => {
    const notes = [
      note('old', { updated_at: '2026-03-01T00:00:00Z' }),
      note('new', { updated_at: '2026-03-05T00:00:00Z' }),
      note('pin', { pinned: true, updated_at: '2026-02-01T00:00:00Z' }),
    ]
    expect(ids(sortNotes(notes))).toEqual(['pin', 'new', 'old'])
  })
})

describe('filterNotes', () => {
  const notes = [
    note('a', { title: 'Idées de voyage', content: 'Aller à Lisbonne en été', tags: ['projets'] }),
    note('b', { title: 'Courses', content: 'Pain, café', tags: ['maison'] }),
  ]

  it('renvoie tout sans requête', () => {
    expect(filterNotes(notes, '  ')).toHaveLength(2)
  })

  it('cherche dans le titre et le contenu, sans accents ni casse', () => {
    expect(ids(filterNotes(notes, 'ete'))).toEqual(['a'])
    expect(ids(filterNotes(notes, 'CAFE'))).toEqual(['b'])
  })

  it('exige que tous les mots correspondent', () => {
    expect(ids(filterNotes(notes, 'voyage lisbonne'))).toEqual(['a'])
    expect(filterNotes(notes, 'voyage pain')).toEqual([])
  })

  it('cherche dans les tags, avec #tag réservé aux tags', () => {
    expect(ids(filterNotes(notes, 'maison'))).toEqual(['b'])
    expect(ids(filterNotes(notes, '#projets'))).toEqual(['a'])
    expect(filterNotes(notes, '#lisbonne')).toEqual([]) // présent dans le contenu, pas dans les tags
    expect(filterNotes(notes, '#')).toEqual([])
  })
})

describe('parseTags', () => {
  it('nettoie, dédoublonne et normalise', () => {
    expect(parseTags('Maison, idées ,  maison; #Travail,')).toEqual(['maison', 'idees', 'travail'])
    expect(parseTags('')).toEqual([])
  })
})

describe('snippet / normalize', () => {
  it('ignore les marqueurs Markdown et tronque', () => {
    expect(snippet('\n\n# Titre\nsuite')).toBe('Titre')
    expect(snippet('- élément')).toBe('élément')
    expect(snippet('x'.repeat(100), 10)).toBe('xxxxxxxxxx…')
    expect(snippet('   ')).toBe('')
  })

  it('retire les accents', () => {
    expect(normalize('Éléphant')).toBe('elephant')
  })
})
