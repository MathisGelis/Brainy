import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui'

export type Step = { title: string; body: ReactNode }

/** Parcours en quelques étapes (rituels) : progression, une étape à la fois, « Plus tard » pour sortir. */
export function StepFlow({ steps, onFinish }: { steps: Step[]; onFinish: () => void }) {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const last = step === steps.length - 1

  return (
    <>
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
      <section aria-labelledby="flow-step" className="card mb-5 p-5">
        <h2 id="flow-step" className="mb-3 font-semibold">
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
        <Button onClick={() => (last ? onFinish() : setStep(step + 1))}>
          {last ? 'Terminer' : 'Suivant'}
        </Button>
      </div>
    </>
  )
}
