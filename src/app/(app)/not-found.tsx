import { CompassIcon } from 'lucide-react';
import Link from 'next/link';

import { EmptyState } from '@/components/states/empty-state';
import { Button } from '@/components/ui/button';

/**
 * 404 inside the shell (FR-039, AC-001-17). Reached when a `[...notFound]`
 * catch-all under a shell section calls `notFound()`, so the visitor keeps the
 * navigation and can carry on in one click instead of landing on a bare page.
 */
export default function AppNotFound() {
  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Page not found</h1>
      <EmptyState
        icon={CompassIcon}
        title="That page isn't here"
        body="The address may be mistyped, or it may belong to a part of Oakfern that is not in this round. Your navigation is still on the left."
        action={
          <Button asChild size="sm" variant="outline">
            <Link href="/home">Go to Home</Link>
          </Button>
        }
      />
    </section>
  );
}
