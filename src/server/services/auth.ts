import { domainError } from '@/server/domain/errors';
import { findDemoUser, findUserById, type SessionUser } from '@/server/repositories/users';

/**
 * Authentication use cases (plan §2.4).
 *
 * This file holds the parts that do not touch a cookie: resolving who the demo
 * user is, and re-reading a user inside their own workspace. The cookie-facing
 * half — `signInAsDemo`, `requireSession`, `requireAdmin` — is added in T-08,
 * once `src/lib/session.ts` exists and there is a `SessionClaims` type to pass
 * around. Keeping the split means a service never invents its own session shape.
 *
 * ADR-0001: no Prisma here, no Next here. Repositories do the reading.
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
