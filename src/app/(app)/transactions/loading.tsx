import { Skeleton } from '@/components/ui/skeleton';

/**
 * Content-shaped loading state for UI-03 (NFR-010): the filter bar, the table
 * header and eight rows at the real row rhythm, so the table does not jump when
 * the data lands. No full-page spinner.
 */
export default function TransactionsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <span className="sr-only" role="status">
        Loading transactions.
      </span>
      <div aria-hidden className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-full max-w-xs" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="rounded-[var(--radius)] border border-border">
          <div className="flex items-center gap-4 border-b border-border px-4 py-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="ml-auto h-3 w-24" />
          </div>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((row) => (
            <div key={row} className="flex items-center gap-4 border-b border-border px-4 py-4">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="ml-auto h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
