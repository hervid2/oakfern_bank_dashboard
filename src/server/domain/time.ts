import { TZDate } from '@date-fns/tz';
import { addDays, addMonths, format, startOfDay, startOfMonth } from 'date-fns';

/**
 * BR-009 — instants are stored UTC; every day and month boundary is computed in
 * the **business** time zone. This is the single module allowed to know that.
 *
 * Two rules make the whole feature testable:
 *   1. `now` is always a parameter. This module never calls `new Date()`, so a
 *      DST example is an ordinary unit test rather than a clock-mocking trick.
 *   2. Every range is half-open `[start, end)`. An instant therefore falls in
 *      exactly one bucket — including on the 25-hour autumn DST day, where
 *      01:30 local happens twice.
 *
 * `TZDate` carries the zone with the value, so `date-fns` arithmetic lands on
 * local midnight rather than on UTC midnight, and the result converts back to a
 * plain UTC `Date` for the database.
 */
export const BUSINESS_TIME_ZONE = 'America/New_York';

export interface Range {
  readonly start: Date;
  readonly end: Date;
}

const inBusinessZone = (instant: Date): TZDate => new TZDate(instant, BUSINESS_TIME_ZONE);

const toUtc = (value: TZDate): Date => new Date(value.getTime());

export const startOfBusinessDay = (now: Date, offsetDays = 0): Date =>
  toUtc(startOfDay(addDays(inBusinessZone(now), offsetDays)));

export const startOfBusinessMonth = (now: Date, offsetMonths = 0): Date =>
  toUtc(startOfMonth(addMonths(inBusinessZone(now), offsetMonths)));

/** `'YYYY-MM'` in the business zone. */
export const monthKeyOf = (instant: Date): string => format(inBusinessZone(instant), 'yyyy-MM');

/** `'YYYY-MM-DD'` in the business zone. */
export const dayKeyOf = (instant: Date): string => format(inBusinessZone(instant), 'yyyy-MM-dd');

/**
 * `n` daily buckets **including today**: 30 means 30, never 29 or 31, whatever
 * DST does inside the window (spec §5 BR-009 example 4).
 */
export const lastNDaysRange = (now: Date, n: number): Range => ({
  start: startOfBusinessDay(now, -(n - 1)),
  end: startOfBusinessDay(now, 1),
});

/** `n` ET months back from the start of the current month, up to end of today. */
export const lastNMonthsRange = (now: Date, n: number): Range => ({
  start: startOfBusinessMonth(now, -(n - 1)),
  end: startOfBusinessDay(now, 1),
});

/**
 * The `n` most recent **closed** ET months, oldest first. The current month is
 * excluded on purpose: averaging over a partial month understates burn
 * (FR-036 / AC-001-08 depend on this).
 */
export const closedMonthsBefore = (now: Date, n: number): Range[] => {
  const months: Range[] = [];

  for (let offset = n; offset >= 1; offset -= 1) {
    months.push({
      start: startOfBusinessMonth(now, -offset),
      end: startOfBusinessMonth(now, -(offset - 1)),
    });
  }

  return months;
};
