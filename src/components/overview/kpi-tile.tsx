import type { ReactNode } from 'react';

/**
 * One figure, one label, one line of context (FR-007, FR-008).
 *
 * `ui-system` rule 4: label `text-sm` muted, value `text-2xl` semibold, context
 * muted below it. Subtle border, no shadow, no gradient. The tile is deliberately
 * dumb — it receives a rendered value and never computes one.
 */
export function KpiTile({
  label,
  value,
  footnote,
}: {
  readonly label: string;
  readonly value: ReactNode;
  readonly footnote: string;
}) {
  return (
    <div
      data-testid="kpi-tile"
      data-label={label}
      className="flex min-w-0 flex-col gap-1 rounded-[var(--radius)] border border-border p-4"
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        data-testid="kpi-value"
        className="truncate text-2xl font-semibold tracking-tight tabular-nums"
      >
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{footnote}</p>
    </div>
  );
}
