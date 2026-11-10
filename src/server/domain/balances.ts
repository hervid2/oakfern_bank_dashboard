import { domainError } from './errors';
import { sumCents } from './money';

/**
 * BR-002 — the balance definitions, and the single place they are computed.
 *
 *   currentBalance   = Σ { amountCents | status = 'posted' }
 *   availableBalance = currentBalance − Σ { |amountCents| | pending ∧ amount < 0 }
 *
 * `Account` deliberately has **no balance column** (spec §6.1), so a stored
 * balance cannot drift from the ledger: the defect class BR-002 exists to
 * prevent is not representable. A pending *inflow* is invisible to both
 * balances — money that has not arrived is not spendable and not owned.
 *
 * The status union is declared here rather than imported from the generated
 * Prisma client: ADR-0001 keeps `src/server/domain` free of Prisma.
 */
export type TransactionStatus = 'pending' | 'posted' | 'canceled' | 'failed';

export interface BalanceRow {
  readonly amountCents: number;
  readonly status: TransactionStatus;
}

export interface Balances {
  readonly currentBalanceCents: number;
  readonly availableBalanceCents: number;
}

export const computeBalances = (rows: readonly BalanceRow[]): Balances => {
  const posted: number[] = [];
  const pendingOutflows: number[] = [];

  for (const { amountCents, status } of rows) {
    if (status === 'posted') {
      posted.push(amountCents);
    } else if (status === 'pending' && amountCents < 0) {
      pendingOutflows.push(amountCents);
    }
  }

  const currentBalanceCents = sumCents(posted);
  const heldCents = sumCents(pendingOutflows);

  return {
    currentBalanceCents,
    // `heldCents` is negative, so adding it subtracts the held amount.
    availableBalanceCents: currentBalanceCents + heldCents,
  };
};

/**
 * The invariant the seed asserts before writing and the integration tests
 * re-prove in CI (AC-001-05). The account id is part of the message so a
 * failure names the offending account instead of just failing.
 */
export const assertBalanceInvariant = (accountId: string, balances: Balances): void => {
  const { currentBalanceCents, availableBalanceCents } = balances;

  if (currentBalanceCents < 0 || availableBalanceCents < 0) {
    throw domainError(
      'BALANCE_INVARIANT',
      `account ${accountId} has a negative balance (current ${currentBalanceCents}, available ${availableBalanceCents})`,
    );
  }

  if (availableBalanceCents > currentBalanceCents) {
    throw domainError(
      'BALANCE_INVARIANT',
      `account ${accountId} has available ${availableBalanceCents} above current ${currentBalanceCents}`,
    );
  }
};
