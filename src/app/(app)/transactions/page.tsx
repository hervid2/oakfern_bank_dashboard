import { ReceiptTextIcon } from 'lucide-react';

import { EmptyState } from '@/components/states/empty-state';
import { SectionPlaceholder } from '@/components/states/section-placeholder';

export const metadata = { title: 'Transactions · Oakfern' };

/** UI-03, honestly unfinished (AC-001-18). The table and its URL filters are feature 003. */
export default function TransactionsPage() {
  return (
    <SectionPlaceholder
      title="Transactions"
      body="Every movement in the workspace, with search, filters and a detail panel — all of it addressable from the URL."
    >
      <EmptyState
        icon={ReceiptTextIcon}
        title="The ledger is seeded, the table is not built yet"
        body="The demo workspace already holds a year of generated activity; this round built the data layer that reads it. The filterable table and the detail panel arrive in the next round."
      />
    </SectionPlaceholder>
  );
}
