import { pingDatabase, type PingResult } from '../repositories/health';

export type { PingResult };

/**
 * The two frozen, closed response shapes of spec §8.1 (plan.md §4.2). Being a
 * discriminated union makes the key sets a type-level fact as well as a tested
 * one (AC-000-04).
 */
export type HealthResult =
  | {
      status: 200;
      body: { status: 'ok'; database: 'ok'; latencyMs: number; timestamp: string };
    }
  | {
      status: 503;
      body: { status: 'degraded'; database: 'unreachable'; timestamp: string };
    };

/**
 * Pure mapper from a ping outcome to the HTTP result. `now` is a parameter so
 * the unit test is deterministic and no `new Date()` hides inside the mapping.
 *
 * The returned bodies are built as closed literals: the key sets of spec §8.1
 * are frozen, so nothing is spread in and no field can leak a connection
 * string, a host name or an error message (AC-000-04, AC-000-07).
 */
export function buildHealthResult(ping: PingResult, now: Date): HealthResult {
  const timestamp = now.toISOString();

  if (!ping.reachable) {
    return {
      status: 503,
      body: { status: 'degraded', database: 'unreachable', timestamp },
    };
  }

  return {
    status: 200,
    body: { status: 'ok', database: 'ok', latencyMs: ping.latencyMs, timestamp },
  };
}

/**
 * FR-038 use case: probe the database and map the outcome. The Route Handler
 * calls only this (ADR-0001).
 */
export async function checkDatabaseHealth(): Promise<HealthResult> {
  return buildHealthResult(await pingDatabase(), new Date());
}
