import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'ghost'

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-accent-fg hover:opacity-90',
  ghost: 'border border-border bg-transparent text-text hover:bg-surface',
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }

export function Button({ variant = 'primary', className = '', type = 'button', ...props }: Props) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-11 items-center justify-center rounded px-4 font-semibold transition-opacity disabled:opacity-50 md:min-h-9 ${variants[variant]} ${className}`}
      {...props}
    />
  )
}
