import { prisma } from './client';

/**
 * Account reads (plan §2.3).
 *
 * NFR-005: `businessId` is the first parameter and goes straight into the
 * `where`. There is no unscoped account read anywhere in the repository layer.
 *
 * Note what is **not** selected: there is no balance column to select (BR-002).
 * Balances come from `services/accounts.getAccountBalances`, which derives them
 * from the ledger through the domain.
 */

export interface AccountRow {
  readonly id: string;
  readonly name: string;
  readonly type: 'checking' | 'savings' | 'treasury';
  readonly accountNumber: string;
  readonly routingNumber: string;
  readonly currency: string;
  readonly openedAt: Date;
}

export const listAccounts = async (businessId: string): Promise<AccountRow[]> =>
  prisma.account.findMany({
    where: { businessId },
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      type: true,
      accountNumber: true,
      routingNumber: true,
      currency: true,
      openedAt: true,
    },
  });

/** Scoped single read: used by 002+ to reject an account id from another workspace (spec §4 E-4). */
export const findAccountById = async (
  businessId: string,
  accountId: string,
): Promise<AccountRow | null> =>
  prisma.account.findFirst({
    where: { businessId, id: accountId },
    select: {
      id: true,
      name: true,
      type: true,
      accountNumber: true,
      routingNumber: true,
      currency: true,
      openedAt: true,
    },
  });
