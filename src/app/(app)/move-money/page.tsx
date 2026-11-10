import { ArrowRightLeftIcon } from 'lucide-react';

import { EmptyState } from '@/components/states/empty-state';
import { SectionPlaceholder } from '@/components/states/section-placeholder';

export const metadata = { title: 'Move money · Oakfern' };

/**
 * UI-05, honestly unfinished (AC-001-18). This is the destination of the third
 * navigation item and of the topbar CTA (amended AC-001-13, cut C1), so the page
 * exists and says exactly what it can and cannot do today — no form that would
 * accept an amount and then drop it.
 */
export default function MoveMoneyPage() {
  return (
    <SectionPlaceholder
      title="Move money"
      body="Internal transfers between your accounts and payments to a recipient, each one reviewed before it is sent."
    >
      <EmptyState
        icon={ArrowRightLeftIcon}
        title="Transfers are not open yet"
        body="Money movement is written last on purpose: it is the only part of the product that mutates balances, so it ships on top of the atomic, idempotent foundation this round laid down. Nothing on this screen can take an amount today."
      />
    </SectionPlaceholder>
  );
}
