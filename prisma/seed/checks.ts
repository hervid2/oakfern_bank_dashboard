import {
  assertBalanceInvariant,
  computeBalances,
  type BalanceRow,
  type TransactionStatus,
} from '../../src/server/domain/balances';
import { MAX_SAFE_CENTS, sumCents } from '../../src/server/domain/money';
import { closedMonthsBefore, lastNDaysRange, monthKeyOf } from '../../src/server/domain/time';

import type { SeedMethod } from './catalog';

/**
 * The seed's analytics and its four self-checks (spec §4 E-8, AC-001-05,
 * AC-001-06, AC-001-08, and the BR-001 `int4` bound).
 *
 * Two properties make this module worth isolating:
 *
 *   1. **It is pure.** Every function takes rows and `now` and returns a value
 *      or throws. `generate.ts` calls `averageNetBurnCents` *before* anything is
 *      written, because the opening capital is sized from it; `seed.ts` calls the
 *      assertions *after* writing, against rows read back out of PostgreSQL. The
 *      same code therefore answers "what will the ledger say" and "what does the
 *      database actually say".
 *   2. **It reuses the app's own `computeBalances`.** AC-001-05 is only
 *      meaningful if the seed checks the balances with the function the UI will
 *      use, not with a second implementation that could agree by accident.
 */

/** The minimal row shape the cash-flow analytics need. */
export interface FlowRow {
  readonly amountCents: number;
  readonly status: TransactionStatus;
  readonly method: SeedMethod;
  readonly postedAt: Date | null;
}

/** `FlowRow` plus the account, for the per-account BR-002 invariant. */
export interface LedgerRow extends FlowRow {
  readonly accountId: string;
  readonly categoryId: string | null;
  readonly counterpartyId: string | null;
  readonly transferId: string | null;
}

const isSettled = (row: FlowRow): boolean => row.status === 'posted' && row.postedAt !== null;

const withinRange = (instant: Date, start: Date, end: Date): boolean =>
  instant.getTime() >= start.getTime() && instant.getTime() < end.getTime();

/** BR-011: internal legs never count towards a cash-flow metric. */
const isExternal = (row: FlowRow): boolean => row.method !== 'internal';

export interface MonthNet {
  readonly monthKey: string;
  readonly netCents: number;
}

/**
 * Net posted external cash flow per **closed** ET month, oldest first. The
 * current partial month is excluded on purpose: averaging over a half-finished
 * month understates burn (AC-001-08).
 */
export const netByClosedMonth = (rows: readonly FlowRow[], now: Date, months: number): MonthNet[] =>
  closedMonthsBefore(now, months).map(({ start, end }) => ({
    monthKey: monthKeyOf(start),
    netCents: sumCents(
      rows
        .filter(
          (row) =>
            isSettled(row) && isExternal(row) && withinRange(row.postedAt as Date, start, end),
        )
        .map((row) => row.amountCents),
    ),
  }));

/**
 * Average **net burn** over the last `months` closed ET months, in cents.
 * Positive means the business is burning cash, which is the sign convention
 * FR-010 and AC-001-08 are written in.
 */
export const averageNetBurnCents = (
  rows: readonly FlowRow[],
  now: Date,
  months: number,
): number => {
  const nets = netByClosedMonth(rows, now, months);

  if (nets.length === 0) {
    return 0;
  }

  return Math.round(-sumCents(nets.map((net) => net.netCents)) / nets.length);
};

export interface MoneyFlow {
  readonly inCents: number;
  readonly outCents: number;
}

/** Money in / money out over the last `days` ET days. `outCents` is positive. */
export const moneyFlowOverDays = (
  rows: readonly FlowRow[],
  now: Date,
  days: number,
  options: { readonly includeInternal: boolean },
): MoneyFlow => {
  const { start, end } = lastNDaysRange(now, days);
  const inWindow = rows.filter(
    (row) =>
      isSettled(row) &&
      (options.includeInternal || isExternal(row)) &&
      withinRange(row.postedAt as Date, start, end),
  );

  return {
    inCents: sumCents(inWindow.filter((row) => row.amountCents > 0).map((row) => row.amountCents)),
    outCents: -sumCents(
      inWindow.filter((row) => row.amountCents < 0).map((row) => row.amountCents),
    ),
  };
};

