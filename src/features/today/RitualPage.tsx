import { useNavigate } from 'react-router-dom'
import { useToast } from '@/components/ui'
import { PageHeader } from '@/components/ui/PageHeader'
import { DayWin } from '@/features/checkins/DayWin'
import { MoodEnergy } from '@/features/checkins/MoodEnergy'
import { nextMonday } from '@/features/todos/TodoItem'
import { filterTodos } from '@/features/todos/todoLogic'
import { useTodos } from '@/features/todos/useTodos'
import { celebrate } from '@/lib/celebrate'
import { addDays, todayISO } from '@/lib/dates'
import { markEveningRitualDone } from '@/lib/ritual'
import { rowClass, TodayHabits } from './parts'
import { StepFlow } from './StepFlow'
import { TopThree } from './TopThree'

const small =
  'min-h-11 rounded-full px-3 text-xs text-muted transition-colors hover:bg-surface hover:text-text md:min-h-9'

/** Ce qui reste aujourd'hui : boucler ou reporter en un geste. */
function Leftovers({ today, onError }: { today: string; onError: (m: string) => void }) {
  const { todos, completeTodo, snoozeTodo } = useTodos({ onError })
  const left = filterTodos(todos, 'today', today)
  if (left.length === 0) return <p className="text-muted">Tout est bouclé pour aujourd'hui.</p>
  return (
    <ul>
      {left.map((todo) => (
        <li key={todo.id} className={rowClass}>
          <span className="min-w-0 flex-1 py-3">{todo.title}</span>
          <button
            type="button"
            className={small}
            onClick={() => {
              completeTodo(todo)
              celebrate(0.6)
            }}
          >
            Fait
          </button>
          <button
            type="button"
            className={small}
            onClick={() => snoozeTodo(todo.id, addDays(today, 1))}
          >
            Demain
          </button>
          <button
            type="button"
            className={small}
            onClick={() => snoozeTodo(todo.id, nextMonday(today))}
          >
            Lundi
          </button>
        </li>
      ))}
    </ul>
  )
}

/** Rituel du soir : 30 secondes pour boucler la journée et préparer demain. */
export default function RitualPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const onError = (m: string) => toast.show(m)
  const today = todayISO()
  const tomorrow = addDays(today, 1)

  const steps = [
    {
      title: 'Comment s’est passée la journée ?',
      body: (
        <div className="flex flex-col gap-5">
          <MoodEnergy day={today} onError={onError} />
          <DayWin day={today} onError={onError} />
        </div>
      ),
    },
    { title: 'Vos habitudes du jour', body: <TodayHabits today={today} onError={onError} /> },
    { title: 'Ce qui reste aujourd’hui', body: <Leftovers today={today} onError={onError} /> },
    {
      title: 'Votre Top 3 de demain',
      body: (
        <TopThree
          day={tomorrow}
          onError={onError}
          title="Top 3 de demain"
          prompt="Choisissez vos 3 priorités pour demain."
        />
      ),
    },
  ]
  function finish() {
    markEveningRitualDone(today)
    celebrate(1.2)
    toast.show('Journée bouclée. Bonne soirée !')
    navigate('/')
  }

  return (
    <>
      <PageHeader title="Rituel du soir" />
      <StepFlow steps={steps} onFinish={finish} />
    </>
  )
}
