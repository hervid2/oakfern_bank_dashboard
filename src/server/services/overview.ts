import {
  averageClosedMonthBurn,
  flowTotals,
  runwayOf,
  type BurnAverage,
  type FlowTotals,
  type Runway,
  type TransactionMethod,
} from '@/server/domain/metrics';
import { closedMonthsBefore, lastNDaysRange } from '@/server/domain/time';
import {
  listPendingPayments,
  listPostedFlowRows,
  listRecentTransactions,
  type RecentTransactionRow,
} from '@/server/repositories/transactions';
import { getAccountBalances, type AccountWithBalances } from '@/server/services/accounts';

/**
 * FR-007…FR-012 — the **one** read Home performs, and the NFR-011 boundary for
 * every later view (plan 002 §5).
 *
 * Two properties make this the single source rather than one of several:
 *
 *   1. Total cash and the per-account figures both come out of the existing
 *      `getAccountBalances`. Nothing here re-derives a balance, so FR-007's
 *      total and FR-009's cards cannot disagree — AC-002-01 is a property of
 *      the code, not a convention.
 *   2. `now` is a **parameter**. The page adapter reads the clock once and
 *      injects it; this service and the domain below it never call `new Date()`,
 *      which is what makes every BR-009 / BR-008 edge case a unit test.
 *
 * Feature 003 reuses `getAccountBalances` and `RecentTransactionView`. If it
 * needs a filtered or paginated list it adds a *repository* method — never a
 * second balance derivation.
 */

/** How many rows FR-012 asks for, at minimum. */
const RECENT_LIMIT = 8;

/** How many closed months BR-008 averages the burn over. */
const BURN_MONTHS = 3;

export interface RecentTransactionView {
  readonly id: string;
  readonly amountCents: number;
  readonly status: 'pending' | 'posted' | 'canceled' | 'failed';
  readonly method: TransactionMethod;
  /** Counterparty name, or an internal-transfer label — never empty. */
  readonly label: string;
  readonly categoryLabel: string | null;
  /** BR-011: internal legs are shown in lists and excluded from metrics. */
  readonly isInternal: boolean;
  /** `postedAt ?? createdAt` — the ET date the row is sorted and rendered by (ASM-002-01). */
  readonly effectiveAt: Date;
  /** Only meaningful while `status === 'pending'`: "Expected <ET date>" (ASM-002-02). */
  readonly settleAt: Date | null;
}

export interface OverviewData {
  /** FR-007, from `getAccountBalances`. */
  readonly totalCashCents: number;
  /** FR-009, from `getAccountBalances`. */
  readonly accounts: readonly AccountWithBalances[];
  /** FR-008, over the trailing 30 ET days, internal legs excluded. */
  readonly last30Days: FlowTotals;
  /** FR-010 / BR-008, over the closed months that exist. */
  readonly burn: BurnAverage;
  readonly runway: Runway;
  /** FR-012 plus the FR-011 pending rows folded in (cut L-2). */
  readonly recentTransactions: readonly RecentTransactionView[];
}

const toView = (row: RecentTransactionRow): RecentTransactionView => {
  const isInternal = row.method === 'internal';

  return {
    id: row.id,
    amountCents: row.amountCents,
    status: row.status,
    method: row.method,
    label: row.counterpartyName ?? (isInternal ? 'Internal transfer' : (row.memo ?? 'Transaction')),
    categoryLabel: row.categoryLabel,
    isInternal,
    effectiveAt: row.postedAt ?? row.createdAt,
    settleAt: row.settleAt,
  };
};

/**
 * Cut ladder **L-2**: there is no pending panel, so the recent list is the union
 * of the recent rows and **every** pending payment, deduplicated by `id` and
 * sorted by effective ET date descending. The list is therefore `>= 8` rows and
 * always contains the pending ones (AC-002-21, AC-002-23).
 */
const mergeRecent = (
  recent: readonly RecentTransactionRow[],
  pending: readonly RecentTransactionRow[],
): RecentTransactionView[] => {
  const byId = new Map<string, RecentTransactionView>();

  for (const row of [...recent, ...pending]) {
    byId.set(row.id, toView(row));
  }

  return [...byId.values()].sort((a, b) => b.effectiveAt.getTime() - a.effectiveAt.getTime());
};

export const getOverview = async (businessId: string, now: Date): Promise<OverviewData> => {
  const window30 = lastNDaysRange(now, 30);
  const months = closedMonthsBefore(now, BURN_MONTHS);
  // One indexed read spanning the three closed months, partitioned per month by
  // the domain. `closedMonthsBefore` always returns `BURN_MONTHS` ranges.
  const monthsSpan = { start: months[0].start, end: months[months.length - 1].end };

  const [balances, windowRows, monthRows, recent, pending] = await Promise.all([
    getAccountBalances(businessId),
    listPostedFlowRows(businessId, window30),
    listPostedFlowRows(businessId, monthsSpan),
    listRecentTransactions(businessId, RECENT_LIMIT),
    listPendingPayments(businessId),
  ]);

  const burn = averageClosedMonthBurn(monthRows, months);

  return {
    totalCashCents: balances.totalCurrentBalanceCents,
    accounts: balances.accounts,
    last30Days: flowTotals(windowRows, window30),
    burn,
    runway: runwayOf(balances.totalCurrentBalanceCents, burn.avgBurnCents),
    recentTransactions: mergeRecent(recent, pending),
  };
};
