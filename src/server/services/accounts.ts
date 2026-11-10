import { computeBalances, type BalanceRow } from '@/server/domain/balances';
import { sumCents } from '@/server/domain/money';
import { listAccounts, type AccountRow } from '@/server/repositories/accounts';
import { listBalanceRows } from '@/server/repositories/transactions';

/**
 * The **single source of truth for a balance** (NFR-011, plan §2.4).
 *
 * FR-007's total cash and FR-009's per-account figures are the same numbers
 * derived once here, never recomputed in a component or a second service. That
 * is the whole point: two places deriving a balance is two places that can
 * disagree, which is the BR-002 defect class.
 *
 * It costs two scoped queries and one pass through the domain — no balance
 * column, nothing cached, nothing to invalidate.
 */

export interface AccountWithBalances extends AccountRow {
  readonly currentBalanceCents: number;
  readonly availableBalanceCents: number;
}

export interface AccountBalances {
  readonly accounts: readonly AccountWithBalances[];
  /** Σ of every account's `currentBalanceCents` — the FR-007 figure. */
  readonly totalCurrentBalanceCents: number;
  readonly totalAvailableBalanceCents: number;
}

export const getAccountBalances = async (businessId: string): Promise<AccountBalances> => {
  const [accounts, ledger] = await Promise.all([
    listAccounts(businessId),
    listBalanceRows(businessId),
  ]);

  const rowsByAccount = new Map<string, BalanceRow[]>();

  for (const row of ledger) {
    const existing = rowsByAccount.get(row.accountId);
    const balanceRow: BalanceRow = { amountCents: row.amountCents, status: row.status };

    if (existing === undefined) {
      rowsByAccount.set(row.accountId, [balanceRow]);
    } else {
      existing.push(balanceRow);
    }
  }

  const withBalances: AccountWithBalances[] = accounts.map((account) => ({
    ...account,
    ...computeBalances(rowsByAccount.get(account.id) ?? []),
  }));

  return {
    accounts: withBalances,
    totalCurrentBalanceCents: sumCents(withBalances.map((a) => a.currentBalanceCents)),
    totalAvailableBalanceCents: sumCents(withBalances.map((a) => a.availableBalanceCents)),
  };
};
