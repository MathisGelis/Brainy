import { isoWeekday, WEEKDAYS, cut, extractDate, fold } from '@/lib/naturalDate'
import { firstOccurrence, type Recurrence } from './recurrence'
import type { Priority } from './types'

export type ParsedTodo = {
  title: string
  due_date: string | null
  priority: Priority
  recurrence: Recurrence | null
  listName: string | null
}

const B = '(?<![\\p{L}\\d])'
const E = '(?![\\p{L}\\d])'
const DAY = `(${WEEKDAYS.join('|')})s?`

const RECURRENCES: { re: RegExp; build: (m: RegExpExecArray) => Recurrence | 'same-weekday' }[] = [
  {
    re: new RegExp(
      `${B}(?:tous les jours|chaque jour|chaque matin|chaque soir|tous les (?:matins|soirs)|quotidiennement)${E}`,
      'u',
    ),
    build: () => ({ kind: 'daily' }),
  },
  {
    re: new RegExp(`${B}(?:en semaine|du lundi au vendredi|les jours ouvres)${E}`, 'u'),
    build: () => ({ kind: 'weekly', days: [1, 2, 3, 4, 5] }),
  },
  {
    re: new RegExp(`${B}(?:tous les|chaque) week-?ends?${E}`, 'u'),
    build: () => ({ kind: 'weekly', days: [6, 7] }),
  },
  {
    re: new RegExp(`${B}(?:tous les|chaque) ${DAY}(?:(?:\\s*,\\s*|\\s+et\\s+)${DAY})*${E}`, 'u'),
    build: (m) => {
      const days = Array.from(
        m[0].matchAll(new RegExp(WEEKDAYS.join('|'), 'g')),
        (x) => WEEKDAYS.indexOf(x[0]) + 1,
      )
      return { kind: 'weekly', days }
    },
  },
  {
    re: new RegExp(`${B}(?:toutes les semaines|chaque semaine|hebdomadaire(?:ment)?)${E}`, 'u'),
    build: () => 'same-weekday',
  },
  {
    re: new RegExp(`${B}(?:tous les mois|chaque mois|mensuel(?:le)?(?:ment)?)${E}`, 'u'),
    build: () => ({ kind: 'monthly' }),
  },
]

/**
 * « Payer le loyer demain ! #maison tous les mois » →
 * titre, échéance, priorité, récurrence et liste. Le texte non reconnu forme le titre.
 */
export function parseTodoInput(input: string, today: string): ParsedTodo {
  let text = input
  let recurrence: Recurrence | 'same-weekday' | null = null

  // 1. Récurrence (avant les dates : « tous les lundis » n'est pas « lundi »)
  for (const rule of RECURRENCES) {
    const m = rule.re.exec(fold(text))
    if (m) {
      recurrence = rule.build(m)
      text = cut(text, m.index, m.index + m[0].length)
      break
    }
  }

  // 2. Liste : #nom
  let listName: string | null = null
  const list = /(?<!\S)#([\p{L}\d_-]+)/u.exec(text)
  if (list) {
    listName = list[1]!
    text = cut(text, list.index, list.index + list[0].length)
  }

  // 3. Priorité : un ou plusieurs « ! » isolés ou en fin de mot
  let priority: Priority = 'normal'
  if (/!+(?=\s|$)/.test(text)) {
    priority = 'high'
    text = text
      .replace(/\s*!+(?=\s|$)/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  // 4. Échéance
  let due: string | null = null
  const date = extractDate(text, today, 'future')
  if (date) {
    due = date.value
    text = date.rest
  }

  const resolved: Recurrence | null =
    recurrence === 'same-weekday'
      ? { kind: 'weekly', days: [isoWeekday(due ?? today)] }
      : recurrence
  if (resolved && !due) due = firstOccurrence(resolved, today)

  const title = text.trim() || input.trim()
  return { title, due_date: due, priority, recurrence: resolved, listName }
}
