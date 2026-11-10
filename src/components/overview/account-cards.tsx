import { LandmarkIcon } from 'lucide-react';
import Link from 'next/link';

import { EmptyState } from '@/components/states/empty-state';
import { Button } from '@/components/ui/button';
import { formatCents, maskAccountNumber } from '@/lib/format';

/**
 * FR-009 — one card per account: name, type, a **masked** number, current and
 * available balance.
 *
 * NFR-005 / NFR-009: the full account number never reaches the DOM. The card
 * receives the number and masks it here, which means there is no code path that
 * renders it unmasked (AC-002-18).
 *
 * Both figures arrive already derived by `getAccountBalances` through
 * `getOverview` — the single balance source (BR-002, NFR-011). This file does no
 * arithmetic (AC-002-30).
 *
 * ADR-0001: the prop shape is restated here rather than imported from
 * `src/server`, which the ESLint boundary rule forbids. It is satisfied
 * structurally by `AccountWithBalances`.
 */
export interface AccountCardData {
  readonly id: string;
  readonly name: string;
  readonly type: 'checking' | 'savings' | 'treasury';
  readonly accountNumber: string;
  readonly currentBalanceCents: number;
  readonly availableBalanceCents: number;
}

const TYPE_LABEL: Record<AccountCardData['type'], string> = {
  checking: 'Checking',
  savings: 'Savings',
  treasury: 'Treasury',
};

export function AccountCards({ accounts }: { readonly accounts: readonly AccountCardData[] }) {
  return (
    <section aria-labelledby="accounts-heading" className="flex min-w-0 flex-col gap-4">
      <h2 id="accounts-heading" className="text-sm font-medium text-muted-foreground">
        Accounts
      </h2>

      {accounts.length === 0 ? (
        <EmptyState
          icon={LandmarkIcon}
          title="No accounts yet"
          body="This workspace has no accounts, so there is no cash to show. The demo workspace is created by the seed."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/home">Reload Home</Link>
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {accounts.map((account) => (
            <li
              key={account.id}
              className="flex min-w-0 flex-col gap-3 rounded-[var(--radius)] border border-border p-4"
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="truncate text-sm font-medium text-foreground">{account.name}</p>
                <p className="text-xs text-muted-foreground">
                  {TYPE_LABEL[account.type]} ·{' '}
                  <span className="tabular-nums">{maskAccountNumber(account.accountNumber)}</span>
                </p>
              </div>
              <dl className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <div className="flex min-w-0 flex-col">
                  <dt className="text-xs text-muted-foreground">Current</dt>
                  <dd className="text-base font-semibold tabular-nums text-foreground">
                    {formatCents(account.currentBalanceCents)}
                  </dd>
                </div>
                <div className="flex min-w-0 flex-col items-end">
                  <dt className="text-xs text-muted-foreground">Available</dt>
                  <dd className="text-sm tabular-nums text-muted-foreground">
                    {formatCents(account.availableBalanceCents)}
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
