import { useTheme } from '@/lib/theme'
import { MoonIcon, SunIcon } from './icons'

/** Bascule clair/sombre : l'icône montre le thème vers lequel on va. */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggle } = useTheme()
  const toDark = theme === 'light'
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={toDark ? 'Passer en mode sombre' : 'Passer en mode clair'}
      title={toDark ? 'Mode sombre' : 'Mode clair'}
      className={`flex size-11 items-center justify-center rounded-full text-muted transition-colors hover:text-text ${className}`}
    >
      <span key={theme} className="animate-pop">
        {toDark ? <MoonIcon /> : <SunIcon />}
      </span>
    </button>
  )
}
