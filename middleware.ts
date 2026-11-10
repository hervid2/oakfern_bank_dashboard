import { NextResponse, type NextRequest } from 'next/server';

import { SESSION_COOKIE, verifySession } from '@/lib/session';

/**
 * Edge gate for the authenticated shell (FR-002, FR-003b, plan §4.6).
 *
 * This is **UX, not the authorization boundary.** A Server Action can be invoked
 * directly and a route segment can be rendered by a code path the matcher never
 * sees, so the real check is `requireSession()` inside the service layer. What
 * the middleware buys is that an anonymous visitor is redirected before any
 * page, query or database connection is touched.
 *
 * Edge-runtime discipline (plan §8 R-9): the only import is `src/lib/session.ts`,
 * which uses nothing but `jose` and WebCrypto. `src/lib/env.ts` is deliberately
 * **not** imported — pulling Zod and the full env schema into the edge bundle is
 * exactly the failure that risk describes. `verifySession` swallows a missing
 * `SESSION_SECRET` into `null`, so a misconfigured deployment fails *closed*
 * here (everyone anonymous) and fails *loudly* on the sign-in path, where
 * `signSession` throws the named error AC-001-19 asks for.
 */

/**
 * The `(app)` route group. Kept in sync with `src/components/shell/nav-items.ts`
 * — three sections since cut C1 (amended AC-001-13), not FR-004's five.
 *
 * A path that is *not* listed here is still protected: `(app)/layout.tsx` calls
 * `requireSession()` and redirects. The list only decides what gets bounced
 * before any rendering happens.
 */
const PROTECTED_PREFIXES = ['/home', '/transactions', '/move-money'] as const;

const isProtected = (pathname: string): boolean =>
  PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const claims = token === undefined ? null : await verifySession(token);

  if (claims === null && isProtected(pathname)) {
    const target = new URL('/', request.url);

    // A cookie that was present but did not verify is the expiry case (spec §4
    // E-3): UI-01 explains it instead of silently bouncing the visitor.
    if (token !== undefined) {
      target.searchParams.set('session', 'expired');
    }

    const response = NextResponse.redirect(target);

    if (token !== undefined) {
      response.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 });
    }

    return response;
  }

  // Already signed in: the landing page has nothing to offer (plan §4.6).
  if (claims !== null && pathname === '/') {
    return NextResponse.redirect(new URL('/home', request.url));
  }

  return NextResponse.next();
}

export const config = {
  /**
   * Everything except Next's internals, the public health endpoint and static
   * files. `/api/health` must stay reachable anonymously (FR-038).
   */
  matcher: ['/((?!_next/static|_next/image|api/health|favicon.ico|icon.svg).*)'],
};
