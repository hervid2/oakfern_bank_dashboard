import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * AC-001-22 — regression test for the measured production defect reported in
 * `specs/000-walking-skeleton/validation.md` §6 item 1.
 *
 * The exported `prisma` is a lazy `Proxy`. Before the fix, its `get` trap
 * called the factory on **every** property access and the memo was only written
 * to `globalThis` when `NODE_ENV !== 'production'`, so a production process
 * built a fresh `PrismaClient` + `pg` pool per access and never closed it
 * (client backends 1 → 27 over 26 requests).
 *
 * These tests count real constructions through a mocked client module, which is
 * why they would catch the regression if the module-level memo were removed.
 */
const mocks = vi.hoisted(() => ({
  clientConstructions: 0,
  adapterConstructions: 0,
}));

vi.mock('@prisma/adapter-pg', () => ({
  PrismaPg: class {
    constructor(public readonly options: { connectionString: string }) {
      mocks.adapterConstructions += 1;
    }
  },
}));

vi.mock('@/generated/prisma/client', () => ({
  PrismaClient: class {
    public readonly instanceId: number;

    constructor(public readonly options: unknown) {
      mocks.clientConstructions += 1;
      this.instanceId = mocks.clientConstructions;
    }

    $queryRaw(): Promise<unknown[]> {
      return Promise.resolve([]);
    }
  },
}));

interface ProbeClient {
  instanceId: number;
  $queryRaw: () => Promise<unknown[]>;
}

const PROPERTY_ACCESS_COUNT = 20;

const globalForPrisma = globalThis as unknown as { prisma?: unknown };

const loadClientModule = async () => {
  const clientModule = await import('@/server/repositories/client');

  return clientModule.prisma as unknown as ProbeClient;
};

beforeEach(() => {
  mocks.clientConstructions = 0;
  mocks.adapterConstructions = 0;
  delete globalForPrisma.prisma;
  vi.resetModules();
  vi.stubEnv('DATABASE_URL', 'postgresql://user:password@localhost:5433/oakfern?schema=public');
});

afterEach(() => {
  vi.unstubAllEnvs();
  delete globalForPrisma.prisma;
});

describe('prisma client singleton', () => {
  it('AC-001-22: constructs the client once across repeated property access in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');

    const prisma = await loadClientModule();

    const seenInstanceIds = new Set<number>();

    for (let index = 0; index < PROPERTY_ACCESS_COUNT; index += 1) {
      seenInstanceIds.add(prisma.instanceId);
      void prisma.$queryRaw;
    }

    expect(mocks.clientConstructions).toBe(1);
    expect(mocks.adapterConstructions).toBe(1);
    expect([...seenInstanceIds]).toEqual([1]);
  });

  it('AC-001-22: two property accesses resolve to the same underlying instance', async () => {
    vi.stubEnv('NODE_ENV', 'production');

    const prisma = await loadClientModule();

    expect(prisma.instanceId).toBe(prisma.instanceId);
    expect(mocks.clientConstructions).toBe(1);
  });

  it('AC-001-22: keeps the globalThis memo for dev hot-reload only', async () => {
    vi.stubEnv('NODE_ENV', 'development');

    const prisma = await loadClientModule();

    expect(prisma.instanceId).toBe(1);
    expect(globalForPrisma.prisma).toBeDefined();
    expect(mocks.clientConstructions).toBe(1);

    // A hot reload re-evaluates the module but must reuse the pooled client.
    vi.resetModules();
    const reloaded = await loadClientModule();

    expect(reloaded.instanceId).toBe(1);
    expect(mocks.clientConstructions).toBe(1);
  });

  it('AC-001-22: does not write the globalThis memo in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');

    const prisma = await loadClientModule();

    expect(prisma.instanceId).toBe(1);
    expect(globalForPrisma.prisma).toBeUndefined();
  });
});
