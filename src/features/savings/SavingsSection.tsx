import { useState, type FormEvent } from 'react'
import { ProgressBar, useToast } from '@/components/ui'
import type { Goal } from '@/features/goals/types'
import { useGoals } from '@/features/goals/useGoals'
import { celebrate } from '@/lib/celebrate'
import { formatDayMonth, monthOf, todayISO } from '@/lib/dates'
import { centsToInput, formatCents, parseAmountToCents } from '@/lib/money'
import { savedInMonth, savingsRatio } from './savingsLogic'
import type { MovePatch, SavingsGoal, SavingsMove, SavingsPatch } from './types'
import { useSavings } from './useSavings'

const field = 'field min-h-11 px-3 md:min-h-10'
const small =
  'min-h-11 rounded-full px-3 text-xs text-muted transition-colors hover:bg-surface hover:text-text md:min-h-9'

const signed = (cents: number) => `${cents >= 0 ? '+' : '−'}${formatCents(Math.abs(cents))}`

function MoveRow({
  move,
  onUpdate,
  onDelete,
}: {
  move: SavingsMove
  onUpdate: (id: string, patch: MovePatch) => void
  onDelete: (move: SavingsMove) => void
}) {
  const [editing, setEditing] = useState(false)
  const [invalid, setInvalid] = useState(false)
  const label = move.amount_cents > 0 ? 'Versement' : 'Retrait'

  if (!editing) {
    return (
      <li>
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={`Modifier le ${label.toLowerCase()} de ${formatCents(Math.abs(move.amount_cents))} du ${formatDayMonth(move.moved_on)}`}
          className="-mx-2 flex min-h-11 w-[calc(100%+1rem)] items-center gap-3 rounded-xl px-2 text-left text-sm transition-colors hover:bg-surface"
        >
          <span className="w-14 shrink-0 text-xs text-muted">{formatDayMonth(move.moved_on)}</span>
          <span className="min-w-0 flex-1 truncate text-muted">{move.note || label}</span>
          <span className={move.amount_cents > 0 ? 'font-semibold text-success' : 'font-semibold'}>
            {signed(move.amount_cents)}
          </span>
        </button>
      </li>
    )
  }

  const sign = Math.sign(move.amount_cents)
  return (
    <li className="my-1 flex flex-wrap items-center gap-2 rounded-2xl bg-surface p-2">
      <select
        aria-label="Type de mouvement"
        value={sign > 0 ? 'in' : 'out'}
        onChange={(e) =>
          onUpdate(move.id, {
            amount_cents: Math.abs(move.amount_cents) * (e.target.value === 'in' ? 1 : -1),
          })
        }
        className={field}
      >
        <option value="in">Versement</option>
        <option value="out">Retrait</option>
      </select>
      <input
        defaultValue={centsToInput(Math.abs(move.amount_cents))}
        inputMode="decimal"
        aria-label="Montant du mouvement"
        aria-invalid={invalid}
        onBlur={(e) => {
          const cents = parseAmountToCents(e.target.value)
          setInvalid(cents === null)
          if (cents !== null && cents * sign !== move.amount_cents)
            onUpdate(move.id, { amount_cents: cents * sign })
        }}
        className={`${field} w-28 ${invalid ? '!border-danger' : ''}`}
      />
      <input
        type="date"
        defaultValue={move.moved_on}
        aria-label="Date du mouvement"
        onChange={(e) => e.target.value && onUpdate(move.id, { moved_on: e.target.value })}
        className={field}
      />
      <input
        defaultValue={move.note ?? ''}
        aria-label="Note du mouvement"
        placeholder="Note"
        onBlur={(e) => {
          const note = e.target.value.trim() || null
          if (note !== move.note) onUpdate(move.id, { note })
        }}
        className={`${field} min-w-0 flex-1`}
      />
      <button type="button" onClick={() => onDelete(move)} className={`${small} hover:text-danger`}>
        Supprimer
      </button>
      <button type="button" onClick={() => setEditing(false)} className={small}>
        OK
      </button>
    </li>
  )
}

type CardProps = {
  savings: SavingsGoal
  balance: number
  moves: SavingsMove[]
  goals: Goal[]
  onMove: (savings: SavingsGoal, cents: number) => void
  onUpdate: (id: string, patch: SavingsPatch) => void
  onDelete: (savings: SavingsGoal) => void
  onUpdateMove: (id: string, patch: MovePatch) => void
  onDeleteMove: (move: SavingsMove) => void
}

