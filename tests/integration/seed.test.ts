import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { computeBalances, assertBalanceInvariant } from '@/server/domain/balances';
import { MAX_SAFE_CENTS, sumCents } from '@/server/domain/money';
import { dayKeyOf, lastNDaysRange, startOfBusinessDay } from '@/server/domain/time';
import { prisma } from '@/server/repositories/client';
import { getAccountBalances } from '@/server/services/accounts';

import { BUSINESS, DEMO_USER } from '../../prisma/seed/catalog';
import {
  checkInternalExclusionIsObservable,
  checkInternalLegShape,
  checkVolumes,
  moneyFlowOverDays,
  type LedgerRow,
} from '../../prisma/seed/checks';
import { loadLocalEnv } from '../helpers/db';

/**
 * The seeded dataset, re-proved in CI against the **real** database
 * (AC-001-02, AC-001-03 partial, AC-001-04, AC-001-05, AC-001-06).
 *
 * The point of this file is that the seed's own self-checks run on rows the seed
 * just built in memory, whereas these assertions run on rows read **back out of
 * PostgreSQL**. If a column type, an enum mapping or a nullable FK silently
 * changed the data on the way in, the seed would still exit 0 and this file
 * would be red. It deliberately reuses the same pure helpers from
 * `prisma/seed/checks.ts`: AC-001-05 and AC-001-06 are only meaningful if the
 * database is measured with the functions the application itself uses, not with
 * a second implementation that could agree by accident.
 *
 * **Why `now` is anchored to the ledger rather than to the clock.** The seed's
 * `runDay` is ET midnight of the day it ran. Anchoring the 30-day window to
 * `new Date()` would make this file quietly start failing the day *after* a
 * seed, which is a brittle test rather than a strict one. The anchor is instead
 * the ET start of the last day the ledger has posted activity, so BR-009
 * bucketing is still computed in `America/New_York` over real stored instants.
 */

interface DbLedgerRow extends LedgerRow {
  readonly id: string;
  readonly settleAt: Date | null;
}

let businessId: string;
let rows: DbLedgerRow[];
let accountIds: string[];
let transferIds: string[];
/** ET start of the most recent day with posted activity. */
let anchor: Date;

