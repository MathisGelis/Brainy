import { lazy, Suspense, useLayoutEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useMatch } from 'react-router-dom'
import { CalendarIcon, LogoutIcon, PlusIcon, SearchIcon, ThemeToggle } from '@/components/ui'
import { signOut } from '@/features/auth/useAuth'
import { useRecurringGeneration } from '@/features/budget/useBudgetExtras'
import { navItems, secondaryNavItems } from './navItems'
import { SchemaBanner } from './SchemaBanner'
import type { QuickAddTab } from './QuickAdd'
import { ShortcutsHelp } from './ShortcutsHelp'
import { useShortcuts } from './shortcuts'

const QuickAdd = lazy(() => import('./QuickAdd'))
const CommandPalette = lazy(() => import('./palette/CommandPalette'))

/** Type pré-sélectionné selon l'écran courant (valeur par défaut intelligente). */
function tabFor(pathname: string): QuickAddTab {
  if (pathname.startsWith('/notes')) return 'note'
  if (pathname.startsWith('/budget')) return 'expense'
  return 'todo'
}

export function Brand() {
  return (
    <span className="flex items-center gap-2.5 font-semibold tracking-tight">
      <span aria-hidden className="brand-orb size-7 rounded-full" />
      Brainy
    </span>
  )
}

/** Capsule qui glisse sous l'onglet actif (positionnée en mesurant le lien `aria-current`). */
function useNavIndicator(pathname: string) {
  const navRef = useRef<HTMLElement>(null)
  const indicatorRef = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const nav = navRef.current
    const indicator = indicatorRef.current
    if (!nav || !indicator) return
    const place = () => {
      const active = nav.querySelector<HTMLElement>('a[aria-current="page"]')
      if (!active) {
        indicator.style.opacity = '0'
        return
      }
      indicator.style.opacity = '1'
      indicator.style.width = `${active.offsetWidth}px`
      indicator.style.height = `${active.offsetHeight}px`
      indicator.style.transform = `translate(${active.offsetLeft}px, ${active.offsetTop}px)`
    }
    place()
    // Les transitions ne s'activent qu'après le premier placement (pas de glissement depuis 0,0).
    const frame = requestAnimationFrame(() => (indicator.dataset.ready = 'true'))
    window.addEventListener('resize', place)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', place)
    }
  }, [pathname])

  return { navRef, indicatorRef }
}

