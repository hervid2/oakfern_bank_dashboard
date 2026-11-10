import { ArrowRightLeftIcon, HouseIcon, ReceiptTextIcon, type LucideIcon } from 'lucide-react';

/**
 * The single navigation definition. The sidebar and the mobile sheet both read
 * it, so the two can never drift (plan §2.6).
 *
 * **Three items, not FR-004's five.** Cut C1, taken by the Technical Director at
 * 🚦 G-SpecPlan: the roadmap scope cut removed feature 004 (cash insights) and
 * feature 006 (cards), so two of the five links would have had no destination in
 * any released version. AC-001-13 is amended accordingly — every item here
 * resolves to a route that exists.
 */

export interface NavItem {
  readonly href: string;
  readonly label: string;
  readonly icon: LucideIcon;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/home', label: 'Home', icon: HouseIcon },
  { href: '/transactions', label: 'Transactions', icon: ReceiptTextIcon },
  { href: '/move-money', label: 'Move money', icon: ArrowRightLeftIcon },
];

/**
 * Prefix match, so `/transactions/abc` keeps "Transactions" current. The three
 * hrefs are mutually non-prefixing, which is what makes "exactly one
 * `aria-current`" (AC-001-13) a property of the data rather than a coincidence.
 */
export const isActivePath = (pathname: string, href: string): boolean =>
  pathname === href || pathname.startsWith(`${href}/`);
