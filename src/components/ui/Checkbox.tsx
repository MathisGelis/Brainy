import type { InputHTMLAttributes } from 'react'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: string }

/** Zone tactile ≥ 44px autour de la case. */
export function Checkbox({ label, className = '', ...props }: Props) {
  return (
    <label className={`inline-flex min-h-11 cursor-pointer items-center gap-3 ${className}`}>
      <input type="checkbox" className="size-5 cursor-pointer accent-[var(--accent)]" {...props} />
      <span>{label}</span>
    </label>
  )
}