export function Layout() {
  // Les notes (liste + éditeur) ont besoin de plus de largeur que les autres écrans.
  const wide = useMatch('/notes/*') !== null
  const { pathname } = useLocation()
  const section = pathname.split('/')[1] ?? ''
  const [quickAdd, setQuickAdd] = useState<QuickAddTab | null>(null)
  const [help, setHelp] = useState(false)
  const [palette, setPalette] = useState(false)
  const returnFocus = useRef<HTMLElement | null>(null)

  function openPalette() {
    returnFocus.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    setQuickAdd(null)
    setPalette(true)
  }
  function closePalette() {
    setPalette(false)
    returnFocus.current?.focus()
  }
  const plusRef = useRef<HTMLButtonElement>(null)
  const { navRef, indicatorRef } = useNavIndicator(pathname)
  // Loyer, abonnements, salaire : occurrences du mois créées à l'ouverture de l'app
  useRecurringGeneration()

  function closeQuickAdd() {
    setQuickAdd(null)
    plusRef.current?.focus()
  }

  useShortcuts({
    onNew: () => setQuickAdd((current) => current ?? tabFor(pathname)),
    onHelp: () => setHelp((v) => !v),
    onEscape: () => {
      if (palette) closePalette()
      if (quickAdd) closeQuickAdd()
      setHelp(false)
    },
    onPalette: () => (palette ? closePalette() : openPalette()),
  })

  return (
    <div className="min-h-dvh">
      <button
        type="button"
        onClick={() => document.getElementById('contenu')?.focus()}
        className="sr-only z-50 rounded-full bg-accent px-4 py-2 text-accent-fg focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Aller au contenu
      </button>

      {/* Barre latérale (desktop) / barre d'onglets flottante (mobile) */}
      <div className="fixed inset-x-2 bottom-[calc(env(safe-area-inset-bottom)+10px)] z-40 md:inset-x-auto md:top-4 md:bottom-4 md:left-4 md:w-60">
        <div className="glass flex h-full flex-col rounded-[30px] p-1 md:rounded-[28px] md:p-3">
          <div className="hidden px-3 pt-2 pb-4 md:block">
            <Brand />
          </div>
          <button
            type="button"
            onClick={openPalette}
            className="mb-3 hidden min-h-10 items-center gap-2 rounded-2xl border border-[var(--field-border)] bg-bg px-3 text-sm text-muted transition-colors hover:text-text md:flex"
          >
            <SearchIcon width={16} height={16} />
            <span className="flex-1 text-left">Rechercher</span>
            <kbd className="font-sans text-xs">⌘K</kbd>
          </button>
          <nav
            ref={navRef}
            aria-label="Navigation principale"
            className="relative grid grid-cols-7 md:flex md:flex-col md:gap-1"
          >
            <span
              ref={indicatorRef}
              aria-hidden
              className="nav-indicator absolute top-0 left-0 rounded-[24px] md:rounded-2xl"
            />
            {navItems.map(({ to, label, short, end, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `relative z-10 flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-[24px] text-[10px] leading-tight tracking-tight transition-colors md:min-h-10 md:tracking-normal md:flex-row md:justify-start md:gap-3 md:rounded-2xl md:px-3 md:text-sm ${
                    isActive ? 'font-semibold text-accent' : 'text-muted hover:text-text'
                  }`
                }
              >
                <Icon />
                {short ? (
                  <>
                    <span className="md:hidden">{short}</span>
                    <span className="hidden md:inline">{label}</span>
                  </>
                ) : (
                  <span>{label}</span>
                )}
              </NavLink>
            ))}
          </nav>
          <nav
            aria-label="Vues"
            className="mt-3 hidden flex-col gap-1 border-t border-border pt-3 md:flex"
          >
            {secondaryNavItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex min-h-10 items-center gap-3 rounded-2xl px-3 text-sm transition-colors ${
                    isActive ? 'bg-surface font-semibold text-accent' : 'text-muted hover:text-text'
                  }`
                }
              >
                <Icon width={20} height={20} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto hidden items-center justify-between border-t border-border pt-3 md:flex">
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
      </div>

      {/* Recherche, calendrier et thème sur mobile : en haut à droite (PageHeader leur laisse la place) */}
      <div className="fixed top-[calc(env(safe-area-inset-top)+14px)] right-5 z-40 flex md:hidden">
        <button
          type="button"
          onClick={openPalette}
          aria-label="Rechercher"
          className="flex size-11 items-center justify-center rounded-full text-muted transition-colors hover:text-text"
        >
          <SearchIcon />
        </button>
        <NavLink
          to="/calendrier"
          aria-label="Calendrier"
          className={({ isActive }) =>
            `flex size-11 items-center justify-center rounded-full transition-colors ${
              isActive ? 'text-accent' : 'text-muted hover:text-text'
            }`
          }
        >
          <CalendarIcon />
        </NavLink>
        <ThemeToggle />
      </div>

      <main
        id="contenu"
        tabIndex={-1}
        className="px-3 pt-[calc(env(safe-area-inset-top)+12px)] pb-48 focus:outline-none md:pt-6 md:pr-6 md:pb-28 md:pl-[17.5rem]"
      >
        <div
          key={section}
          className={`sheet mx-auto animate-rise rounded-[30px] px-5 py-6 md:px-10 md:py-9 ${
            wide ? 'max-w-5xl' : 'max-w-3xl'
          }`}
        >
          <SchemaBanner />
          <Outlet />
        </div>
      </main>

      <button
        ref={plusRef}
        type="button"
        aria-label="Ajout rapide (n)"
        aria-expanded={quickAdd !== null}
        onClick={() => (quickAdd ? closeQuickAdd() : setQuickAdd(tabFor(pathname)))}
        className="fab fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+92px)] z-40 flex size-14 items-center justify-center rounded-full md:right-8 md:bottom-8"
      >
        <PlusIcon width={26} height={26} />
      </button>
      {quickAdd && (
        <Suspense fallback={null}>
          <QuickAdd key={quickAdd} initialTab={quickAdd} onClose={closeQuickAdd} />
        </Suspense>
      )}
      {help && <ShortcutsHelp onClose={() => setHelp(false)} />}
      {palette && (
        <Suspense fallback={null}>
          <CommandPalette
            onClose={closePalette}
            onQuickAdd={(tab) => setQuickAdd(tab)}
            onHelp={() => setHelp(true)}
          />
        </Suspense>
      )}
    </div>
  )
}
