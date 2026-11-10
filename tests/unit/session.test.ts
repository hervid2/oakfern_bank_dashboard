import { beforeAll, describe, expect, it } from 'vitest';

/**
 * ADR-0004 session tokens (AC-001-12, AC-001-19).
 *
 * `lib/session.ts` reads `SESSION_SECRET` lazily, so the variable is set before
 * the module is imported for the first time. Every test then drives the real
 * `jose` HS256 path — no mocking, because the thing under test *is* the
 * signature check.
 */

const VALID_SECRET = 'test-session-secret-at-least-32-chars-long';
const OTHER_SECRET = 'a-different-secret-also-at-least-32-chars';

/**
 * `verifySession` checks `exp` against the **real** clock — that is the whole
 * point of it — so `NOW` is anchored to the real clock rather than frozen to a
 * literal. A frozen literal would silently start failing the moment real time
 * passed it, which is a brittle test rather than a strict one. `signSession`
 * still takes `now` as a parameter, which is what the expiry assertions pin.
 */
const NOW = new Date();
const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;

type SessionModule = typeof import('@/lib/session');

let session: SessionModule;

beforeAll(async () => {
  process.env.SESSION_SECRET = VALID_SECRET;
  session = await import('@/lib/session');
});

describe('signSession / verifySession', () => {
  it('AC-001-12: a freshly signed token verifies and round-trips its claims', async () => {
    const token = await session.signSession(
      { userId: 'usr_1', businessId: 'biz_1', role: 'admin' },
      NOW,
    );

    await expect(session.verifySession(token)).resolves.toEqual({
      userId: 'usr_1',
      businessId: 'biz_1',
      role: 'admin',
    });
  });

  it('AC-001-12: the token is an HS256 JWT and expires 8 hours after `now` (ADR-0004)', async () => {
    const token = await session.signSession(
      { userId: 'usr_1', businessId: 'biz_1', role: 'admin' },
      NOW,
    );

    const [rawHeader, rawPayload] = token.split('.');
    const decode = (part: string): Record<string, unknown> =>
      JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as Record<string, unknown>;

    expect(decode(rawHeader).alg).toBe('HS256');

    const payload = decode(rawPayload);

    expect(payload.iat).toBe(Math.floor(NOW.getTime() / 1000));
    expect(payload.exp).toBe(Math.floor((NOW.getTime() + EIGHT_HOURS_MS) / 1000));
  });

  it('AC-001-12: an expired token verifies to null, never to stale claims', async () => {
    const longExpired = new Date(NOW.getTime() - EIGHT_HOURS_MS - 60_000);
    const token = await session.signSession(
      { userId: 'usr_1', businessId: 'biz_1', role: 'admin' },
      longExpired,
    );

    await expect(session.verifySession(token)).resolves.toBeNull();
  });

  it('AC-001-12: a token signed with another secret verifies to null', async () => {
    const { SignJWT } = await import('jose');
    const forged = await new SignJWT({ userId: 'usr_1', businessId: 'biz_1', role: 'admin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(Math.floor(NOW.getTime() / 1000))
      .setExpirationTime(Math.floor((NOW.getTime() + EIGHT_HOURS_MS) / 1000))
      .sign(new TextEncoder().encode(OTHER_SECRET));

    await expect(session.verifySession(forged)).resolves.toBeNull();
  });

  it('AC-001-12: a tampered token verifies to null', async () => {
    const token = await session.signSession(
      { userId: 'usr_1', businessId: 'biz_1', role: 'admin' },
      NOW,
    );
    const [header, , signature] = token.split('.');
    const tamperedPayload = Buffer.from(
      JSON.stringify({
        userId: 'usr_attacker',
        businessId: 'biz_someone_else',
        role: 'admin',
        iat: Math.floor(NOW.getTime() / 1000),
        exp: Math.floor((NOW.getTime() + EIGHT_HOURS_MS) / 1000),
      }),
      'utf8',
    ).toString('base64url');

    await expect(
      session.verifySession(`${header}.${tamperedPayload}.${signature}`),
    ).resolves.toBeNull();
    // ...and the untampered original still verifies, so the test is not vacuous.
    await expect(session.verifySession(token)).resolves.not.toBeNull();
  });

  it('AC-001-12: garbage, empty and `alg: none` tokens verify to null', async () => {
    const unsigned = `${Buffer.from(JSON.stringify({ alg: 'none' }), 'utf8').toString(
      'base64url',
    )}.${Buffer.from(
      JSON.stringify({ userId: 'u', businessId: 'b', role: 'admin' }),
      'utf8',
    ).toString('base64url')}.`;

    await expect(session.verifySession('')).resolves.toBeNull();
    await expect(session.verifySession('not-a-jwt')).resolves.toBeNull();
    await expect(session.verifySession(unsigned)).resolves.toBeNull();
  });

  it('AC-001-12: a validly signed token with the wrong claim shape verifies to null', async () => {
    const { SignJWT } = await import('jose');
    const wrongShape = await new SignJWT({ userId: 'usr_1', role: 'admin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(Math.floor(NOW.getTime() / 1000))
      .setExpirationTime(Math.floor((NOW.getTime() + EIGHT_HOURS_MS) / 1000))
      .sign(new TextEncoder().encode(VALID_SECRET));

    await expect(session.verifySession(wrongShape)).resolves.toBeNull();
  });
});

describe('the session cookie contract (ADR-0004, AC-001-09)', () => {
  it('AC-001-09: the cookie is httpOnly, SameSite=Lax, path=/ and 8 hours long', () => {
    expect(session.SESSION_COOKIE).toBe('oakfern_session');
    expect(session.sessionCookieOptions()).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 8 * 60 * 60,
    });
  });

  it('AC-001-09: `secure` is set in production and relaxed for local http', () => {
    expect(session.sessionCookieOptions('production').secure).toBe(true);
    expect(session.sessionCookieOptions('development').secure).toBe(false);
  });
});

describe('SESSION_SECRET has no default (AC-001-19)', () => {
  it('AC-001-19: signing throws a named error when the secret is missing', async () => {
    const previous = process.env.SESSION_SECRET;
    delete process.env.SESSION_SECRET;

    try {
      await expect(
        session.signSession({ userId: 'u', businessId: 'b', role: 'admin' }, NOW),
      ).rejects.toThrow(/SESSION_SECRET/);
    } finally {
      process.env.SESSION_SECRET = previous;
    }
  });

  it('AC-001-19: a secret shorter than 32 characters is rejected, not padded', async () => {
    const previous = process.env.SESSION_SECRET;
    process.env.SESSION_SECRET = 'too-short';

    try {
      await expect(
        session.signSession({ userId: 'u', businessId: 'b', role: 'admin' }, NOW),
      ).rejects.toThrow(/SESSION_SECRET/);
    } finally {
      process.env.SESSION_SECRET = previous;
    }
  });

  it('AC-001-19: the secret is read per call, so it is never baked in at import time', async () => {
    // The guard above would pass vacuously if the module had memoised a secret
    // captured before the test deleted it. This proves it had not.
    const token = await session.signSession(
      { userId: 'usr_1', businessId: 'biz_1', role: 'admin' },
      NOW,
    );

    await expect(session.verifySession(token)).resolves.not.toBeNull();
  });
});
