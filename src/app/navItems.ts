import {
  BudgetIcon,
  GoalsIcon,
  HabitsIcon,
  NotesIcon,
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
