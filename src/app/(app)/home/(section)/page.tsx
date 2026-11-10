import { LayoutDashboardIcon } from 'lucide-react';

import { EmptyState } from '@/components/states/empty-state';
import { SectionPlaceholder } from '@/components/states/section-placeholder';

export const metadata = { title: 'Home · Oakfern' };

/**
 * UI-02, honestly unfinished (AC-001-18).
 *
 * Feature 001 ships the shell, the domain, the seed and the session. The cash
 * figures belong to feature 002, so this page shows **no numbers at all**
 * (ASM-08): a placeholder KPI tile with a plausible-looking balance is a lie
 * that survives into screenshots.
 */
export default function HomePage() {
  return (
    <SectionPlaceholder
      title="Home"
      body="Cash across every account, money in and out over the last 30 days, net burn and runway — all computed in Eastern Time."
    >
      <EmptyState
        icon={LayoutDashboardIcon}
        title="No figures on this screen yet"
        body="This round delivered the domain model, the deterministic demo ledger, the session and this shell. The overview reads that ledger in the next round; until then nothing here is filled in with a made-up number."
      />
    </SectionPlaceholder>
  );
}
