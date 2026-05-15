/**
 * Generic page-level loading skeleton shown by the Suspense boundary
 * in Layout while a lazy route chunk is being downloaded.
 *
 * Matches the visual structure of the Dashboard to minimise layout shift.
 */
export function PageSkeleton() {
  return (
    <div
      className="p-5 lg:p-7 xl:p-8 space-y-6 max-w-[1600px] mx-auto animate-pulse"
      aria-label="Cargando página…"
      role="status"
    >
      <div className="space-y-2">
        <div className="h-6 bg-muted rounded w-48" />
        <div className="h-4 bg-muted rounded w-72" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface-raised rounded-xl border border-border p-5 space-y-3">
            <div className="flex justify-between">
              <div className="h-2.5 bg-muted rounded w-20" />
              <div className="w-7 h-7 bg-muted rounded-lg" />
            </div>
            <div className="h-7 bg-muted rounded w-24" />
            <div className="h-2.5 bg-muted rounded w-32" />
          </div>
        ))}
      </div>

      <div className="bg-surface-raised rounded-xl border border-border h-48" />
    </div>
  );
}
