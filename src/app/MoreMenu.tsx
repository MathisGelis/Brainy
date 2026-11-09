import { useEffect, useRef, type RefObject } from 'react'
import { NavLink } from 'react-router-dom'
import { LogoutIcon, ThemeToggle } from '@/components/ui'
import { signOut } from '@/features/auth/useAuth'
import { navItems, secondaryNavItems } from './navItems'

/**
 * Menu « Plus » de la barre mobile : les sections qui n'ont pas d'onglet, le thème et la
 * déconnexion. Panneau de navigation (bouton à aria-expanded) : Échap, un toucher à côté ou
 * une navigation le referment.
 */
export function MoreMenu({
  id,
  onClose,
  ignore,
}: {
  id: string
  onClose: () => void
  /** Le bouton « Plus » : un toucher dessus est géré par le bouton lui-même */
  ignore: RefObject<HTMLElement | null>
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const items = [...navItems.filter((n) => !n.mobile), ...secondaryNavItems]

  // Dernière version de onClose, sans relancer l'effet (le focus ne doit pas sauter à chaque rendu)
  const close = useRef(onClose)
  useEffect(() => {
    close.current = onClose
  })

  useEffect(() => {
    panelRef.current?.querySelector<HTMLElement>('a')?.focus()
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node
      if (!panelRef.current?.contains(target) && !ignore.current?.contains(target)) close.current()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [ignore])

  return (
    <div
      ref={panelRef}
      id={id}
      className="dropdown animate-pop absolute inset-x-0 bottom-[calc(100%+8px)] rounded-[26px] p-2"
    >
      <nav aria-label="Autres sections">
        <ul className="grid grid-cols-3 gap-1">
          {items.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-center text-xs leading-tight transition-colors ${
                    isActive ? 'bg-surface font-semibold text-accent' : 'text-text hover:bg-surface'
                  }`
                }
              >
                <Icon />
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-2 flex items-center justify-between border-t border-border px-1 pt-2">
        <ThemeToggle />
        <button
          type="button"
          onClick={() => void signOut()}
          className="flex min-h-11 items-center gap-2 rounded-full px-3 text-sm text-muted transition-colors hover:text-text"
        >
          <LogoutIcon width={18} height={18} />
          Déconnexion
        </button>
      </div>
    </div>
  )
}
