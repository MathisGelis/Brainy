const TARGET_OPTIONS = [7, 6, 5, 4, 3, 2, 1]

export function TargetSelect({
  value,
  onChange,
  label = 'Fréquence',
}: {
  value: number
  onChange: (value: number) => void
  label?: string
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="min-h-11 rounded border border-border bg-bg px-2 text-text md:min-h-9"
    >
      {TARGET_OPTIONS.map((n) => (
        <option key={n} value={n}>
          {n === 7 ? 'Tous les jours' : `${n} fois par semaine`}
        </option>
      ))}
    </select>
  )
}
