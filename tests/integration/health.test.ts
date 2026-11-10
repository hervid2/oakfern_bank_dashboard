import { existsSync } from 'node:fs';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { prisma } from '@/server/repositories/client';
import { pingDatabase } from '@/server/repositories/health';

/**
 * CL-04 / AC-000-10: the one integration test that stops the CI `integration`
 * job from passing vacuously. It is deliberately *not* mocked — it connects
 * through the **generated** Prisma client (`src/generated/prisma`, reached via
 * the single repository singleton) to the real PostgreSQL of Docker Compose
 * locally and of the service container in CI.
 *
 * What it proves together, which no unit test can: `prisma migrate` applied the
 * migration, `prisma generate` produced a client whose types match that schema,
 * and the connection string actually reaches a live server. If any of the three
 * disagrees, this file is red.
 *
 * Vitest does not populate `process.env` from `.env.local` (Vite only exposes
 * `VITE_`-prefixed values to `import.meta.env`), so the local run loads it with
 * Node 22's `process.loadEnvFile`. In CI the variable is already in the
 * environment, so the file is absent and nothing is loaded.
 */
beforeAll(() => {
  if (!process.env.DATABASE_URL && existsSync('.env.local')) {
    process.loadEnvFile('.env.local');
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('database health (integration)', () => {
  it('AC-000-10: pingDatabase reports the database reachable through the generated client', async () => {
    const result = await pingDatabase();

    expect(result.reachable).toBe(true);

    // Narrowed by the assertion above; keeps `latencyMs` typed without a cast.
    if (!result.reachable) {
      throw new Error('unreachable');
    }

    expect(typeof result.latencyMs).toBe('number');
    expect(Number.isFinite(result.latencyMs)).toBe(true);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('AC-000-10: a typed query on the migrated SkeletonCheck model succeeds, proving migrate + generate + connect agree', async () => {
    const count = await prisma.skeletonCheck.count();

    expect(typeof count).toBe('number');
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
