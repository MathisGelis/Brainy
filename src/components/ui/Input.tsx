import type { InputHTMLAttributes } from 'react'

type Props = InputHTMLAttributes<HTMLInputElement> & { label: string }

/** Le label est toujours présent pour l'accessibilité ; `sr-only` pour le masquer visuellement. */
export function Input({ label, className = '', id, ...props }: Props) {
  const inputId = id ?? `input-${label.toLowerCase().replace(/\s+/g, '-')}`
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="px-1 text-xs text-muted">
        {label}
      </label>
      <input id={inputId} className={`field min-h-11 px-3.5 ${className}`} {...props} />
    </div>
  )
}
