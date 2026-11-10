# Plan — Spec 001 (domain-data-shell)

Spec: `specs/001-domain-data-shell/spec.md` **v0.2** · Branch: `feat/001-domain-data-shell`
Template D.20 · Sprint Profile · Planner, 2026-11-09 22:4x ET
Revised to fold in the five carry-ins from `specs/000-walking-skeleton/validation.md` §6.

> Layering is **ADR-0001, one direction only**: `src/server/domain` (pure) → `services` →
> `repositories` (the only layer importing Prisma) → `app` / `actions` as thin Zod adapters.
> ESLint already enforces all four boundaries for both `@prisma/client` **and** the generated client
> at `src/generated/prisma` (000 `eslint.config.mjs`). Nothing in this plan may weaken that.

---

## 1. Technical approach (and discarded alternatives)

### 1.0 Before anything else — the 000 carry-ins

`specs/000-walking-skeleton/validation.md` §6 is an input to this plan. Two items change the task
order:

**(a) The Prisma singleton production defect comes first, ahead of the schema.** Today's
`src/server/repositories/client.ts` has:

```ts
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get: (_target, property) => {
    const client = getPrismaClient();   // ← runs on EVERY property access
    …
```

and `getPrismaClient()` only memoises into `globalThis` when `NODE_ENV !== 'production'`. In
production, therefore, every `prisma.x` access constructs a new `PrismaClient` and a new `pg` pool
and never closes it. The 000 reviewer **measured** it: `pg_stat_activity` client backends went 1 → 27
over 26 requests.

The fix is a **module-level memo**:

```ts
let client: PrismaClient | undefined;           // process-local, works in production

const getPrismaClient = (): PrismaClient => {
  if (client) return client;                    // ← the missing line
  const existing = globalForPrisma.prisma;      // dev hot-reload branch, unchanged
  if (existing) { client = existing; return client; }
  client = createPrismaClient();
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = client;
  return client;
};
```

It must land **before** the schema work, because from 001 onward every request touches the database,
and it must ship with a regression test (`tests/unit/client.test.ts`) that asserts the factory runs
once across repeated property access. Scope discipline: nothing else in that file changes — no
`$disconnect`, no pool tuning (ASM-001-17).

**(b) 000's AC-000-12a is dead and is replaced by AC-001-23.** 001's PR must produce a real Vercel
**Preview**, verified before merge. That is a hard requirement on T-16, not a nice-to-have, because
it is the only remaining way to close that criterion.

### 1.1 Shape of the work

Six layers, built **bottom-up on purpose** so that the valuable half exists first (ordering rule in `tasks.md`):

```
client singleton fix + doc corrections ──► schema + migration ──►
domain primitives (money, time, balances) ──► seed ──►
env + repositories + services ──► session + guard + middleware ──► shell + routes + states
```

| Decision | Chosen | Discarded alternative | Why |
|---|---|---|---|
| Migration strategy | **One** migration that drops `SkeletonCheck` and creates the whole domain model | Two migrations (drop, then create) | A single migration is one atomic unit to deploy to Neon and one thing to roll back. The drop carries no business data (000 ASM-023) |
| Balances | **Derived** by `computeBalances` in the domain; no column on `Account` | A cached `balanceCents` column kept in sync | A stored balance is exactly the BR-002 defect class. Derivation is also fast enough: 1,800 rows, indexed by `(businessId, accountId, postedAt)` |
| Time zone | `date-fns` + `@date-fns/tz` `TZDate` in a single `domain/time.ts`, `now` injected | Hand-rolled `Intl` offset arithmetic ("don't add it") | BR-009's DST examples are where hand-rolled offset maths breaks; both packages were already approved/listed (ASM-001-11) |
| Session | `jose` HS256 JWT in an httpOnly cookie + a `requireSession()` guard, enforced twice (middleware for UX, guard as the boundary) | Auth.js; a session table | ADR-0004, already Accepted. ~40 lines against a large configuration surface for one hard-coded demo user |
| Seed runner | `node --experimental-strip-types prisma/seed.ts`, 5-minute experiment budget, `tsx@4.23.15` pre-authorised fallback | Add `tsx` immediately; compile the seed with `tsc` | Art. 10 "don't add it" first, exactly as 000 handled `dotenv`. Bounded so the experiment cannot eat the timebox (ASM-001-12) |
| Determinism | The seed mints **every id and every timestamp itself** from the seeded faker and a single `runDay` anchor | Rely on `@default(cuid())` / `@default(now())` | Database defaults are non-deterministic, which would make FR-036 unverifiable (ASM-001-03) |
| Shell components | `shadcn@4.23.0` init + 5 primitives | Hand-write everything | A focus-trapped, `Esc`-dismissible sheet is more risk hand-rolled (ASM-001-13) |
| Theme | `next-themes@0.4.6` | Hand-rolled no-flash script | FR-005's acceptance condition is "no unstyled flash" (ASM-001-10) |
| Production migration | Human-run `prisma migrate deploy` against `DIRECT_DATABASE_URL` | A step in the Vercel build; a CI job on `main` | Art. 9 wants a human present for the first production migration; both alternatives also need the direct URL stored in a second place (ASM-001-15, TD-012) |

### 1.2 What 001 deliberately builds that 002 will consume

`domain/money.ts`, `domain/time.ts`, `domain/balances.ts`, `lib/format.ts`, the
`businessId`-scoped repositories and `services/accounts.getAccountBalances`. These are **not**
scope creep: the seed cannot place transactions in ET months, guarantee the BR-002 invariant or hit
FR-036's 14–24-month runway without them, and AC-001-05/07/08 are unverifiable without them.
What 001 does **not** build is any KPI, burn or runway *service* — that is 002.

