import type { SVGProps } from 'react'

/** Icônes au trait (24×24, couleur héritée), dessinées pour l'app : aucune dépendance. */
function Icon({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

type P = SVGProps<SVGSVGElement>

export const TodayIcon = (p: P) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M4.6 4.6L6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4" />
  </Icon>
)

export const GoalsIcon = (p: P) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" />
  </Icon>
)

export const NotesIcon = (p: P) => (
  <Icon {...p}>
    <path d="M6 3h8.5L19 7.5V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
    <path d="M14 3v5h5M8 13h8M8 17h5" />
  </Icon>
)

export const HabitsIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4.5 11a7.5 7.5 0 0 1 13-4.6M19.5 13a7.5 7.5 0 0 1-13 4.6" />
    <path d="M17.5 2.8v3.8h-3.8M6.5 21.2v-3.8h3.8" />
  </Icon>
)

export const TodoIcon = (p: P) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12.3l2.7 2.7L16.2 9.4" />
  </Icon>
)

export const BudgetIcon = (p: P) => (
  <Icon {...p}>
    <rect x="3" y="6" width="18" height="14" rx="3.5" />
    <path d="M3 10h18M16.5 15h1" />
    <path d="M6 6l9.5-2.6a1.5 1.5 0 0 1 1.9 1.1L17.8 6" />
  </Icon>
)

export const PlusIcon = (p: P) => (
  <Icon strokeWidth="2.2" {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
)

export const SunIcon = (p: P) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2.5v1.8M12 19.7v1.8M4.6 4.6l1.3 1.3M18.1 18.1l1.3 1.3M2.5 12h1.8M19.7 12h1.8M4.6 19.4l1.3-1.3M18.1 5.9l1.3-1.3" />
  </Icon>
)

export const MoonIcon = (p: P) => (
  <Icon {...p}>
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
  </Icon>
)

export const LogoutIcon = (p: P) => (
  <Icon {...p}>
    <path d="M14 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10" />
  </Icon>
)

export const SearchIcon = (p: P) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M20 20l-4.2-4.2" />
  </Icon>
)
