/** Barre de progression : accent normalement, rouge uniquement en cas de dépassement. */
export function ProgressBar({
  ratio,
  over,
  label,
}: {
  ratio: number
  over: boolean
  label: string
}) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(ratio * 100)}
      className="h-2 overflow-hidden rounded-full bg-surface"
    >
      <div
        className={`h-full ${over ? 'bg-danger' : 'bg-accent'}`}
        style={{ width: `${Math.round(ratio * 100)}%` }}
      />
    </div>
  )
}
