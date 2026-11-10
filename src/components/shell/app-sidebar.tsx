'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Wordmark } from '@/components/brand/wordmark';
import { isActivePath, NAV_ITEMS } from '@/components/shell/nav-items';

/**
 * The fixed sidebar at ≥ 1024 px (`ui-system` rule 6); below that it is absent
 * and `MobileNav` renders the same items inside a sheet.
 *
 * A client component because the active item is a function of the current path,
 * and a layout — unlike a page — is never handed the pathname. `usePathname()`
 * is the framework's answer; the alternative (a pathname header set in
 * middleware) would buy nothing and couple the shell to the edge.
 *
 * The accent appears here only on the active item (ui-brief §1.1).
 */

const itemClasses = (active: boolean): string =>
  [
    'flex items-center gap-3 rounded-[var(--radius)] px-3 py-2 text-sm transition-colors duration-150',
    active
      ? 'bg-primary/10 font-medium text-primary'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
  ].join(' ');

export function SidebarNav({ onNavigate }: { readonly onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="flex flex-col gap-1 px-3">
      {NAV_ITEMS.map((item) => {
        const active = isActivePath(pathname, item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={itemClasses(active)}
          >
            <Icon aria-hidden className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppSidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border lg:flex">
      <div className="flex h-14 items-center px-5">
        <Link href="/home" className="rounded-[var(--radius)]">
          <Wordmark />
        </Link>
      </div>
      <SidebarNav />
      <p className="mt-auto px-5 pb-5 text-xs text-muted-foreground">
        Demo workspace · figures are generated, not real.
      </p>
    </aside>
  );
}
