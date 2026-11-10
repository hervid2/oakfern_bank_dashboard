import { Skeleton } from '@/components/ui/skeleton';

/**
 * Content-shaped loading state for UI-02 (NFR-010): the four KPI tiles keep
 * their boxes, the chart keeps its plot area and the activity list keeps its row
 * rhythm, so nothing moves when the real content arrives. Never a full-page
 * spinner (`ui-system` rule 7).
 *
 * The skeleton is `aria-hidden` and an `sr-only` sentence says what is loading:
 * a screen reader should be told, not shown, that the page is busy.
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
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="flex flex-col gap-4 rounded-[var(--radius)] border border-border p-4">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-48 w-full" />
          </div>
          <div className="flex flex-col gap-4 rounded-[var(--radius)] border border-border p-4">
            <Skeleton className="h-3 w-24" />
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="flex flex-col gap-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