/** Σ posted across every account — the FR-007 total cash figure. */
export const totalCashCents = (rows: readonly FlowRow[]): number =>
  sumCents(rows.filter(isSettled).map((row) => row.amountCents));

/**
 * `totalCash / avgBurn`, to one decimal. `null` when the business is cash-flow
 * positive, which FR-010 renders as words rather than as `Infinity`.
 */
export const runwayMonths = (totalCents: number, avgNetBurnCents: number): number | null => {
  if (avgNetBurnCents <= 0) {
    return null;
  }

  return Math.round((totalCents / avgNetBurnCents) * 10) / 10;
};

/** Thrown by every self-check, so `seed.ts` can report the reason and exit 1. */
export class SeedCheckError extends Error {
  readonly check: string;

  constructor(check: string, message: string) {
    super(`${check}: ${message}`);
    this.name = 'SeedCheckError';
    this.check = check;
  }
}

/**
 * Self-check 1 — BR-002 per account, computed with the app's own
 * `computeBalances` over the rows read back from PostgreSQL (AC-001-05).
 */
export interface AccountBalanceSummary {
  readonly accountId: string;
  readonly currentBalanceCents: number;
  readonly availableBalanceCents: number;
}

export const checkBalanceInvariant = (
  rows: readonly LedgerRow[],
  accountIds: readonly string[],
): AccountBalanceSummary[] =>
  accountIds.map((accountId) => {
    const accountRows: BalanceRow[] = rows
      .filter((row) => row.accountId === accountId)
      .map((row) => ({ amountCents: row.amountCents, status: row.status }));

    const balances = computeBalances(accountRows);

    try {
      assertBalanceInvariant(accountId, balances);
    } catch (error) {
      throw new SeedCheckError(
        'BR-002 balance invariant',
        error instanceof Error ? error.message : String(error),
      );
    }

    // The AC asks for the equality explicitly, not just for the invariant: a
    // bug that dropped rows from both sides would satisfy the invariant alone.
    const recomputedCurrent = sumCents(
      accountRows.filter((row) => row.status === 'posted').map((row) => row.amountCents),
    );

    if (recomputedCurrent !== balances.currentBalanceCents) {
      throw new SeedCheckError(
        'BR-002 balance invariant',
        `account ${accountId} current balance ${balances.currentBalanceCents} does not equal the recomputed posted sum ${recomputedCurrent}`,
      );
    }

    return {
      accountId,
      currentBalanceCents: balances.currentBalanceCents,
      availableBalanceCents: balances.availableBalanceCents,
    };
  });

/** Self-check 2 — BR-011 internal-leg shape (AC-001-06). */
export const checkInternalLegShape = (
  rows: readonly LedgerRow[],
  transferIds: readonly string[],
): void => {
  for (const row of rows) {
    if (row.method !== 'internal') {
      continue;
    }

    if (row.transferId === null) {
      throw new SeedCheckError('BR-011 internal legs', 'an internal leg has no transferId');
    }

    if (row.categoryId !== null || row.counterpartyId !== null) {
      throw new SeedCheckError(
        'BR-011 internal legs',
        `internal leg of transfer ${row.transferId} is categorised or has a counterparty`,
      );
    }
  }

  for (const transferId of transferIds) {
    const legs = rows.filter((row) => row.transferId === transferId);

    if (legs.length !== 2) {
      throw new SeedCheckError(
        'BR-011 internal legs',
        `transfer ${transferId} has ${legs.length} legs, expected exactly 2`,
      );
    }

    const net = sumCents(legs.map((leg) => leg.amountCents));

    if (net !== 0) {
      throw new SeedCheckError(
        'BR-011 internal legs',
        `the legs of transfer ${transferId} sum to ${net}, expected 0`,
      );
    }
  }

  // AC-001-06's "the exclusion is observable" half is asserted by the caller,
  // which has `now`; see `checkInternalExclusionIsObservable`.
};

