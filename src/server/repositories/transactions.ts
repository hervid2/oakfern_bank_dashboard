import type { FlowRow, TransactionMethod } from '@/server/domain/metrics';
import type { Range } from '@/server/domain/time';

import { prisma } from './client';

/**
 * Transaction reads (plan §2.3).
 *
 * NFR-005: `businessId` first, always in the `where`. The optional `accountId`
 * is an *additional* filter, never a replacement — narrowing by account must not
 * widen access across businesses, which is the classic IDOR shape this signature
 * is designed to make impossible.
 */

export interface BalanceLedgerRow {
  readonly accountId: string;
  readonly amountCents: number;
  readonly status: 'pending' | 'posted' | 'canceled' | 'failed';
}

/**
 * The minimum the BR-002 derivation needs: three columns over the whole ledger.
 * Deliberately narrow — `select` keeps 1,365 rows cheap, and NFR-002's
 * `(businessId, accountId, postedAt)` index covers the filter.
 */
export const listBalanceRows = async (
  businessId: string,
  accountId?: string,
): Promise<BalanceLedgerRow[]> =>
  prisma.transaction.findMany({
    where: { businessId, ...(accountId === undefined ? {} : { accountId }) },
    select: { accountId: true, amountCents: true, status: true },
  });

/** Row count for a workspace. Used by the integration tests and by 003's pagination. */
export const countTransactions = async (businessId: string, accountId?: string): Promise<number> =>
  prisma.transaction.count({
    where: { businessId, ...(accountId === undefined ? {} : { accountId }) },
  });

/* ------------------------------------------------------------------------- *
 * Feature 002 — overview reads (plan 002 §4).
 *
 * All three take `businessId` first and put it in the `where` (NFR-005,
 * AC-002-29), select narrowly, and use indexes 001's migration already created.
 * No schema change and no migration in this feature.
 * ------------------------------------------------------------------------- */

/**
 * Posted rows inside a half-open ET range, shaped for `domain/metrics.ts`.
 *
 * The `status: 'posted'` filter guarantees `postedAt` is non-null, so the
 * mapping below hands the domain a non-nullable `Date`: `FlowRow` never sees
 * `Date | null` and the domain needs no null branch (plan §4).
 */
export const listPostedFlowRows = async (businessId: string, range: Range): Promise<FlowRow[]> => {
  const rows = await prisma.transaction.findMany({
    where: { businessId, status: 'posted', postedAt: { gte: range.start, lt: range.end } },
    select: { amountCents: true, method: true, status: true, postedAt: true },
  });

  return rows.map((row) => ({
    amountCents: row.amountCents,
    method: row.method,
    status: row.status,
    // Non-null by the `status: 'posted'` filter; the `??` is the type-level
    // proof of that, not a behaviour we expect to reach.
    postedAt: row.postedAt ?? range.start,
  }));
};

/** A ledger row as the overview and (later) the transactions list need it. */
export interface RecentTransactionRow {
  readonly id: string;
  readonly amountCents: number;
  readonly status: 'pending' | 'posted' | 'canceled' | 'failed';
  readonly method: TransactionMethod;
  readonly memo: string | null;
  readonly createdAt: Date;
  readonly settleAt: Date | null;
  readonly postedAt: Date | null;
  readonly transferId: string | null;
  readonly counterpartyName: string | null;
  readonly categoryLabel: string | null;
}

const recentSelect = {
  id: true,
  amountCents: true,
  status: true,
  method: true,
  memo: true,
  createdAt: true,
  settleAt: true,
  postedAt: true,
  transferId: true,
  counterparty: { select: { name: true } },
  category: { select: { label: true } },
} as const;

interface SelectedRecentRow {
  readonly id: string;
  readonly amountCents: number;
  readonly status: 'pending' | 'posted' | 'canceled' | 'failed';
  readonly method: TransactionMethod;
  readonly memo: string | null;
  readonly createdAt: Date;
  readonly settleAt: Date | null;
  readonly postedAt: Date | null;
  readonly transferId: string | null;
  readonly counterparty: { readonly name: string } | null;
  readonly category: { readonly label: string } | null;
}

const toRecentRow = (row: SelectedRecentRow): RecentTransactionRow => ({
  id: row.id,
  amountCents: row.amountCents,
  status: row.status,
  method: row.method,
  memo: row.memo,
  createdAt: row.createdAt,
  settleAt: row.settleAt,
  postedAt: row.postedAt,
  transferId: row.transferId,
  counterpartyName: row.counterparty?.name ?? null,
  categoryLabel: row.category?.label ?? null,
});

/**
 * The newest `limit` rows of the ledger, **every status**, newest first
 * (ASM-002-01). `postedAt` is nullable — a `pending` row has none — so
 * `createdAt` is the tie-break here and the service re-sorts on the effective ET
 * date after merging in the pending reads.
 */
export const listRecentTransactions = async (
  businessId: string,
  limit: number,
): Promise<RecentTransactionRow[]> => {
  const rows = await prisma.transaction.findMany({
    where: { businessId },
    orderBy: [{ postedAt: 'desc' }, { createdAt: 'desc' }],
    take: limit,
    select: recentSelect,
  });

  return rows.map(toRecentRow);
};

/**
 * Every pending external payment, soonest expected first (FR-011, BR-004).
 *
 * Cut ladder L-2 removed the *panel*, not the data: this dedicated read is what
 * makes AC-002-21 deterministic, because a burst of posted rows could otherwise
 * push a pending payment past the 8-row recent window.
 */
export const listPendingPayments = async (businessId: string): Promise<RecentTransactionRow[]> => {
  const rows = await prisma.transaction.findMany({
    where: { businessId, status: 'pending', method: { in: ['ach', 'wire'] } },
    orderBy: { settleAt: 'asc' },
    select: recentSelect,
  });

  return rows.map(toRecentRow);
};
