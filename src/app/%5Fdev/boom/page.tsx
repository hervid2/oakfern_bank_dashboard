/**
 * Throws on render so the `error.tsx` half of AC-000-08 has an executable
 * verifier: without a route that fails on purpose, the root error boundary
 * could only be reviewed by reading, never by running.
 *
 * The folder is named `%5Fdev`, not `_dev`. An underscore-prefixed folder is a
 * **private folder** in the App Router and is excluded from routing entirely,
 * which `pnpm build` proved: with `src/app/_dev/boom/page.tsx` in place the
 * route table listed only `/`, `/_not-found` and `/api/health`. `%5F` is the
 * documented escape that produces a literal leading underscore in the URL, so
 * the path tasks.md and the T-10 e2e test name — `/_dev/boom` — still works.
 *
 * Feature 001 owns FR-039 in full and removes this probe.
 */
export const dynamic = 'force-dynamic';

export default function BoomPage() {
  throw new Error('Deliberate failure: AC-000-08 error boundary probe.');
}
