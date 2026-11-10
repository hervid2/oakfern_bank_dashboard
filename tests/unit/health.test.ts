import { describe, expect, it } from 'vitest';

import { buildHealthResult } from '@/server/services/health';

/**
 * AC-000-04 over the frozen `GET /api/health` contract of spec §8.1.
 *
 * The assertions are on the **closed key sets**, not just on a few fields:
 * `Object.keys(body).sort()` is what proves the body cannot grow an extra key
 * carrying a connection string, a host name or a stack trace. A test asserting
 * only `status === 'ok'` would pass against a leaky body, which is exactly the
 * vacuous test CL-04 forbids.
 */
const OK_KEYS = ['database', 'latencyMs', 'status', 'timestamp'];
const DEGRADED_KEYS = ['database', 'status', 'timestamp'];

const NOW = new Date('2026-11-09T15:04:05.000Z');

describe('buildHealthResult', () => {
  it('AC-000-04: buildHealthResult returns the frozen 200 body when the database is reachable', () => {
    const result = buildHealthResult({ reachable: true, latencyMs: 7 }, NOW);

    expect(result.status).toBe(200);
    expect(Object.keys(result.body).sort()).toEqual(OK_KEYS);
    expect(result.body).toEqual({
      status: 'ok',
      database: 'ok',
      latencyMs: 7,
      timestamp: '2026-11-09T15:04:05.000Z',
    });
  });

  it('AC-000-04: buildHealthResult returns the frozen 503 body when the database is not reachable', () => {
    const result = buildHealthResult({ reachable: false }, NOW);

    expect(result.status).toBe(503);
    expect(Object.keys(result.body).sort()).toEqual(DEGRADED_KEYS);
    expect(result.body).toEqual({
      status: 'degraded',
      database: 'unreachable',
      timestamp: '2026-11-09T15:04:05.000Z',
    });
  });

  it('AC-000-04: the timestamp is ISO-8601 UTC and comes from the injected clock, not from new Date()', () => {
    const other = new Date('2027-01-02T03:04:05.678Z');

    expect(buildHealthResult({ reachable: true, latencyMs: 1 }, other).body.timestamp).toBe(
      '2027-01-02T03:04:05.678Z',
    );
    expect(buildHealthResult({ reachable: false }, other).body.timestamp).toBe(
      '2027-01-02T03:04:05.678Z',
    );
  });
});