beforeAll(async () => {
  loadLocalEnv();

  const business = await prisma.business.findUnique({
    where: { slug: BUSINESS.slug },
    select: { id: true },
  });

  if (business === null) {
    throw new Error(
      `the demo workspace '${BUSINESS.slug}' is absent: run \`pnpm db:seed\` before \`pnpm test:int\``,
    );
  }

  businessId = business.id;

  const [transactions, accounts, transfers] = await Promise.all([
    prisma.transaction.findMany({
      where: { businessId },
      select: {
        id: true,
        accountId: true,
        amountCents: true,
        status: true,
        method: true,
        postedAt: true,
        settleAt: true,
        categoryId: true,
        counterpartyId: true,
        transferId: true,
      },
    }),
    prisma.account.findMany({ where: { businessId }, select: { id: true } }),
    prisma.transfer.findMany({ where: { businessId }, select: { id: true, amountCents: true } }),
  ]);

  rows = transactions;
  accountIds = accounts.map((account) => account.id);
  transferIds = transfers.map((transfer) => transfer.id);

  const lastPosted = rows
    .map((row) => row.postedAt)
    .filter((postedAt): postedAt is Date => postedAt !== null)
    .reduce((latest, postedAt) => (postedAt > latest ? postedAt : latest), new Date(0));

  anchor = startOfBusinessDay(lastPosted);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('the seeded demo dataset (integration)', () => {
  it('AC-001-04: the seeded volumes match FR-036, read back from the database', async () => {
    const [users, cards, categories, counterparties, admins] = await Promise.all([
      prisma.user.count({ where: { businessId } }),
      prisma.card.count({ where: { businessId } }),
      prisma.category.count(),
      prisma.counterparty.count({ where: { businessId } }),
      prisma.user.count({ where: { businessId, role: 'admin', passwordHash: null } }),
    ]);

    const postedDays = rows
      .map((row) => row.postedAt)
      .filter((postedAt): postedAt is Date => postedAt !== null)
      .map((postedAt) => postedAt.getTime());
    const ledgerSpanDays = Math.round(
      (Math.max(...postedDays) - Math.min(...postedDays)) / 86_400_000,
    );

    const pendingExternalOutflows = rows.filter(
      (row) =>
        row.status === 'pending' &&
        row.amountCents < 0 &&
        (row.method === 'ach' || row.method === 'wire') &&
        row.postedAt === null &&
        row.settleAt !== null &&
        row.settleAt.getTime() > anchor.getTime(),
    );

    // The same thresholds the seed enforces, applied to what PostgreSQL holds.
    expect(() =>
      checkVolumes({
        businesses: 1,
        users,
        accounts: accountIds.length,
        cards,
        categories,
        counterparties,
        transactions: rows.length,
        transfers: transferIds.length,
        pendingExternalOutflows: pendingExternalOutflows.length,
        ledgerSpanDays,
      }),
    ).not.toThrow();

    // The AC names these explicitly, so they are asserted explicitly too.
    expect(users).toBe(1);
    expect(admins).toBe(1);
    expect(accountIds).toHaveLength(4);
    expect(cards).toBe(5);
    expect(categories).toBe(14);
    expect(counterparties).toBeGreaterThanOrEqual(55);
    expect(counterparties).toBeLessThanOrEqual(65);
    expect(rows.length).toBeGreaterThanOrEqual(1_200);
    expect(rows.length).toBeLessThanOrEqual(1_800);
    expect(transferIds.length).toBeGreaterThanOrEqual(6);
    expect(ledgerSpanDays).toBeGreaterThanOrEqual(360);
    expect(pendingExternalOutflows.length).toBeGreaterThanOrEqual(2);
    expect(pendingExternalOutflows.length).toBeLessThanOrEqual(4);

    const demo = await prisma.user.findUnique({
      where: { email: DEMO_USER.email },
      select: { businessId: true, role: true, passwordHash: true },
    });

    expect(demo).toEqual({ businessId, role: 'admin', passwordHash: null });
  });

  it('AC-001-02: every stored money value is a safe signed integer, never a float', async () => {
    const transfers = await prisma.transfer.findMany({
      where: { businessId },
      select: { amountCents: true },
    });
    const cards = await prisma.card.findMany({
      where: { businessId },
      select: { monthlyLimitCents: true },
    });

    const values = [
      ...rows.map((row) => row.amountCents),
      ...transfers.map((transfer) => transfer.amountCents),
      ...cards
        .map((card) => card.monthlyLimitCents)
        .filter((limit): limit is number => limit !== null),
    ];

    expect(values.length).toBeGreaterThan(1_200);

    for (const value of values) {
      expect(typeof value).toBe('number');
      expect(Number.isInteger(value)).toBe(true);
      expect(Math.abs(value)).toBeLessThanOrEqual(MAX_SAFE_CENTS);
    }

    // `Transfer.amountCents` is the positive magnitude; the legs carry the signs.
    expect(transfers.every((transfer) => transfer.amountCents > 0)).toBe(true);
  });

  it('AC-001-05: every seeded account satisfies the BR-002 invariant', () => {
    expect(accountIds.length).toBeGreaterThan(0);

    for (const accountId of accountIds) {
      const accountRows = rows
        .filter((row) => row.accountId === accountId)
        .map((row) => ({ amountCents: row.amountCents, status: row.status }));

      expect(accountRows.length).toBeGreaterThan(0);

      const balances = computeBalances(accountRows);

      expect(() => assertBalanceInvariant(accountId, balances)).not.toThrow();

      // The AC asks for the equality itself, not only for the invariant: a bug
      // dropping rows from both sides would satisfy the invariant alone.
      const recomputedPosted = sumCents(
        accountRows.filter((row) => row.status === 'posted').map((row) => row.amountCents),
      );
      const held = -sumCents(
        accountRows
          .filter((row) => row.status === 'pending' && row.amountCents < 0)
          .map((row) => row.amountCents),
      );

      expect(balances.currentBalanceCents).toBe(recomputedPosted);
      expect(balances.availableBalanceCents).toBe(recomputedPosted - held);
      expect(balances.availableBalanceCents).toBeLessThanOrEqual(balances.currentBalanceCents);
      expect(balances.currentBalanceCents).toBeGreaterThanOrEqual(0);
      expect(balances.availableBalanceCents).toBeGreaterThanOrEqual(0);
    }
  });

  it('AC-001-05: getAccountBalances is the single source of truth and agrees with the ledger (NFR-011)', async () => {
    const result = await getAccountBalances(businessId);

    expect(result.accounts).toHaveLength(4);

    for (const account of result.accounts) {
      const expected = computeBalances(
        rows
          .filter((row) => row.accountId === account.id)
          .map((row) => ({ amountCents: row.amountCents, status: row.status })),
      );

      expect(account.currentBalanceCents).toBe(expected.currentBalanceCents);
      expect(account.availableBalanceCents).toBe(expected.availableBalanceCents);
    }

    expect(result.totalCurrentBalanceCents).toBe(
      sumCents(result.accounts.map((account) => account.currentBalanceCents)),
    );
  });

  it('AC-001-06: every internal leg has the BR-011 shape and each transfer’s legs sum to zero', () => {
    const internal = rows.filter((row) => row.method === 'internal');

    expect(internal.length).toBeGreaterThan(0);
    expect(transferIds.length).toBeGreaterThanOrEqual(6);
    expect(() => checkInternalLegShape(rows, transferIds)).not.toThrow();

    // Spelled out as well as delegated, so the AC is readable here:
    for (const leg of internal) {
      expect(leg.transferId).not.toBeNull();
      expect(leg.categoryId).toBeNull();
      expect(leg.counterpartyId).toBeNull();
    }

    for (const transferId of transferIds) {
      const legs = rows.filter((row) => row.transferId === transferId);

      expect(legs).toHaveLength(2);
      expect(sumCents(legs.map((leg) => leg.amountCents))).toBe(0);
      expect(legs.every((leg) => leg.method === 'internal')).toBe(true);
    }
  });

  it('AC-001-06: internal transfers are excluded from the 30-day inflow and outflow totals (BR-011)', () => {
    const excluding = moneyFlowOverDays(rows, anchor, 30, { includeInternal: false });
    const including = moneyFlowOverDays(rows, anchor, 30, { includeInternal: true });

    // Strictly less, not merely different: the seed must contain a recent
    // internal transfer, or 002's exclusion filter could pass vacuously.
    expect(excluding.outCents).toBeLessThan(including.outCents);
    expect(excluding.inCents).toBeLessThan(including.inCents);
    expect(() => checkInternalExclusionIsObservable(rows, anchor)).not.toThrow();

    // Both figures are positive magnitudes in integer cents.
    expect(Number.isInteger(excluding.outCents)).toBe(true);
    expect(excluding.outCents).toBeGreaterThan(0);
    expect(excluding.inCents).toBeGreaterThan(0);
  });

  it('AC-001-06: internal transfers cannot appear in spending by category (BR-011)', () => {
    const spendingByCategory = new Map<string, number>();

    for (const row of rows) {
      if (row.status !== 'posted' || row.amountCents >= 0 || row.categoryId === null) {
        continue;
      }

      spendingByCategory.set(
        row.categoryId,
        (spendingByCategory.get(row.categoryId) ?? 0) - row.amountCents,
      );
    }

    expect(spendingByCategory.size).toBeGreaterThan(0);

    // Categorised spending equals external posted outflows exactly: no internal
    // leg can be inside, because an uncategorised row cannot enter a category
    // bucket and every internal leg is uncategorised by construction.
    const externalPostedOutflows = -sumCents(
      rows
        .filter(
          (row) => row.status === 'posted' && row.amountCents < 0 && row.method !== 'internal',
        )
        .map((row) => row.amountCents),
    );
    const categorisedTotal = sumCents([...spendingByCategory.values()]);

    expect(categorisedTotal).toBe(externalPostedOutflows);
    expect(rows.filter((row) => row.method === 'internal' && row.categoryId !== null)).toEqual([]);
  });

  it('AC-001-07: daily buckets are computed in America/New_York over the stored UTC instants (BR-009)', () => {
    const { start, end } = lastNDaysRange(anchor, 30);
    const inWindow = rows.filter(
      (row) =>
        row.postedAt !== null &&
        row.postedAt.getTime() >= start.getTime() &&
        row.postedAt.getTime() < end.getTime(),
    );

    expect(inWindow.length).toBeGreaterThan(0);

    const dayKeys = new Set(inWindow.map((row) => dayKeyOf(row.postedAt as Date)));
    const expectedKeys = new Set(
      Array.from({ length: 30 }, (_, index) => dayKeyOf(startOfBusinessDay(anchor, -index))),
    );

    // 30 means 30, whatever DST did inside the window.
    expect(expectedKeys.size).toBe(30);

    // Every bucketed row lands on one of those 30 ET days — the assertion that
    // would fail if the window were computed in UTC, because the ET day starts
    // at 04:00 or 05:00 UTC depending on DST.
    for (const key of dayKeys) {
      expect(expectedKeys.has(key)).toBe(true);
    }

    // And the ledger as a whole covers at least 12 distinct ET months.
    const monthKeys = new Set(
      rows
        .filter((row) => row.postedAt !== null)
        .map((row) => dayKeyOf(row.postedAt as Date).slice(0, 7)),
    );

    expect(monthKeys.size).toBeGreaterThanOrEqual(12);
  });
});
