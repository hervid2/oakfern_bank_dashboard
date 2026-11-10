import { prisma } from '@/server/repositories/client';

/**
 * Integration-test database helpers (plan §6, task T-09).
 *
 * Two jobs:
 *
 *   1. **Load the local connection string.** Vitest does not populate
 *      `process.env` from `.env.local` (Vite only exposes `VITE_`-prefixed
 *      values), so the local run loads it with Node 22's `process.loadEnvFile`.
 *      In CI the variable is already in the environment and the file is absent.
 *   2. **Build the NFR-005 two-business fixture**, which is what makes the
 *      AC-001-10 anti-IDOR assertions real rather than a call-shape review.
 *
 * **Why there is no truncate-everything helper.** The seed owns truncation
 * (`prisma/seed/write.ts` clears the per-business tables inside one
 * transaction), and `tests/integration/seed.test.ts` asserts against that
 * seeded workspace. A test helper that truncated would delete the very dataset
 * the sibling file is measuring, and Vitest runs files in parallel. So the
 * fixture instead **adds** two throwaway businesses with unique slugs and
 * removes exactly those at the end, relying on `onDelete: Cascade` from
 * `Business`. Every assertion in both files is scoped by `businessId`, so the
 * two files cannot see each other's rows.
 */
export const loadLocalEnv = (): void => {
  if (!process.env.DATABASE_URL) {
    try {
      process.loadEnvFile('.env.local');
    } catch {
      // Absent in CI, where DATABASE_URL is already exported.
    }
  }
};

export interface FixtureBusiness {
  readonly businessId: string;
  readonly userId: string;
  /** Checking account, carries the external ledger rows. */
  readonly accountAId: string;
  /** Savings account, the destination of the internal transfer. */
  readonly accountBId: string;
  readonly transferId: string;
  readonly postedTransactionId: string;
  readonly pendingTransactionId: string;
  /** Σ of the `posted` rows on `accountAId`, in signed integer cents. */
  readonly accountACurrentBalanceCents: number;
}

const createFixtureBusiness = async (label: string, nonce: string): Promise<FixtureBusiness> => {
  const businessId = `biz_${label}_${nonce}`;
  const accountAId = `acc_${label}_a_${nonce}`;
  const accountBId = `acc_${label}_b_${nonce}`;
  const transferId = `tfr_${label}_${nonce}`;
  const postedTransactionId = `txn_${label}_posted_${nonce}`;
  const pendingTransactionId = `txn_${label}_pending_${nonce}`;
  const now = new Date('2026-11-10T15:00:00.000Z');

  await prisma.business.create({
    data: {
      id: businessId,
      name: `IDOR fixture ${label}`,
      slug: `idor-fixture-${label}-${nonce}`,
      users: {
        create: {
          id: `usr_${label}_${nonce}`,
          email: `${label}.${nonce}@idor-fixture.example`,
          name: `Fixture ${label}`,
          role: 'admin',
        },
      },
      accounts: {
        create: [
          {
            id: accountAId,
            name: 'Fixture Operating',
            type: 'checking',
            accountNumber: `9${nonce.slice(0, 11)}`,
            routingNumber: '021000021',
            openedAt: now,
          },
          {
            id: accountBId,
            name: 'Fixture Reserve',
            type: 'savings',
            accountNumber: `8${nonce.slice(0, 11)}`,
            routingNumber: '021000021',
            openedAt: now,
          },
        ],
      },
    },
  });

  // Money is signed integer cents throughout (BR-001): +250,000 in, -40,000 out
  // posted; -10,000 pending so `availableBalance < currentBalance` is exercised.
  await prisma.transaction.createMany({
    data: [
      {
        id: postedTransactionId,
        businessId,
        accountId: accountAId,
        amountCents: 250_000,
        status: 'posted',
        method: 'ach',
        postedAt: now,
      },
      {
        id: `txn_${label}_out_${nonce}`,
        businessId,
        accountId: accountAId,
        amountCents: -40_000,
        status: 'posted',
        method: 'card',
        postedAt: now,
      },
      {
        id: pendingTransactionId,
        businessId,
        accountId: accountAId,
        amountCents: -10_000,
        status: 'pending',
        method: 'ach',
        settleAt: new Date(now.getTime() + 86_400_000),
      },
    ],
  });

  // An internal transfer, so the BR-011 leg shape is present in the fixture too.
  await prisma.transfer.create({
    data: {
      id: transferId,
      businessId,
      sourceAccountId: accountAId,
      destinationAccountId: accountBId,
      amountCents: 30_000,
      idempotencyKey: `idem_${label}_${nonce}`,
      legs: {
        create: [
          {
            id: `txn_${label}_leg_out_${nonce}`,
            businessId,
            accountId: accountAId,
            amountCents: -30_000,
            status: 'posted',
            method: 'internal',
            postedAt: now,
          },
          {
            id: `txn_${label}_leg_in_${nonce}`,
            businessId,
            accountId: accountBId,
            amountCents: 30_000,
            status: 'posted',
            method: 'internal',
            postedAt: now,
          },
        ],
      },
    },
  });

  return {
    businessId,
    userId: `usr_${label}_${nonce}`,
    accountAId,
    accountBId,
    transferId,
    postedTransactionId,
    pendingTransactionId,
    accountACurrentBalanceCents: 250_000 - 40_000 - 30_000,
  };
};

export interface TwoBusinessFixture {
  readonly a: FixtureBusiness;
  readonly b: FixtureBusiness;
}

/** Create two independent workspaces with identical shapes (AC-001-10). */
export const createTwoBusinessFixture = async (): Promise<TwoBusinessFixture> => {
  const nonce = Math.random().toString(36).slice(2, 14).padEnd(12, '0');

  return {
    a: await createFixtureBusiness('a', nonce),
    b: await createFixtureBusiness('b', nonce),
  };
};

/** Remove only the fixture's own businesses; `onDelete: Cascade` does the rest. */
export const destroyTwoBusinessFixture = async (fixture: TwoBusinessFixture): Promise<void> => {
  await prisma.business.deleteMany({
    where: { id: { in: [fixture.a.businessId, fixture.b.businessId] } },
  });
};
