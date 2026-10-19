import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { fold } from '@/lib/naturalDate'

export type SelectOption<T extends string> = { value: T; label: string }

type Props<T extends string> = {
  /** Nom accessible (les menus de l'app n'ont pas de libellé visible) */
  label: string
  value: T
  options: SelectOption<T>[]
  onChange: (value: T) => void
  /**
   * Texte affiché quand `value` ne correspond à aucune option : menus d'action
   * (« Lier une todo… ») qui reviennent toujours à vide.
   */
  placeholder?: string
  className?: string
}

const GAP = 6
const MARGIN = 8
const MAX_HEIGHT = 288

/**
 * Menu déroulant maison (combobox « sélection seule » du guide ARIA) :
 * même rendu partout, texte centré verticalement, liste en verre au-dessus de tout.
 * Clavier : flèches, Début/Fin, Entrée/Espace, Échap, et saisie des premières lettres.
 */
export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  placeholder,
  className = '',
}: Props<T>) {
  const id = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const typed = useRef({ text: '', at: 0 })
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  const selectedIndex = options.findIndex((o) => o.value === value)
  const selected = options[selectedIndex]

  function show(index = selectedIndex) {
    setActive(Math.max(0, Math.min(options.length - 1, index)))
    setOpen(true)
  }

  function choose(index: number) {
    const option = options[index]
    setOpen(false)
    buttonRef.current?.focus()
    if (option && option.value !== value) onChange(option.value)
  }

  /** Saisie rapide : « co » va à « Courses » ; la même lettre répétée fait défiler. */
  function typeahead(key: string) {
    const now = Date.now()
    const t = typed.current
    t.text = now - t.at < 600 ? t.text + key : key
    t.at = now
    const query = fold(t.text)
    const repeat = [...query].every((c) => c === query[0])
    const from = open ? active : Math.max(selectedIndex, 0)
    const order = options.map((_, i) => (from + (repeat ? 1 : 0) + i) % options.length)
    const prefix = repeat ? query[0]! : query
    const hit = order.find((i) => fold(options[i]!.label).startsWith(prefix))
    if (hit === undefined) return
    if (open) setActive(hit)
    else if (options[hit]!.value !== value) onChange(options[hit]!.value)
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (options.length === 0) return
    const last = options.length - 1
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault()
        show(selectedIndex < 0 ? 0 : selectedIndex)
      } else if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault()
        show(e.key === 'Home' ? 0 : last)
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        typeahead(e.key)
      }
      return
    }
    const moves: Record<string, number> = {
      ArrowDown: Math.min(active + 1, last),
      ArrowUp: Math.max(active - 1, 0),
      Home: 0,
      End: last,
      PageDown: Math.min(active + 8, last),
      PageUp: Math.max(active - 8, 0),
    }
    if (e.key in moves) {
      e.preventDefault()
      setActive(moves[e.key]!)
    } else if (e.key === 'Enter' || (e.key === ' ' && typed.current.text.trim() === '')) {
      e.preventDefault()
      choose(active)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
    } else if (e.key === 'Tab') {
      setOpen(false)
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault()
      typeahead(e.key)
    }
  }

  // Place la liste sous le bouton (ou au-dessus s'il manque de place), dans l'écran.
  useLayoutEffect(() => {
    if (!open) return
    function place() {
      const button = buttonRef.current
      const list = listRef.current
      if (!button || !list) return
      const r = button.getBoundingClientRect()
      const below = window.innerHeight - r.bottom - GAP - MARGIN
      const above = r.top - GAP - MARGIN
      const up = below < Math.min(list.scrollHeight, MAX_HEIGHT) && above > below
      list.style.maxHeight = `${Math.min(MAX_HEIGHT, Math.max(up ? above : below, 120))}px`
      list.style.minWidth = `${r.width}px`
      list.style.top = up ? '' : `${r.bottom + GAP}px`
      list.style.bottom = up ? `${window.innerHeight - r.top + GAP}px` : ''
      const width = list.offsetWidth
      list.style.left = `${Math.max(MARGIN, Math.min(r.left, window.innerWidth - MARGIN - width))}px`
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  // Garde l'option active visible pendant la navigation au clavier.
  useEffect(() => {
    if (open) document.getElementById(`${id}-${active}`)?.scrollIntoView?.({ block: 'nearest' })
  }, [open, active, id])

  // Un clic ailleurs referme la liste.
  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node
      if (!buttonRef.current?.contains(target) && !listRef.current?.contains(target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-activedescendant={open ? `${id}-${active}` : undefined}
        disabled={options.length === 0}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKeyDown}
        className={`field inline-flex items-center gap-2 text-left disabled:opacity-50 ${className}`}
      >
        <span className={`min-w-0 flex-1 truncate ${selected ? '' : 'text-muted'}`}>
          {selected?.label ?? placeholder ?? ''}
        </span>
        <svg
          aria-hidden
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`shrink-0 text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open &&
        createPortal(
          <ul
            ref={listRef}
            id={`${id}-list`}
            role="listbox"
            aria-label={label}
            className="dropdown animate-pop fixed z-[70] max-w-[min(20rem,calc(100vw-1rem))] overflow-y-auto rounded-2xl p-1 text-sm"
          >
            {options.map((o, i) => (
              <li
                key={o.value}
                id={`${id}-${i}`}
                role="option"
                aria-selected={o.value === value}
                // garde le focus sur le bouton (le clic choisit sans le lui retirer)
                onMouseDown={(e) => e.preventDefault()}
                onMouseMove={() => i !== active && setActive(i)}
                onClick={() => choose(i)}
                className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-3 md:min-h-9 ${
                  i === active ? 'bg-surface' : ''
                } ${o.value === value ? 'font-semibold text-accent' : ''}`}
              >
                <span className="min-w-0 flex-1 truncate">{o.label}</span>
                {o.value === value && (
                  <svg
                    aria-hidden
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="shrink-0"
                  >
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                )}
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </>
  )
}
