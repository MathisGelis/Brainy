import { lazy, Suspense } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { BackgroundLoader } from './background/BackgroundLoader'
import { Layout } from './Layout'
import { usePointerLight } from './background/usePointerLight'
import { RequireAuth } from '@/features/auth/RequireAuth'

const LoginPage = lazy(() => import('@/features/auth/LoginPage'))
const TodayPage = lazy(() => import('@/features/today/TodayPage'))
const GoalsPage = lazy(() => import('@/features/goals/GoalsPage'))
const NotesPage = lazy(() => import('@/features/notes/NotesPage'))
const HabitsPage = lazy(() => import('@/features/habits/HabitsPage'))
const HabitDetailPage = lazy(() => import('@/features/habits/HabitDetailPage'))
const TodosPage = lazy(() => import('@/features/todos/TodosPage'))
const BudgetPage = lazy(() => import('@/features/budget/BudgetPage'))
const ReviewPage = lazy(() => import('@/features/review/ReviewPage'))
const RitualPage = lazy(() => import('@/features/today/RitualPage'))
const CalendarPage = lazy(() => import('@/features/calendar/CalendarPage'))

export function App() {
  usePointerLight()
  return (
    <HashRouter>
      <BackgroundLoader />
      <Suspense fallback={null}>
        <Routes>
          <Route path="connexion" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route element={<Layout />}>
              <Route index element={<TodayPage />} />
              <Route path="objectifs" element={<GoalsPage />} />
              <Route path="notes/:noteId?" element={<NotesPage />} />
              <Route path="habitudes" element={<HabitsPage />} />
              <Route path="habitudes/:habitId" element={<HabitDetailPage />} />
              <Route path="todo" element={<TodosPage />} />
              <Route path="budget" element={<BudgetPage />} />
              <Route path="revue" element={<ReviewPage />} />
              <Route path="rituel" element={<RitualPage />} />
              <Route path="calendrier" element={<CalendarPage />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </HashRouter>
  )
}
