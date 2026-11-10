import { domainError } from './errors';

/**
 * BR-001 — money is a **signed integer number of USD cents**, everywhere.
 *
 * There is no `parseFloat` and no `toFixed` in this module on purpose: both
 * introduce binary floating point into a value that must stay exact. Parsing is
 * done by regular expression and integer arithmetic, so `"0.07"` is `7` and
 * never `7.000000000000001`.
 *
 * The bound is PostgreSQL's `int4`, which is the column type of every money
 * column (±2,147,483,647 cents ≈ ±USD 21.4 M). A value the database cannot
 * store is rejected here rather than at `INSERT` time.
 */
export const MAX_SAFE_CENTS = 2_147_483_647;

/** `[sign][$]<grouped or plain dollars>[.cc]` — 0, 1 or 2 decimal places. */
const MONEY_PATTERN = /^([+-])?\$?(\d{1,3}(?:,\d{3})*|\d+)(?:\.(\d{1,2}))?$/;

export const assertSafeCents = (value: number): void => {
  if (!Number.isInteger(value)) {
    throw domainError('INVALID_CENTS', `expected an integer number of cents, received ${value}`);
  }

  if (Math.abs(value) > MAX_SAFE_CENTS) {
    throw domainError(
      'INVALID_CENTS',
      `${value} cents is outside the int4 range of a money column`,
    );
  }
};

/**
 * The **only** money parser in the repository. Rejects rather than rounds: a
 * third decimal place is a caller mistake, not something to silently resolve
 * (spec §5 BR-001 example 3).
 */
export const parseMoneyToCents = (input: string): number => {
  const match = MONEY_PATTERN.exec(input.trim());

  if (!match) {
    throw domainError(
      'INVALID_AMOUNT',
      `"${input}" is not a US dollar amount with at most 2 decimals`,
    );
  }

  const [, sign, dollarPart, fractionPart = ''] = match;
  const dollars = Number(dollarPart.replaceAll(',', ''));
  const cents = Number(fractionPart.padEnd(2, '0'));
  const magnitude = dollars * 100 + cents;
  const value = sign === '-' ? -magnitude : magnitude;

  assertSafeCents(value);

  return value;
};

/** Exact sum. Every input is validated, so a stray float cannot leak through. */
export const sumCents = (values: readonly number[]): number => {
  let total = 0;

  for (const value of values) {
    assertSafeCents(value);
    total += value;
  }

  assertSafeCents(total);

  return total;
};

/**
 * Direction is **derived from the sign** and is never a stored column
 * (ADR-0003 §2). Zero counts as `in`: it moves no money, and treating it as an
 * outflow would make a zero-value row subtract from spending.
 */
export const directionOf = (cents: number): 'in' | 'out' => (cents < 0 ? 'out' : 'in');
