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
