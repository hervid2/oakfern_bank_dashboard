import { prisma } from './client';

/**
 * Outcome of a liveness probe against the database (plan.md §4.2, §4.3).
 * Declared here, next to the only code that can produce it, and re-exported by
 * the health service so callers see the contract of plan.md §4.2.
 */
export type PingResult = { reachable: true; latencyMs: number } | { reachable: false };

/**
 * FR-038 liveness probe: the cheapest statement PostgreSQL can answer.
 *
 * `SELECT 1` deliberately touches no table, so the probe stays valid when
 * feature 001 supersedes `SkeletonCheck` (ASM-023).
 *
 * It catches its own connection errors and returns `{ reachable: false }`
 * instead of throwing, which is what makes the 503 path of AC-000-07
 * deterministic rather than an accidental 500.
 */
export async function pingDatabase(): Promise<PingResult> {
  const startedAt = performance.now();

  try {
    await prisma.$queryRaw`SELECT 1`;

    return { reachable: true, latencyMs: Math.round(performance.now() - startedAt) };
  } catch {
    return { reachable: false };
  }
}
