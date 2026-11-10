import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';

/**
 * The session (ADR-0004, plan §4.2): an HS256 JWT in an httpOnly cookie, 8
 * hours, **no refresh**. One hard-coded demo user, so there is nothing to
 * revoke and no session table to keep.
 *
 * Design rules that the tests pin:
 *
 *   - **`verifySession` returns `null` on *any* failure.** Absence, expiry,
 *     tampering, a foreign secret, `alg: none` and a validly-signed token with
 *     the wrong claim shape all collapse into one anonymous path (AC-001-12), so
 *     no error object and no stack trace can escape towards a browser.
 *   - **The secret is read on every call and never memoised.** A memoised secret
 *     would make the AC-001-19 guard vacuous: the module would keep working with
 *     a value captured before the variable was removed.
 *   - **No default secret, ever** (AC-001-19, Constitution Title III).
 *   - **`now` is injected into `signSession`**, so the expiry arithmetic is an
 *     ordinary unit test rather than a clock-mocking trick.
 *
 * `middleware.ts` imports only `SESSION_COOKIE` and `verifySession` from here —
 * both of which use nothing but `jose` and WebCrypto, so the edge bundle stays
 * clean (plan §8 R-9). `src/lib/env.ts` is deliberately **not** imported.
 */

export const SESSION_COOKIE = 'oakfern_session';

/** 8 hours, in seconds. ADR-0004: no refresh, no sliding window. */
export const SESSION_TTL_SECONDS = 8 * 60 * 60;

const MIN_SECRET_LENGTH = 32;

export interface SessionClaims {
  readonly userId: string;
  readonly businessId: string;
  readonly role: 'admin';
}

const encodedSecret = (): Uint8Array => {
  const secret = process.env.SESSION_SECRET;

  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `SESSION_SECRET is missing or shorter than ${String(MIN_SECRET_LENGTH)} characters. There is no default: generate one with \`openssl rand -base64 32\` and set it in .env.local and in the hosting environment.`,
    );
  }

  return new TextEncoder().encode(secret);
};

export const signSession = async (claims: SessionClaims, now: Date): Promise<string> => {
  const issuedAt = Math.floor(now.getTime() / 1000);

  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + SESSION_TTL_SECONDS)
    .sign(encodedSecret());
};

/** Narrow an unknown JWT payload to `SessionClaims`, or fail. */
const toClaims = (payload: Record<string, unknown>): SessionClaims | null => {
  const { userId, businessId, role } = payload;

  if (typeof userId !== 'string' || userId === '') {
    return null;
  }

  if (typeof businessId !== 'string' || businessId === '') {
    return null;
  }

  if (role !== 'admin') {
    return null;
  }

  return { userId, businessId, role };
};

export const verifySession = async (token: string): Promise<SessionClaims | null> => {
  if (token === '') {
    return null;
  }

  try {
    // `algorithms` is not optional in practice: without it a token could choose
    // its own algorithm, which is the classic JWT confusion attack.
    const { payload } = await jwtVerify(token, encodedSecret(), { algorithms: ['HS256'] });

    return toClaims(payload as Record<string, unknown>);
  } catch {
    return null;
  }
};

export interface SessionCookieOptions {
  readonly httpOnly: true;
  readonly secure: boolean;
  readonly sameSite: 'lax';
  readonly path: '/';
  readonly maxAge: number;
}

/**
 * The cookie attributes of FR-001 / AC-001-09. `SameSite=Lax` rather than
 * `Strict` because the sign-in flow navigates top-level and `Strict` would drop
 * the cookie on a cross-site entry; `Lax` still blocks the cross-site POST that
 * CSRF needs. `secure` is off only for local http, never in production.
 */
export const sessionCookieOptions = (
  nodeEnv: string | undefined = process.env.NODE_ENV,
): SessionCookieOptions => ({
  httpOnly: true,
  secure: nodeEnv === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: SESSION_TTL_SECONDS,
});

export const setSessionCookie = async (token: string): Promise<void> => {
  const store = await cookies();

  store.set(SESSION_COOKIE, token, sessionCookieOptions());
};

export const clearSessionCookie = async (): Promise<void> => {
  const store = await cookies();

  store.set(SESSION_COOKIE, '', { ...sessionCookieOptions(), maxAge: 0 });
};

/** The verified claims of the current request, or `null` when anonymous. */
export const readSessionCookie = async (): Promise<SessionClaims | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (token === undefined) {
    return null;
  }

  return verifySession(token);
};
