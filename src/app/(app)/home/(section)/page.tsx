import { Amount } from '@/components/money/amount';
import { AccountCards } from '@/components/overview/account-cards';
import { KpiTile } from '@/components/overview/kpi-tile';
import { RecentTransactions } from '@/components/overview/recent-transactions';
import { RunwayTile } from '@/components/overview/runway-tile';
import { SectionPlaceholder } from '@/components/states/section-placeholder';
import { formatCents } from '@/lib/format';
import { requireSession } from '@/server/services/auth';
import { getOverview } from '@/server/services/overview';

export const metadata = { title: 'Home · Oakfern' };

/**
 * UI-02 — the overview (FR-007…FR-012).
 *
 * This file is a **thin adapter** (ADR-0001). It does exactly four things:
 * resolve the session, read the clock **once**, call `getOverview` **once**, and
 * hand the result to components that only format. There is no arithmetic and no
 * second read here, which is what makes NFR-011 structural: every figure on the
 * screen traces back to one service call (AC-002-01, AC-002-30).
 *
 * `now` is injected downwards so that no domain function touches the system
 * clock — that is what turns every BR-009 / BR-008 edge case into a unit test.
 *
 * What is deliberately **absent**, and why: no cash sparkline (cut L-4,
 * FR-012b deferred), no dedicated pending-payments panel (cut L-2 — the rows
 * are in the recent list), no cash-flow chart and no spending-by-category panel
 * (feature 004 is cut), and no "Move money" CTA (feature 005 is cut, so a
 * primary button leading to a placeholder would be worse than none). All five
 * are recorded in `docs/ux/ui-brief.md` §8 Amendment 1.
 */
export default async function HomePage() {
  // The layout already guards this segment; the page asks again because
  // authorization belongs to the use case, not to the chrome around it.
  const { businessId } = await requireSession();
  const now = new Date();
  const overview = await getOverview(businessId, now);

  const accountCount = overview.accounts.length;

  return (
    <SectionPlaceholder
      title="Home"
      body="Cash across every account, money in and out over the last 30 days, net burn and runway — all computed in Eastern Time."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          label="Total cash"
          value={formatCents(overview.totalCashCents)}
          footnote={
            accountCount === 1
              ? 'Across 1 account, derived from the ledger'
              : `Across ${accountCount} accounts, derived from the ledger`
          }
        />
        <KpiTile
          label="Money in"
          value={<Amount amountCents={overview.last30Days.inflowCents} />}
          footnote="Last 30 days, Eastern Time. Internal transfers excluded."
        />
        <KpiTile
          label="Money out"
          // The service reports an outflow as a positive magnitude; the minus is
          // a display concern, so the sign flip happens here in the adapter and
          // never inside a component (AC-002-30).
          value={<Amount amountCents={-overview.last30Days.outflowCents} />}
          footnote="Last 30 days, Eastern Time. Internal transfers excluded."
        />
        <RunwayTile runway={overview.runway} burn={overview.burn} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <RecentTransactions rows={overview.recentTransactions} />
        <AccountCards accounts={overview.accounts} />
      </div>
    </SectionPlaceholder>
  );
}
