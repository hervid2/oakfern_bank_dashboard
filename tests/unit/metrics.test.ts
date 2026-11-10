import { describe, expect, it } from 'vitest';

import {
  averageClosedMonthBurn,
  flowTotals,
  isMetricRow,
  netBurnCents,
  runwayOf,
  type FlowRow,
} from '@/server/domain/metrics';
import { closedMonthsBefore, dayKeyOf, lastNDaysRange } from '@/server/domain/time';

/**
 * FR-008 / FR-010 — the money mathematics of the overview, tested before it was
 * written (spec 002 §7, plan §7).
 *
 * Every example here comes from a business rule rather than from the
 * implementation: BR-009 (half-open ET day ranges), BR-011 (internal legs are
 * not metrics), BR-008 (net burn over **closed** months, runway in months).
 * `now` is always a literal, so DST and the month boundary are ordinary
 * assertions instead of clock mocking.
 */

const row = (
  amountCents: number,
  postedAt: string,
  method: FlowRow['method'] = 'ach',
  status: FlowRow['status'] = 'posted',
): FlowRow => ({ amountCents, method, status, postedAt: new Date(postedAt) });

/** 2026-11-10 12:00 ET — the spec's reference `now`. */
const NOW = new Date('2026-11-10T17:00:00.000Z');

describe('flow totals (FR-008)', () => {
  it('AC-002-06: the 30-day window is half-open and covers exactly 30 ET days including today', () => {
    const range = lastNDaysRange(NOW, 30);

    // 30 ET days ending today: 2026-10-12 .. 2026-11-10 inclusive.
    expect(dayKeyOf(range.start)).toBe('2026-10-12');
    expect(dayKeyOf(new Date(range.end.getTime() - 1))).toBe('2026-11-10');

    // Half-open: `end` is the first instant of tomorrow, so it is excluded.
    expect(dayKeyOf(range.end)).toBe('2026-11-11');

    const first = row(1_000, '2026-10-12T04:00:00.000Z'); // 2026-10-12 00:00 ET
    const last = row(2_000, '2026-11-11T04:59:00.000Z'); // 2026-11-10 23:59 ET
    const tooEarly = row(4_000, '2026-10-12T03:59:00.000Z'); // 2026-10-11 23:59 ET
    const tooLate = row(8_000, '2026-11-11T05:00:00.000Z'); // 2026-11-11 00:00 ET

    expect(flowTotals([first, last, tooEarly, tooLate], range)).toEqual({
      inflowCents: 3_000,
      outflowCents: 0,
    });
  });

  it('AC-002-07: only posted rows contribute; inflow sums the positives, outflow the magnitudes of the negatives', () => {
    const range = lastNDaysRange(NOW, 30);
    const rows = [
      row(500_000, '2026-11-02T15:00:00.000Z'),
      row(-120_000, '2026-11-03T15:00:00.000Z'),
      row(900_000, '2026-11-04T15:00:00.000Z', 'wire', 'pending'),
      row(-900_000, '2026-11-05T15:00:00.000Z', 'card', 'canceled'),
      row(-700_000, '2026-11-06T15:00:00.000Z', 'ach', 'failed'),
    ];

    expect(flowTotals(rows, range)).toEqual({ inflowCents: 500_000, outflowCents: 120_000 });
  });

  it('AC-002-08: an internal transfer pair leaves money in and money out unchanged (BR-011)', () => {
    const range = lastNDaysRange(NOW, 30);
    const external = [
      row(800_000, '2026-11-02T15:00:00.000Z'),
      row(-300_000, '2026-11-03T15:00:00.000Z'),
    ];
    const internalPair = [
      row(-5_000_000, '2026-11-04T15:00:00.000Z', 'internal'),
      row(5_000_000, '2026-11-04T15:00:00.000Z', 'internal'),
    ];

    expect(flowTotals([...external, ...internalPair], range)).toEqual(flowTotals(external, range));
    expect(isMetricRow(internalPair[0])).toBe(false);
    expect(isMetricRow(external[0])).toBe(true);
  });

  it('AC-002-09: a row at 2026-11-01T03:30:00Z belongs to October 31 ET, never to November 1', () => {
    const boundary = row(-250_000, '2026-11-01T03:30:00.000Z');

    expect(dayKeyOf(boundary.postedAt)).toBe('2026-10-31');

    // And therefore it lands in the **October** closed month, not November.
    const [, , october] = closedMonthsBefore(NOW, 3);
    expect(flowTotals([boundary], october)).toEqual({ inflowCents: 0, outflowCents: 250_000 });

    // A `now` of 2026-11-01 ET still sees it inside the trailing 30-day window.
    const window = lastNDaysRange(new Date('2026-11-01T17:00:00.000Z'), 30);
    expect(flowTotals([boundary], window)).toEqual({ inflowCents: 0, outflowCents: 250_000 });
  });

  it('netBurnCents is outflow minus inflow, and is negative when the month is profitable', () => {
    expect(netBurnCents({ inflowCents: 100_000, outflowCents: 350_000 })).toBe(250_000);
    expect(netBurnCents({ inflowCents: 900_000, outflowCents: 350_000 })).toBe(-550_000);
  });
});

