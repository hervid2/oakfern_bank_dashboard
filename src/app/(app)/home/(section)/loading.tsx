import { Skeleton } from '@/components/ui/skeleton';

/**
 * Content-shaped loading state for UI-02 (NFR-010, AC-002-26, spec §4 E-07).
 *
 * The boxes are the **final** layout's boxes, so nothing moves when the data
 * arrives: four KPI tiles, then the recent-transactions list beside the accounts
 * panel. The chart plot area that feature 001 drew here is **gone** — feature
 * 004 would have filled it and 004 is cut, and a skeleton promising a chart that
 * never renders is a layout shift waiting to happen. There is no sparkline box
 * (cut L-4) and no pending-payments box (cut L-2).
 *
 * The skeleton itself is `aria-hidden` and an `sr-only` sentence says what is
 * loading: a screen reader should be *told*, not shown, that the page is busy.
 * Never a full-page spinner (`ui-system` rule 7).
 */
export default function HomeLoading() {
  return (
    <div className="flex flex-col gap-6">
      <span className="sr-only" role="status">
        Loading the overview.
      </span>
      <div aria-hidden className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((tile) => (
            <div
              key={tile}
              className="flex flex-col gap-3 rounded-[var(--radius)] border border-border p-4"
            >
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="flex min-w-0 flex-col gap-4">
            <Skeleton className="h-3 w-36" />
            <div className="flex flex-col divide-y divide-border rounded-[var(--radius)] border border-border">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((row) => (
                <div key={row} className="flex items-start justify-between gap-3 p-4">
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            <Skeleton className="h-3 w-20" />
            {[0, 1, 2, 3].map((card) => (
              <div
                key={card}
                className="flex flex-col gap-3 rounded-[var(--radius)] border border-border p-4"
              >
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-6 w-28" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
