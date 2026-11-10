import { describe, expect, it } from 'vitest';

import { assertSafeCents, directionOf, parseMoneyToCents, sumCents } from '@/server/domain/money';
import { formatCents } from '@/lib/format';

/**
 * BR-001 — money is signed integer USD cents. The example tables of spec §5
 * BR-001 are transcribed here one assertion per example, including both traps:
 * the parsing trap (three decimals must be rejected, never rounded) and the
 * float trap (no `parseFloat`, no `toFixed`, so `sumCents` is exact).
 */
describe('parseMoneyToCents', () => {
  it('AC-001-02: parses grouped dollars and cents exactly', () => {
    expect(parseMoneyToCents('1,234.56')).toBe(123456);
    expect(parseMoneyToCents('0.07')).toBe(7);
    expect(parseMoneyToCents('0')).toBe(0);
    expect(parseMoneyToCents('12')).toBe(1200);
    expect(parseMoneyToCents('12.3')).toBe(1230);
    expect(parseMoneyToCents('$1,000,000.00')).toBe(100000000);
    expect(parseMoneyToCents('-1,234.56')).toBe(-123456);
    expect(parseMoneyToCents('  42.10  ')).toBe(4210);
  });

  it('AC-001-02: rejects three decimal places instead of rounding them', () => {
    expect(() => parseMoneyToCents('12.345')).toThrow(/INVALID_AMOUNT/);
  });

  it('AC-001-02: rejects anything that is not a plain US money string', () => {
    for (const input of [
      '',
      '   ',
      'abc',
      'NaN',
      'Infinity',
      '1e3',
      '1.2.3',
      '12,34.5',
      '1,23,456.00',
      '.50',
      '12.',
      '--1.00',
      '1 234.56',
    ]) {
      expect(() => parseMoneyToCents(input), input).toThrow(/INVALID_AMOUNT/);
    }
  });

  it('AC-001-02: rejects an amount outside the int4 range the column can hold', () => {
    expect(() => parseMoneyToCents('21,474,836.48')).toThrow(/INVALID_CENTS/);
  });
});

describe('sumCents', () => {
  it('AC-001-02: sums exactly, with no floating-point drift', () => {
    expect(sumCents([10, 20])).toBe(30);
    expect(sumCents([])).toBe(0);
    expect(sumCents([1, 1, 1, 1, 1, 1, 1, 1, 1, 1])).toBe(10);
    expect(sumCents([500000, -120000, -80000])).toBe(300000);
  });

  it('AC-001-02: refuses non-integer input rather than silently truncating', () => {
    expect(() => sumCents([10.5, 20])).toThrow(/INVALID_CENTS/);
  });
});

describe('assertSafeCents', () => {
  it('AC-001-02: accepts integers inside the int4 range', () => {
    for (const value of [0, 1, -1, 2_147_483_647, -2_147_483_647]) {
      expect(() => assertSafeCents(value)).not.toThrow();
    }
  });

  it('AC-001-02: rejects decimals, NaN, Infinity and anything past int4', () => {
    for (const value of [0.5, -0.01, Number.NaN, Number.POSITIVE_INFINITY, 2_147_483_648]) {
      expect(() => assertSafeCents(value), String(value)).toThrow(/INVALID_CENTS/);
    }
  });
});

describe('directionOf', () => {
  it('AC-001-02: derives the direction from the sign, never from a column', () => {
    expect(directionOf(1)).toBe('in');
    expect(directionOf(123456)).toBe('in');
    expect(directionOf(0)).toBe('in');
    expect(directionOf(-1)).toBe('out');
  });
});

describe('formatCents', () => {
  it('AC-001-05: formats cents as en-US USD, and zero is never blank or NaN', () => {
    expect(formatCents(123456)).toBe('$1,234.56');
    expect(formatCents(0)).toBe('$0.00');
    expect(formatCents(7)).toBe('$0.07');
    expect(formatCents(-123456)).toBe('-$1,234.56');
  });

  it('AC-001-05: honours signDisplay for the explicit-sign case', () => {
    expect(formatCents(-123456, { signDisplay: 'always' })).toBe('-$1,234.56');
    expect(formatCents(123456, { signDisplay: 'always' })).toBe('+$1,234.56');
  });
});
