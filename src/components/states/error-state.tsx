'use client';

import { TriangleAlertIcon } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

/**
 * The error state (FR-039, AC-001-16): what happened, what to do next, and a
 * retry that actually retries.
 *
 * **It takes no `error` argument, by construction.** A component that cannot
 * receive the message, the digest or the stack cannot leak them, so AC-001-16's
 * "no stack trace in the body" is a property of this file's signature rather
 * than of the caller's discipline. `role="alert"` announces it, and the retry
 * button is first in the tab order.
 */
export function ErrorState({
  title = 'Something went wrong',
  body,
  onRetry,
}: {
  readonly title?: string;
  readonly body: string;
  readonly onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-[var(--radius)] border border-border px-6 py-10"
    >
      <span className="flex items-center gap-2 text-destructive">
        <TriangleAlertIcon aria-hidden className="size-5" />
        <span className="text-sm font-medium">Error</span>
      </span>
      <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
      <p className="max-w-prose text-sm text-muted-foreground">{body}</p>
      <div className="flex items-center gap-3 pt-1">
        <Button onClick={onRetry} size="sm">
          Try again
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/home">Go to Home</Link>
        </Button>
      </div>
    </div>
  );
}
