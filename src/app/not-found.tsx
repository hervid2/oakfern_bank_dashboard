import Link from 'next/link';

/**
 * Root not-found page (FR-039, spec §7). Served with HTTP 404 by Next.js.
 * One heading, one human sentence and a link back to `/`.
 */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-[color:var(--muted-foreground)]">We couldn&apos;t find that page.</p>
      <div>
        <Link
          href="/"
          className="text-sm font-medium text-[color:var(--primary)] underline underline-offset-4"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
