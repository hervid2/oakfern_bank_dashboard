import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { lastNDaysRange } from '@/server/domain/time';
import { prisma } from '@/server/repositories/client';
import {
  listPendingPayments,
  listPostedFlowRows,
  listRecentTransactions,
} from '@/server/repositories/transactions';
import { getAccountBalances } from '@/server/services/accounts';
import { getOverview } from '@/server/services/overview';

import {
  createTwoBusinessFixture,
  destroyTwoBusinessFixture,
  loadLocalEnv,
  type TwoBusinessFixture,
} from '../helpers/db';

/**
 * Feature 002 — `getOverview` against a **real** PostgreSQL (plan §7).
 *
 * What can only be proven here rather than in a unit test: that the figures the
 * page renders come from the seeded ledger, that the total is literally
 * `getAccountBalances`' own total (NFR-011), that every pending payment survives
 * the L-2 merge, that an empty business returns zeros instead of throwing, and
 * that none of the three new repository reads can be talked into returning
 * another business's rows (NFR-005).
 *
 * The seeded workspace is read, never written. The anti-IDOR case uses the 001
 * two-business fixture, which adds and removes its own throwaway workspaces, so
 * this file and `seed.test.ts` cannot see each other's rows.
 */

let fixture: TwoBusinessFixture;
let demoBusinessId: string;

beforeAll(async () => {
  loadLocalEnv();

  const business = await prisma.business.findFirst({
    where: { slug: { not: { startsWith: 'idor-fixture-' } } },
    select: { id: true },
  });

  if (business === null) {
    throw new Error('no seeded business found — run `pnpm db:seed` first');
  }

  demoBusinessId = business.id;
  fixture = await createTwoBusinessFixture();
});

afterAll(async () => {
  await destroyTwoBusinessFixture(fixture);
  await prisma.$disconnect();
});

