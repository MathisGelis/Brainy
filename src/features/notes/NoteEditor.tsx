import { useEffect, useRef, useState } from 'react'
import { Markdown } from './Markdown'
import { parseTags } from './notesLogic'
import type { Note, NotePatch } from './types'

/** Délai entre la dernière frappe et la sauvegarde automatique. */
export const AUTOSAVE_DELAY_MS = 800

type Props = {
  note: Note
  onSave: (id: string, patch: NotePatch) => void
  onTogglePin: (note: Note) => void
  onDelete: (note: Note) => void
}

/** Éditeur avec sauvegarde automatique (debounce) ; à utiliser avec `key={note.id}`. */
export function NoteEditor({ note, onSave, onTogglePin, onDelete }: Props) {
  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.content)
  const [tagsText, setTagsText] = useState(note.tags.join(', '))
  const [preview, setPreview] = useState(false)
  const [dirty, setDirty] = useState(false)

  const latest = useRef({ title, content, tagsText })
  const saved = useRef({ title: note.title, content: note.content, tagsText: note.tags.join(', ') })
  const onSaveRef = useRef(onSave)

  useEffect(() => {
    onSaveRef.current = onSave
  })
  useEffect(() => {
    latest.current = { title, content, tagsText }
  }, [title, content, tagsText])

  const flush = useRef(() => {})
  useEffect(() => {
    flush.current = () => {
      const now = latest.current
      const before = saved.current
      const patch: NotePatch = {}
      if (now.title !== before.title) patch.title = now.title
      if (now.content !== before.content) patch.content = now.content
      if (now.tagsText !== before.tagsText) patch.tags = parseTags(now.tagsText)
      saved.current = now
      setDirty(false)
      if (Object.keys(patch).length > 0) onSaveRef.current(note.id, patch)
    }
  }, [note.id])

  // Sauvegarde différée après la dernière modification
  useEffect(() => {
    const changed =
      title !== saved.current.title ||
      content !== saved.current.content ||
      tagsText !== saved.current.tagsText
    if (!changed) return
    const timer = setTimeout(() => flush.current(), AUTOSAVE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [title, content, tagsText])

  // Sauvegarde immédiate en changeant de note, en quittant la page ou en masquant l'onglet
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush.current()
    }
    document.addEventListener('visibilitychange', onHide)
    const doFlush = flush
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      doFlush.current()
    }
  }, [])

  const field =
    'w-full rounded-xl border border-transparent bg-transparent transition-colors hover:border-[var(--field-border)]'

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            setDirty(true)
          }}
          aria-label="Titre de la note"
          placeholder="Sans titre"
          autoFocus={!note.title && !note.content}
          className={`${field} min-h-11 px-2 text-xl font-semibold md:min-h-9`}
        />
        <button
          type="button"
          aria-pressed={note.pinned}
          onClick={() => onTogglePin(note)}
          className="pill min-h-10 shrink-0 px-4"
        >
          {note.pinned ? 'Épinglée' : 'Épingler'}
        </button>
      </div>
      <input
        value={tagsText}
        onChange={(e) => {
          setTagsText(e.target.value)
          setDirty(true)
        }}
        aria-label="Tags"
        placeholder="Tags séparés par des virgules"
        className={`${field} min-h-11 px-2 text-xs md:min-h-9`}
      />
      <div className="flex items-center justify-between">
        <div role="group" aria-label="Mode" className="flex gap-1 rounded-full bg-surface p-1">
          {[false, true].map((isPreview) => (
            <button
              key={String(isPreview)}
              type="button"
              aria-pressed={preview === isPreview}
              onClick={() => setPreview(isPreview)}
              className="pill min-h-9 px-4"
            >
              {isPreview ? 'Aperçu' : 'Écrire'}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted" role="status">
          {dirty ? 'Enregistrement…' : 'Enregistré'}
        </span>
      </div>
      {preview ? (
        <div className="card min-h-64 p-4">
          {content.trim() ? (
            <Markdown>{content}</Markdown>
          ) : (
            <p className="text-muted">Note vide.</p>
          )}
        </div>
      ) : (
        <textarea
          value={content}
          onChange={(e) => {
            setContent(e.target.value)
            setDirty(true)
          }}
          aria-label="Contenu de la note"
          placeholder="Écrivez en Markdown…"
          className="field min-h-64 w-full resize-y rounded-2xl p-4 leading-relaxed md:min-h-96"
        />
      )}
      <button
        type="button"
        onClick={() => onDelete(note)}
        className="min-h-11 self-start px-2 text-xs text-muted hover:text-danger"
      >
        Supprimer la note
      </button>
    </div>
  )
}
