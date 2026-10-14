import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, useToast } from '@/components/ui'
import { PageHeader } from '@/components/ui/PageHeader'
import { MoodEnergy } from '@/features/checkins/MoodEnergy'
import { nextMonday } from '@/features/todos/TodoItem'
import { filterTodos } from '@/features/todos/todoLogic'
import { useTodos } from '@/features/todos/useTodos'
import { celebrate } from '@/lib/celebrate'
import { addDays, todayISO } from '@/lib/dates'
import { markEveningRitualDone } from '@/lib/ritual'
import { rowClass, TodayHabits } from './parts'
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
  const [step, setStep] = useState(0)

  const steps = [
    {
      title: 'Comment s’est passée la journée ?',
      body: <MoodEnergy day={today} onError={onError} />,
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
  const last = step === steps.length - 1

  function finish() {
    markEveningRitualDone(today)
    celebrate(1.2)
    toast.show('Journée bouclée. Bonne soirée !')
    navigate('/')
  }

  return (
    <>
      <PageHeader title="Rituel du soir" />
      <ol aria-label="Étapes" className="-mt-3 mb-5 flex gap-1.5">
        {steps.map((s, i) => (
          <li
            key={s.title}
            aria-current={i === step ? 'step' : undefined}
            className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-accent' : 'bg-surface'}`}
          >
            <span className="sr-only">
              Étape {i + 1} sur {steps.length} : {s.title}
            </span>
          </li>
        ))}
      </ol>
      <section aria-labelledby="ritual-step" className="card mb-5 p-5">
        <h2 id="ritual-step" className="mb-3 font-semibold">
          {steps[step]!.title}
        </h2>
        {steps[step]!.body}
      </section>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => (step === 0 ? navigate('/') : setStep(step - 1))}
          className="min-h-11 rounded-full px-4 text-muted transition-colors hover:bg-surface hover:text-text"
        >
          {step === 0 ? 'Plus tard' : 'Précédent'}
        </button>
        <Button onClick={() => (last ? finish() : setStep(step + 1))}>
          {last ? 'Terminer' : 'Suivant'}
        </Button>
      </div>
    </>
  )
}
