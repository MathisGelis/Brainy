import { NAV_SHORTCUTS, OTHER_SHORTCUTS } from './shortcuts'

const kbd =
  'inline-flex min-w-6 justify-center rounded-md border border-[var(--field-border)] bg-bg px-1.5 py-0.5 font-sans text-xs shadow-[inset_0_-1px_0_var(--border)]'

export function ShortcutsHelp({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-label="Raccourcis clavier"
      className="glass-strong fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+160px)] z-50 mx-auto max-w-sm animate-pop rounded-[28px] p-5 md:right-8 md:bottom-28 md:left-auto"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Raccourcis clavier</h2>
        <button
          type="button"
          onClick={onClose}
          className="min-h-9 rounded-full px-3 text-muted transition-colors hover:bg-surface hover:text-text"
        >
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