## 2. Files to create / modify

### 2.1 Schema, migration, configuration

| Path | Action | Reason |
|---|---|---|
| `prisma/schema.prisma` | **modify** (replace `SkeletonCheck` with the 8 models + 8 enums + indexes) | §6.1 of the spec |
| `prisma/migrations/<ts>_domain_model/migration.sql` | create (generated) | AC-001-01 |
| `prisma/migrations/<ts>_domain_model/down.sql` | create (hand-written, **not** run by Prisma) | Rollback strategy §3.3 |
| `prisma.config.ts` | modify — CLI url prefers `DIRECT_DATABASE_URL`, add `migrations.seed` | §3.4, AC-001-21 |
| `package.json` | modify — real `db:seed`, `db:reset`, new deps | AC-001-20 |
| `.env.example` | modify — add empty `SESSION_SECRET`, `DIRECT_DATABASE_URL` placeholders **and correct the host port 5432 → 5433** | AC-001-19, AC-001-20 |
| `src/server/repositories/client.ts` | **modify — the production singleton fix (module-level memo)** | 🔴 AC-001-22 |
| `tests/unit/client.test.ts` | create — regression test: the factory runs once across repeated property access | AC-001-22 |
| `src/app/icon.svg` | create — favicon, so a production page load logs no `/favicon.ico` 404 | AC-001-24 |
| `src/app/%5Fdev/boom/page.tsx` | modify — `notFound()` when `NODE_ENV === 'production'` | AC-001-24 |
| `vitest.config.ts` | modify — turn on the 80 % coverage threshold for `src/server/domain` | ASM-001-14, NFR-007 |
| `AGENTS.md` | modify — correct the "Project commands" table, remove the UNVERIFIED warning | AC-001-20 (carried from 000 T-14) |
| `docs/domain/model.md` | modify — one-line clarification that the ACH/wire sign invariant binds user-created movements only | ASM-001-06 |
| `docs/traceability.md` | modify — AC-001-01…24 → test rows, **and fix line 64's citation of the non-existent `tests/e2e/error-states.spec.ts`** (only `tests/e2e/health.spec.ts` exists) | Art. 3, AC-001-20 |
| `docs/roadmap.md` | modify — 001 status, TD-011 / TD-012 rows | — |

### 2.2 Domain (pure TypeScript — no Next, no Prisma, no `process.env`, no `new Date()`)

