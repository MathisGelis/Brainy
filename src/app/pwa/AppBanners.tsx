import { useUpdateReady } from './updateStore'
import { useOnline } from './useOnline'

const banner =
  'mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-[var(--field-border)] bg-surface px-4 py-2.5 text-sm'

/** Hors ligne, nouvelle version : des bandeaux discrets en haut de page. */
export function AppBanners() {
  const online = useOnline()
  const applyUpdate = useUpdateReady()
  return (
    <>
      {!online && (
        <p role="status" className={banner}>
          <span aria-hidden className="size-2 rounded-full bg-danger" />
          <span className="flex-1">
            <span className="font-semibold">Hors ligne.</span> Vous consultez les dernières données
            chargées ; les modifications demandent le réseau.
          </span>
        </p>
      )}
      {applyUpdate && (
        <div role="status" className={banner}>
          <span className="flex-1 font-semibold">Nouvelle version disponible</span>
          <button
            type="button"
            onClick={applyUpdate}
            className="btn-primary min-h-11 px-4 text-sm font-semibold md:min-h-9"
          >
            Recharger
          </button>
        </div>
      )}
    </>
  )
}
