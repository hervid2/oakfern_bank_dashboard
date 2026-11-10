import { notFound } from 'next/navigation';

import { devRoutesEnabled } from '@/lib/dev-routes';

/**
 * The same probe as `/_dev/boom`, but **inside the `(app)` shell**, so that
 * AC-001-16 — the segment error state, with the navigation still around it — is
 * executable rather than merely reviewed.
 *
 * It is a separate path, not a move of the root probe, because the two
 * boundaries are different contracts: the root one catches a failure anywhere in
 * the document, this one catches a failure in an authenticated section and must
 * keep the sidebar and topbar alive. Both are gated by
 * `src/lib/dev-routes.ts` (AC-001-24).
 */
export const dynamic = 'force-dynamic';

export default function ShellBoomPage(): never {
  if (!devRoutesEnabled()) {
    notFound();
  }

  throw new Error('Deliberate failure: AC-001-16 shell error boundary probe.');
}
