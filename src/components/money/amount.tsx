import { cn } from 'cn';

import { formatSignedCents, type MoneyDirection } from '@/lib/format';

/**
 * The **only** place a signed amount becomes markup (plan 002 §6, NFR-011).
 *
 * Three rules from `docs/ux/ui-brief.md` §1.1 are encoded here so no caller has
 * to remember them:
 *
 *   - an inflow is `--positive`, an outflow is the **neutral foreground** — not
 *     red, because spending money is not an error;
 *   - `--destructive` is reserved for a `failed` row;
 *   - colour is never the only signal: the `+` / `−` sign is always rendered,
 *     which is what keeps the figure readable in monochrome and to a screen
 *     reader (NFR-003, AC-002-10).
 *
 * The component performs **no arithmetic and no comparison on `amountCents`**:
 * `formatSignedCents` in `src/lib/format.ts` hands back the string and the
 * direction, and this file only picks a class (AC-002-30).
 */
const toneFor = (direction: MoneyDirection, status: string | undefined): string => {
  if (status === 'failed') {
    return 'text-destructive';
  }

  return direction === 'in' ? 'text-positive' : 'text-foreground';
};

export function Amount({
  amountCents,
  status,
  className,
}: {
  readonly amountCents: number;
  /** Only `'failed'` changes the tone; every other status is neutral. */
  readonly status?: string;
  readonly className?: string;
}) {
  const { text, direction } = formatSignedCents(amountCents);

  return (
    <span
      data-direction={direction}
      className={cn('tabular-nums', toneFor(direction, status), className)}
    >
      {text}
    </span>
  );
}
