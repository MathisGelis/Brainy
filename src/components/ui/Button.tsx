import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'ghost'

const variants: Record<Variant, string> = {
  primary: 'btn-primary hover:brightness-105',
  ghost: 'border border-[var(--field-border)] bg-bg text-text hover:bg-surface',
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }

export function Button({ variant = 'primary', className = '', type = 'button', ...props }: Props) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-11 items-center justify-center rounded-full px-5 font-semibold transition-[transform,filter] active:scale-[0.97] disabled:opacity-50 md:min-h-10 ${variants[variant]} ${className}`}
      {...props}
    />
  )
}
