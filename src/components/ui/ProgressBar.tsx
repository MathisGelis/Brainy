/** Barre de progression lumineuse : accent normalement, rouge uniquement en cas de dépassement. */
export function ProgressBar({
  ratio,
  over,
  label,
}: {
  ratio: number
  over: boolean
  label: string
}) {
  const percent = Math.round(ratio * 100)
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="h-2 overflow-hidden rounded-full bg-surface"
    >
      <div
        className={`h-full rounded-full transition-[width] duration-700 ease-out ${
          over
            ? 'bg-danger'
            : 'bg-[linear-gradient(90deg,var(--accent),var(--accent-hi))] shadow-[0_0_12px_var(--accent-glow)]'
        }`}
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}
