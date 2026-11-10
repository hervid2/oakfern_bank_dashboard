import { Skeleton } from '@/components/ui/skeleton';

/**
 * Content-shaped loading state for UI-05 (NFR-010): the decision surface is low
 * density, so the skeleton is the heading plus one form card with four field
 * rows and a submit — the shape the form will actually have. No full-page
 * spinner.
 */
export default function MoveMoneyLoading() {
  return (
    <div className="flex flex-col gap-6">
      <span className="sr-only" role="status">
        Loading the money movement form.
      </span>
      <div aria-hidden className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="flex max-w-xl flex-col gap-5 rounded-[var(--radius)] border border-border p-5">
          {[0, 1, 2, 3].map((field) => (
            <div key={field} className="flex flex-col gap-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
          <Skeleton className="h-9 w-36" />
        </div>
      </div>
    </div>
  );
}
