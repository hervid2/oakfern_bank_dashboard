import { ArrowUpRightIcon } from 'lucide-react';
import Link from 'next/link';

import { Wordmark } from '@/components/brand/wordmark';
import { MobileNav } from '@/components/shell/mobile-nav';
import { ThemeToggle } from '@/components/shell/theme-toggle';
import { UserMenu } from '@/components/shell/user-menu';
import { Button } from '@/components/ui/button';

/**
 * The topbar: a server component composing three client islands (menu sheet,
 * theme toggle, user menu). Below 1024 px it also carries the wordmark, because
 * the sidebar that normally holds it is not rendered there.
 *
 * **The "Move money" CTA is a link, not a disabled button.** The plan wrote it
 * `disabled` with an explanatory accessible name (ASM-001-09), which was correct
 * while "Move money" had no destination. Cut C1 then made it one of the three
 * navigation items of the amended AC-001-13, and the spec outranks the plan
 * (GENESIS Art. 9, spec-anchored). A disabled CTA pointing at a route the
 * sidebar links to would read as a bug; instead the CTA and the sidebar item go
 * to the same place, and `/move-money` says plainly that transfers arrive in a
 * later round. Nothing is claimed that does not work.
 *
 * Search and ⌘K are not here: FR-013's search belongs to feature 003 and an
 * input that searches nothing would be the opposite of honest.
 */
export function Topbar({ userName }: { readonly userName: string }) {
  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/90 px-4 backdrop-blur-sm sm:px-6">
      <MobileNav />
      <Link href="/home" className="shrink-0 lg:hidden">
        {/*
         * Below 640 px only the mark is rendered. Measured: with the
         * `oakfern` text the topbar's min-content width is 389 px against a
         * 375 px viewport, so the row only "fitted" by spilling into its own
         * right padding — on Linux chromium's slightly wider glyph metrics
         * that spill became 3 px of document overflow and broke AC-001-15 in
         * CI. Dropping the word at the smallest breakpoint takes the row to
         * 332 px, which leaves real slack instead of a rounding accident. The
         * mark keeps its own `aria-label`, so the link is still named.
         */}
        {/*
         * The visibility class goes on a wrapper, not on `Wordmark`: the
         * component hard-codes `inline-flex`, and two `display` utilities on
         * the same element are decided by stylesheet order, not by authoring
         * order — `hidden` loses and both marks paint.
         */}
        <span className="sm:hidden">
          <Wordmark size="sm" withText={false} />
        </span>
        <span className="hidden sm:block">
          <Wordmark size="sm" />
        </span>
      </Link>
      <div className="flex-1" />
      <Button asChild size="sm">
        <Link href="/move-money">
          <ArrowUpRightIcon aria-hidden />
          Move money
        </Link>
      </Button>
      <ThemeToggle />
      <UserMenu userName={userName} />
    </header>
  );
}
