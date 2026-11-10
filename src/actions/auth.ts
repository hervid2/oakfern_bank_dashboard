'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';

import { clearSessionCookie, setSessionCookie, signSession } from '@/lib/session';
import { signInAsDemo as signInAsDemoUseCase } from '@/server/services/auth';

/**
 * Authentication Server Actions (plan §4.4) — thin adapters, nothing more:
 * validate with Zod, call a service, map the result (ADR-0001).
 *
 * The schemas are `z.object({})` because neither action takes input. That is not
 * ceremony: a Server Action is a public POST endpoint, and parsing the payload
 * means an attacker cannot smuggle extra fields into a future version of this
 * function. It also makes the NFR-005 rule "every server input goes through Zod"
 * literally true with no exceptions to remember.
 *
 * `redirect()` throws by design in Next, hence the `Promise<never>` returns and
 * the absence of any code after the call.
 */

const noInput = z.object({});

export async function signInAsDemo(): Promise<never> {
  noInput.parse({});

  const claims = await signInAsDemoUseCase();

  // `now` is injected into `signSession`, so the 8 h expiry is pinned by a unit
  // test rather than by whatever the server clock happens to be at review time.
  await setSessionCookie(await signSession(claims, new Date()));

  redirect('/home');
}

export async function signOut(): Promise<never> {
  noInput.parse({});

  await clearSessionCookie();

  redirect('/');
}
