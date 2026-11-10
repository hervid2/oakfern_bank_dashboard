import { KpiTile } from '@/components/overview/kpi-tile';
import { formatCents, formatMonths } from '@/lib/format';

/**
 * ADR-0001 forbids a component importing from `src/server`, **including types**
 * (the ESLint `no-restricted-imports` rule enforces it). So the shape is
 * restated here. TypeScript is structural, so `domain/metrics.Runway` satisfies
 * it exactly and the page passes the service's value straight through — a drift
 * between the two is a compile error at the call site, not a silent mismatch.
 */
export type RunwayProp =
  { readonly kind: 'cash-flow-positive' } | { readonly kind: 'months'; readonly months: number };

export interface BurnProp {
  readonly avgBurnCents: number;
  readonly monthsUsed: number;
}

/**
 * FR-010 / BR-008 — the runway tile, rendering the `Runway` **union** rather
 * than a number.
 *
 * Because the domain returns a discriminated union, this component cannot print
 * `Infinity`, `NaN`, `0.0 months` or a negative month count: those states are
 * not representable in its input (AC-002-12). The cash-flow-positive branch says
 * so in words instead of showing a figure that would be a lie.
 *
 * `monthsUsed` is rendered, not hidden: a two-month average is honest about
 * being a two-month average (AC-002-16, the BR-008 exception).
 */
const basis = (monthsUsed: number): string =>
  monthsUsed === 0
    ? 'No closed month of history yet'
    : monthsUsed < 3
      ? `Based on the ${monthsUsed === 1 ? 'only closed month' : `${monthsUsed} closed months`} of history so far`
      : 'Average of the last 3 closed months, Eastern Time';

export function RunwayTile({
  runway,
  burn,
}: {
  readonly runway: RunwayProp;
  readonly burn: BurnProp;
}) {
  if (runway.kind === 'cash-flow-positive') {
    return (
      <KpiTile
        label="Runway"
        value={<span className="text-positive">Cash-flow positive</span>}
        footnote={`Inflows covered outflows. ${basis(burn.monthsUsed)}.`}
      />
    );
  }

  return (
    <KpiTile
      label="Runway"
      value={formatMonths(runway.months)}
      footnote={`${formatCents(burn.avgBurnCents)} net burn per month. ${basis(burn.monthsUsed)}.`}
    />
  );
}
