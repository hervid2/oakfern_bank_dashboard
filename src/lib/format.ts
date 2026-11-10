/**
 * The **only** place money becomes a string (BR-001). Everything rendered goes
 * through `formatCents`, so a figure cannot be formatted two different ways in
 * two views, and `Intl` is constructed once per option set rather than per row.
 *
 * Callers pass integer cents. Division by 100 happens here, at the very last
 * step before display, and never in a calculation.
 *
 * Rendered figures carry `tabular-nums` in the UI (AGENTS.md non-negotiable 1);
 * that is a class, not this module's job.
 */
type FormatOptions = Pick<Intl.NumberFormatOptions, 'signDisplay' | 'maximumFractionDigits'>;

const formatterCache = new Map<string, Intl.NumberFormat>();

const formatterFor = (options: FormatOptions): Intl.NumberFormat => {
  const key = JSON.stringify(options);
  const cached = formatterCache.get(key);

  if (cached) {
    return cached;
  }

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    ...options,
  });

  formatterCache.set(key, formatter);

  return formatter;
};

export const formatCents = (cents: number, options: FormatOptions = {}): string =>
  formatterFor(options).format(cents / 100);

/* ------------------------------------------------------------------------- *
 * Feature 002 — the signed-amount, mask and ET-date strings (plan 002 §6).
 *
 * All of it lives here rather than in a component so that **no file under
 * `src/components` performs arithmetic on, or even compares, `amountCents`**
 * (NFR-011, AC-002-30). A component receives a string and a direction and
 * renders them; it never decides what a number means.
 * ------------------------------------------------------------------------- */

/** U+2212 MINUS SIGN, not the ASCII hyphen: it aligns with `tabular-nums`. */
export const MINUS_SIGN = '−';

/** Direction is derived from the sign (ADR-0003 §2) and is never stored. */
export type MoneyDirection = 'in' | 'out' | 'zero';

export interface SignedMoney {
  /** `'+'`, `'−'` or `''` — colour is never the only signal (NFR-003). */
  readonly sign: string;
  /** Sign plus formatted magnitude, e.g. `'+$312,480.00'`. */
  readonly text: string;
  readonly direction: MoneyDirection;
}

/**
 * The one way a signed amount becomes a string. Zero renders `$0.00` with no
 * sign at all — `+$0.00` claims money arrived when none did.
 */
export const formatSignedCents = (cents: number): SignedMoney => {
  const direction: MoneyDirection = cents > 0 ? 'in' : cents < 0 ? 'out' : 'zero';
  const sign = direction === 'in' ? '+' : direction === 'out' ? MINUS_SIGN : '';

  return { sign, text: `${sign}${formatCents(Math.abs(cents))}`, direction };
};

/**
 * NFR-005 / NFR-009 — only the last four digits of an account number may reach
 * the DOM. A short or empty value is masked **entirely** rather than leaked.
 */
export const maskAccountNumber = (accountNumber: string): string => {
  const digits = accountNumber.trim();

  return digits.length <= 4 ? '••••' : `••••${digits.slice(-4)}`;
};

const etDate = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const etDateTime = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

/** BR-009 — every date a visitor reads is the **business** day, not theirs. */
export const formatEtDate = (instant: Date): string => etDate.format(instant);

export const formatEtDateTime = (instant: Date): string => etDateTime.format(instant);

/**
 * BR-008 — a runway is a number of months to one decimal place, so `12` reads
 * `"12.0 months"` and the figure never looks more precise than it is.
 */
export const formatMonths = (months: number): string =>
  `${months.toFixed(1)} ${months === 1 ? 'month' : 'months'}`;
