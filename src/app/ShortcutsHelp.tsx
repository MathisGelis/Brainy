import { NAV_SHORTCUTS, OTHER_SHORTCUTS } from './shortcuts'

const kbd = 'rounded border border-border bg-surface px-1.5 py-0.5 font-sans text-xs'

export function ShortcutsHelp({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-label="Raccourcis clavier"
      className="fixed inset-x-4 bottom-36 z-50 mx-auto max-w-sm rounded border border-border bg-bg p-4 md:right-6 md:bottom-6 md:left-auto"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Raccourcis clavier</h2>
        <button type="button" onClick={onClose} className="min-h-9 px-2 text-muted hover:text-text">
          Fermer
        </button>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
        {OTHER_SHORTCUTS.map((s) => (
          <div key={s.keys} className="contents">
            <dt>
              <kbd className={kbd}>{s.keys}</kbd>
            </dt>
            <dd>{s.label}</dd>
          </div>
        ))}
        {NAV_SHORTCUTS.map((s) => (
          <div key={s.key} className="contents">
            <dt>
              <kbd className={kbd}>g</kbd> <kbd className={kbd}>{s.key}</kbd>
            </dt>
            <dd>{s.label}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