| Path | Action | Exports |
|---|---|---|
| `src/server/domain/money.ts` | create | `parseMoneyToCents(input: string): number`, `sumCents(values: number[]): number`, `assertSafeCents(v: number): void`, `directionOf(cents: number): 'in' \| 'out'` |
| `src/server/domain/time.ts` | create | `BUSINESS_TIME_ZONE`, `startOfBusinessDay(now, offsetDays?)`, `startOfBusinessMonth(now, offsetMonths?)`, `lastNDaysRange(now, n)`, `lastNMonthsRange(now, n)`, `monthKeyOf(instant)`, `dayKeyOf(instant)`, `closedMonthsBefore(now, n)` — all half-open `[start, end)`, all taking `now: Date` as an argument |
| `src/server/domain/balances.ts` | create | `computeBalances(rows: BalanceRow[]): { currentBalanceCents, availableBalanceCents }`, `assertBalanceInvariant(...)` |
| `src/server/domain/errors.ts` | create | `DomainError` union: `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, plus a `domainError(code, message)` factory |

### 2.3 Repositories (the **only** Prisma importers; every method takes `businessId`)

| Path | Action | Methods |
|---|---|---|
| `src/server/repositories/users.ts` | create | `findDemoUser()` (by the seeded email; the one method with no `businessId`, because it *establishes* it), `findUserById(businessId, userId)` |
| `src/server/repositories/accounts.ts` | create | `listAccounts(businessId)` |
| `src/server/repositories/transactions.ts` | create | `listBalanceRows(businessId, accountId?)` — selects only `{ accountId, amountCents, status }` |
| `src/server/repositories/health.ts` | unchanged | — |

### 2.4 Services

| Path | Action | Use cases |
|---|---|---|
| `src/server/services/auth.ts` | create | `signInAsDemo()` → claims; `getCurrentUser(session)`; `requireSession()`; `requireAdmin()` |
| `src/server/services/accounts.ts` | create | `getAccountBalances(businessId)` — joins `listAccounts` + `listBalanceRows` through `computeBalances`. The single source of truth for a balance (NFR-011) |

### 2.5 Boundary (`app/`, `actions/`, `lib/`) — thin adapters only

| Path | Action | Reason |
|---|---|---|
| `src/lib/env.ts` | create | Zod schema over `DATABASE_URL`, `DIRECT_DATABASE_URL?`, `SESSION_SECRET` (min 32). Fails loudly, no defaults (AC-001-19) |
| `src/lib/session.ts` | create | `jose` sign/verify + cookie read/write/clear. The only file that touches `SESSION_SECRET` |
| `src/lib/format.ts` | create | `formatCents`, `formatCompactCents` (chart axes only), `formatBusinessDate` |
| `src/actions/auth.ts` | create | `signInAsDemo`, `signOut` Server Actions — Zod parse → service → cookie → `redirect()` |
| `middleware.ts` | create | Verifies the cookie signature on `(app)` paths and redirects anonymous requests to `/` |
| `src/app/page.tsx` | **replace** | UI-01 landing (was the 000 placeholder) |
| `src/app/layout.tsx` | modify | Wrap in `ThemeProvider`, add `suppressHydrationWarning` on `<html>` |
| `src/app/error.tsx`, `src/app/not-found.tsx` | unchanged | Root-level copies already satisfy FR-039 at the root |
| `src/app/(app)/layout.tsx` | create | `requireSession()` → shell |
| `src/app/(app)/home/page.tsx` + `loading.tsx` | create | UI-02 placeholder + skeleton |
| `src/app/(app)/transactions/page.tsx` + `loading.tsx` | create | UI-03 placeholder + skeleton |
| `src/app/(app)/accounts/page.tsx` + `loading.tsx` | create | placeholder + skeleton |
| `src/app/(app)/payments/page.tsx` + `loading.tsx` | create | UI-06 placeholder + skeleton |
| `src/app/(app)/cards/page.tsx` + `loading.tsx` | create | UI-07 honest "not in this round" state |
| `src/app/(app)/error.tsx`, `src/app/(app)/not-found.tsx` | create | Segment-level states **inside** the shell (AC-001-16, AC-001-17) |
| `src/app/%5Fdev/boom/page.tsx` | modify | Still triggers the root error boundary locally, but calls `notFound()` under `NODE_ENV === 'production'` (AC-001-24) |
| `src/app/(app)/_dev/boom/page.tsx` | create | Throws on render so AC-001-16 is executable **inside** the shell |

### 2.6 Components (presentational; may **not** import `src/server`, may **not** do money arithmetic)

| Path | Action |
|---|---|
| `src/components/ui/{button,sheet,dropdown-menu,separator,skeleton}.tsx` | create (shadcn, copied into the repo) |
| `src/components/brand/wordmark.tsx` | create — inline SVG mark + `oakfern` wordmark, no raster asset |
| `src/components/shell/app-sidebar.tsx` | create — the 5 FR-004 items, `aria-current` |
| `src/components/shell/mobile-nav.tsx` | create — the same items inside a `Sheet` (FR-006) |
| `src/components/shell/topbar.tsx` | create — menu button, theme toggle, user menu, "Move money" CTA |
| `src/components/shell/nav-items.ts` | create — the single nav definition both consume |
| `src/components/shell/theme-toggle.tsx` | create |
| `src/components/theme-provider.tsx` | create — `next-themes` wrapper |
| `src/components/states/{empty-state,error-state,section-placeholder}.tsx` | create — reused by every route (NFR-010) |

### 2.7 Seed and tests

| Path | Action |
|---|---|
| `prisma/seed.ts` | create — orchestrator |
| `prisma/seed/{catalog.ts,generate.ts,write.ts,checks.ts,hash.ts}` | create — static catalogue, pure generator, writer, self-checks, content hash |
| `tests/unit/money.test.ts`, `balances.test.ts`, `time.test.ts`, `session.test.ts` | create |
| `tests/integration/seed.test.ts`, `scoping.test.ts` | create |
| `tests/e2e/shell.spec.ts` | create |
| `tests/helpers/db.ts` | create — truncate + fixture helpers for the two-business anti-IDOR fixture |

## 3. Data changes and migrations (with rollback strategy)

### 3.1 Enums

```
UserRole            admin | viewer
AccountType         checking | savings | treasury
TransactionStatus   pending | posted | canceled | failed
TransactionMethod   ach | wire | card | internal | check | fee | interest
CounterpartyKind    recipient | merchant
CardFormFactor      virtual | physical
CardStatus          active | frozen
CategoryDirection   in | out | both
```

### 3.2 Model notes that will otherwise be got wrong

| Point | Instruction |
|---|---|
| Ids | `@id @default(cuid())`. **Verify with `prisma validate` at implementation time**; if Prisma 7 rejects it, use `@default(uuid(7))` and note it here. The seed overrides ids anyway (ASM-001-03) |
| Money | `amountCents Int`, `monthlyLimitCents Int`. **Never** `Float`, `Decimal` or `BigInt` (AC-001-02) |
| No balance columns | `Account` has none. Deliberate (BR-002) |
| `Transfer` ↔ `Transaction` | One-to-many from `Transfer` with exactly 2 legs enforced by the service and the seed, **not** by the schema. Modelling it as two nullable one-to-one relations would make the "sum to zero" query awkward |
| Self-relations on `Account` | `Transfer.sourceAccountId` and `destinationAccountId` both point at `Account`, so both need explicit relation names (`TransferSource`, `TransferDestination`) or Prisma cannot disambiguate |
| `onDelete` | `Cascade` from `Business` to everything it owns, so a reset is one statement per table; `Restrict` from `Category` (global rows must not be deletable while referenced) |
| Currency | `currency String @default("USD")` — a column for honesty about scope, fixed in value |
| `@@map` | **Not used.** Table names stay as the models, matching 000's convention |

### 3.3 Rollback strategy

| Scenario | Action |
|---|---|
| Local, migration is wrong before commit | `pnpm prisma migrate reset --force` (Docker database is disposable), fix the schema, re-run `migrate dev`. Nothing is published |
| Local, migration already committed | `prisma migrate resolve --rolled-back <name>`, then apply the hand-written `down.sql` (committed in the migration folder), then a new corrective migration. **Prisma has no `migrate down`** — the `down.sql` exists precisely because of that |
| Neon / production | Apply `down.sql` through the Neon SQL editor or `psql` on `DIRECT_DATABASE_URL`, then `prisma migrate resolve --rolled-back`. **Data loss is acceptable and expected:** every row in Neon is generated demo data recreated by `pnpm db:seed` in under a minute (TD-010, TD-006) |
| The `SkeletonCheck` drop | Irreversible in practice and harmless: the table holds only 000's proof rows. `down.sql` recreates its two-column shape for completeness |
| Neon safety net | Neon's branch/restore feature is a documented contingency (RSK-07); not relied on |

`down.sql` content: `DROP TABLE` for the 8 tables in reverse FK order, `DROP TYPE` for the 8 enums,
then `CREATE TABLE "SkeletonCheck"` as 000 defined it.

### 3.4 ⚠️ Operational fact #1 — the migration must reach Neon, and the pooled URL cannot do it

| Point | Detail |
|---|---|
| The problem | Vercel's `DATABASE_URL` is Neon's **pooled** (PgBouncer, `-pooler` in the host) string. It is correct for the runtime client, but `prisma migrate deploy` needs session-level features — advisory locks and non-pipelined DDL — that a transaction-pooled connection does not provide. Running `migrate deploy` through it fails or, worse, half-applies |
| The fix | A **second** variable, `DIRECT_DATABASE_URL`, holding Neon's **direct / unpooled** string (the same host **without** `-pooler`). `prisma.config.ts` resolves the CLI datasource as `process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL`, so the CLI uses the direct string whenever it exists while `src/server/repositories/client.ts` keeps reading `DATABASE_URL` for the runtime pool. **One line in one file, and every CLI command is correct forever** |
| Secondary benefit | It also removes 000's `PrismaConfigEnvError` foot-gun: resolving the value in plain TypeScript with our own clear error beats `env()` aborting `pnpm install` whenever the variable is absent (000 T-12 carry-forward) |
| Risk | `defineConfig`'s `datasource.url` may insist on the `env()` marker rather than a plain string. **Verify by running `pnpm db:generate` immediately after the edit.** Fallback: keep `env('DATABASE_URL')` and have the human export `DATABASE_URL=<direct string>` for the one `migrate deploy` invocation — documented in the README either way |
| **Where `migrate deploy` runs for production** | **From the developer machine, by the human**, as task T-14: `DIRECT_DATABASE_URL` in `.env.local` → `pnpm exec prisma migrate deploy` → `pnpm db:seed` → `pnpm exec prisma migrate status` → verify `GET /api/health`. **Not** in the Vercel build (which has only the pooled URL and must not mutate production schema on every preview) and **not** in CI (unattended DDL against production on a 24 h clock is the wrong trade — TD-012 proposes it as the follow-up) |
| 🛑 **Human step** | The human must (a) copy Neon's **direct** connection string into `.env.local` as `DIRECT_DATABASE_URL`, and (b) add `SESSION_SECRET` (32+ random bytes, e.g. `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`) to `.env.local` **and** to Vercel for **Production and Preview**. Without (b) the deployed app fails loudly at boot — by design (AC-001-19) |

### 3.5 ⚠️ Operational fact #2 — 000's `AGENTS.md` correction was never executed

000's T-14 was dropped when the PR was merged early, so `AGENTS.md`'s "Project commands" table still
carries a ⚠️ UNVERIFIED banner and a fictional `pnpm db:seed`. It is folded into **T-01** of this
feature. The corrected table must reflect what actually runs today:

| Action | Command | Correction |
|---|---|---|
| Install / dev | `pnpm install` · `pnpm dev` | ✅ as written |
| Lint | `pnpm lint` | ⚠️ runs **`eslint . && prettier --check .`** — the table must say so, since "lint" passing means both |
| Type check | `pnpm typecheck` | ✅ |
| Unit tests | `pnpm test` (= `vitest run --project unit`) | ⚠️ it is the **`unit` project only**, not "all tests" |
| Integration | `pnpm test:int` (= `vitest run --project integration`) | ⚠️ needs a reachable PostgreSQL (`docker compose up -d`, host port **5433** locally) |
| E2E | `pnpm test:e2e` | ⚠️ its `webServer` runs `pnpm build && pnpm start` itself — do not build first |
| **Start (production)** | `pnpm start` | **missing from the table today** — add it. The e2e `webServer`, the 503 check and every production check depend on it |
| Migrate | `pnpm db:migrate` (= `prisma migrate dev`) | ⚠️ in Prisma 7 it **no longer runs `generate` or the seed**; `pnpm db:generate` is separate. Note that it wants **`--name <name>`** or it prompts interactively |
| Generate | `pnpm db:generate` | **missing from the table today** — add it |
| Seed | `pnpm db:seed` | ⚠️ today a deliberate stub that exits 1. **001 makes it real** (FR-036) |
| Reset | `pnpm db:reset` | **new in 001** — `prisma migrate reset --force` then seed; local only |
| Build | `pnpm build` | ✅ |
| Remove | the ⚠️ UNVERIFIED warning block | Every row above is executed in **T-02** and the exit status recorded |

Two further one-line corrections ride in the same task (000 validation §6 items 2 and 4):

- `.env.example` → `DATABASE_URL="postgresql://USER:PASSWORD@localhost:**5433**/DATABASE?schema=public"`,
  matching the port `docker-compose.yml` actually publishes. Today a fresh clone that follows the
  template reaches the developer's native Windows PostgreSQL service and fails with `P1000`.
- `docs/traceability.md:64` cites `tests/e2e/error-states.spec.ts`, **which does not exist**; the
  only e2e file is `tests/e2e/health.spec.ts`. A traceability table that points at a phantom test is
  worse than no table (Art. 3).

## 4. Contracts (API, events, interfaces)

### 4.1 Domain contracts

```ts
// money.ts
export function parseMoneyToCents(input: string): number;      // throws DomainError('INVALID_AMOUNT')
export function sumCents(values: readonly number[]): number;
export function assertSafeCents(value: number): void;           // integer, |v| <= 2_147_483_647
export function directionOf(cents: number): 'in' | 'out';

