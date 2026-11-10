'use client';

import { ErrorState } from '@/components/states/error-state';

/**
 * Segment error boundary for the overview (FR-039, AC-002-28, spec §4 E-02).
 *
 * The `error` argument is accepted because Next passes it, and then **dropped on
 * the floor**: it is not spread into `ErrorState`, which has no prop able to
 * receive it. So no message, no digest, no SQL and no stack frame can reach the
 * body — that is a property of the signature rather than of this caller's
 * discipline.
 *
 * The boundary is on the `(section)` group so the sidebar and topbar survive a
 * failed overview read: losing the numbers should not cost the visitor their
 * navigation.
 */
export default function HomeError({
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}) {
  return (
    <ErrorState
      title="We couldn't load your overview"
      body="The figures on this page come from your ledger, and that read failed just now — on our side, not yours. Try again; if it keeps failing, come back to Home in a minute."
      onRetry={reset}
    />
  );
}