function SavingsCard({
  savings,
  balance,
  moves,
  goals,
  onMove,
  onUpdate,
  onDelete,
  onUpdateMove,
  onDeleteMove,
}: CardProps) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [invalid, setInvalid] = useState<string | null>(null)
  const [targetInvalid, setTargetInvalid] = useState(false)
  const ratio = savingsRatio(balance, savings.target_cents)
  const goal = goals.find((g) => g.id === savings.goal_id)
  const detailsId = `savings-${savings.id}`

  function move(direction: 1 | -1) {
    const cents = parseAmountToCents(amount)
    if (cents === null) {
      setInvalid('Montant invalide')
      return
    }
    if (direction < 0 && cents > balance) {
      setInvalid(`Solde de ${formatCents(balance)} seulement`)
      return
    }
    setInvalid(null)
    setAmount('')
    onMove(savings, cents * direction)
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    move(1)
  }

  return (
    <li className="card flex flex-col gap-2 p-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls={detailsId}
          className="-mx-2 flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-xl px-2 text-left transition-colors hover:bg-surface"
        >
          <span className="min-w-0 flex-1 truncate font-semibold">
            {savings.name}
            {savings.archived && <span className="font-normal text-muted"> · archivée</span>}
          </span>
          <span className="text-sm">
            {formatCents(balance)}{' '}
            <span className="text-muted">/ {formatCents(savings.target_cents)}</span>
          </span>
        </button>
        <span
          className={`w-10 text-right text-xs ${ratio >= 1 ? 'font-semibold text-accent' : 'text-muted'}`}
        >
          {Math.round(ratio * 100)} %
        </span>
      </div>
      <ProgressBar ratio={ratio} over={false} label={`Cagnotte « ${savings.name} »`} />
      {goal && <p className="text-xs text-muted">◎ Pour « {goal.title} »</p>}

      {!savings.archived && (
        <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
          <input
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value)
              setInvalid(null)
            }}
            inputMode="decimal"
            placeholder="Montant"
            aria-label={`Montant pour « ${savings.name} »`}
            aria-invalid={invalid !== null}
            aria-describedby={invalid ? `${detailsId}-error` : undefined}
            className={`${field} w-28 ${invalid ? '!border-danger' : ''}`}
          />
          <button
            type="submit"
            className="btn-primary min-h-11 rounded-full px-4 text-sm font-semibold md:min-h-10"
          >
            Verser
          </button>
          <button
            type="button"
            onClick={() => move(-1)}
            className="min-h-11 rounded-full border border-[var(--field-border)] px-4 text-sm transition-colors hover:bg-surface md:min-h-10"
          >
            Retirer
          </button>
          {invalid && (
            <span id={`${detailsId}-error`} role="alert" className="text-xs text-danger">
              {invalid}
            </span>
          )}
        </form>
      )}

      {open && (
        <div id={detailsId} className="mt-1 flex flex-col gap-3 border-t border-border pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              defaultValue={savings.name}
              aria-label="Nom de la cagnotte"
              onBlur={(e) => {
                const name = e.target.value.trim()
                if (name && name !== savings.name) onUpdate(savings.id, { name })
              }}
              className={`${field} min-w-0 flex-1`}
            />
            <input
              defaultValue={centsToInput(savings.target_cents)}
              inputMode="decimal"
              aria-label="Montant cible"
              aria-invalid={targetInvalid}
              onBlur={(e) => {
                const cents = parseAmountToCents(e.target.value)
                setTargetInvalid(cents === null)
                if (cents !== null && cents !== savings.target_cents)
                  onUpdate(savings.id, { target_cents: cents })
              }}
              className={`${field} w-32 ${targetInvalid ? '!border-danger' : ''}`}
            />
            <select
              aria-label="Objectif lié"
              value={savings.goal_id ?? ''}
              onChange={(e) => onUpdate(savings.id, { goal_id: e.target.value || null })}
              className={`${field} max-w-full`}
            >
              <option value="">Aucun objectif lié</option>
              {goals
                .filter((g) => g.status === 'active' || g.id === savings.goal_id)
                .map((g) => (
                  <option key={g.id} value={g.id}>
                    ◎ {g.title}
                  </option>
                ))}
            </select>
          </div>

          <section aria-label={`Historique de « ${savings.name} »`}>
            <h3 className="mb-1 text-xs font-semibold text-muted uppercase">Historique</h3>
            {moves.length === 0 ? (
              <p className="text-sm text-muted">Aucun versement pour l’instant.</p>
            ) : (
              <ul className="flex flex-col">
                {moves.map((m) => (
                  <MoveRow key={m.id} move={m} onUpdate={onUpdateMove} onDelete={onDeleteMove} />
                ))}
              </ul>
            )}
          </section>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onUpdate(savings.id, { archived: !savings.archived })}
              className={small}
            >
              {savings.archived ? 'Réactiver' : 'Archiver'}
            </button>
            <button
              type="button"
              onClick={() => onDelete(savings)}
              className={`${small} hover:text-danger`}
            >
              Supprimer la cagnotte
            </button>
          </div>
        </div>
      )}
    </li>
  )
}

