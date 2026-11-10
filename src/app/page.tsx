/**
 * Deliberately plain placeholder (spec §7). It renders server-side and fetches
 * nothing, so there is no loading boundary and no data view. Feature 001
 * replaces it with UI-01; it must not attempt a landing-page layout.
 *
 * Exactly one `<h1>` on the page — a DOM fact the e2e test asserts (AC-000-09).
 */
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-3 px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Oakfern</h1>
      <p className="text-[color:var(--muted-foreground)]">Banking dashboard — setup in progress.</p>
    </main>
  );
}
