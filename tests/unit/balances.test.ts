import { describe, expect, it } from 'vitest';

import { assertBalanceInvariant, computeBalances } from '@/server/domain/balances';
import type { BalanceRow } from '@/server/domain/balances';

/**
 * BR-002 — balance definitions and invariant:
 *
 *   currentBalance   = Σ { amountCents | status = 'posted' }
 *   availableBalance = currentBalance − Σ { |amountCents| | pending ∧ amount < 0 }
 *
 * The three spec §5 BR-002 examples are transcribed below, including the two
 * edge cases: a pending **inflow** is invisible to both balances, and an empty
 * account is `0 / 0` rather than blank or NaN.
 */
const row = (amountCents: number, status: BalanceRow['status']): BalanceRow => ({
  amountCents,
  status,
});

describe('computeBalances', () => {
  it('AC-001-05: derives both balances from the ledger', () => {
    const balances = computeBalances([
      row(500_000, 'posted'),
      row(-120_000, 'posted'),
      row(-80_000, 'pending'),
    ]);

    expect(balances).toEqual({ currentBalanceCents: 380_000, availableBalanceCents: 300_000 });
  });

  it('AC-001-05: a pending inflow is invisible to both balances', () => {
    const balances = computeBalances([row(500_000, 'posted'), row(900_000, 'pending')]);

    expect(balances).toEqual({ currentBalanceCents: 500_000, availableBalanceCents: 500_000 });
  });

  it('AC-001-05: an account with no transactions is zero, not blank or NaN', () => {
    expect(computeBalances([])).toEqual({ currentBalanceCents: 0, availableBalanceCents: 0 });
  });

  it('AC-001-05: canceled and failed rows never move a balance', () => {
    const balances = computeBalances([
      row(500_000, 'posted'),
      row(-999_999, 'canceled'),
      row(-999_999, 'failed'),
    ]);

    expect(balances).toEqual({ currentBalanceCents: 500_000, availableBalanceCents: 500_000 });
  });

  it('AC-001-05: availableBalance never exceeds currentBalance', () => {
    const balances = computeBalances([
      row(100_000, 'posted'),
      row(-1, 'pending'),
      row(50_000, 'pending'),
    ]);

    expect(balances.availableBalanceCents).toBeLessThanOrEqual(balances.currentBalanceCents);
    expect(balances.availableBalanceCents).toBe(99_999);
  });
});

describe('assertBalanceInvariant', () => {
  it('AC-001-05: accepts a balance pair that satisfies BR-002', () => {
    expect(() =>
      assertBalanceInvariant('acc_1', {
        currentBalanceCents: 380_000,
        availableBalanceCents: 300_000,
      }),
    ).not.toThrow();
  });

  it('AC-001-05: rejects a negative balance and names the account', () => {
    expect(() =>
      assertBalanceInvariant('acc_1', { currentBalanceCents: -1, availableBalanceCents: -1 }),
    ).toThrow(/acc_1/);
  });

  it('AC-001-05: rejects available above current', () => {
    expect(() =>
      assertBalanceInvariant('acc_2', { currentBalanceCents: 100, availableBalanceCents: 101 }),
    ).toThrow(/BALANCE_INVARIANT/);
  });
});
