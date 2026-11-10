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

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
