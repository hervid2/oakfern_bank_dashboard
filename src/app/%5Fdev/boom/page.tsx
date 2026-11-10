import { notFound } from 'next/navigation';

import { devRoutesEnabled } from '@/lib/dev-routes';

/**
 * Throws on render so the **root** `error.tsx` boundary has an executable
 * verifier (AC-000-08): without a route that fails on purpose, that boundary
 * could only be reviewed by reading, never by running. Its sibling probe,
 * `/_dev/shell-boom`, does the same for the `(app)` boundary (AC-001-16).
 *
 * The folder is named `%5Fdev`, not `_dev`. An underscore-prefixed folder is a
 * **private folder** in the App Router and is excluded from routing entirely,
 * which `pnpm build` proved: with `src/app/_dev/boom/page.tsx` in place the
 * route table listed only `/`, `/_not-found` and `/api/health`. `%5F` is the
 * documented escape that produces a literal leading underscore in the URL.
 *
 * **Gated since 001** (AC-001-24, from 000's validation §6 item 5): outside a
 * development build it answers 404 unless the process opted in — see
 * `src/lib/dev-routes.ts`.
 */
export const dynamic = 'force-dynamic';

export default function BoomPage(): never {
  if (!devRoutesEnabled()) {
    notFound();
  }

  throw new Error('Deliberate failure: AC-000-08 root error boundary probe.');
}
