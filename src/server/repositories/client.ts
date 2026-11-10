import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '@/generated/prisma/client';

/**
 * The single Prisma import site in the repository (ADR-0001, plan.md §4.3).
 * Every other layer goes through a repository, which is why the ESLint
 * `no-restricted-imports` blocks forbid `@prisma/client` and the generated
 * client path everywhere except here.
 *
 * Prisma 7 makes a driver adapter mandatory for a direct database connection
 * (plan.md §7.3), hence `@prisma/adapter-pg`.
 *
 * The `globalThis` guard keeps a single pool across Next.js dev-server hot
 * reloads, which would otherwise exhaust PostgreSQL connections.
 *
 * Construction is **lazy** (see the Proxy below): importing this module must
 * not touch `DATABASE_URL`. Two reasons, both executed facts rather than
 * preferences — (1) the T-06 unit test of the pure `buildHealthResult` mapper
 * imports the service, which imports this repository, and a unit test may not
 * require a database; (2) an eager throw at module evaluation would surface as
 * a 500 HTML page, whereas spec §8.1 freezes *every* failure of `/api/health`
 * as the 503 JSON body. Deferring construction lets `pingDatabase`'s own
 * try/catch own that path.
 */
const createPrismaClient = (): PrismaClient => {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.');
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
};

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Process-local memo. This is the line whose absence was a **measured**
 * production defect (000 validation §6 item 1, AC-001-22): the `globalThis`
 * memo below is only written when `NODE_ENV !== 'production'`, so without this
 * `let` every property access on the Proxy built a new `PrismaClient` and a new
 * `pg` pool and never closed it — client backends grew 1 → 27 over 26 requests.
 * The `globalThis` branch is kept, and only for dev hot-reload.
 */
let client: PrismaClient | undefined;

const getPrismaClient = (): PrismaClient => {
  if (client) {
    return client;
  }

  const existing = globalForPrisma.prisma;

  if (existing) {
    client = existing;

    return client;
  }

  client = createPrismaClient();

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = client;
  }

  return client;
};

/**
 * Behaves exactly like a `PrismaClient`, but the real one is only built on the
 * first property access.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get: (_target, property) => {
    const client = getPrismaClient();
    const value = Reflect.get(client, property) as unknown;

    // Methods are bound to the real client so `this` is never the Proxy.
    return typeof value === 'function' ? value.bind(client) : value;
  },
  has: (_target, property) => Reflect.has(getPrismaClient(), property),
});
