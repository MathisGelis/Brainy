import {
  BudgetIcon,
  CalendarIcon,
  GoalsIcon,
  HabitsIcon,
  NotesIcon,
  ReviewIcon,
  TodayIcon,
  TodoIcon,
} from '@/components/ui/icons'

export const navItems = [
  { to: '/', label: "Aujourd'hui", end: true, icon: TodayIcon },
  { to: '/objectifs', label: 'Objectifs', end: false, icon: GoalsIcon },
  { to: '/notes', label: 'Notes', end: false, icon: NotesIcon },
  { to: '/habitudes', label: 'Habitudes', end: false, icon: HabitsIcon },
  { to: '/todo', label: 'Todo', end: false, icon: TodoIcon },
  { to: '/budget', label: 'Budget', end: false, icon: BudgetIcon },
] as const

/** Vues transverses : barre latérale sur desktop, icône (calendrier) en haut sur mobile. */
export const secondaryNavItems = [
  { to: '/calendrier', label: 'Calendrier', icon: CalendarIcon },
  { to: '/revue', label: 'Revue de la semaine', icon: ReviewIcon },
] as const
