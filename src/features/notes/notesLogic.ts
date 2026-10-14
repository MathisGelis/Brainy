import type { Note } from './types'

/** Minuscules et sans accents, pour une recherche tolérante. */
export function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/** « Maison, idées ,  maison » → ['maison', 'idees'] (sans doublons, vides ignorés). */
export function parseTags(text: string): string[] {
  const tags = text
    .split(/[,;]/)
    .map((t) => normalize(t.trim().replace(/^#/, '')))
    .filter(Boolean)
  return [...new Set(tags)]
}

/** Épinglées d'abord, puis les plus récemment modifiées. */
export function sortNotes(notes: Note[]): Note[] {
  return [...notes].sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || b.updated_at.localeCompare(a.updated_at),
  )
}

/**
 * Recherche instantanée : chaque mot doit apparaître dans le titre, le contenu ou un tag.
 * Un mot préfixé par `#` ne cherche que dans les tags.
 */
export function filterNotes(notes: Note[], query: string): Note[] {
  const tokens = normalize(query).split(/\s+/).filter(Boolean)
  const sorted = sortNotes(notes)
  if (tokens.length === 0) return sorted
  return sorted.filter((note) => {
    const text = normalize(`${note.title} ${note.content}`)
    const tags = note.tags.map(normalize)
    return tokens.every((token) =>
      token.startsWith('#')
        ? token.length > 1 && tags.some((t) => t.includes(token.slice(1)))
        : text.includes(token) || tags.some((t) => t.includes(token)),
    )
  })
}

/** Première ligne non vide du contenu, sans marqueurs Markdown courants, pour l'aperçu en liste. */
export function snippet(content: string, max = 80): string {
  const line = content
    .split('\n')
    .map((l) => l.replace(/^[#>\-*\s]+/, '').trim())
    .find(Boolean)
  if (!line) return ''
  return line.length > max ? `${line.slice(0, max)}…` : line
}
