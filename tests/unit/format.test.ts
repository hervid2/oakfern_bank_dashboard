import { describe, expect, it } from 'vitest';

import {
  MINUS_SIGN,
  formatCents,
  formatEtDate,
  formatEtDateTime,
  formatMonths,
  formatSignedCents,
  maskAccountNumber,
} from '@/lib/format';

/**
 * The display layer's string contracts (FR-007…FR-012, NFR-005).
 *
 * These are render-free on purpose: every rule the UI must obey — the `+`/`−`
 * sign, `$0.00` never becoming blank, only four digits of an account number
 * reaching the DOM, dates read in Eastern Time — is a property of a pure
 * function, so it is provable without a browser.
 */

describe('formatCents and formatSignedCents (BR-001)', () => {
  it('AC-002-02: 128431055 cents renders $1,284,310.55 and 0 renders $0.00, never blank or NaN', () => {
    expect(formatCents(128_431_055)).toBe('$1,284,310.55');
    expect(formatCents(0)).toBe('$0.00');
    expect(formatSignedCents(0).text).toBe('$0.00');
    expect(formatSignedCents(0).sign).toBe('');
    expect(formatSignedCents(0).direction).toBe('zero');
  });

  it('AC-002-10: money in 31248000 reads +$312,480.00 and money out 19812044 reads −$198,120.44', () => {
    const inflow = formatSignedCents(31_248_000);
    const outflow = formatSignedCents(-19_812_044);

    expect(inflow.text).toBe('+$312,480.00');
    expect(inflow.sign).toBe('+');
    expect(inflow.direction).toBe('in');

    expect(outflow.text).toBe(`${MINUS_SIGN}$198,120.44`);
    expect(outflow.sign).toBe(MINUS_SIGN);
    expect(outflow.direction).toBe('out');

    // A true minus sign, not the ASCII hyphen Intl would emit.
    expect(MINUS_SIGN).toBe('−');
    expect(outflow.text).not.toContain('-');
  });

  it('formats a single cent and the int4 bound exactly', () => {
    expect(formatSignedCents(1).text).toBe('+$0.01');
    expect(formatSignedCents(-1).text).toBe(`${MINUS_SIGN}$0.01`);
    expect(formatCents(2_147_483_647)).toBe('$21,474,836.47');
  });
});

describe('maskAccountNumber (NFR-005, NFR-009)', () => {
  it('AC-002-18: only the last four digits survive', () => {
    expect(maskAccountNumber('100043214821')).toBe('••••4821');
    expect(maskAccountNumber('100043214821')).not.toContain('10004321');
  });

  it('masks a short or empty value entirely rather than leaking it', () => {
    expect(maskAccountNumber('4821')).toBe('••••');
    expect(maskAccountNumber('12')).toBe('••••');
    expect(maskAccountNumber('')).toBe('••••');
  });
});

describe('ET dates (BR-009)', () => {
  it('renders the business day, not the reader’s: 2026-11-01T03:30:00Z is October 31', () => {
    expect(formatEtDate(new Date('2026-11-01T03:30:00.000Z'))).toBe('Oct 31, 2026');
    expect(formatEtDate(new Date('2026-11-12T17:00:00.000Z'))).toBe('Nov 12, 2026');
    expect(formatEtDateTime(new Date('2026-11-01T03:30:00.000Z'))).toBe('Oct 31, 2026, 11:30 PM');
  });
});

describe('formatMonths (BR-008)', () => {
  it('AC-002-16: always one decimal place, and the singular is singular', () => {
    expect(formatMonths(12)).toBe('12.0 months');
    expect(formatMonths(18)).toBe('18.0 months');
    expect(formatMonths(14.3)).toBe('14.3 months');
    expect(formatMonths(1)).toBe('1.0 month');
  });
});
