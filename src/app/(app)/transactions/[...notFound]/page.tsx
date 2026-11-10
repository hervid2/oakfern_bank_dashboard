import { notFound } from 'next/navigation';

/**
 * Any unknown path under this shell section answers **404 inside the shell**
 * (AC-001-17) instead of falling through to the bare root 404.
 *
 * Why a catch-all per section rather than one at the group root: `(app)` adds no
 * URL segment of its own, so `(app)/[...notFound]` would also swallow every
 * unmatched top-level URL — and the group layout would then redirect an
 * anonymous visitor who merely mistyped an address to the sign-in page instead
 * of telling them the page does not exist (AC-000-08). Scoping the catch-all to
 * the three real sections keeps both behaviours correct. The `[id]` routes of
 * features 002 and 003 are more specific than this one and take precedence.
 */
export default function TransactionsNotFound(): never {
  notFound();
}