describe('net burn and runway (FR-010, BR-008)', () => {
  it('AC-002-11: burns of 10000000, 11000000 and 9000000 average to 10000000 and give 12.0 months on 120000000 cash', () => {
    const months = closedMonthsBefore(NOW, 3);
    const rows = [
      row(-9_000_000, '2026-08-15T15:00:00.000Z'),
      row(-1_000_000, '2026-08-20T15:00:00.000Z'),
      row(-11_000_000, '2026-09-15T15:00:00.000Z'),
      row(-9_000_000, '2026-10-15T15:00:00.000Z'),
    ];

    const average = averageClosedMonthBurn(rows, months);
    expect(average).toEqual({ avgBurnCents: 10_000_000, monthsUsed: 3 });

    expect(runwayOf(120_000_000, average.avgBurnCents)).toEqual({ kind: 'months', months: 12 });
  });

  it('AC-002-12: three profitable closed months yield the cash-flow-positive branch, never Infinity or NaN', () => {
    const months = closedMonthsBefore(NOW, 3);
    const rows = [
      row(5_000_000, '2026-08-15T15:00:00.000Z'),
      row(2_000_000, '2026-09-15T15:00:00.000Z'),
      row(3_000_000, '2026-10-15T15:00:00.000Z'),
    ];

    const average = averageClosedMonthBurn(rows, months);
    expect(average.avgBurnCents).toBe(-3_333_333);

    const runway = runwayOf(120_000_000, average.avgBurnCents);
    expect(runway).toEqual({ kind: 'cash-flow-positive' });

    // Break-even takes the same branch, so division by zero is unreachable.
    expect(runwayOf(120_000_000, 0)).toEqual({ kind: 'cash-flow-positive' });
  });

  it('AC-002-13: for a November `now` the closed months are August, September and October 2026, and a November row changes nothing', () => {
    const months = closedMonthsBefore(NOW, 3);

    expect(months.map((month) => dayKeyOf(month.start))).toEqual([
      '2026-08-01',
      '2026-09-01',
      '2026-10-01',
    ]);
    expect(dayKeyOf(new Date(months[2].end.getTime() - 1))).toBe('2026-10-31');

    const closed = [
      row(-3_000_000, '2026-08-15T15:00:00.000Z'),
      row(-3_000_000, '2026-09-15T15:00:00.000Z'),
      row(-3_000_000, '2026-10-15T15:00:00.000Z'),
    ];
    const withNovember = [...closed, row(-99_000_000, '2026-11-05T15:00:00.000Z')];

    expect(averageClosedMonthBurn(withNovember, months)).toEqual(
      averageClosedMonthBurn(closed, months),
    );
    expect(runwayOf(90_000_000, averageClosedMonthBurn(withNovember, months).avgBurnCents)).toEqual(
      { kind: 'months', months: 30 },
    );
  });

  it('AC-002-14: an empty closed month contributes a 0 term rather than being skipped', () => {
    const months = closedMonthsBefore(NOW, 3);
    const rows = [
      // August: nothing at all.
      // September: net burn 0 (in and out cancel).
      row(1_000_000, '2026-09-10T15:00:00.000Z'),
      row(-1_000_000, '2026-09-11T15:00:00.000Z'),
      // October: 3,000,000 burned.
      row(-3_000_000, '2026-10-15T15:00:00.000Z'),
    ];

    expect(averageClosedMonthBurn(rows, months)).toEqual({
      avgBurnCents: 1_000_000,
      monthsUsed: 3,
    });
  });

  it('AC-002-15: an internal transfer pair inside a month leaves its net burn unchanged (BR-011)', () => {
    const months = closedMonthsBefore(NOW, 3);
    const rows = [
      row(-2_000_000, '2026-08-15T15:00:00.000Z'),
      row(-2_000_000, '2026-09-15T15:00:00.000Z'),
      row(-2_000_000, '2026-10-15T15:00:00.000Z'),
    ];
    const pair = [
      row(-5_000_000, '2026-10-20T15:00:00.000Z', 'internal'),
      row(5_000_000, '2026-10-20T15:00:00.000Z', 'internal'),
    ];

    expect(flowTotals([...rows, ...pair], months[2])).toEqual(flowTotals(rows, months[2]));
    expect(averageClosedMonthBurn([...rows, ...pair], months)).toEqual(
      averageClosedMonthBurn(rows, months),
    );
  });

  it('AC-002-16: with fewer than 3 closed months the average uses the months that exist and reports how many', () => {
    const months = closedMonthsBefore(NOW, 2);
    const rows = [
      row(-4_000_000, '2026-09-15T15:00:00.000Z'),
      row(-2_000_000, '2026-10-15T15:00:00.000Z'),
    ];

    expect(averageClosedMonthBurn(rows, months)).toEqual({
      avgBurnCents: 3_000_000,
      monthsUsed: 2,
    });

    // No closed month at all is a brand-new workspace, not a crash.
    expect(averageClosedMonthBurn(rows, [])).toEqual({ avgBurnCents: 0, monthsUsed: 0 });
    expect(runwayOf(0, 0)).toEqual({ kind: 'cash-flow-positive' });
  });

  it('rounds the month count to one decimal exactly once, at the end', () => {
    // 100,000,000 / 7,000,000 = 14.2857… → 14.3, and never 14.285714285714286.
    expect(runwayOf(100_000_000, 7_000_000)).toEqual({ kind: 'months', months: 14.3 });
  });
});
