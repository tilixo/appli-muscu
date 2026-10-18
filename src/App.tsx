import { lazy, Suspense, useEffect } from 'react'
import { createHashRouter, Outlet, RouterProvider, useLocation } from 'react-router'
import { TabBar } from './components/TabBar'
import { UpdatePrompt } from './components/UpdatePrompt'
import BodyPage from './features/body/BodyPage'
import ExercisesPage from './features/exercises/ExercisesPage'
import AddFoodPage from './features/nutrition/AddFoodPage'
import NutritionPage from './features/nutrition/NutritionPage'
import SettingsPage from './features/settings/SettingsPage'
import TemplateEditPage from './features/templates/TemplateEditPage'
import TemplatesPage from './features/templates/TemplatesPage'
import { RestTimerBar } from './features/timer/RestTimerBar'
import WorkoutPage from './features/workouts/WorkoutPage'
import WorkoutsHome from './features/workouts/WorkoutsHome'

// Pages avec graphiques chargées à la demande (recharts est volumineux).
const ExerciseHistoryPage = lazy(() => import('./features/exercises/ExerciseHistoryPage'))
const WeeklyVolumePage = lazy(() => import('./features/stats/WeeklyVolumePage'))

function Layout() {
  const { pathname } = useLocation()
  useEffect(() => window.scrollTo(0, 0), [pathname])

  return (
    <div className="min-h-dvh">
      <main className="pb-40">
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </main>
      <div className="fixed inset-x-0 bottom-0 z-30">
        <UpdatePrompt />
        <RestTimerBar />
        <TabBar />
      </div>
    </div>
  )
}

const router = createHashRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <WorkoutsHome /> },
      { path: '/seance/:id', element: <WorkoutPage /> },
      { path: '/modeles', element: <TemplatesPage /> },
      { path: '/modeles/:id', element: <TemplateEditPage /> },
      { path: '/exercices', element: <ExercisesPage /> },
      { path: '/exercices/:id', element: <ExerciseHistoryPage /> },
      { path: '/volume', element: <WeeklyVolumePage /> },
      { path: '/nutrition', element: <NutritionPage /> },
      { path: '/nutrition/ajouter', element: <AddFoodPage /> },
      { path: '/corps', element: <BodyPage /> },
      { path: '/reglages', element: <SettingsPage /> },
      { path: '*', element: <WorkoutsHome /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
