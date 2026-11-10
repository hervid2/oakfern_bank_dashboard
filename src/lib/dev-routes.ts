/**
 * The gate in front of the two deliberate-failure probes (AC-001-24).
 *
 * 000's validation flagged `/_dev/boom` as publicly reachable in production, so
 * it must 404 there. But AC-001-16's verifier is an **end-to-end** test, and
 * `pnpm test:e2e` runs against `pnpm build && pnpm start` — a production
 * NODE_ENV. Gating on NODE_ENV alone would therefore make the error boundary
 * unverifiable by anything except a human in dev mode, which is how AC-000-07
 * was lost in the first place.
 *
 * So the gate has two keys: the probes exist when the build is not production,
 * **or** when the operator of that process explicitly opted in with
 * `OAKFERN_ENABLE_DEV_ROUTES=1`. `playwright.config.ts` sets the flag for its
 * own server and nothing else does; no deployed environment has it, so
 * production stays 404 — which T-12's `curl` evidence shows against a plain
 * `pnpm start`.
 */
export const devRoutesEnabled = (): boolean =>
  process.env.NODE_ENV !== 'production' || process.env.OAKFERN_ENABLE_DEV_ROUTES === '1';
