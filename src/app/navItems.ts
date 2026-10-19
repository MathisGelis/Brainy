import {
  BudgetIcon,
  CalendarIcon,
  GoalsIcon,
  HabitsIcon,
  MenuIcon,
  NotesIcon,
  ReviewIcon,
  TodayIcon,
  TodoIcon,
} from '@/components/ui/icons'

/** `short` : libellé de la barre d'onglets mobile, quand le nom complet ne tient pas à 7 onglets. */
export const navItems: {
  to: string
  label: string
  short?: string
  end: boolean
  icon: typeof TodayIcon
}[] = [
  { to: '/', label: "Aujourd'hui", short: 'Accueil', end: true, icon: TodayIcon },
  { to: '/objectifs', label: 'Objectifs', end: false, icon: GoalsIcon },
  { to: '/notes', label: 'Notes', end: false, icon: NotesIcon },
  { to: '/habitudes', label: 'Habitudes', end: false, icon: HabitsIcon },
  { to: '/todo', label: 'Todo', end: false, icon: TodoIcon },
  { to: '/budget', label: 'Budget', end: false, icon: BudgetIcon },
  { to: '/menu', label: 'Menu', end: false, icon: MenuIcon },
]

/** Vues transverses : barre latérale sur desktop, icône (calendrier) en haut sur mobile. */
export const secondaryNavItems = [
  { to: '/calendrier', label: 'Calendrier', icon: CalendarIcon },
  { to: '/revue', label: 'Revue de la semaine', icon: ReviewIcon },
] as const
