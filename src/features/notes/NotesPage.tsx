import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button, useToast } from '@/components/ui'
import { filterNotes, snippet } from './notesLogic'
import { NoteEditor } from './NoteEditor'
import type { Note } from './types'
import { useNotes } from './useNotes'

export default function NotesPage() {
  const { noteId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { notes, isLoading, isError, refetch, createNote, restoreNote, updateNote, deleteNote } =
    useNotes({ onError: (m) => toast.show(m) })
  const [query, setQuery] = useState('')

  const visible = filterNotes(notes, query)
  const selected = notes.find((n) => n.id === noteId)

  function onCreate() {
    navigate(`/notes/${createNote()}`)
  }

  function onDelete(note: Note) {
    deleteNote(note.id)
    navigate('/notes')
    toast.show('Note supprimée', () => {
      restoreNote(note)
      navigate(`/notes/${note.id}`)
    })
  }

  // Mobile : liste OU éditeur ; desktop : les deux côte à côte.
  const listClass = noteId ? 'hidden md:flex' : 'flex'
  const editorClass = noteId ? 'block' : 'hidden md:block'

  return (
    <div className="md:grid md:grid-cols-[18rem_1fr] md:gap-8">
      <section aria-label="Liste des notes" className={`${listClass} flex-col gap-3`}>
        <h1 className="text-xl font-semibold">Notes</h1>
        <div className="flex gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Rechercher dans les notes"
            placeholder="Rechercher…  (/)"
            data-search
            className="min-h-11 min-w-0 flex-1 rounded border border-border bg-bg px-3 text-text placeholder:text-muted md:min-h-9"
          />
          <Button onClick={onCreate}>Nouvelle</Button>
        </div>
        {isError ? (
          <p role="alert" className="text-danger">
            Impossible de charger les notes.{' '}
            <button
              type="button"
              onClick={() => void refetch()}
              className="min-h-11 font-semibold underline"
            >
              Réessayer
            </button>
          </p>
        ) : isLoading ? (
          <div aria-hidden className="h-24 animate-pulse rounded bg-surface" />
        ) : visible.length === 0 ? (
          <p className="text-muted">
            {query
              ? 'Aucune note ne correspond.'
              : 'Aucune note. Cliquez sur « Nouvelle » pour commencer.'}
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {visible.map((n) => (
              <li key={n.id}>
                <Link
                  to={`/notes/${n.id}`}
                  aria-current={n.id === noteId ? 'page' : undefined}
                  className={`block min-h-11 rounded px-3 py-2 hover:bg-surface ${
                    n.id === noteId ? 'bg-surface' : ''
                  }`}
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-semibold">{n.title || 'Sans titre'}</span>
                    {n.pinned && <span className="shrink-0 text-xs text-accent">Épinglée</span>}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {snippet(n.content) || 'Note vide'}
                    {n.tags.length > 0 && ` · ${n.tags.map((t) => `#${t}`).join(' ')}`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Éditeur" className={editorClass}>
        <Link
          to="/notes"
          className="mb-2 inline-block min-h-11 text-muted hover:text-text md:hidden"
        >
          ← Notes
        </Link>
        {selected ? (
          <NoteEditor
            key={selected.id}
            note={selected}
            onSave={updateNote}
            onTogglePin={(n) => updateNote(n.id, { pinned: !n.pinned })}
            onDelete={onDelete}
          />
        ) : noteId && !isLoading ? (
          <p className="text-muted">Cette note n'existe plus.</p>
        ) : (
          <p className="hidden text-muted md:block">Sélectionnez une note ou créez-en une.</p>
        )}
      </section>
    </div>
  )
}
