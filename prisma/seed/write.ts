import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../../src/generated/prisma/client';

import type { SeedDataset } from './generate';

/**
 * The only module in the seed that touches Prisma (ADR-0001 in spirit: the
 * seed is a CLI, not an app layer, but the discipline still holds — generation
 * and checking stay pure and testable without a database).
 *
 * The seed owns its own client rather than reusing
 * `src/server/repositories/client.ts`. Two reasons: that module is memoised for
 * a long-lived server process and deliberately never calls `$disconnect`,
 * whereas a CLI must close its pool and exit; and it resolves through the `@/`
 * alias, which this script does not depend on.
 */
export const createSeedClient = (): PrismaClient => {
  const connectionString = process.env.DIRECT_DATABASE_URL?.trim() || process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      'Neither DIRECT_DATABASE_URL nor DATABASE_URL is set. Copy .env.example to .env.local and fill it in.',
    );
  }

  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
};

/**
 * Replace the demo workspace, atomically.
 *
 * `Category` is **global**, so it is upserted by `key` rather than truncated
 * (ASM-001-02): the rows are referenced by URL and by chart drill-downs, and
 * deleting them would break `onDelete: Restrict` anyway. Everything owned by a
 * business is deleted in dependency order and rewritten.
 */
export const writeDataset = async (prisma: PrismaClient, dataset: SeedDataset): Promise<void> => {
  await prisma.$transaction(
    async (tx) => {
      // Dependency order: legs before transfers, children before parents.
      await tx.transaction.deleteMany({});
      await tx.transfer.deleteMany({});
      await tx.card.deleteMany({});
      await tx.counterparty.deleteMany({});
      await tx.account.deleteMany({});
      await tx.user.deleteMany({});
      await tx.business.deleteMany({});

      for (const category of dataset.categories) {
        await tx.category.upsert({
          where: { key: category.key },
          create: category,
          update: {
            label: category.label,
            direction: category.direction,
            sortOrder: category.sortOrder,
          },
        });
      }

      await tx.business.create({ data: dataset.business });
      await tx.user.create({ data: dataset.user });
      await tx.account.createMany({ data: [...dataset.accounts] });
      await tx.counterparty.createMany({ data: [...dataset.counterparties] });
      await tx.card.createMany({ data: [...dataset.cards] });
      await tx.transfer.createMany({ data: [...dataset.transfers] });
      await tx.transaction.createMany({ data: [...dataset.transactions] });
    },
    { timeout: 120_000, maxWait: 20_000 },
  );
};

/** Everything the self-checks and the content hash need, read back out of PostgreSQL. */
export const readBack = async (prisma: PrismaClient) => {
  const [businesses, users, categories, accounts, counterparties, cards, transfers, transactions] =
    await Promise.all([
      prisma.business.findMany({ orderBy: { id: 'asc' } }),
      prisma.user.findMany({ orderBy: { id: 'asc' } }),
      prisma.category.findMany({ orderBy: { id: 'asc' } }),
      prisma.account.findMany({ orderBy: { id: 'asc' } }),
      prisma.counterparty.findMany({ orderBy: { id: 'asc' } }),
      prisma.card.findMany({ orderBy: { id: 'asc' } }),
      prisma.transfer.findMany({ orderBy: { id: 'asc' } }),
      prisma.transaction.findMany({ orderBy: { id: 'asc' } }),
    ]);

  return {
    businesses,
    users,
    categories,
    accounts,
    counterparties,
    cards,
    transfers,
    transactions,
  };
};