function NewSavingsForm({ onAdd }: { onAdd: (name: string, target: number) => void }) {
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [invalid, setInvalid] = useState(false)

  function submit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    const cents = parseAmountToCents(target)
    if (!trimmed) return
    if (cents === null) {
      setInvalid(true)
      return
    }
    onAdd(trimmed, cents)
    setName('')
    setTarget('')
    setInvalid(false)
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        aria-label="Nom de la nouvelle cagnotte"
        placeholder="Nouvelle cagnotte (Vacances, Coussin…)"
        className={`${field} min-w-0 flex-1 px-4`}
      />
      <input
        value={target}
        onChange={(e) => {
          setTarget(e.target.value)
          setInvalid(false)
        }}
        inputMode="decimal"
        aria-label="Montant cible de la nouvelle cagnotte"
        aria-invalid={invalid}
        placeholder="Cible €"
        className={`${field} w-28 ${invalid ? '!border-danger' : ''}`}
      />
      <button
        type="submit"
        className="min-h-11 rounded-full border border-[var(--field-border)] px-4 text-sm transition-colors hover:bg-surface md:min-h-10"
      >
        Créer
      </button>
    </form>
  )
}

/** Cagnottes d'épargne : cible, versements et retraits en un geste, objectif lié. */
export function SavingsSection({ month }: { month: string }) {
  const toast = useToast()
  const onError = (m: string) => toast.show(m)
  const s = useSavings({ onError })
  const { goals } = useGoals({ onError })
  const [showArchived, setShowArchived] = useState(false)

  const active = s.goals.filter((g) => !g.archived)
  const archived = s.goals.filter((g) => g.archived)
  const saved = savedInMonth(s.moves, month)
  const isCurrentMonth = month === monthOf(todayISO())

  function onMove(savings: SavingsGoal, cents: number) {
    const before = s.balance(savings.id)
    const created = s.addMove({ savings_id: savings.id, amount_cents: cents })
    const filled = before < savings.target_cents && before + cents >= savings.target_cents
    if (cents > 0) celebrate(filled ? 1.5 : 0.6)
    toast.show(
      filled
        ? `Cagnotte « ${savings.name} » remplie !`
        : cents > 0
          ? `${formatCents(cents)} versés dans « ${savings.name} »`
          : `${formatCents(-cents)} retirés de « ${savings.name} »`,
      () => s.deleteMove(created.id),
    )
  }

  function onDelete(savings: SavingsGoal) {
    toast.show(`Cagnotte « ${savings.name} » supprimée`, s.deleteGoal(savings))
  }

  function onDeleteMove(move: SavingsMove) {
    s.deleteMove(move.id)
    toast.show('Mouvement supprimé', () => s.restoreMove(move))
  }

  const card = (savings: SavingsGoal) => (
    <SavingsCard
      key={savings.id}
      savings={savings}
      balance={s.balance(savings.id)}
      moves={s.moves.filter((m) => m.savings_id === savings.id)}
      goals={goals}
      onMove={onMove}
      onUpdate={s.updateGoal}
      onDelete={onDelete}
      onUpdateMove={s.updateMove}
      onDeleteMove={onDeleteMove}
    />
  )

  return (
    <section aria-labelledby="savings-title" className="mb-6 flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="savings-title" className="font-semibold">
          Cagnottes
        </h2>
        {saved !== 0 && (
          <span className="text-xs text-muted">
            {isCurrentMonth ? 'Ce mois-ci' : 'Ce mois-là'} : {signed(saved)} mis de côté
          </span>
        )}
      </div>
      {s.isError ? (
        <p role="alert" className="text-danger">
          Impossible de charger les cagnottes.{' '}
          <button
            type="button"
            onClick={() => void s.refetch()}
            className="min-h-11 font-semibold underline"
          >
            Réessayer
          </button>
        </p>
      ) : s.isLoading ? (
        <div aria-hidden className="h-16 animate-pulse rounded-2xl bg-surface" />
      ) : (
        <>
          {active.length === 0 && (
            <p className="text-sm text-muted">
              Mettez de côté pour un projet : créez une cagnotte avec un montant cible.
            </p>
          )}
          {active.length > 0 && <ul className="flex flex-col gap-3">{active.map(card)}</ul>}
          <NewSavingsForm
            onAdd={(name, target_cents) => s.addGoal({ name, target_cents, goal_id: null })}
          />
          {archived.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setShowArchived(!showArchived)}
                aria-expanded={showArchived}
                className={`${small} self-start`}
              >
                {showArchived ? 'Masquer' : 'Voir'} les cagnottes archivées ({archived.length})
              </button>
              {showArchived && <ul className="flex flex-col gap-3">{archived.map(card)}</ul>}
            </>
          )}
        </>
      )}
    </section>
  )
}
