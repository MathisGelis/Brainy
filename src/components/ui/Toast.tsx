import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type ToastItem = { id: number; message: string; onUndo?: () => void }
type ToastApi = { show: (message: string, onUndo?: () => void) => void }

const ToastContext = createContext<ToastApi | null>(null)
const DURATION_MS = 5000
let nextId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const show = useCallback(
    (message: string, onUndo?: () => void) => {
      const id = nextId++
      setToasts((list) => [...list, { id, message, onUndo }])
      setTimeout(() => dismiss(id), DURATION_MS)
    },
    [dismiss],
  )

  const api = useMemo(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+160px)] z-50 flex flex-col items-center gap-2 px-4 md:bottom-6"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="glass-strong pointer-events-auto flex animate-pop items-center gap-4 rounded-full py-2 pr-2 pl-5"
          >
            <span>{t.message}</span>
            {t.onUndo && (
              <button
                type="button"
                className="min-h-10 rounded-full px-4 font-semibold text-accent transition-colors hover:bg-surface"
                onClick={() => {
                  t.onUndo?.()
                  dismiss(t.id)
                }}
              >
                Annuler
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast doit être utilisé dans <ToastProvider>')
  return ctx
}
