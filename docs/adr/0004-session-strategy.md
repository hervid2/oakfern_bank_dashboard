# ADR-0004 — Session strategy: signed JWT in an httpOnly cookie

- **Status:** **Accepted** — approved as written by the human (Technical Director) at 🚦 G-Foundational on 2026-11-09, with no changes requested.
- **Date:** 2026-11-09
- **Relates to:** FR-001, FR-002, FR-003, FR-003b, NFR-005, ASM-018, `docs/requirements/roles-permissions.md`

## Context

| Force | Detail |
|---|---|
| FR-001 | The evaluator must reach the dashboard in **one click** with no credentials typed. |
| FR-002 | Every request must resolve `{ userId, businessId, role }` server-side, and every data access must be scoped by `businessId` (anti-IDOR). |
| NFR-005 | Session cookie must be `httpOnly` + `Secure` + `SameSite=Lax`; authorization enforced in every Server Action and Route Handler, never only in the UI. |
| GENESIS G3 rule | Authentication uses a proven provider or library — **never homemade cryptography**. |
| Scope | Exactly one seeded demo user, one shared demo business (ASM-012). No registration, no password reset, no MFA (brief "Won't"). |
| Deadline | Auth must cost well under an hour, inside feature 001's 2 h 30 min timebox. |
| Topology | One Vercel deployment (ADR-0006), so there is no cross-domain cookie problem to solve. |

## Options considered

| Option | Pros | Cons | Fit with NFRs and the deadline |
|---|---|---|---|
| **Signed JWT (jose, HS256) in an httpOnly cookie** | Stateless, no session table, no extra round trip; `jose` works in the edge runtime so middleware can gate routes; ~40 lines total; the human already knows JWT | Revocation needs a deny-list or a short lifetime (irrelevant for a single demo user); the secret must be managed as an environment variable | ✅ **Chosen.** Smallest correct implementation that satisfies NFR-005 |
| Auth.js / NextAuth | Batteries included; providers; CSRF handled | Substantial configuration surface and its own database adapter for a single hard-coded demo user; more to break at hour 20; its abstractions would obscure the authorization story the evaluator is meant to see | ⚠️ Overkill, rejected |
| Database-backed opaque session (session table) | Instant revocation; easy to list sessions | One extra DB read per request (and Neon autosuspend makes every avoidable read worth avoiding, ADR-0006); a table and repository to build for no demo benefit | ⚠️ Rejected at this scope; the right answer for a real product |
| `iron-session` (encrypted cookie) | Encrypts rather than only signs; simple API | One more dependency with no benefit here: the payload holds no secrets, only ids and a role | ⚠️ Rejected |
| Homemade HMAC signing | "No dependency" | **Forbidden** — GENESIS G3 explicitly bans homemade cryptography | ❌ |

## Decision

1. **Library:** `jose` (pinned per ADR-0002), **HS256**, secret from `SESSION_SECRET` (environment variable; documented in `.env.example`; never in the repository — Art. 8).
2. **Transport:** one cookie, `oakfern_session`, with `httpOnly: true`, `secure: true` (in every deployed environment), `sameSite: 'lax'`, `path: '/'`.
3. **Payload (claims):** `sub` = `userId`, `bid` = `businessId`, `role` = `'admin'`, plus `iat` and `exp`. **Nothing else** — no email, no name, no amounts. The payload is signed, not encrypted, so it is treated as readable by the holder.
4. **Lifetime:** **8 hours**, no refresh token (ASM-018). Comfortably longer than any evaluation session; FR-003b covers expiry mid-flow by redirecting to UI-01 with an explanation and executing nothing.
5. **Creation:** the `signInAsDemo` Server Action looks up the seeded demo user, mints the token and sets the cookie, then redirects to UI-02 (FR-001). If the credentials form variant is built, it verifies a `bcryptjs` hash first and then takes the same path.
6. **Enforcement — two layers, neither optional:**
   - **Middleware** (edge runtime) verifies the signature and redirects unauthenticated requests away from `(app)` routes. This is a convenience, not the security boundary.
   - **A server guard** `requireSession()` / `requireAdmin()` re-verifies the token and returns `{ userId, businessId, role }`. **Every** Server Action and Route Handler calls it before doing any work, and every repository method takes `businessId` as a required argument. This is the real security boundary (NFR-005, DV-1).
7. **Sign-out:** clears the cookie and redirects to UI-01 (FR-003). No server-side state to clean up.
8. **Role:** carried as a claim. There is no action, UI or API that changes it, so role elevation is not reachable (`roles-permissions.md`). Adding the future `viewer` role means seeding a second user, not adding a switcher.
9. **Logging:** the token is never logged, never written to `MEMORY.md`, never included in an error message (NFR-009).

Rationale in one sentence (SP-7): a signed JWT in an httpOnly cookie is the least machinery that
satisfies NFR-005 and works unchanged in the edge middleware, while leaving the authorization story
visible to the evaluator in plain code — the discarded alternative, Auth.js, would add a large
configuration surface to authenticate a single hard-coded demo user.

## Consequences

**Positive**
- One-click demo login (FR-001) with a real, standards-based session rather than a fake flag.
- No database read on the hot path, which matters under Neon autosuspend (ADR-0006).
- The guard is a single function, so Reviewer C can verify "every Server Action calls it" mechanically, and an integration test per action can assert the unauthenticated case (NFR-005).
- Stateless sessions survive redeployments, so an evaluator's session is not broken by a merge to `main`.

**Negative**
- No instant revocation: a leaked token is valid until `exp`. Acceptable — the token grants access to a shared, fully fictional demo workspace with a reset button.
- The payload is readable (signed, not encrypted) by anyone holding the cookie, so it must stay free of anything sensitive. Enforced by the claim list above.
- `SESSION_SECRET` must exist in local, Preview and Production environments; a missing secret must fail loudly at boot rather than fall back to a default (a default secret would be a security bug).

**Risks**
| Risk | Mitigation |
|---|---|
| Authorization enforced only in middleware (a classic Next.js mistake) | The guard in every action/handler is mandatory; Reviewer C checks every entry point; one integration test per protected resource calls it without a session and expects refusal |
| Session expires mid-flow during the evaluator's walkthrough | 8 h lifetime; FR-003b handles expiry gracefully with no partial money movement |
| A hard-coded or committed fallback secret | `.env.example` documents the key with no value; the app throws on a missing `SESSION_SECRET`; `git grep` for secret patterns is part of the NFR-005 check |
| CSRF on Server Actions | `SameSite=Lax` plus Next.js Server Action origin checks; money mutations additionally require an idempotency key minted in the opened dialog (BR-006) |

**What would make us reconsider**
- Multiple real users, invitations or MFA (then: Auth.js or a managed provider, plus a session table).
- A need to revoke sessions instantly (then: a database-backed session or a short-lived token with a refresh flow).
- A separately deployed API (ADR-0001 option B), which would introduce cross-domain cookie concerns and likely a bearer-token flow.
