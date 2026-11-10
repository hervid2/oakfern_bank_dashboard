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
 * Intentionally unimplemented: task T-05 ships the signature so T-06 can write
 * the unit test and watch it fail before the body exists.
 */
export function buildHealthResult(ping: PingResult, now: Date): HealthResult {
  void ping;
  void now;

  throw new Error('not implemented');
}

/**
 * FR-038 use case: probe the database and map the outcome. The Route Handler
 * calls only this (ADR-0001).
 */
export async function checkDatabaseHealth(): Promise<HealthResult> {
  return buildHealthResult(await pingDatabase(), new Date());
}
