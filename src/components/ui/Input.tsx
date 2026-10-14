import type { InputHTMLAttributes } from 'react'

type Props = InputHTMLAttributes<HTMLInputElement> & { label: string }

/** Le label est toujours présent pour l'accessibilité ; `sr-only` pour le masquer visuellement. */
export function Input({ label, className = '', id, ...props }: Props) {
  const inputId = id ?? `input-${label.toLowerCase().replace(/\s+/g, '-')}`
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-xs text-muted">
        {label}
      </label>
      <input
        id={inputId}
        className={`min-h-11 rounded border border-border bg-bg px-3 text-text placeholder:text-muted md:min-h-9 ${className}`}
        {...props}
      />
    </div>
  )
}
