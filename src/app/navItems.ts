import {
  BudgetIcon,
  CalendarIcon,
  DashboardIcon,
  GoalsIcon,
  HabitsIcon,
  MenuIcon,
  NotesIcon,
  PlanIcon,
  ReviewIcon,
  TodayIcon,
  TodoIcon,
} from '@/components/ui/icons'

/** Page du jour (l'accueil « / » est le dashboard). */
export const TODAY_PATH = '/aujourdhui'

export type NavItem = {
  to: string
  label: string
  end: boolean
  icon: typeof TodayIcon
  /** Dans la barre d'onglets mobile ; les autres sont dans « Plus » */
  mobile?: boolean
}

export const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard', end: true, icon: DashboardIcon, mobile: true },
  { to: TODAY_PATH, label: "Aujourd'hui", end: false, icon: TodayIcon, mobile: true },
  { to: '/objectifs', label: 'Objectifs', end: false, icon: GoalsIcon },
  { to: '/notes', label: 'Notes', end: false, icon: NotesIcon },
  { to: '/habitudes', label: 'Habitudes', end: false, icon: HabitsIcon },
  { to: '/todo', label: 'Todo', end: false, icon: TodoIcon, mobile: true },
  { to: '/budget', label: 'Budget', end: false, icon: BudgetIcon, mobile: true },
  { to: '/menu', label: 'Menu', end: false, icon: MenuIcon },
]

/** Vues transverses : sous la navigation principale sur desktop, dans « Plus » sur mobile. */
export const secondaryNavItems = [
  { to: '/calendrier', label: 'Calendrier', icon: CalendarIcon },
  { to: '/revue', label: 'Revue de la semaine', icon: ReviewIcon },
  { to: '/plan', label: 'Plan financier', icon: PlanIcon },
] as const
