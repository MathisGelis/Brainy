import { useQuery } from '@tanstack/react-query'
import { useOptimisticMutation } from '@/lib/useOptimisticMutation'
import { fetchEvents, insertEvent, patchEvent, removeEvent } from './eventsApi'
import type { ParsedEvent } from './parseEventInput'
import type { CalendarEvent, EventPatch } from './types'

export const EVENTS_KEY = ['events'] as const

type Options = { onError?: (message: string) => void }

export function useEvents({ onError }: Options = {}) {
  const query = useQuery({ queryKey: EVENTS_KEY, queryFn: fetchEvents })

  const add = useOptimisticMutation<CalendarEvent, CalendarEvent>(
    EVENTS_KEY,
    (e) => insertEvent(e),
    (events, e) => [...events.filter((x) => x.id !== e.id), e],
    onError,
  )
  const update = useOptimisticMutation<CalendarEvent, { id: string; patch: EventPatch }>(
    EVENTS_KEY,
    ({ id, patch }) => patchEvent(id, patch),
    (events, { id, patch }) => events.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    onError,
  )
  const remove = useOptimisticMutation<CalendarEvent, string>(
    EVENTS_KEY,
    (id) => removeEvent(id),
    (events, id) => events.filter((e) => e.id !== id),
    onError,
  )

  return {
    events: query.data ?? [],
    isLoading: query.isPending,

    /** Ajoute un événement ; renvoie de quoi l'annuler. */
    addEvent: (input: ParsedEvent & { note?: string | null }): CalendarEvent => {
      const event: CalendarEvent = {
        id: crypto.randomUUID(),
        note: null,
        skipped: [],
        created_at: new Date().toISOString(),
        ...input,
      }
      add.mutate(event)
      return event
    },
    updateEvent: (id: string, patch: EventPatch) => update.mutate({ id, patch }),
    /** Supprime toute la série ; renvoie l'annulation (remet l'événement tel quel). */
    removeEvent: (event: CalendarEvent): (() => void) => {
      remove.mutate(event.id)
      return () => add.mutate(event)
    },
    /** Supprime une seule occurrence d'une série ; renvoie l'annulation. */
    skipOccurrence: (event: CalendarEvent, start: string): (() => void) => {
      const before = event.skipped
      update.mutate({ id: event.id, patch: { skipped: [...before, start].sort() } })
      return () => update.mutate({ id: event.id, patch: { skipped: before } })
    },
  }
}
