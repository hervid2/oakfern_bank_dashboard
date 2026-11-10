import { prisma } from './client';

/**
 * User reads (plan §2.3).
 *
 * **NFR-005, the anti-IDOR rule:** every exported function here takes
 * `businessId` as its **first** parameter and passes it into the Prisma `where`.
 * A client-supplied id is never trusted on its own.
 *
 * `findDemoUser()` is the **single documented exception** in the whole data
 * layer, because it is what *establishes* the session's business and therefore
 * cannot be scoped by one. It is hard-scoped to the seeded demo email instead,
 * so it can only ever return that one row.
 */

/**
 * ⚠️ Must match `DEMO_USER.email` in `prisma/seed/catalog.ts`. The constant is
 * duplicated rather than imported because `prisma/seed` must not be part of the
 * application bundle. Drift is caught by the integration test that asserts
 * `findDemoUser()` returns a row against a freshly seeded database — a red test
 * rather than a silent sign-in failure in production.
 */
export const DEMO_USER_EMAIL = 'ada.whitfield@oakfern.example';

export interface SessionUser {
  readonly id: string;
  readonly businessId: string;
  readonly email: string;
  readonly name: string;
  readonly role: 'admin' | 'viewer';
}

const sessionUserSelect = {
  id: true,
  businessId: true,
  email: true,
  name: true,
  role: true,
} as const;

/**
 * The one-click demo user (FR-001). No `businessId` argument by design — see the
 * module comment. Returns `null` when the database has not been seeded, which
 * the caller surfaces as a failed sign-in rather than as a crash.
 */
export const findDemoUser = async (): Promise<SessionUser | null> =>
  prisma.user.findUnique({
    where: { email: DEMO_USER_EMAIL },
    select: sessionUserSelect,
  });

/** Scoped read: a user id from a cookie is only honoured inside its own workspace. */
export const findUserById = async (
  businessId: string,
  userId: string,
): Promise<SessionUser | null> =>
  prisma.user.findFirst({
    where: { businessId, id: userId },
    select: sessionUserSelect,
  });
