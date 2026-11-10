import { describe, expect, it } from 'vitest';

import {
  BUSINESS_TIME_ZONE,
  closedMonthsBefore,
  dayKeyOf,
  lastNDaysRange,
  lastNMonthsRange,
  monthKeyOf,
  startOfBusinessDay,
  startOfBusinessMonth,
} from '@/server/domain/time';

/**
 * BR-009 — every day/month boundary is computed in `America/New_York`, while
 * the database stores UTC. The four spec §5 BR-009 examples are transcribed
 * below, DST days included: those are precisely where hand-rolled offset
 * arithmetic breaks, which is why `@date-fns/tz` is a dependency.
 *
 * `now` is injected into every function; the module never calls `new Date()`.
 */
const within = (instant: Date, range: { start: Date; end: Date }): boolean =>
  instant.getTime() >= range.start.getTime() && instant.getTime() < range.end.getTime();

describe('business time zone', () => {
  it('AC-001-07: the business zone is America/New_York', () => {
    expect(BUSINESS_TIME_ZONE).toBe('America/New_York');
  });
});

describe('bucket keys', () => {
  it('AC-001-07: 2026-11-01T03:30:00Z buckets into October 2026, not November', () => {
    const instant = new Date('2026-11-01T03:30:00Z'); // 2026-10-31 23:30 ET

    expect(monthKeyOf(instant)).toBe('2026-10');
    expect(dayKeyOf(instant)).toBe('2026-10-31');
  });

  it('AC-001-07: an instant just after ET midnight belongs to the new ET day', () => {
    const instant = new Date('2026-11-01T04:30:00Z'); // 2026-11-01 00:30 ET

    expect(monthKeyOf(instant)).toBe('2026-11');
    expect(dayKeyOf(instant)).toBe('2026-11-01');
  });
});

describe('startOfBusinessDay', () => {
  it('AC-001-07: the 23-hour spring DST day 2026-03-08 ET spans exactly that local day', () => {
    const now = new Date('2026-03-08T18:00:00Z'); // 13:00 ET
    const start = startOfBusinessDay(now);
    const nextStart = startOfBusinessDay(now, 1);

    // EST (-05:00) before the 02:00 jump, EDT (-04:00) after it.
    expect(start.toISOString()).toBe('2026-03-08T05:00:00.000Z');
    expect(nextStart.toISOString()).toBe('2026-03-09T04:00:00.000Z');
    expect((nextStart.getTime() - start.getTime()) / 3_600_000).toBe(23);

    expect(within(new Date('2026-03-08T06:59:00Z'), { start, end: nextStart })).toBe(true);
    expect(within(new Date('2026-03-09T03:59:00Z'), { start, end: nextStart })).toBe(true);
    expect(within(nextStart, { start, end: nextStart })).toBe(false);
  });

  it('AC-001-07: the 25-hour autumn DST day 2026-11-01 ET contains the ambiguous 01:30 once', () => {
    const now = new Date('2026-11-01T16:00:00Z'); // 11:00 ET
    const start = startOfBusinessDay(now);
    const nextStart = startOfBusinessDay(now, 1);

    expect(start.toISOString()).toBe('2026-11-01T04:00:00.000Z');
    expect(nextStart.toISOString()).toBe('2026-11-02T05:00:00.000Z');
    expect((nextStart.getTime() - start.getTime()) / 3_600_000).toBe(25);

    // 01:30 local happens twice: 05:30Z (EDT) and 06:30Z (EST). Both land in
    // this one bucket, and each instant lands in exactly one bucket.
    const firstPass = new Date('2026-11-01T05:30:00Z');
    const secondPass = new Date('2026-11-01T06:30:00Z');

    expect(within(firstPass, { start, end: nextStart })).toBe(true);
    expect(within(secondPass, { start, end: nextStart })).toBe(true);
    expect(dayKeyOf(firstPass)).toBe('2026-11-01');
    expect(dayKeyOf(secondPass)).toBe('2026-11-01');

    const previousStart = startOfBusinessDay(now, -1);

    expect(within(firstPass, { start: previousStart, end: start })).toBe(false);
  });
});

describe('startOfBusinessMonth', () => {
  it('AC-001-07: resolves ET month starts, with offsets', () => {
    const now = new Date('2026-11-01T03:30:00Z'); // 2026-10-31 23:30 ET

    expect(startOfBusinessMonth(now).toISOString()).toBe('2026-10-01T04:00:00.000Z');
    expect(startOfBusinessMonth(now, -1).toISOString()).toBe('2026-09-01T04:00:00.000Z');
    // January is EST, so the offset from UTC is five hours, not four.
    expect(startOfBusinessMonth(now, 3).toISOString()).toBe('2027-01-01T05:00:00.000Z');
  });
});

describe('lastNDaysRange', () => {
  it('AC-001-07: "last 30 days" yields exactly 30 daily buckets including today', () => {
    const now = new Date('2026-11-09T18:00:00Z');
    const range = lastNDaysRange(now, 30);

    expect(range.start.toISOString()).toBe(startOfBusinessDay(now, -29).toISOString());
    expect(range.end.toISOString()).toBe(startOfBusinessDay(now, 1).toISOString());

    const dayKeys = new Set<string>();

    for (let offset = -29; offset <= 0; offset += 1) {
      const bucketStart = startOfBusinessDay(now, offset);

      expect(within(bucketStart, range)).toBe(true);
      dayKeys.add(dayKeyOf(bucketStart));
    }

    expect(dayKeys.size).toBe(30);
    expect(within(startOfBusinessDay(now, -30), range)).toBe(false);
    expect(within(range.end, range)).toBe(false);
  });

  it('AC-001-07: a 30-day window containing a DST change still has 30 buckets', () => {
    const now = new Date('2026-11-09T18:00:00Z'); // the window contains 2026-11-01
    const range = lastNDaysRange(now, 30);
    const hours = (range.end.getTime() - range.start.getTime()) / 3_600_000;

    // 30 local days, one of which had 25 hours.
    expect(hours).toBe(30 * 24 + 1);
  });
});

describe('lastNMonthsRange', () => {
  it('AC-001-07: spans n ET months up to the end of the current ET day', () => {
    const now = new Date('2026-11-09T18:00:00Z');
    const range = lastNMonthsRange(now, 3);

    expect(range.start.toISOString()).toBe('2026-09-01T04:00:00.000Z');
    expect(range.end.toISOString()).toBe(startOfBusinessDay(now, 1).toISOString());
  });
});

describe('closedMonthsBefore', () => {
  it('AC-001-07: returns whole closed ET months and excludes the current partial one', () => {
    const now = new Date('2026-11-09T18:00:00Z');
    const months = closedMonthsBefore(now, 3);

    expect(months).toHaveLength(3);
    expect(months.map((month) => monthKeyOf(month.start))).toEqual([
      '2026-08',
      '2026-09',
      '2026-10',
    ]);
    expect(months[2].end.toISOString()).toBe('2026-11-01T04:00:00.000Z');

    const currentMonthStart = startOfBusinessMonth(now);

    for (const month of months) {
      expect(month.end.getTime()).toBeLessThanOrEqual(currentMonthStart.getTime());
      expect(month.start.getTime()).toBeLessThan(month.end.getTime());
    }
  });
});