describe('getOverview against the seeded workspace', () => {
  it('AC-002-01: total cash is `getAccountBalances`’ own total, not a second derivation', async () => {
    const [overview, balances] = await Promise.all([
      getOverview(demoBusinessId, new Date()),
      getAccountBalances(demoBusinessId),
    ]);

    expect(overview.totalCashCents).toBe(balances.totalCurrentBalanceCents);
    expect(Number.isInteger(overview.totalCashCents)).toBe(true);
    expect(overview.accounts).toHaveLength(balances.accounts.length);
    expect(overview.accounts.map((account) => account.id)).toEqual(
      balances.accounts.map((account) => account.id),
    );
  });

  it('AC-002-17: the seeded runway is a number of months inside the seed self-check’s own 14.0–24.0 range', async () => {
    const overview = await getOverview(demoBusinessId, new Date());

    expect(overview.runway.kind).toBe('months');

    if (overview.runway.kind !== 'months') {
      throw new Error('the seeded workspace must burn cash');
    }

    expect(overview.runway.months).toBeGreaterThanOrEqual(14);
    expect(overview.runway.months).toBeLessThanOrEqual(24);
    expect(Number.isFinite(overview.runway.months)).toBe(true);

    // One decimal place, rounded once at the end (BR-008).
    expect(overview.runway.months).toBe(Math.round(overview.runway.months * 10) / 10);

    // And the burn it rests on is a positive integer number of cents.
    expect(Number.isInteger(overview.burn.avgBurnCents)).toBe(true);
    expect(overview.burn.avgBurnCents).toBeGreaterThan(0);
    expect(overview.burn.monthsUsed).toBe(3);
  });

  it('AC-002-08: the 30-day flows are integer cents and exclude every internal leg (BR-011)', async () => {
    const now = new Date();
    const overview = await getOverview(demoBusinessId, now);
    const rows = await listPostedFlowRows(demoBusinessId, lastNDaysRange(now, 30));

    expect(Number.isInteger(overview.last30Days.inflowCents)).toBe(true);
    expect(Number.isInteger(overview.last30Days.outflowCents)).toBe(true);
    expect(overview.last30Days.inflowCents).toBeGreaterThanOrEqual(0);
    expect(overview.last30Days.outflowCents).toBeGreaterThanOrEqual(0);

    const internalMagnitude = rows
      .filter((row) => row.method === 'internal')
      .reduce((total, row) => total + Math.abs(row.amountCents), 0);

    // The seed writes internal pairs, so this guard is live rather than vacuous.
    expect(internalMagnitude).toBeGreaterThan(0);

    const externalInflow = rows
      .filter((row) => row.method !== 'internal' && row.amountCents > 0)
      .reduce((total, row) => total + row.amountCents, 0);

    expect(overview.last30Days.inflowCents).toBe(externalInflow);
  });

  it('AC-002-21: every pending payment appears in the recent list with a counterparty and a settleAt (cut L-2)', async () => {
    const overview = await getOverview(demoBusinessId, new Date());
    const pending = await listPendingPayments(demoBusinessId);

    expect(pending.length).toBeGreaterThan(0);

    for (const payment of pending) {
      const row = overview.recentTransactions.find((candidate) => candidate.id === payment.id);

      expect(row, `pending payment ${payment.id} is missing from the recent list`).toBeDefined();
      expect(row?.status).toBe('pending');
      expect(row?.settleAt).toBeInstanceOf(Date);
      expect(row?.label.length).toBeGreaterThan(0);
      expect(row?.amountCents).toBeLessThan(0);
    }
  });

  it('AC-002-23: the recent list holds at least 8 rows, deduplicated, newest first by effective ET date', async () => {
    const overview = await getOverview(demoBusinessId, new Date());
    const rows = overview.recentTransactions;

    expect(rows.length).toBeGreaterThanOrEqual(8);
    expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length);

    for (let index = 1; index < rows.length; index += 1) {
      expect(rows[index - 1].effectiveAt.getTime()).toBeGreaterThanOrEqual(
        rows[index].effectiveAt.getTime(),
      );
    }

    // The newest 8 of the ledger are all present, so the merge never drops rows.
    const newest = await listRecentTransactions(demoBusinessId, 8);
    const ids = new Set(rows.map((row) => row.id));

    for (const row of newest) {
      expect(ids.has(row.id)).toBe(true);
    }
  });

  it('AC-002-23: the 8-row window is the newest of the ledger by effective ET date, not an artefact of NULL ordering', async () => {
    // Regression guard for the NULLS-FIRST defect: `ORDER BY postedAt DESC`
    // sorts null-`postedAt` rows (every non-`posted` status) ahead of every
    // posted row in PostgreSQL, so the window used to be filled with stale
    // canceled/failed rows whatever their age. The contract this asserts is
    // ASM-002-01's sort key — `postedAt ?? createdAt`, descending — computed
    // here in TypeScript over the whole ledger and compared with what the
    // repository returns.
    const ledger = await prisma.transaction.findMany({
      where: { businessId: demoBusinessId },
      select: { id: true, postedAt: true, createdAt: true },
    });

    const effectiveOf = (row: { postedAt: Date | null; createdAt: Date }): number =>
      (row.postedAt ?? row.createdAt).getTime();

    const byEffective = [...ledger].sort((a, b) => effectiveOf(b) - effectiveOf(a));

    expect(byEffective.length).toBeGreaterThan(8);

    const cutoff = effectiveOf(byEffective[7]);
    const window = await listRecentTransactions(demoBusinessId, 8);

    expect(window).toHaveLength(8);

    // No row in the window may be older than the 8th-newest ledger row.
    for (const row of window) {
      expect(effectiveOf(row)).toBeGreaterThanOrEqual(cutoff);
    }

    // The newest ledger row cannot be missing from it, and the window itself
    // already arrives newest-first out of the database.
    expect(window.map((row) => row.id)).toContain(byEffective[0].id);

    for (let index = 1; index < window.length; index += 1) {
      expect(effectiveOf(window[index - 1])).toBeGreaterThanOrEqual(effectiveOf(window[index]));
    }
  });
});