/**
 * Self-check 2b — the exclusion is not vacuous: there is a recent internal
 * transfer, so 002's BR-011 filter changes the 30-day money-out figure
 * (AC-001-06).
 */
export const checkInternalExclusionIsObservable = (
  rows: readonly FlowRow[],
  now: Date,
): { readonly excludingCents: number; readonly includingCents: number } => {
  const excluding = moneyFlowOverDays(rows, now, 30, { includeInternal: false });
  const including = moneyFlowOverDays(rows, now, 30, { includeInternal: true });

  if (!(excluding.outCents < including.outCents)) {
    throw new SeedCheckError(
      'BR-011 exclusion is observable',
      `30-day money out excluding internal legs (${excluding.outCents}) is not strictly less than including them (${including.outCents}); the seed contains no internal transfer in the last 30 ET days, so 002's exclusion could pass vacuously`,
    );
  }

  return { excludingCents: excluding.outCents, includingCents: including.outCents };
};

/** Self-check 3 — every money value is a safe integer inside PostgreSQL `int4` (BR-001). */
export const checkInt4Range = (values: readonly { label: string; value: number }[]): void => {
  for (const { label, value } of values) {
    if (!Number.isInteger(value)) {
      throw new SeedCheckError(
        'BR-001 int4 range',
        `${label} is ${value}, which is not an integer`,
      );
    }

    if (Math.abs(value) > MAX_SAFE_CENTS) {
      throw new SeedCheckError(
        'BR-001 int4 range',
        `${label} is ${value}, outside PostgreSQL int4 (+/- ${MAX_SAFE_CENTS})`,
      );
    }
  }
};

/** Self-check 4 — the runway lands in the FR-036 band (AC-001-08). */
export const RUNWAY_MIN_MONTHS = 14;
export const RUNWAY_MAX_MONTHS = 24;

export const checkRunway = (totalCents: number, avgNetBurnCents: number): number => {
  if (avgNetBurnCents <= 0) {
    throw new SeedCheckError(
      'FR-036 runway',
      `average net burn over the last 3 closed ET months is ${avgNetBurnCents}, which is not positive; the seeded business is cash-flow positive and has no runway figure to show`,
    );
  }

  const months = runwayMonths(totalCents, avgNetBurnCents);

  if (months === null || months < RUNWAY_MIN_MONTHS || months > RUNWAY_MAX_MONTHS) {
    throw new SeedCheckError(
      'FR-036 runway',
      `runway is ${months} months, outside the required ${RUNWAY_MIN_MONTHS}–${RUNWAY_MAX_MONTHS} band`,
    );
  }

  return months;
};

/** Self-check 5 — the FR-036 / AC-001-04 volumes. */
export interface VolumeCounts {
  readonly businesses: number;
  readonly users: number;
  readonly accounts: number;
  readonly cards: number;
  readonly categories: number;
  readonly counterparties: number;
  readonly transactions: number;
  readonly transfers: number;
  readonly pendingExternalOutflows: number;
  readonly ledgerSpanDays: number;
}

const expectRange = (label: string, value: number, min: number, max: number): void => {
  if (value < min || value > max) {
    throw new SeedCheckError(
      'FR-036 volumes',
      `${label} is ${value}, outside the required ${min}–${max}`,
    );
  }
};

export const checkVolumes = (counts: VolumeCounts): void => {
  expectRange('Business rows', counts.businesses, 1, 1);
  expectRange('User rows', counts.users, 1, 1);
  expectRange('Account rows', counts.accounts, 4, 4);
  expectRange('Card rows', counts.cards, 5, 5);
  expectRange('Category rows', counts.categories, 14, 14);
  expectRange('Counterparty rows', counts.counterparties, 55, 65);
  expectRange('Transaction rows', counts.transactions, 1_200, 1_800);
  expectRange('Transfer rows', counts.transfers, 6, Number.MAX_SAFE_INTEGER);
  expectRange('pending external outflows', counts.pendingExternalOutflows, 2, 4);
  expectRange('ledger span in days', counts.ledgerSpanDays, 360, Number.MAX_SAFE_INTEGER);
};
