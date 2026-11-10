'use client';

/**
 * Root error boundary (FR-039, spec §7). One heading, one human sentence and a
 * retry affordance.
 *
 * The `error` object is received because Next.js passes it, but **nothing from
 * it is rendered**: no message, no digest, no stack trace reaches the browser.
 * The copy says what happened and what to do next, which is the whole contract.
 */
export default function RootError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="text-[color:var(--muted-foreground)]">
        Something went wrong loading this page.
      </p>
      <div>
        <button
          type="button"
          onClick={reset}
          className="rounded-[var(--radius)] bg-[color:var(--primary)] px-4 py-2 text-sm font-medium text-[color:var(--primary-foreground)]"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