describe('internal transfer legs in the recent list (BR-011)', () => {
  it('AC-002-25: an internal leg is shown, flagged and labelled — BR-011 excludes it from metrics, not from lists', async () => {
    const overview = await getOverview(fixture.a.businessId, new Date('2026-11-10T17:00:00.000Z'));
    const internal = overview.recentTransactions.filter((row) => row.isInternal);

    // The 001 fixture writes one internal pair, so both legs must surface.
    expect(internal).toHaveLength(2);

    for (const leg of internal) {
      expect(leg.method).toBe('internal');
      expect(leg.label).toBe('Internal transfer');
      // BR-011: an internal leg is never categorised.
      expect(leg.categoryLabel).toBeNull();
    }

    // And they are excluded from the metrics over the same period.
    const window = lastNDaysRange(new Date('2026-11-10T17:00:00.000Z'), 30);
    const rows = await listPostedFlowRows(fixture.a.businessId, window);

    expect(rows.filter((row) => row.method === 'internal')).toHaveLength(2);
    expect(overview.last30Days).toEqual({ inflowCents: 250_000, outflowCents: 40_000 });
  });
});

describe('getOverview on an empty workspace', () => {
  it('AC-002-27: a business with no accounts and no transactions returns zeros and the cash-flow-positive branch', async () => {
    const empty = await prisma.business.create({
      data: { name: 'Empty overview fixture', slug: `empty-overview-${Date.now()}` },
      select: { id: true },
    });

    try {
      const overview = await getOverview(empty.id, new Date());

      expect(overview.totalCashCents).toBe(0);
      expect(overview.accounts).toEqual([]);
      expect(overview.last30Days).toEqual({ inflowCents: 0, outflowCents: 0 });
      expect(overview.burn).toEqual({ avgBurnCents: 0, monthsUsed: 3 });
      expect(overview.runway).toEqual({ kind: 'cash-flow-positive' });
      expect(overview.recentTransactions).toEqual([]);
    } finally {
      await prisma.business.delete({ where: { id: empty.id } });
    }
  });
});

describe('anti-IDOR on the three new reads (NFR-005)', () => {
  it('AC-002-29: listPostedFlowRows never returns another business’ rows', async () => {
    const range = {
      start: new Date('2026-01-01T00:00:00.000Z'),
      end: new Date('2027-01-01T00:00:00.000Z'),
    };

    const forA = await listPostedFlowRows(fixture.a.businessId, range);
    const forB = await listPostedFlowRows(fixture.b.businessId, range);

    // Both fixtures are written with identical shapes, so equal counts prove
    // scoping rather than coincidence.
    expect(forA.length).toBeGreaterThan(0);
    expect(forA.length).toBe(forB.length);

    const scopedIds = new Set(
      (
        await prisma.transaction.findMany({
          where: { businessId: fixture.a.businessId },
          select: { id: true },
        })
      ).map((row) => row.id),
    );

    expect(scopedIds.size).toBeGreaterThan(0);
    expect(forA).toHaveLength(
      (
        await prisma.transaction.findMany({
          where: {
            businessId: fixture.a.businessId,
            status: 'posted',
            postedAt: { gte: range.start, lt: range.end },
          },
          select: { id: true },
        })
      ).length,
    );
  });

  it('AC-002-29: listRecentTransactions and listPendingPayments are scoped to the caller’s business', async () => {
    const recentA = await listRecentTransactions(fixture.a.businessId, 50);
    const pendingA = await listPendingPayments(fixture.a.businessId);

    const bIds = new Set(
      (
        await prisma.transaction.findMany({
          where: { businessId: fixture.b.businessId },
          select: { id: true },
        })
      ).map((row) => row.id),
    );

    expect(bIds.has(fixture.b.pendingTransactionId)).toBe(true);
    expect(recentA.length).toBeGreaterThan(0);
    expect(pendingA.length).toBeGreaterThan(0);

    for (const row of [...recentA, ...pendingA]) {
      expect(bIds.has(row.id)).toBe(false);
    }

    expect(pendingA.map((row) => row.id)).toContain(fixture.a.pendingTransactionId);
  });

  it('AC-002-29: getOverview for business A reports only A’ own cash', async () => {
    const overview = await getOverview(fixture.a.businessId, new Date('2026-11-10T17:00:00.000Z'));

    expect(overview.accounts).toHaveLength(2);
    expect(overview.accounts.map((account) => account.id).sort()).toEqual(
      [fixture.a.accountAId, fixture.a.accountBId].sort(),
    );
    expect(overview.totalCashCents).toBe(250_000 - 40_000);
  });
});
