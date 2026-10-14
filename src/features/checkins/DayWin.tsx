import { useId, useState, type FormEvent } from 'react'
import { useToast } from '@/components/ui'
import { celebrate } from '@/lib/celebrate'
import { useCheckins } from './useCheckins'

const MAX = 280

type Props = {
  day: string
  onError: (m: string) => void
  /** Libellé visible au-dessus du champ */
  label?: string
}

/** Victoire du jour : une ligne, enregistrée en quittant le champ ou avec Entrée. */
export function DayWin({ day, onError, label = 'Une victoire aujourd’hui ?' }: Props) {
  const id = useId()
  const toast = useToast()
  const { checkinsByDay, isLoading, setWin } = useCheckins({ onError })
  const saved = checkinsByDay.get(day)?.win ?? ''
  // null : pas en cours de saisie, on affiche ce qui est enregistré
  const [draft, setDraft] = useState<string | null>(null)

  function commit() {
    if (draft === null) return
    const text = draft.trim()
    setDraft(null)
    if (text === saved) return
    setWin(day, text || null)
    if (text && !saved) celebrate(0.8)
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    commit()
  }

  function erase() {
    setWin(day, null)
    setDraft(null)
    toast.show('Victoire effacée', () => setWin(day, saved))
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs text-muted">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          value={draft ?? saved}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          disabled={isLoading}
          maxLength={MAX}
          placeholder="Une victoire, même petite…"
          className="field min-h-11 min-w-0 flex-1 px-4 md:min-h-10"
        />
        {saved && draft === null && (
          <>
            <span aria-hidden className="text-accent">
              ★
            </span>
            <button
              type="button"
              onClick={erase}
              aria-label="Effacer la victoire"
              className="min-h-11 min-w-11 rounded-full text-muted transition-colors hover:text-danger md:min-h-9 md:min-w-9"
            >
              ×
            </button>
          </>
        )}
      </div>
    </form>
  )
}