// time.ts — every function takes `now`; the module never calls new Date()
export const BUSINESS_TIME_ZONE = 'America/New_York';
export interface Range { readonly start: Date; readonly end: Date }  // half-open [start, end)
export function startOfBusinessDay(now: Date, offsetDays?: number): Date;
export function startOfBusinessMonth(now: Date, offsetMonths?: number): Date;
export function lastNDaysRange(now: Date, n: number): Range;         // n buckets, includes today
export function lastNMonthsRange(now: Date, n: number): Range;
export function closedMonthsBefore(now: Date, n: number): Range[];   // excludes the current partial month
export function monthKeyOf(instant: Date): string;                   // 'YYYY-MM' in ET
export function dayKeyOf(instant: Date): string;                     // 'YYYY-MM-DD' in ET

// balances.ts
export interface BalanceRow { readonly amountCents: number; readonly status: TransactionStatus }
export interface Balances { readonly currentBalanceCents: number; readonly availableBalanceCents: number }
export function computeBalances(rows: readonly BalanceRow[]): Balances;
export function assertBalanceInvariant(accountId: string, b: Balances): void;
```

### 4.2 Session contract

```ts
// lib/session.ts
export interface SessionClaims { userId: string; businessId: string; role: 'admin' }
export function signSession(claims: SessionClaims, now: Date): Promise<string>;  // HS256, exp = now + 8h
export function verifySession(token: string): Promise<SessionClaims | null>;     // null on any failure
export const SESSION_COOKIE = 'oakfern_session';
export function setSessionCookie(token: string): Promise<void>;
export function clearSessionCookie(): Promise<void>;
export function readSessionCookie(): Promise<SessionClaims | null>;

