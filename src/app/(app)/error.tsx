'use client';

import { ErrorState } from '@/components/states/error-state';

/**
 * Segment error boundary for the authenticated shell (FR-039, AC-001-16).
 *
 * The `error` argument is accepted because Next passes it, and then it is
 * **dropped on the floor**: it is not spread into `ErrorState`, which has no
 * prop able to receive it. No message, no digest and no stack frame can reach
 * the body. The sidebar and topbar stay rendered — a failed section should not
 * cost the visitor their navigation.
 */
export default function AppError({
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}) {
  return (
    <ErrorState
      title="We couldn't load this section"
      body="Something went wrong on our side, not yours. Try again — if it keeps failing, go back to Home and open it from there."
      onRetry={reset}
    />
  );
}
