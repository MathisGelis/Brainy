import { useQuery } from '@tanstack/react-query'
import { useOptimisticMutation } from '@/lib/useOptimisticMutation'
import { fetchNotes, insertNote, patchNote, removeNote } from './notesApi'
import type { Note, NotePatch } from './types'

export const NOTES_KEY = ['notes'] as const

export function useNotes({ onError }: { onError?: (message: string) => void } = {}) {
  const query = useQuery({ queryKey: NOTES_KEY, queryFn: fetchNotes })

  const add = useOptimisticMutation<Note, Note>(
    NOTES_KEY,
    insertNote,
    (notes, note) => [note, ...notes],
    onError,
  )
  const update = useOptimisticMutation<Note, { id: string; patch: NotePatch }>(
    NOTES_KEY,
    ({ id, patch }) => patchNote(id, patch),
    (notes, { id, patch }) =>
      notes.map((n) =>
        n.id === id ? { ...n, ...patch, updated_at: new Date().toISOString() } : n,
      ),
    onError,
  )
  const remove = useOptimisticMutation<Note, string>(
    NOTES_KEY,
    removeNote,
    (notes, id) => notes.filter((n) => n.id !== id),
    onError,
  )

  return {
    notes: query.data ?? [],
    isLoading: query.isPending,
    isError: query.isError,
    refetch: query.refetch,

    /** Crée une note vide et renvoie son id (pour l'ouvrir aussitôt). */
    createNote: (title = ''): string => {
      const now = new Date().toISOString()
      const id = crypto.randomUUID()
      add.mutate({
        id,
        title,
        content: '',
        pinned: false,
        tags: [],
        created_at: now,
        updated_at: now,
      })
      return id
    },
    /** Remet une note supprimée (annulation), avec son id d'origine. */
    restoreNote: (note: Note) => add.mutate(note),
    updateNote: (id: string, patch: NotePatch) => update.mutate({ id, patch }),
    deleteNote: (id: string) => remove.mutate(id),
  }
}