// services/auth.ts
export function requireSession(): Promise<SessionClaims>;   // throws DomainError('UNAUTHENTICATED')
export function requireAdmin(): Promise<SessionClaims>;      // throws DomainError('FORBIDDEN')
```

`verifySession` returns `null` rather than throwing, so expiry, tampering and absence collapse into
one anonymous path (AC-001-12) with no chance of a stack trace escaping to the browser.

### 4.3 Repository contract (NFR-005 — mechanically checkable)

Every exported function's **first parameter is `businessId: string`**, and every Prisma call includes
`where: { businessId, … }`. The one exception is `findDemoUser()`, which has no caller-supplied
`businessId` because it is what *establishes* the session's business; it is hard-scoped to the seeded
demo email instead and is documented inline as the single exception.

### 4.4 Server Action contract

```ts
// actions/auth.ts  — 'use server'
export async function signInAsDemo(): Promise<never>;  // Zod z.object({}) → service → cookie → redirect('/home')
export async function signOut(): Promise<never>;       // clear cookie → redirect('/')
```

### 4.5 Seed CLI contract

```
pnpm db:seed
  stdout: a table of row counts, per-account current/available balance, money in/out (30 ET days,
          internal excluded), avg net burn over 3 closed ET months, runway months, and
          "content-hash: <sha256>"
  exit 0  all self-checks passed
  exit 1  a BR-002, BR-011, int4-range or runway self-check failed; the reason is printed
