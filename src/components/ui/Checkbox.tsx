import type { InputHTMLAttributes } from 'react'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string
  /** Libellé lu par les lecteurs d'écran mais masqué visuellement (le texte est affiché à côté). */
  hideLabel?: boolean
}

/** Case à cocher avec une zone tactile ≥ 44px. */
export function Checkbox({ label, hideLabel = false, className = '', ...props }: Props) {
  return (
    <label
      className={`inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-3 ${
        hideLabel ? 'min-w-11 justify-center md:min-h-9 md:min-w-9' : ''
      } ${className}`}
    >
      <input type="checkbox" className="size-5 cursor-pointer accent-[var(--accent)]" {...props} />
      <span className={hideLabel ? 'sr-only' : ''}>{label}</span>
    </label>
  )
}
