import { lazy, Suspense } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './Layout'

const TodayPage = lazy(() => import('@/features/today/TodayPage'))
const GoalsPage = lazy(() => import('@/features/goals/GoalsPage'))
const NotesPage = lazy(() => import('@/features/notes/NotesPage'))
const HabitsPage = lazy(() => import('@/features/habits/HabitsPage'))
const TodosPage = lazy(() => import('@/features/todos/TodosPage'))
const BudgetPage = lazy(() => import('@/features/budget/BudgetPage'))

export function App() {
  return (
    <HashRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<TodayPage />} />
            <Route path="objectifs" element={<GoalsPage />} />
            <Route path="notes" element={<NotesPage />} />
            <Route path="habitudes" element={<HabitsPage />} />
            <Route path="todo" element={<TodosPage />} />
            <Route path="budget" element={<BudgetPage />} />
          </Route>
        </Routes>
      </Suspense>
    </HashRouter>
  )
}
