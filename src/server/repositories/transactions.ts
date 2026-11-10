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