```

### 4.6 Routes

| Route | Auth | Response |
|---|---|---|
| `GET /` | public | UI-01; **302 → `/home`** if a valid cookie is present |
| `GET /home`, `/transactions`, `/accounts`, `/payments`, `/cards` | required | shell + content; **302 → `/`** if anonymous |
| `GET /api/health` | public | unchanged from 000 |
| anything else under the shell | required | **404** + `(app)/not-found.tsx` |

## 5. UI components

| Component | Type | Props / behaviour | States | A11y |
|---|---|---|---|---|
| `Wordmark` | server | `size?: 'sm' \| 'md'` | — | `role="img"` + `aria-label="Oakfern"` on the SVG |
| `AppSidebar` | server | `activePath: string` | — | `<nav aria-label="Main">`; active item `aria-current="page"` |
| `MobileNav` | client | wraps `AppSidebar`'s items in `Sheet` | open / closed | Focus trapped by Radix; `Esc` closes; trigger has `aria-label="Open navigation"` |
| `Topbar` | server + client island | `userName`, `activePath` | — | Icon buttons all have `aria-label` |
| `ThemeToggle` | client | `next-themes` `useTheme()` | light / dark / system | `aria-label` reflects the **next** state; icon changes too (colour is never the only signal) |
| `MoveMoneyCta` | server | `disabled` in 001 | disabled | `aria-describedby` points at the explanatory sentence (ASM-001-09) |
| `EmptyState` | server | `icon`, `title`, `body`, `action?` | — | Icon `aria-hidden`; the text carries the meaning |
| `ErrorState` | client | `onRetry` | — | `role="alert"`; the retry button is focusable and first in order |
| `SectionPlaceholder` | server | `title`, `body` | — | One `<h1>` per page, never two |
| `*Skeleton` (per route `loading.tsx`) | server | — | loading | `aria-hidden` + an `sr-only` "Loading <section>" so a screen reader is told, not shown, the skeleton |

Binding `ui-system` rules applied: one radius token, 1px borders instead of shadows, teal accent on
CTA/active-nav/focus-ring only, no hardcoded hex in components, no full-page spinner, `tabular-nums`
on every figure, transitions ≤ 200 ms honouring `prefers-reduced-motion`.

## 6. Test strategy mapped to each AC

| AC | Level | Test / command | Where |
|---|---|---|---|
| AC-001-01 | command | `pnpm db:migrate` then `pnpm exec prisma migrate status`; `\dt` shows 8 tables, no `SkeletonCheck` | executed evidence |
| AC-001-02 | integration + grep | `grep -Ei '(double precision\|numeric\|real\|decimal)' prisma/migrations/*/migration.sql` → empty; integration test asserts `typeof amountCents === 'number'` and `Number.isInteger` | `tests/integration/seed.test.ts` |
| AC-001-03 | command | `pnpm db:seed` ×2, compare the printed `content-hash` | executed evidence (+ CI job) |
| AC-001-04 | integration | `it('AC-001-04: seed volumes match FR-036', …)` — all counts and the 2–4 pending window | `tests/integration/seed.test.ts` |
| AC-001-05 | unit + integration | unit: the three BR-002 examples over `computeBalances`; integration: the invariant over every seeded account | `tests/unit/balances.test.ts`, `tests/integration/seed.test.ts` |
| AC-001-06 | integration | internal legs have `transferId` set, `counterpartyId`/`categoryId` null; every `Transfer`'s legs sum to 0; 30-day money-out **excluding** internal `<` including internal | `tests/integration/seed.test.ts` |
| AC-001-07 | unit | the four BR-009 examples, including both DST days and the 30-bucket count | `tests/unit/time.test.ts` |
| AC-001-08 | command | the seed's runway self-check; the printed figure is pasted as evidence | executed evidence |
| AC-001-09 | e2e | `/` → click "Continue as demo" → `/home`; assert the shell and `context.cookies()` flags | `tests/e2e/shell.spec.ts` |
| AC-001-10 | integration | two-business fixture; each repository method called with the wrong `businessId` returns empty | `tests/integration/scoping.test.ts` |
| AC-001-11 | e2e | sign out → cookie gone → `/home` redirects to `/` | `tests/e2e/shell.spec.ts` |
| AC-001-12 | unit | `verifySession` on a token signed with `exp` in the past → `null` | `tests/unit/session.test.ts` |
| AC-001-13 | e2e | 5 nav items; exactly one `[aria-current="page"]` and it matches the route; user menu name; CTA accessible name | `tests/e2e/shell.spec.ts` |
| AC-001-14 | e2e | `colorScheme: 'dark'` context → `html.dark` present on first paint; toggle → reload → choice persists | `tests/e2e/shell.spec.ts` |
| AC-001-15 | e2e | 4 viewports: `scrollWidth <= innerWidth`; at 375 px sidebar absent, menu opens the sheet, `Esc` closes | `tests/e2e/shell.spec.ts` |
| AC-001-16 | e2e | `/home/../(app)/_dev/boom` renders the segment error state; body contains no `at ` stack frame and no digest | `tests/e2e/shell.spec.ts` |
| AC-001-17 | e2e | unknown authenticated URL → status 404 + the shell not-found copy | `tests/e2e/shell.spec.ts` |
| AC-001-18 | review + e2e | every `(app)` route has a `loading.tsx` (file assertion); `grep` finds no `animate-spin` full-page spinner; placeholder copy asserted | `tests/e2e/shell.spec.ts` |
| AC-001-19 | command | run the built server with `SESSION_SECRET` unset → named error, non-zero/503, never a default; `git ls-files \| grep '^\.env'` → only `.env.example` | executed evidence |
| AC-001-20 | command | each row of the corrected `AGENTS.md` table executed once; exit statuses pasted | executed evidence |
| AC-001-21 | 🛑 human + command | `prisma migrate deploy` + `db:seed` on `DIRECT_DATABASE_URL`; `migrate status`; `curl -i <prod>/api/health`; browse production | `validation.md` |
| **AC-001-22** | **unit + measured** | unit: `tests/unit/client.test.ts` spies the factory and asserts it ran **once** across ~20 property accesses and that two accesses return the same underlying instance; measured: hit `/api/health` 25× against the built production server and read `SELECT count(*) FROM pg_stat_activity WHERE datname='oakfern' AND backend_type='client backend'` **before and after** — the count must stay flat (the 000 report's 1 → 27 is the baseline to beat) | `tests/unit/client.test.ts` + executed evidence |
| **AC-001-23** | 🛑 human + command | On 001's PR: confirm a Preview deployment exists for the head, `curl -i <preview>/api/health` → 200 `status:"ok"`, browse `<preview>/` and complete "Continue as demo" | `validation.md` |
| **AC-001-24** | command + e2e | `pnpm build && pnpm start` then `curl -o /dev/null -w '%{http_code}' localhost:3000/_dev/boom` → **404**; the same path under `pnpm dev` still renders the error boundary; Playwright asserts no `/favicon.ico` 404 in the console | executed evidence + `tests/e2e/shell.spec.ts` |

**Pyramid and thresholds.** Unit tests carry the weight (money, time, balances, session —
`src/server/domain` coverage threshold switched on at **≥ 80 %**, ASM-001-14); two integration files
touch a real PostgreSQL; one e2e spec covers flow F-1 end to end. Every test title carries its
`AC-001-xx` id. **Test-first where it is cheap and meaningful:** T-03 and T-04 write the unit tests
red before implementing (the money/time/balance rules are fully specified by BR-001/002/009, so there
is nothing to discover first).

## 7. New dependencies (justification per Art. 10)

### 7.1 Art. 14 registry verification — run today, 2026-11-09

Checked against `https://registry.npmjs.org/-/package/<pkg>/dist-tags`:

| Package | Intended pin | Registry result | Verdict |
|---|---|---|---|
| **`jose`** | `6.2.17` (ADR-0002) | **`latest` = `6.2.17`** | ✅ **The ADR pin is exactly `latest`. Confirmed, not guessed.** Source: `https://registry.npmjs.org/-/package/jose/dist-tags` |
| `@faker-js/faker` | `10.6.0` (ADR-0002, dev) | `latest` = `stable` = `10.6.0` | ✅ |
| `date-fns` | `4.4.0` (ADR-0002) | `latest` = `4.4.0` (`next` = `5.0.0-alpha.0`) | ✅ pin the stable line, not `next` |
| `@date-fns/tz` | unverified (TD-008) | **`latest` = `1.5.0`** | ✅ **pin `1.5.0`** — TD-008 partially closed |
| `lucide-react` | unverified (TD-008) | **`latest` = `1.70.0`** (a `1.x` major; `next` = `1.3.0`) | ⚠️ **Install whatever `shadcn add` resolves; if it resolves nothing, pin `1.70.0` and record the executed result here.** shadcn CLI `4.23.0` may still expect a `0.x` icon package — a real incompatibility risk (§8 R-4) |
| `next-themes` | not in ADR-0002 | **`latest` = `0.4.6`**, MIT, `peerDependencies.react` includes `^19` | ✅ compatible with React `19.3.1` |
| `shadcn` (CLI, `dlx` only) | `4.23.0` (ADR-0002) | `latest` = `4.23.0` | ✅ not a dependency; invoked via `pnpm dlx shadcn@4.23.0` |
| `tsx` (fallback only) | — | `latest` = `4.23.15` | ✅ pre-authorised fallback for ASM-001-12 |
| `sonner` | deferred | `latest` = `2.0.8` (recorded, **not installed**) | ⏭ feature 005 |

### 7.2 Art. 10 records

| Package | Purpose | Alternatives, incl. "don't add it" | Licence | Maintenance | Weight |
|---|---|---|---|---|---|
| **`jose@6.2.17`** | HS256 sign/verify for the session JWT (ADR-0004) | **"Don't add it" = homemade HMAC → forbidden by GENESIS G3.** `Auth.js` rejected in ADR-0004; `iron-session` rejected (encryption buys nothing for a payload of ids) | MIT | Actively maintained (panva); `latest` today | Zero dependencies, WebCrypto-based, works in the edge runtime — which the middleware needs |
| **`@faker-js/faker@10.6.0`** (dev) | Deterministic realistic names, merchants, amounts for FR-036 | "Don't add it" = hand-written fixture arrays → ~1,500 rows by hand is not realistic and not seedable. `chance.js` / `casual` are less maintained and lack a seeded `en_US` business corpus | MIT | Active, large community | **devDependency only** — never in the production bundle |
| **`date-fns@4.4.0` + `@date-fns/tz@1.5.0`** | BR-009 business-zone day/month boundaries, DST-correct | "Don't add it" = hand-rolled `Intl.DateTimeFormat` offset arithmetic — rejected, DST (BR-009 examples 2–3) is where it breaks. `luxon` rejected (heavier, already an ADR-0002 decision for date-fns). `temporal-polyfill` rejected (not in any approved ADR) | MIT | Active; `@date-fns/tz` is from the date-fns org | Tree-shakeable; `@date-fns/tz` uses the platform `Intl` database, so **no tz data is bundled** |
| **`next-themes@0.4.6`** | FR-005: system theme + manual toggle + persistence + **no unstyled flash** | "Don't add it" = a hand-rolled blocking script + `localStorage` (~30 lines) — rejected because the flash bug is exactly what FR-005 is graded on, and this is the implementation shadcn's own docs use. Cut **C3** reverts to system-only dark mode if time runs out | MIT | Maintained (pacocoursey); React 19 in `peerDependencies` | ~2 kB, one package, no transitive dependencies |
| **`lucide-react@<resolved>`** | Nav and state icons (ui-brief §8) | "Don't add it" = inline SVGs — viable but ~12 hand-drawn icons costs more than it saves and loses visual consistency. Heroicons rejected (ADR-0002 already names lucide) | ISC | Active | Per-icon ESM imports; only the icons used are bundled |
| **`shadcn@4.23.0`** (CLI via `dlx`) | Copies `button`, `sheet`, `dropdown-menu`, `separator`, `skeleton` **into the repo** | "Don't add it" = hand-write them; rejected for the focus-trapped sheet (ASM-001-13) | MIT | Active | **Not a dependency.** It pulls `@radix-ui/react-{dialog,dropdown-menu,separator}`, `class-variance-authority`, `clsx`, `tailwind-merge` as real dependencies — all MIT, all small, all standard |
| **`tsx@4.23.15`** | *Fallback only* for running `prisma/seed.ts` | **Preferred: don't add it** — `node --experimental-strip-types` first, 5-minute budget (ASM-001-12) | MIT | Active | devDependency; wraps esbuild |

### 7.3 Deliberately **not** added in 001

`sonner` (→ 005), `@axe-core/playwright` (→ 003), `recharts` (→ 002), React Hook Form (→ 005),
`bcryptjs` (no credentials form), `nuqs` (→ 003, and "don't add it" is still the leading option),
`dotenv` (Node's `process.loadEnvFile` already works, 000 §7.4), `pg` (bundled inside
`@prisma/adapter-pg`).

## 8. Risks and mitigations

| ID | Risk | Likelihood × impact | Mitigation | Trigger to act |
|---|---|---|---|---|
| **R-1** | The seed is the single biggest unknown: ~1,500 rows, chronological, balance-floor logic, a bounded runway search and four self-checks, all deterministic | High × High | Split into pure modules (`catalog`, `generate`, `write`, `checks`, `hash`) so the generator is testable without a database; write the generator **pure** (takes `runDay` + a seeded faker, returns plain arrays) and let `write.ts` do a single batched `createMany` per table inside one `$transaction` | If T-05 passes 45 min, drop the runway search to a fixed multiplier and accept whatever runway results, recording the number honestly |
| **R-2** | `node --experimental-strip-types` chokes on the generated Prisma client's TypeScript | Medium × Medium | 5-minute experiment budget, then `tsx@4.23.15` (pre-authorised, ASM-001-12) | 5 minutes elapsed |
| **R-3** | `shadcn init` overwrites `src/app/globals.css` and destroys the approved teal/slate token block, or rewrites `tsconfig`/`eslint` config | Medium × High | **Commit before running it.** Immediately `git diff --stat`; restore the `ui-brief` §1.1 token block if touched; never accept a change to `eslint.config.mjs` (it carries the ADR-0001 guardrails) | Any diff outside `src/components/ui/`, `components.json`, `src/lib/utils.ts` and `package.json` |
| **R-4** | `lucide-react` `1.x` is incompatible with what shadcn `4.23.0` emits (renamed exports) | Medium × Low | Let `shadcn add` resolve the version; if icons fail to import, pin the version shadcn declares; last resort, replace the ~8 icons with inline SVG (cheap) | First failing icon import |
| **R-5** | `prisma.config.ts` rejects a plain string for `datasource.url` | Low × Medium | Verify with `pnpm db:generate` right after the edit; fallback documented in §3.4 | `pnpm db:generate` fails |
| **R-6** | Neon's pooled URL is used for `migrate deploy` by accident | Medium × **High** (half-applied production schema) | Structural: the CLI prefers `DIRECT_DATABASE_URL`. Procedural: T-14 prints `prisma migrate status` **before** and after, and the human confirms the host has no `-pooler` | Before running T-14 |
| **R-7** | `@default(cuid())` is rejected by Prisma 7 | Low × Low | `prisma validate` catches it in T-02; fall back to `@default(uuid(7))` | `prisma validate` fails |
| **R-8** | Turning the 80 % coverage threshold on (ASM-001-14) reds CI on an unrelated uncovered line | Medium × Low | Run `pnpm test --coverage` locally in T-13 before pushing; the fix is a test, never a lower threshold | Local coverage run |
| **R-9** | `middleware.ts` + `jose` in the edge runtime: Node-only APIs leak in and the build fails | Low × Medium | `lib/session.ts` uses only `jose` + WebCrypto; `lib/env.ts` is **not** imported by the middleware (it reads `process.env.SESSION_SECRET` directly there, with its own guard) | `pnpm build` |
| **R-11** | The singleton memo is correct in a long-lived Node process but Vercel's serverless isolation still creates one client **per lambda instance**. Connection growth could therefore persist after a correct fix | Medium × Medium | Measure against the **built local production server** (one process, so the memo's effect is unambiguous) and report the Vercel figure separately and honestly. If Neon connections still climb in production, the answer is Neon's pooled URL at runtime — which we already use — not more code | Production `pg_stat_activity` after AC-001-21 |
| **R-12** | 001's PR produces **no** Preview (the way 000's did not), leaving AC-001-23 unverifiable a second time | Medium × High | **Open the PR and wait for the Preview before merging.** Do not merge on CI-green alone; that is precisely how AC-000-12a was lost | T-16 |
| **R-10** | **The 2 h 30 timebox.** The honest raw estimate is 6 h 45 min (tasks §Timebox reckoning) | **High × High** | Backend-first ordering, a named stopping point for tonight, and seven pre-authorised cuts in priority order | At any task overrunning its estimate by > 50 % |

## 9. New or affected ADRs

| ADR | Effect |
|---|---|
| ADR-0001 (architecture) | **Exercised for the first time with real code.** No change. 001 is the feature that proves the layering is livable; the ESLint guardrails stay untouched |
| ADR-0002 (stack and versions) | **Amend after implementation** with four resolved versions: `@date-fns/tz@1.5.0`, `lucide-react@<resolved>`, `next-themes@0.4.6`, and `tsx@4.23.15` if the fallback is taken. `jose@6.2.17` confirmed against the registry — no change needed |
| ADR-0003 (money) | No change. First implementation of `parseMoneyToCents` / `formatCents`; AC-001-02 pins it |
| ADR-0004 (session) | No change. First implementation; the cookie name, claim set and 8 h lifetime are taken verbatim |
| ADR-0006 (deployment) | **Add a paragraph** recording the pooled-vs-direct Neon distinction and that production migrations run manually from the developer machine (§3.4, TD-012). This is new operational knowledge, not a new decision — a 4-line amendment, not a new ADR |
| **No new ADR is required.** | Every architectural question 001 raises was already decided in ADR-0001/0003/0004/0006. The new choices (`next-themes`, `@date-fns/tz`, the seed's determinism technique) are dependency- and implementation-level, so they live in §7 and in the spec's `ASM` table, which is where GENESIS Art. 10 puts them |
