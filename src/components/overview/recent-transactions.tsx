import { ArrowLeftRightIcon, ReceiptTextIcon } from 'lucide-react';
import Link from 'next/link';

import { Amount } from '@/components/money/amount';
import { EmptyState } from '@/components/states/empty-state';
import { Button } from '@/components/ui/button';
import { formatEtDate } from '@/lib/format';

/**
 * FR-012 — the recent ledger, and under cut ladder **L-2** the only place
 * pending payments surface (FR-011, read-only).
 *
 * Three decisions that are requirements, not taste:
 *
 *   - **No cancel control of any kind.** Feature 005 is cut, so there is no
 *     cancellation path. The honest sentence below the list says so once, and
 *     this file renders no button, link or disabled affordance for it, and never
 *     links to `/move-money` (OQ-002-01 A, AC-002-22).
 *   - **Internal legs are shown and labelled.** BR-011 excludes them from
 *     metrics, not from lists (AC-002-25).
 *   - **"Expected <ET date>" is absolute, not a countdown** (ASM-002-02), and
 *     BR-009 means that date is the *business* day.
 *
 * One DOM for every width: a list of rows that reflow to a card at 375 px. A
 * separate mobile markup would duplicate every figure in the document, which is
 * exactly how a "no full account number in the DOM" assertion gets fooled.
 *
 * ADR-0001: the prop shape is restated here instead of imported from
 * `src/server`; `RecentTransactionView` satisfies it structurally.
 */
export interface RecentRowData {
  readonly id: string;
  readonly amountCents: number;
  readonly status: 'pending' | 'posted' | 'canceled' | 'failed';
  readonly method: 'ach' | 'wire' | 'card' | 'internal' | 'check' | 'fee' | 'interest';
  readonly label: string;
  readonly categoryLabel: string | null;
  readonly isInternal: boolean;
  readonly effectiveAt: Date;
  readonly settleAt: Date | null;
}

const METHOD_LABEL: Record<RecentRowData['method'], string> = {
  ach: 'ACH',
  wire: 'Wire',
  card: 'Card',
  internal: 'Internal transfer',
  check: 'Check',
  fee: 'Fee',
  interest: 'Interest',
};

const STATUS_LABEL: Record<RecentRowData['status'], string> = {
  pending: 'pending',
  posted: 'posted',
  canceled: 'canceled',
  failed: 'failed',
};

/** `pending · Expected Nov 12, 2026`, or the bare status for the other cases. */
const badgeTextOf = (row: RecentRowData): string =>
  row.status === 'pending' && row.settleAt !== null
    ? `${STATUS_LABEL.pending} · Expected ${formatEtDate(row.settleAt)}`
    : STATUS_LABEL[row.status];

function StatusBadge({ row }: { readonly row: RecentRowData }) {
  const tone =
    row.status === 'failed'
      ? 'border-destructive/40 text-destructive'
      : 'border-border text-muted-foreground';

  return (
    <span data-status={row.status} className={`rounded-full border px-2 py-0.5 text-xs ${tone}`}>
      {badgeTextOf(row)}
    </span>
  );
}

export function RecentTransactions({ rows }: { readonly rows: readonly RecentRowData[] }) {
  const hasPending = rows.some((row) => row.status === 'pending');

  return (
    <section aria-labelledby="recent-heading" className="flex min-w-0 flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h2 id="recent-heading" className="text-sm font-medium text-muted-foreground">
          Recent transactions
        </h2>
        <Button asChild variant="ghost" size="sm">
          <Link href="/transactions">View all</Link>
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={ReceiptTextIcon}
          title="No transactions yet"
          body="Money moving in or out of any account will appear here, newest first, in Eastern Time."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/transactions">Open transactions</Link>
            </Button>
          }
        />
      ) : (
        <ul
          data-testid="recent-transactions"
          className="flex flex-col divide-y divide-border rounded-[var(--radius)] border border-border"
        >
          {rows.map((row) => (
            <li
              key={row.id}
              data-testid="recent-transaction-row"
              className="flex min-w-0 items-start justify-between gap-3 p-4"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <p className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-foreground">
                  {row.isInternal ? (
                    <ArrowLeftRightIcon aria-hidden className="size-3.5 shrink-0" />
                  ) : null}
                  <span className="truncate">{row.label}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  <span className="tabular-nums">{formatEtDate(row.effectiveAt)}</span> ·{' '}
                  {METHOD_LABEL[row.method]}
                  {row.categoryLabel === null ? null : ` · ${row.categoryLabel}`}
                </p>
                {row.status === 'posted' ? null : (
                  <span className="pt-0.5">
                    <StatusBadge row={row} />
                  </span>
                )}
              </div>
              <Amount
                amountCents={row.amountCents}
                status={row.status}
                className="shrink-0 text-right text-sm font-medium"
              />
            </li>
          ))}
        </ul>
      )}

      {hasPending ? (
        <p className="text-xs text-muted-foreground">
          Pending payments are shown here while they settle. Stopping one is not available in this
          round of Oakfern, so this view is read-only.
        </p>
      ) : null}
    </section>
  );
}
