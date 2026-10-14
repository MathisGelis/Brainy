import { NavLink, Outlet } from 'react-router-dom'
import { navItems } from './navItems'

const linkBase = 'flex items-center rounded px-3 text-sm'

/** Sidebar sur desktop, tab bar en bas sur mobile (zones tactiles ≥ 44px). */
export function Layout() {
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
      </nav>
      <main className="mx-auto w-full max-w-3xl px-4 pt-6 pb-24 md:px-8 md:pb-8">
        <Outlet />
      </main>
    </div>
  )
}
