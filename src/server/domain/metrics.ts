import type { TransactionStatus } from './balances';
import { sumCents } from './money';
import type { Range } from './time';

/**
 * FR-008 / FR-010 — the overview's money mathematics, as pure TypeScript.
 *
 * ADR-0001: no Prisma, no Next, no `new Date()`. Every range is handed in by the
 * caller, which is what turns BR-009's DST and month-boundary cases into
 * ordinary unit tests (`tests/unit/metrics.test.ts`).
 *
 * Three rules are encoded here rather than remembered:
 *
 *   1. **BR-011** — a leg of an internal transfer moves money between the
 *      business's own accounts, so it is not inflow, not outflow and not burn.
 *      It is still a *transaction* and still appears in lists; it is simply not
 *      a metric.
 *   2. **BR-009** — membership of a window is `start <= postedAt < end`,
 *      half-open, so an instant falls in exactly one bucket even on the
 *      25-hour autumn DST day.
 *   3. **BR-008** — burn is averaged over **closed** months only, every month
 *      is a term (an empty one contributes 0, it is not skipped), and the
 *      division that turns cash into months is rounded **once**, at the end.
 */
export type TransactionMethod = 'ach' | 'wire' | 'card' | 'internal' | 'check' | 'fee' | 'interest';

/**
 * What a repository hands over for a metric. `postedAt` is non-nullable by
 * construction: the repository filters `status: 'posted'` and maps the column at
 * that boundary, so the domain never sees `Date | null`.
 *
 * `status` is carried even though the repository already filters on it. The
 * filter is the first line of defence and this check is the second; it also
 * makes AC-002-07 provable at the unit level instead of only against a database.
 */
export interface FlowRow {
  readonly amountCents: number;
  readonly method: TransactionMethod;
  readonly status: TransactionStatus;
  readonly postedAt: Date;
}

export interface FlowTotals {
  /** Σ of the positive amounts. */
  readonly inflowCents: number;
  /** Σ of the **magnitudes** of the negative amounts, so it is positive. */
  readonly outflowCents: number;
}

export interface BurnAverage {
  readonly avgBurnCents: number;
  /** How many closed months the average is based on — surfaced, not hidden (AC-002-16). */
  readonly monthsUsed: number;
}

export type Runway =
  { readonly kind: 'cash-flow-positive' } | { readonly kind: 'months'; readonly months: number };

/** BR-011: internal legs and non-posted rows are never metrics. */
export const isMetricRow = (row: FlowRow): boolean =>
  row.method !== 'internal' && row.status === 'posted';

/** BR-009, half-open. */
const inWindow = (row: FlowRow, range: Range): boolean =>
  row.postedAt >= range.start && row.postedAt < range.end;

export const flowTotals = (rows: readonly FlowRow[], range: Range): FlowTotals => {
  const inflows: number[] = [];
  const outflows: number[] = [];

  for (const row of rows) {
    if (!isMetricRow(row) || !inWindow(row, range)) {
      continue;
    }

    if (row.amountCents > 0) {
      inflows.push(row.amountCents);
    } else if (row.amountCents < 0) {
      outflows.push(-row.amountCents);
    }
  }

  return { inflowCents: sumCents(inflows), outflowCents: sumCents(outflows) };
};

/** BR-008: burn is what left minus what arrived. Negative means profitable. */
export const netBurnCents = (totals: FlowTotals): number =>
  totals.outflowCents - totals.inflowCents;

/**
 * BR-008 — the mean net burn across the given closed months. Every month is a
 * term, including one with no transactions at all: skipping it would flatter the
 * average of a company that spent nothing in August.
 */
export const averageClosedMonthBurn = (
  rows: readonly FlowRow[],
  months: readonly Range[],
): BurnAverage => {
  if (months.length === 0) {
    return { avgBurnCents: 0, monthsUsed: 0 };
  }

  let total = 0;

  for (const month of months) {
    total += netBurnCents(flowTotals(rows, month));
  }

  return { avgBurnCents: Math.round(total / months.length), monthsUsed: months.length };
};

/**
 * BR-008 — how many months the cash lasts at the average burn.
 *
 * The return type is a discriminated union on purpose: `Infinity`, `NaN` and a
 * negative month count are **not representable**. `avgBurnCents <= 0` covers
 * both "profitable" and "exactly break-even", so the division is unreachable
 * when the divisor is zero (AC-002-12).
 *
 * The quotient is a ratio of two integer cent values — a dimensionless number of
 * months, not money — which is the one place in this codebase a non-integer is
 * legitimate. `assertSafeCents` deliberately does not apply to it, and the
 * rounding to one decimal happens here, once, at the very end.
 */
export const runwayOf = (totalCashCents: number, avgBurnCents: number): Runway =>
  avgBurnCents <= 0
    ? { kind: 'cash-flow-positive' }
    : { kind: 'months', months: Math.round((totalCashCents / avgBurnCents) * 10) / 10 };
