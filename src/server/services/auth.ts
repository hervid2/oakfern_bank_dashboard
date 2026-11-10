import { readSessionCookie, type SessionClaims } from '@/lib/session';
import { domainError } from '@/server/domain/errors';
import { findDemoUser, findUserById, type SessionUser } from '@/server/repositories/users';

/**
 * Authentication use cases (plan §2.4).
 *
 * ADR-0001: no Prisma here and no Next here. Repositories do the reading, and
 * the cookie is reached only through `src/lib/session.ts`, which is the one
 * module allowed to know what a cookie is.
 *
 * `requireSession` is the **authorization boundary**. `middleware.ts` also gates
 * the same paths, but that is for UX only: middleware can be bypassed by any
 * direct Server Action invocation, so every protected use case calls this guard
 * too. Two layers, one of which is authoritative (plan §1.1).
 */

export type { SessionUser };

/**
 * The seeded one-click demo identity (FR-001). Throws rather than returning
 * `null`: a missing demo user means the database was never seeded, which is a
 * deployment fault and must not be mistaken for "wrong credentials".
 */
export const resolveDemoUser = async (): Promise<SessionUser> => {
  const user = await findDemoUser();

  if (user === null) {
    throw domainError(
      'NOT_FOUND',
      'the demo user does not exist; run `pnpm db:seed` against this database',
    );
  }

  return user;
};

/**
 * Re-read the signed-in user from their own workspace (NFR-005). The cookie
 * carries ids, so they are verified against `businessId` on every use rather
 * than trusted; a token naming a user of another business resolves to `null`.
 */
export const getCurrentUser = async (
  businessId: string,
  userId: string,
): Promise<SessionUser | null> => findUserById(businessId, userId);

/**
 * Claims of the current request, or `null` when anonymous. Expiry, tampering and
 * absence are indistinguishable here on purpose (AC-001-12).
 */
export const getSession = async (): Promise<SessionClaims | null> => readSessionCookie();

/**
 * The guard. Throws `UNAUTHENTICATED` rather than redirecting: a service must not
 * know about HTTP. The boundary adapter maps the code to a redirect (pages) or to
 * a refusal (Server Actions), which is what spec §4 E-2 and E-3 require — and in
 * neither case does any work happen first.
 */
export const requireSession = async (): Promise<SessionClaims> => {
  const claims = await getSession();

  if (claims === null) {
    throw domainError('UNAUTHENTICATED', 'no valid session cookie');
  }

  return claims;
};

/**
 * Role check for the money-moving use cases of 005. 001 has a single `admin`
 * demo user, so this always passes today; it exists now so that the call site is
 * right from the start rather than retrofitted onto a transfer later.
 */
export const requireAdmin = async (): Promise<SessionClaims> => {
  const claims = await requireSession();

  if (claims.role !== 'admin') {
    throw domainError('FORBIDDEN', `role ${claims.role} may not perform this action`);
  }

  return claims;
};

/**
 * Sign in as the seeded demo user (FR-001): resolve the identity, then hand back
 * the claims for the adapter to sign and set as a cookie. The service does not
 * touch the cookie itself, so it stays testable without a request context.
 */
export const signInAsDemo = async (): Promise<SessionClaims> => {
  const user = await resolveDemoUser();

  if (user.role !== 'admin') {
    throw domainError('FORBIDDEN', 'the seeded demo user is not an admin');
  }

  return { userId: user.id, businessId: user.businessId, role: 'admin' };
};
