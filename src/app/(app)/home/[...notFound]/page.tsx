import { notFound } from 'next/navigation';

/**
 * Any unknown path under this shell section answers **404 inside the shell**
 * (AC-001-17) instead of falling through to the bare root 404.
 *
 * Two structural details, both measured rather than assumed:
 *
 *  - **Why a catch-all per section, not one at the group root.** `(app)` adds no
 *    URL segment of its own, so `(app)/[...notFound]` would also swallow every
 *    unmatched top-level URL — and the group layout would then redirect an
 *    anonymous visitor who merely mistyped an address to the sign-in page
 *    instead of answering 404 (AC-000-08). Scoping it to the three real
 *    sections keeps both behaviours correct, and the `[id]` routes of features
 *    002 and 003 are more specific than this one, so they take precedence.
 *  - **Why the section's own page and `loading.tsx` sit in a `(section)` route
 *    group.** A `loading.tsx` beside this file would put a Suspense boundary
 *    above it, Next would flush the shell before the render reached
 *    `notFound()`, and the response would be **200 with 404 content** — which it
 *    measurably was. The route group scopes the loading boundary to the section
 *    page without changing a single URL, so the status is a real 404.
 */
export default function HomeNotFound(): never {
  notFound();
}
