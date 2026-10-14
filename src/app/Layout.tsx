import { lazy, Suspense, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useMatch } from 'react-router-dom'
import { signOut } from '@/features/auth/useAuth'
import { navItems } from './navItems'
import type { QuickAddTab } from './QuickAdd'
import { ShortcutsHelp } from './ShortcutsHelp'
import { useShortcuts } from './shortcuts'

const QuickAdd = lazy(() => import('./QuickAdd'))

/** Type pré-sélectionné selon l'écran courant (valeur par défaut intelligente). */
function tabFor(pathname: string): QuickAddTab {
  if (pathname.startsWith('/notes')) return 'note'
  if (pathname.startsWith('/budget')) return 'expense'
  return 'todo'
}

const linkBase = 'flex items-center rounded px-3 text-sm'

/** Sidebar sur desktop, tab bar en bas sur mobile (zones tactiles ≥ 44px). */
export function Layout() {
  // Les notes (liste + éditeur) ont besoin de plus de largeur que les autres écrans.
  const wide = useMatch('/notes/*') !== null
  const { pathname } = useLocation()
  const [quickAdd, setQuickAdd] = useState<QuickAddTab | null>(null)
  const [help, setHelp] = useState(false)
  const plusRef = useRef<HTMLButtonElement>(null)

  function closeQuickAdd() {
    setQuickAdd(null)
    plusRef.current?.focus()
  }

  useShortcuts({
    onNew: () => setQuickAdd((current) => current ?? tabFor(pathname)),
    onHelp: () => setHelp((v) => !v),
    onEscape: () => {
      if (quickAdd) closeQuickAdd()
      setHelp(false)
    },
  })
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[14rem_1fr]">
      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-border bg-bg pb-[env(safe-area-inset-bottom)] md:static md:flex md:flex-col md:gap-1 md:border-t-0 md:border-r md:p-4"
      >
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `${linkBase} min-h-14 justify-center text-xs md:min-h-9 md:justify-start md:text-sm ${
                isActive ? 'font-semibold text-accent md:bg-surface' : 'text-muted hover:text-text'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={() => void signOut()}
          className="hidden min-h-9 items-center rounded px-3 text-left text-sm text-muted hover:text-text md:mt-auto md:flex"
        >
          Déconnexion
        </button>
      </nav>
      <main
        className={`mx-auto w-full px-4 pt-6 pb-40 md:px-8 md:pb-24 ${wide ? 'max-w-5xl' : 'max-w-3xl'}`}
      >
        <Outlet />
      </main>

      <button
        ref={plusRef}
        type="button"
        aria-label="Ajout rapide (n)"
        aria-expanded={quickAdd !== null}
        onClick={() => (quickAdd ? closeQuickAdd() : setQuickAdd(tabFor(pathname)))}
        className="fixed right-4 bottom-20 z-40 flex size-14 items-center justify-center rounded-full bg-accent text-2xl text-accent-fg md:right-6 md:bottom-6"
      >
        +
      </button>
      {quickAdd && (
        <Suspense fallback={null}>
          <QuickAdd key={quickAdd} initialTab={quickAdd} onClose={closeQuickAdd} />
        </Suspense>
      )}
      {help && <ShortcutsHelp onClose={() => setHelp(false)} />}
    </div>
  )
}
