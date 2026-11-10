import { checkDatabaseHealth } from '@/server/services/health';

/**
 * `GET /api/health` (FR-038, NFR-009) — the frozen contract of spec §8.1.
 *
 * Thin adapter (ADR-0001): it imports **only** the service, never a repository
 * and never Prisma — a constraint the ESLint `no-restricted-imports` block for
 * `src/app/**` enforces as an error, not as a convention.
 *
 * No Zod: the endpoint takes no input (spec §6).
 *
 * The `try/catch` is the AC-000-07 guarantee. Spec §8.1 freezes *every* failure
 * as the 503 JSON body, so an unexpected throw anywhere below this line must not
 * become Next.js's 500 HTML error page. The caught error is deliberately not
 * read: the key set is closed, so no message, host name or connection string
 * can reach the response.
 *
 * Route Handlers with a `GET` export are dynamic by default since Next 15 RC
 * (plan.md §7.2), so the body is never baked at build time; `Cache-Control:
 * no-store` states the same thing to proxies and uptime monitors.
 */
export async function GET(): Promise<Response> {
  const headers = { 'Cache-Control': 'no-store' };

  try {
    const { status, body } = await checkDatabaseHealth();

    return Response.json(body, { status, headers });
  } catch {
    return Response.json(
      { status: 'degraded', database: 'unreachable', timestamp: new Date().toISOString() },
      { status: 503, headers },
    );
  }
}
