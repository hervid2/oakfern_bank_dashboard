# Spec 001 — domain-data-shell

Status: **Draft, awaiting 🚦 G-SpecPlan** · Version: 0.1 · Branch: `feat/001-domain-data-shell`
FR: FR-001, FR-002, FR-003, FR-003b, FR-004, FR-005, FR-006, FR-036, FR-039 · Depends on: 000
Template D.18 · Sprint Profile · Planner, 2026-11-09 22:10 ET

> **Planning mode:** single-invocation (spec + plan + tasks in one planner call), per the Sprint
> Profile amendment approved by the Technical Director on 2026-11-09 (`docs/roadmap.md` §"Sprint
> Profile amendments"). **`/sdd-clarify` does not run for this feature** — it runs only for 002 and
> 005. Every question that would have become a clarification finding is instead decided here under
> the recommended option and recorded in §11 as an `ASM` with its risk. There is no audit pass.

---

## 1. Goal

Feature 000 proved the pipeline with a throwaway table and an empty `src/server`. Feature 001 makes
the product *real below the waterline*: the full Oakfern data model in PostgreSQL, a deterministic
realistic seed that makes the dashboard look like a working business, a one-click demo session that
every later request can be authorised against, and the application shell that every later screen
renders inside — including the error and not-found states.

For the evaluator this is the feature that turns a skeleton into a bank: after it, `/home` is an
authenticated screen of a seeded business with 4 accounts and ~1,500 transactions behind it. For
features 002, 003 and 005 it is the floor they all stand on: the schema, the business-zone time
module, the money primitives, the `businessId` scoping guard and the layout.

## 2. Scope

**Includes**

| # | Item | FR / BR |
|---|---|---|
| 1 | Prisma schema for the eight domain entities + enums + NFR-002 indexes; one migration that supersedes the 000 `SkeletonCheck` model | FR-036, BR-001 |
| 2 | Money primitives: `parseMoneyToCents`, `sumCents`, `formatCents` (the only formatter) | BR-001, ADR-0003 |
| 3 | Business-time-zone module `src/server/domain/time.ts` (half-open ranges, DST-correct) | BR-009 |
| 4 | Derived-balance domain function `computeBalances` | BR-002 |
| 5 | Deterministic realistic seed (`pnpm db:seed`), re-runnable, with self-checks | FR-036, BR-002, BR-011 |
| 6 | Demo session: `jose` HS256 JWT in an httpOnly cookie, 8 h, no refresh; sign-in, sign-out, middleware, `requireSession()` guard | FR-001, FR-002, FR-003, FR-003b, ADR-0004 |
| 7 | `businessId`-scoped repositories and the services above them (users, accounts, transactions-for-balances) | FR-002, NFR-005 |
| 8 | UI-01 landing with "Continue as demo" | FR-001 |
| 9 | App shell: sidebar (5 items), topbar with user menu, "Move money" CTA, theme (system + toggle + persisted), responsive sheet below 1024 px | FR-004, FR-005, FR-006 |
| 10 | Segment-level `error.tsx`, `not-found.tsx` and `loading.tsx` for every shell route; designed empty states | FR-039, NFR-010 |
| 11 | Migrations and the seed applied to **Neon** (production), with the direct/unpooled connection string | ADR-0006 |
| 12 | The `AGENTS.md` "Project commands" correction carried forward from 000 T-14 (never executed) | SP-8 housekeeping |
| 13 | 🔴 **Fix the measured production defect in the Prisma client singleton** (000 validation §6, `src/server/repositories/client.ts:51-53`) + a regression test | NFR-006, ADR-0006 |
| 14 | Close 000's unverifiable **AC-000-12a** by verifying the Vercel **Preview** on 001's own PR | 000 validation §6 |
| 15 | `.env.example` port correction (5432 → **5433**), `docs/traceability.md:64` phantom-file correction, `/_dev/boom` gated out of production, favicon | 000 validation §6 |

### 2.1 Carry-ins from the 000 validation report (verdict CHANGES REQUIRED — 0 blockers, 3 major)

`specs/000-walking-skeleton/validation.md` §6 hands five items to this feature. They are **tasks**
here, not notes:

| # | Carry-in | Lands as | Priority |
|---|---|---|---|
| 1 | **Prisma `Proxy` singleton has no module-level memo**, and the `globalThis` memo is written only when `NODE_ENV !== 'production'`. Every property access calls `getPrismaClient()`, so in production **every request builds a fresh `PrismaClient` + `pg` pool and never closes it**. Measured, not inferred: `pg_stat_activity` client backends 1 → 27 over 26 requests. Harmless while 000 has one endpoint; **from 001 on, every request touches the database**, and Neon Free's connection ceiling is reachable in well under a hundred requests — a `/api/health` uptime monitor would do it alone | **AC-001-22**, task **T-01** — the first implementation task of the feature, before any schema work, with its own AC and its own regression test | 🔴 **Highest** |
| 2 | 000's **T-14 never ran**: `AGENTS.md`'s command table still opens with ⚠️ UNVERIFIED, is missing `pnpm start` and `pnpm db:generate`, mislabels `pnpm db:seed`, and omits that `db:migrate` is `prisma migrate dev` wanting `--name`. Plus `docs/traceability.md:64` cites `tests/e2e/error-states.spec.ts`, **a file that does not exist** | **AC-001-20** (widened), task **T-02** | High — the command table is about the third thing an external evaluator opens |
| 3 | **AC-000-12a (Vercel Preview) is permanently NOT VERIFIED** for 000: the work went PR → production with no Preview on that head, and it cannot be salvaged retroactively | **AC-001-23**, task **T-16** — verify the Preview on 001's own PR | High |
| 4 | `.env.example` says `localhost:5432` but Compose publishes **5433**; a fresh clone hits the native Windows PostgreSQL service and fails `P1000` | folded into **AC-001-20** / task **T-02** | High, one line |
| 5 | `/_dev/boom` is publicly reachable in production; no automated test carries the `AC-000-07` id (the 503 contract is manual-only); `src/app` has no favicon, so every production page load logs a console 404 | **AC-001-24** (boom gating + favicon); the `AC-000-07` automation is **not** taken in 001 — recorded as **TD-013** | Low — recorded, not allowed to inflate the box |

**Explicitly not re-raised** (the reviewer verified these clean and this spec must not re-litigate
them): money representation, idempotency, anti-IDOR, Zod validation, cookie flags, time zones, UI
originality, ADR-0001 layering. **No axe scan** — still deferred to 003.

**Does not include**

| Excluded | Why / where it goes |
|---|---|
| KPI figures, burn, runway, sparkline, account cards with real balances rendered on `/home` | Feature **002**. 001 ships `/home` as a designed placeholder |
| Transactions table, filters, pagination, URL state, side detail | Feature **003** |
| Move-money flow, transfers created by a user, idempotency service, settlement | Feature **005**. 001 only makes transfers *representable* and seeds them |
| Cards screen, freeze/unfreeze, limits | **CUT** (`docs/roadmap.md` 2026-11-09) |
| Cash-insights charts | **CUT** |
| `@axe-core/playwright` and the NFR-003 axe matrix | Deferred to **003** (human's decision, 2026-11-09) |
| `sonner` toasts | Feature **005** — 001 has no mutation that needs one (Art. 10 "don't add it yet") |
| CSV export, recategorize, notes | **CUT** |
| Credentials login form, registration, password reset, MFA, `viewer` role | Out of scope (brief "Won't", TD-005) |
| Lighthouse / NFR-001 measurement | Feature 008 |

## 3. Actors and permissions

| Actor | Reaches | May do in 001 | Enforced by |
|---|---|---|---|
| `anonymous` | UI-01 (`/`), UI-08 (error / 404) | Activate "Continue as demo" | `middleware.ts` redirects `(app)` routes to `/`; the guard refuses regardless |
| `admin` (the single seeded demo user) | UI-01 and every `(app)` route | Browse the shell, switch theme, sign out | `requireSession()` in every Server Action and Route Handler; every repository method takes `businessId` |
| `viewer` | — | — | `N/A` — out of scope (TD-005) |
| operator (the developer / CI) | `pnpm db:migrate`, `pnpm db:seed` | Create and reset demo data | Shell only; no UI surface in 001 |

Authorization is **server-side only**: the middleware is a convenience, the guard is the boundary
(ADR-0004 §6). Rows belonging to another business return **404**, never 403 and never partial data.

## 4. Flows

### 4.1 Main flow — one-click demo into the shell (F-1)

1. An anonymous visitor opens `/`. UI-01 renders: wordmark, one paragraph of what Oakfern is, an
   honest line that the data is fictional and the rails are simulated, and one primary button
   **"Continue as demo"**.
2. The visitor activates the button. The `signInAsDemo` Server Action runs.
3. The action looks up the seeded demo user through `users` repository → `auth` service. No input is
   accepted from the client, so there is nothing to validate beyond the empty payload (Zod schema
   `z.object({})`).
4. The action mints an HS256 JWT with claims `{ sub: userId, bid: businessId, role: 'admin' }`,
   `exp = iat + 8 h`, signed with `SESSION_SECRET`, and sets cookie `oakfern_session`
   (`httpOnly`, `secure`, `sameSite: 'lax'`, `path: '/'`, `maxAge: 28800`).
5. The action redirects to `/home`.
6. `middleware.ts` verifies the signature on the `(app)` request and lets it through.
7. `(app)/layout.tsx` calls `requireSession()`, loads the current user through the `auth` service,
   and renders the shell: sidebar with Home / Transactions / Accounts / Payments / Cards, the active
   item carrying `aria-current="page"`; topbar with the theme toggle and a user menu showing the
   seeded name and a "Sign out" item; the primary **"Move money"** CTA.
8. `/home` renders its placeholder content inside the shell.
9. The visitor activates **Sign out**. The `signOut` action deletes the cookie and redirects to `/`.
   A direct request to `/home` now redirects to `/`.

### 4.2 Main flow — seeding (operator, FR-036)

1. The operator runs `pnpm db:migrate` (local) or `prisma migrate deploy` (Neon).
2. The operator runs `pnpm db:seed`.
3. The seed resolves `runDay` = midnight `America/New_York` of the current day, and constructs a
   faker instance with the fixed seed `20261110`.
4. The seed **truncates** the domain tables in dependency order, then rebuilds everything. Global
   `Category` rows are **upserted by `key`** rather than truncated, so a category id referenced from
   a URL stays stable across resets (FR-025, FR-037).
5. The seed emits rows in chronological order over the previous 12 ET months, carrying a running
   per-account balance (see §5, BR-002).
6. The seed re-reads the ledger through the same `computeBalances` domain function the app uses and
   asserts the BR-002 invariant on every account. On violation it prints the offending account and
   exits non-zero.
7. The seed prints a summary table (counts per table, per-account current/available balance, money
   in / money out for the last 30 ET days excluding internal, avg net burn over the last 3 closed ET
   months, runway months) and a SHA-256 **content hash** of a canonical projection of every row.

### 4.3 Alternative flows

| # | Trigger | Behaviour |
|---|---|---|
| A-1 | An already-authenticated visitor opens `/` | Redirect to `/home` — the landing never shows a "log in" button to someone who is in |
| A-2 | Viewport < 1024 px | The sidebar is not rendered in place; the topbar shows a menu button that opens the same navigation as a focus-trapped sheet, dismissible with `Esc`, the backdrop, or selecting an item (FR-006) |
| A-3 | No theme choice has ever been stored | The UI follows `prefers-color-scheme`; the toggle then stores an explicit choice that wins on later visits (FR-005) |
| A-4 | `pnpm db:seed` is run twice on the same day | Identical data, identical content hash. Running it on a different day shifts every date by the day delta and changes the hash — by design (FR-036 "dates relative to the run day") |
| A-5 | A placeholder route (`/accounts`, `/payments`, `/cards`) is opened | A designed state renders: section title, one honest sentence that the section is not part of this round, and a link back to Home. No fake data, no "coming soon" marketing (Constitution Title I.4) |

### 4.4 Error flows

| # | Case | Behaviour | Ref |
|---|---|---|---|
| E-1 | `SESSION_SECRET` is absent or shorter than 32 characters | The app **fails loudly at boot** with a named error. No default secret, ever | Constitution Title III, ADR-0004 |
| E-2 | The cookie is missing, malformed, or its signature does not verify | `(app)` request redirects to `/`; a Server Action throws `UNAUTHENTICATED` and does no work | FR-002 |
| E-3 | The token is valid but `exp` has passed (after 8 h) | Same as E-2, plus UI-01 renders an explanatory line ("Your demo session expired. Continue as demo to start a new one."). Nothing is executed | FR-003b, ASM-018 |
| E-4 | A request resolves a `businessId` that owns no such row | The repository returns nothing and the route calls `notFound()` → **404**. Never 403, never another business's data | FR-002, NFR-005 |
| E-5 | A data read inside a route segment throws | The segment's `error.tsx` renders: heading, one human sentence, **"Try again"** (calls `reset()`), and a link to Home. No message, digest or stack from the error object reaches the browser | FR-039, NFR-009 |
| E-6 | An unknown URL under the shell | `not-found.tsx` renders inside the shell with HTTP **404** and a link to Home | FR-039 |
| E-7 | `pnpm db:seed` runs against a database with no migrations applied | Prisma fails with its own clear error; the seed does not attempt to create tables | — |
| E-8 | The seed's BR-002 self-check or the runway self-check fails | Non-zero exit with a diagnostic; **no partially-seeded database is left as "fine"** | BR-002, FR-036 |
| E-9 | `prisma migrate deploy` is run against Neon's **pooled** connection string | Advisory-lock / prepared-statement failures. Prevented structurally: the Prisma CLI reads `DIRECT_DATABASE_URL` when present (plan §3.4) | ADR-0006 |

## 5. Applicable business rules

### BR-001 — Money is signed integer USD cents

| Where it binds in 001 | How |
|---|---|
| Schema | `Transaction.amountCents`, `Transfer.amountCents`, `Card.monthlyLimitCents` are Prisma **`Int`**. No `Float`, `Decimal` or `Numeric` column exists anywhere in the migration SQL |
| Domain | `src/server/domain/money.ts` — `parseMoneyToCents` (the only parser), `sumCents`, `assertSafeCents` |
| Presentation | `src/lib/format.ts` — `formatCents`, the only place money becomes a string, built on `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })`. Every rendered figure carries `tabular-nums` |
| Forbidden | `parseFloat`, `toFixed`, and any arithmetic on `amountCents` under `src/components` |

**Examples (transcribed as tests):**
1. `parseMoneyToCents("1,234.56")` → `123456`; `parseMoneyToCents("0.07")` → `7`.
2. `formatCents(123456)` → `"$1,234.56"`; `formatCents(-123456, { signDisplay: 'always' })` → `"-$1,234.56"`; `formatCents(0)` → `"$0.00"`, never `""` or `"NaN"`.
3. **Edge case (parsing trap):** `parseMoneyToCents("12.345")` **rejects** rather than rounding to `1234` or `1235`.
4. **Edge case (float trap):** `sumCents([10, 20])` → `30` exactly; the seed's largest account total stays well inside `Number.MAX_SAFE_INTEGER` and inside PostgreSQL `int4` (± 2,147,483,647 cents ≈ ± USD 21.4 M), which the seed asserts.

### BR-002 — Balance definitions and invariant

`currentBalance = Σ { amountCents | status = 'posted' }`
`availableBalance = currentBalance − Σ { |amountCents| | status = 'pending' ∧ amountCents < 0 }`

**How 001 guarantees it — structurally first, then by construction, then by assertion:**

1. **Structurally.** There is **no balance column** on `Account`. Both balances are derived by
   `computeBalances` in `src/server/domain`, so a stored balance cannot disagree with the ledger —
   the class of defect BR-002 exists to prevent is not representable.
2. **By construction in the seed.** Rows are emitted in chronological order while the seed carries a
   running `currentBalance` per account. Before emitting an outflow it checks the running balance
   against a USD 50,000 floor; if the outflow would breach it, the seed first emits a deterministic
   internal transfer from the Reserve/Treasury account (two legs, one `Transfer`) and only then the
   outflow. The 2–4 closing `pending` outflows are sized so that
   `availableBalance = currentBalance − Σ|pending out|` stays `>= 0` on every account. Every decision
   is a pure function of the seeded RNG sequence, so it stays deterministic.
3. **By assertion.** After writing, the seed re-reads the ledger and runs the *same*
   `computeBalances` the app uses, asserting for every account that `currentBalance` equals a freshly
   recomputed sum, that `availableBalance <= currentBalance` and that neither is negative. Violation
   = non-zero exit. The same assertion is an integration test (AC-001-05), so CI re-proves it.

**Examples:**
1. Posted `+500000`, posted `−120000`, pending `−80000` → `currentBalance = 380000`, `availableBalance = 300000`.
2. **Edge case (pending inflow):** posted `+500000`, pending `+900000` → both balances `500000`; the pending inflow is invisible to both.
3. **Edge case (empty account):** no transactions → `0` / `0`, rendered `"$0.00"`, never blank or `NaN`.

### BR-009 — Business time zone `America/New_York`

Instants are stored UTC. Every day/month boundary is computed in the business zone through the single
module `src/server/domain/time.ts`. Ranges are half-open `[start, end)`. `now` is **injected** into
every domain function; the domain never calls `new Date()`.

**Examples (transcribed as tests):**
1. `postedAt = 2026-11-01T03:30:00Z` (= 2026-10-31 23:30 ET) belongs to **October 2026** in every bucket.
2. **Edge case (spring DST):** 2026-03-08 ET has 23 hours; `[startOfBusinessDay, +1d)` spans exactly that local day.
3. **Edge case (autumn DST):** 2026-11-01 ET has 25 hours; an instant at 01:30 local (ambiguous) lands in that one day's bucket exactly once.
4. **Edge case (bucket count):** "last 30 days" yields exactly **30** daily buckets including today — never 29 or 31.

### BR-011 — Internal transfers excluded from metrics

001 must make the distinction **representable and already proven**, because 002 and 005 depend on it:

| Guarantee in 001 | Mechanism |
|---|---|
| Internal legs are identifiable without a join | `Transaction.method = 'internal'` |
| Internal legs are never categorised | `categoryId` is `NULL` on every internal leg (seed invariant + integration test) |
| Internal legs are always paired | `transferId` is non-null on every internal leg, and each `Transfer` has exactly 2 legs summing to `0` |
| Exclusion is cheap to query | Index `(businessId, method, postedAt)` |

**Examples:**
1. The seed creates at least 6 internal transfers; for each, the two legs sum to exactly `0`, so total cash across accounts is unchanged by any of them.
2. **Edge case (exclusion is observable):** money-out for the last 30 ET days computed **with** internal legs differs from the same figure computed **without** them on the seeded data — i.e. the seed actually contains a recent internal transfer, so 002's exclusion cannot pass vacuously.

## 6. Data

### 6.1 Entities created (all new; names are canonical, `docs/domain/model.md`)

| Entity | Notable columns | Scoping | Indexes (NFR-002) |
|---|---|---|---|
| `Business` | `id`, `name`, `slug @unique`, `createdAt` | tenant root | `slug` unique |
| `User` | `id`, `businessId`, `email @unique`, `name`, `role`, `passwordHash?`, `createdAt` | `businessId` | `(businessId)` |
| `Account` | `id`, `businessId`, `name`, `type`, `accountNumber`, `routingNumber`, `currency` (fixed `"USD"`), `openedAt`. **No balance column** | `businessId` | `(businessId, type)` |
| `Transaction` | `id`, `businessId`, `accountId`, **`amountCents Int`**, `status`, `method`, `categoryId?`, `counterpartyId?`, `cardId?`, `transferId?`, `memo?`, `note?`, `idempotencyKey?`, `createdAt`, `settleAt?`, `postedAt?` | `businessId` | `(businessId, postedAt)`, `(businessId, status, settleAt)`, `(businessId, accountId, postedAt)`, `(businessId, categoryId)`, `(businessId, method, postedAt)`, **unique `(businessId, idempotencyKey)`** |
| `Transfer` | `id`, `businessId`, `sourceAccountId`, `destinationAccountId`, **`amountCents Int`** (positive), `idempotencyKey`, `createdAt` | `businessId` | unique `(businessId, idempotencyKey)` |
| `Counterparty` | `id`, `businessId`, `name`, `kind`, `accountNumber?`, `routingNumber?`, `defaultCategoryId?`, `createdAt` | `businessId` | unique `(businessId, name)` |
| `Card` | `id`, `businessId`, `accountId`, `holderName`, `formFactor`, `last4`, `status`, **`monthlyLimitCents Int`**, `createdAt` | `businessId` | `(businessId, accountId)` |
| `Category` | `id`, `key @unique`, `label`, `direction`, `sortOrder` | **global**, not per business | `key` unique, `sortOrder` |

Enums: `UserRole`, `AccountType`, `TransactionStatus`, `TransactionMethod`, `CounterpartyKind`,
`CardFormFactor`, `CardStatus`, `CategoryDirection`. `Category` stays a **table**, not an enum
(domain model: stable ids for drill-down URLs).

`direction` (`in`/`out`) is **derived from the sign of `amountCents`** and is never a column
(ADR-0003 §2).

### 6.2 Validations

| Where | Validation |
|---|---|
| Database | Type-level: every money column is `Int`, so a float is unrepresentable. FK integrity on every relation. Uniqueness on `Business.slug`, `User.email`, `Category.key`, `(businessId, name)` on `Counterparty`, `(businessId, idempotencyKey)` on `Transaction` and `Transfer` |
| Domain | `assertSafeCents` (integer, within `int4`, non-zero where required); `computeBalances` invariant helper; `time.ts` range builders |
| Boundary | Zod on every Server Action input (`signInAsDemo` takes `z.object({})`); `src/lib/env.ts` parses `DATABASE_URL`, `DIRECT_DATABASE_URL?` and `SESSION_SECRET` (min 32 chars) with Zod and fails loudly |
| Not enforced at DB level | `amountCents <> 0` and `Transfer.amountCents > 0` as SQL `CHECK` constraints — see **ASM-001-05** |

### 6.3 Migrations

| Item | Decision |
|---|---|
| Count | **One** migration, `*_domain_model` |
| Content | `DROP TABLE "SkeletonCheck"` (000's throwaway, ASM-023) + `CREATE TYPE` for the 8 enums + `CREATE TABLE` for the 8 entities + indexes and FKs |
| Local | `pnpm db:migrate` (= `prisma migrate dev`) against Docker Compose PostgreSQL 18 on host port 5433 |
| CI | `prisma migrate deploy` (already in the 000 workflow) against the `postgres:18` service container |
| Production (Neon) | `prisma migrate deploy` run **by the human from the developer machine** against Neon's **direct / unpooled** connection string via `DIRECT_DATABASE_URL`. Plan §3.4 explains why Vercel's pooled `DATABASE_URL` cannot be used, and §10 marks the variable as a human step |
| Rollback | See plan §3.3. Summary: the only destructive step is the `SkeletonCheck` drop, which holds no business data; recovery is `prisma migrate resolve --rolled-back` + a down-SQL file committed alongside the migration |

### 6.4 Seed shape (FR-036)

| Thing | Target | Note |
|---|---|---|
| `Business` | 1 | slug `oakfern-demo` |
| `User` | 1 | role `admin`, `passwordHash = NULL` (one-click demo), fictional `@oakfern.example` address |
| `Category` | 14 | the fixed global set from the domain model, upserted by `key` |
| `Account` | 4 | Operating (checking), Payroll (checking), Reserve (savings), Treasury (treasury) |
| `Card` | 5 | 3 virtual, 2 physical; 1 `frozen`; limits inside `0..10_000_000` cents; ≥ 1 card over its monthly limit so 006's over-limit state has data if it ever returns |
| `Counterparty` | 55–65 | mixed `merchant` and `recipient`; statement-style names, no logos |
| `Transaction` | 1,200–1,800 | over the previous 12 ET months, chronological |
| `Transfer` | ≥ 6 | each with exactly 2 `posted` internal legs summing to 0, ≥ 1 inside the last 30 ET days |
| pending external payments | **2–4** | `ach`/`wire` outflows, `postedAt = NULL`, `settleAt` in the near future |
| Determinism | fixed faker seed `20261110`; **the seed supplies every `id` and every timestamp explicitly** — see ASM-001-03 | |
| Runway | between **14 and 24 months** | enforced by a deterministic bounded search on the recurring-outflow multiplier, asserted before commit |

## 7. Interface

### 7.1 Screens

| ID | Route | 001 content |
|---|---|---|
| **UI-01** | `/` | Landing: `oakfern` wordmark + mark, one-sentence value proposition, three short bullets (cash position, movements, move money), an honest line "Demo data is generated and payment rails are simulated.", and the primary **"Continue as demo"** button. Redirects to `/home` if already authenticated |
| **UI-02** | `/home` | The shell + a designed placeholder: section heading, the seeded greeting ("Good morning, <name>" / date in ET), and content-shaped skeleton-style cards labelled honestly as arriving in the next step. **No fabricated numbers** |
| **UI-03** | `/transactions` | Shell + honest placeholder (feature 003 fills it) |
| — | `/accounts` | Shell + honest placeholder |
| **UI-06** | `/payments` | Shell + honest placeholder |
| **UI-07** | `/cards` | Shell + honest "not part of this round" state, per the roadmap cut |
| **UI-08** | any | `error.tsx` + `not-found.tsx` at the root **and** inside the `(app)` segment |

### 7.2 Shell behaviour (FR-004, FR-005, FR-006)

| Element | Behaviour |
|---|---|
| Sidebar | Fixed from 1024 px. Items **Home · Transactions · Accounts · Payments · Cards** with a `lucide-react` icon each. The active item has `aria-current="page"` and the teal accent; nothing else uses the accent |
| Topbar | Wordmark on mobile, theme toggle, user menu (avatar initials + name) containing "Sign out". The search field drawn in the wireframe is **not** built in 001 (it belongs to 003) and is therefore absent rather than fake |
| "Move money" CTA | Primary button, present on every `(app)` route. In 001 it is `disabled` with an accessible name explaining it arrives with feature 005 — an honest affordance, not a dead button (ASM-001-09) |
| Theme | `next-themes` with `attribute="class"`, `defaultTheme="system"`, `enableSystem`, and the blocking inline script it injects so there is **no unstyled flash**. Toggle cycles light → dark → system with an `aria-label` and a visible icon state |
| Below 1024 px | Sidebar replaced by a menu button in the topbar opening the same nav as a focus-trapped sheet (`Esc`, backdrop and item selection all close it) |
| Content width | Capped at `max-w-screen-2xl`, no horizontal scroll at 375 / 768 / 1280 / 1440 px |

### 7.3 Required states (NFR-010) — every route in 001

| State | Implementation |
|---|---|
| Loading | `loading.tsx` per `(app)` route with a **content-shaped** skeleton that mirrors the final layout. **No full-page spinner anywhere** |
| Empty | Icon + one sentence + the action that resolves it. The placeholder routes use this pattern with honest copy |
| Error | `(app)/error.tsx`: heading "Something went wrong", one human sentence, **"Try again"** (`reset()`), link to Home. Nothing from the error object is rendered |
| Not found | `(app)/not-found.tsx` inside the shell, HTTP 404, link to Home |
| Success | `N/A` — 001 has no money mutation, so there is no success surface to design (it arrives in 005) |

### 7.4 Key copy (en-US, plain, no exclamation marks)

| Surface | Copy |
|---|---|
| UI-01 heading | "Know your cash. Move it safely." |
| UI-01 honesty line | "Demo workspace. All data is generated and payment rails are simulated." |
| UI-01 CTA | "Continue as demo" |
| Session expired | "Your demo session expired. Continue as demo to start a new one." |
| Placeholder route | "<Section> is not part of this round. See the README for what shipped and what did not." |
| Error state | "Something went wrong loading this page." + "Try again" |
| Not found | "We couldn't find that page." + "Back to home" |

## 8. Integrations and contracts

### 8.1 Session contract (ADR-0004)

```
Cookie  oakfern_session   httpOnly · secure · sameSite=lax · path=/ · maxAge 28800
Claims  { sub: userId, bid: businessId, role: 'admin', iat, exp }   HS256, SESSION_SECRET
```

Nothing else is ever put in the payload — no email, no name, no amount. The token is never logged,
never written to `MEMORY.md` and never included in an error message (NFR-009).

### 8.2 Guard contract

```ts
requireSession(): Promise<{ userId: string; businessId: string; role: 'admin' }>  // throws UNAUTHENTICATED
requireAdmin():   Promise<SessionClaims>                                          // throws FORBIDDEN
```

Every Server Action and Route Handler calls one of them **before any work**. Every repository method
takes `businessId` as a required first argument — verifiable mechanically by a reviewer.

### 8.3 External systems

| System | 001 contract |
|---|---|
| PostgreSQL (Docker 5433 / CI 5432 / Neon) | Prisma 7 + the mandatory `@prisma/adapter-pg` driver adapter. Runtime uses the **pooled** Neon URL; the CLI uses the **direct** one |
| Vercel | No new integration. Two new environment variables (`SESSION_SECRET`, and `DIRECT_DATABASE_URL` locally) — human step |
| `GET /api/health` | Unchanged from 000; it must still return `200 / status:"ok"` after the migration |

## 9. Applicable non-functional requirements

| NFR | What 001 owes it | Verified by |
|---|---|---|
| NFR-002 | The indexes in §6.1 exist from day one, so 003 does not have to migrate for performance | Migration SQL review + `\d+ "Transaction"` |
| NFR-003 | `aria-current` on the active nav item, `aria-label` on every icon button, focus visible, contrast ≥ 4.5:1 in both themes, colour never the only signal. **axe itself is deferred to 003** | Manual keyboard pass + Playwright MCP screenshots |
| NFR-004 | No horizontal scroll at 375 / 768 / 1280 / 1440 px; sidebar → sheet below 1024 px | Playwright viewport assertions |
| NFR-005 | Zod on every server input; cookie flags; guard in every action; `businessId` on every repository method; anti-IDOR returns 404; **no secret in the repository** | Integration tests + `git grep` + `git ls-files` |
| NFR-007 | TS `strict`, 0 lint errors, no `any` in `src/server/domain`, **coverage threshold ≥ 80 % on `src/server/domain` switched on for the first time** (000 deliberately left it off over an empty directory, CL-05) | `pnpm lint`, `pnpm typecheck`, `pnpm test --coverage` |
| NFR-009 | `error.tsx` / `not-found.tsx` per segment, no stack trace to the browser, no PII in logs | e2e + reading the server output |
| NFR-010 | Loading / empty / error states on every route in 001 | Playwright + screenshots |
| NFR-011 | Zero money arithmetic in `src/components`; `formatCents` is the only formatter | `git grep` for `amountCents` under `src/components` |
| NFR-001, NFR-006, NFR-008 | `N/A` in 001 — no money mutation (NFR-006 → 005), no perf budget surface yet (NFR-001 → 008), cross-browser deferred (ASM-015) | — |

## 10. Acceptance criteria

> Every AC is verifiable by an executed command or a browser check. `AC` ids are carried in test
> titles: `it('AC-001-05: seeded accounts satisfy the BR-002 invariant', …)`.

| ID | Criterion |
|---|---|
| **AC-001-01** | **Given** an empty PostgreSQL database, **when** `prisma migrate deploy` runs, **then** all 8 domain tables and 8 enum types are created, `SkeletonCheck` does not exist, and `prisma migrate status` reports no pending migration and no drift. |
| **AC-001-02** | **Given** the applied migration, **when** the migration SQL and the generated client types are inspected, **then** every monetary column (`Transaction.amountCents`, `Transfer.amountCents`, `Card.monthlyLimitCents`) is SQL `integer` / TS `number`, and **no** `double precision`, `real`, `numeric` or `decimal` column exists anywhere in the schema. (BR-001, ADR-0003) |
| **AC-001-03** | **Given** a migrated database, **when** `pnpm db:seed` runs twice in a row on the same day, **then** both runs print the **same SHA-256 content hash**, and the hash covers ids and timestamps (not only counts). (FR-036) |
| **AC-001-04** | **Given** a freshly seeded database, **when** the row counts are queried, **then** there is 1 `Business`, 1 `User` with role `admin` and `passwordHash IS NULL`, 4 `Account`s, 5 `Card`s, 14 `Category` rows, 55–65 `Counterparty` rows, 1,200–1,800 `Transaction`s spanning ≥ 360 days, ≥ 6 `Transfer`s, and **2–4** `pending` `ach`/`wire` outflows with `postedAt IS NULL` and `settleAt` in the future. (FR-036) |
| **AC-001-05** | **Given** a freshly seeded database, **when** `computeBalances` is run per account from the ledger, **then** for every account `currentBalance` equals the freshly recomputed sum of its `posted` rows, `availableBalance = currentBalance − Σ|pending outflows|`, `availableBalance <= currentBalance`, and neither value is negative. (BR-002) |
| **AC-001-06** | **Given** a freshly seeded database, **when** internal legs are inspected, **then** every `method='internal'` row has `transferId` non-null, `counterpartyId` null and `categoryId` null; every `Transfer` has exactly 2 legs summing to `0`; and money-out over the last 30 ET days computed **excluding** internal legs is **strictly less** than the same figure including them — proving the seed contains a recent internal transfer so 002's BR-011 exclusion cannot pass vacuously. (BR-011) |
| **AC-001-07** | **Given** `src/server/domain/time.ts` with an injected `now`, **when** the four BR-009 examples are evaluated, **then** `2026-11-01T03:30:00Z` buckets into **October 2026**; the 23-hour day 2026-03-08 ET and the 25-hour day 2026-11-01 ET each produce exactly one bucket containing their instants once; and "last 30 days" produces exactly **30** daily buckets. (BR-009) |
| **AC-001-08** | **Given** the seeded ledger, **when** the seed prints its summary, **then** average net burn over the **last 3 closed ET months** (excluding internal legs) is positive and `totalCash / avgBurn` lands between **14 and 24 months**; if it does not, the seed exits non-zero instead of writing. (FR-036) |
| **AC-001-09** | **Given** an anonymous visitor on `/`, **when** "Continue as demo" is activated, **then** the browser is redirected to `/home`, the shell renders with the seeded user's name in the topbar, and the response set an `oakfern_session` cookie that is `HttpOnly` and `SameSite=Lax` (and `Secure` in a deployed environment). (FR-001) |
| **AC-001-10** | **Given** a fixture containing **two** businesses, **when** a repository method is called with business A's `businessId` for a row owned by business B, **then** it returns nothing and the route answers **404** — never 403, never business B's data. One such test exists per repository added in 001. (FR-002, NFR-005) |
| **AC-001-11** | **Given** an authenticated visitor, **when** "Sign out" is activated, **then** the cookie is cleared and a subsequent direct request to `/home` is redirected to `/`. (FR-003) |
| **AC-001-12** | **Given** a token whose `exp` is in the past, **when** it is verified, **then** verification fails and the caller is treated as anonymous; a `(app)` request redirects to `/` with the expiry explanation and **executes nothing**. (FR-003b) |
| **AC-001-13** | **Given** any authenticated route, **when** the shell is inspected, **then** the sidebar lists exactly the **3** navigation items that have a destination — **Home, Transactions, Move money** — the item matching the current route carries `aria-current="page"` while no other does, the user menu shows the seeded name and a "Sign out" item, and the "Move money" CTA is present with an accessible name. **Cut C1 taken by the Technical Director at 🚦 G-SpecPlan 2026-11-09:** FR-004's 5-item navigation is reduced to 3 because the scope cut recorded at the top of `docs/roadmap.md` removed feature 004 (cash-insights) and feature 006 (cards). Two of the five items would have had no destination in any released version; a navigation of three that all work is more honest than five with two dead ends. The README must state which areas were descoped. (FR-004, amended) |
| **AC-001-14** | **Given** a visitor with no stored theme and an OS preference of dark, **when** `/home` loads, **then** it renders dark **with no unstyled flash**; **and** when the toggle is used and the page reloaded, the chosen theme persists. (FR-005) |
| **AC-001-15** | **Given** `/home` at viewport widths 375, 768, 1280 and 1440 px, **when** each is measured, **then** `document.documentElement.scrollWidth <= window.innerWidth` at all four; below 1024 px the sidebar is absent and a topbar menu button opens it as a dismissible sheet that closes on `Esc`. (FR-006, NFR-004) |
| **AC-001-16** | **Given** a route segment whose render throws, **when** it is opened, **then** the `(app)` `error.tsx` renders a heading, a human sentence and a working "Try again", the page body contains **no** stack trace, error message or digest, and the browser console shows no uncaught error beyond React's own boundary notice. (FR-039, NFR-009) |
| **AC-001-17** | **Given** an authenticated visitor, **when** an unknown URL under the shell is requested, **then** the response status is **404** and `not-found.tsx` renders inside the shell with a link back to Home. (FR-039) |
| **AC-001-18** | **Given** each `(app)` route, **when** its files are inspected and the route is opened with a throttled connection, **then** a `loading.tsx` content-shaped skeleton renders (never a full-page spinner), and each placeholder route shows the designed empty state with honest copy. (NFR-010) |
| **AC-001-19** | **Given** `SESSION_SECRET` unset (or shorter than 32 characters), **when** the app boots, **then** it fails with a named, human error and **no** default secret is used; **and** `git ls-files` shows no `.env*` file other than `.env.example`, whose `SESSION_SECRET` and `DIRECT_DATABASE_URL` entries are empty placeholders. (NFR-005, Art. 8) |
| **AC-001-20** | **Given** the repository's own documentation, **when** it is read by someone who just cloned it, **then** (a) `AGENTS.md`'s "Project commands" table has **no** ⚠️ UNVERIFIED warning, every row is a command actually executed in this repository, and it includes the missing **`pnpm start`** and **`pnpm db:generate`** rows, notes that `db:migrate` is `prisma migrate dev` and wants `--name`, and describes `pnpm db:seed` as the real FR-036 seed; (b) `.env.example`'s `DATABASE_URL` uses host port **5433**, matching what `docker-compose.yml` publishes, so a fresh clone does not hit `P1000`; (c) `docs/traceability.md` no longer cites the non-existent `tests/e2e/error-states.spec.ts`. Each command in the table is run once and its exit status pasted. (carried from 000 T-14 + 000 validation §6 items 2 and 4) |
| **AC-001-22** | 🔴 **Given** the built production server (`NODE_ENV=production`), **when** N successive requests each touch the database, **then** exactly **one** `PrismaClient` and **one** `pg` pool exist for the process — proved two ways: (a) a regression test asserts that repeated property access on the exported `prisma` proxy resolves to the **same** underlying instance and that the factory ran **once**; (b) executed evidence from `pg_stat_activity` showing client backends do **not** grow with request count (the 000 report measured 1 → 27 over 26 requests; after the fix the count must stay flat). The `globalThis` branch is kept for dev hot-reload. (000 validation §6 item 1, NFR-006) |
| **AC-001-23** | 🛑 **Human-gated. Given** 001's own pull request, **when** Vercel builds it, **then** a **Preview** deployment exists for that head, `GET <preview-url>/api/health` returns `200` with `status:"ok"`, and `<preview-url>/` serves UI-01 with "Continue as demo" reaching the shell. This **closes 000's permanently-unverifiable AC-000-12a**, which cannot be salvaged retroactively. (000 validation §6 item 3) |
| **AC-001-24** | **Given** a production build, **when** `/_dev/boom` is requested, **then** it is **not reachable** (404), while it still works under `NODE_ENV !== 'production'` so AC-001-16 stays executable locally; **and** a favicon is served from `src/app`, so a production page load logs **no** `/favicon.ico` 404 in the browser console. (000 validation §6 item 5) |
| **AC-001-21** | 🛑 **Human-gated.** **Given** Neon's **direct** connection string in `DIRECT_DATABASE_URL`, **when** `prisma migrate deploy` and then `pnpm db:seed` are run against it, **then** `migrate status` reports all migrations applied with no drift, the seed's self-checks pass, and `GET https://oakfernbankdashboard.vercel.app/api/health` returns `200` with `status:"ok"`; the production `/` serves UI-01 and "Continue as demo" reaches the shell. (ADR-0006) |

## 11. Assumptions and open questions

### Assumptions recorded **in place of** clarification questions (no `/sdd-clarify` for 001)

| ID | Decision taken (recommended option) | Discarded alternative | Risk if wrong |
|---|---|---|---|
| **ASM-001-01** | **Route layout:** `/` is the public UI-01 landing; the authenticated screens live in a `(app)` route group at `/home`, `/transactions`, `/accounts`, `/payments`, `/cards`. | `/` as Home with the landing at `/welcome`. Rejected: an evaluator opening the bare URL must meet the explainer and the one-click CTA (FR-001). | **Low.** Costs one redirect rule. If the human prefers `/` = Home, it is a 10-minute change in 001 and free afterwards. |
| **ASM-001-02** | **The seed truncates and rebuilds** the per-business tables in dependency order; global `Category` rows are **upserted by `key`**. | Upsert everything. Rejected: upserting 1,500 transactions is slower, leaves orphans from a previous shape, and breaks determinism. | **Low.** It destroys an evaluator's mutations — which is precisely FR-037 "reset demo data" and TD-006's accepted behaviour. |
| **ASM-001-03** | **The seed supplies every `id` and every `createdAt`/`postedAt`/`settleAt` explicitly** from the seeded faker instance and a single `runDay` anchor. `@default(cuid())` and `@default(now())` stay on the models for rows created at runtime. | Rely on database defaults. **Rejected because it silently breaks FR-036:** `cuid()`/`uuid()` and `now()` are non-deterministic, so "two runs produce identical data" would be unverifiable and the AC-001-03 hash would never match. | **Medium if ignored** — this is the single easiest way to fail FR-036. As decided, risk is low. |
| **ASM-001-04** | **Faker seed value `20261110`**, and `runDay` = ET midnight of the day the seed runs. Two runs on the same day are identical; across days every date shifts. | A frozen absolute date. Rejected: FR-036 explicitly says "dates relative to the run day", so the dashboard must never look stale. | **Low.** The AC states the determinism window is "same run day". |
| **ASM-001-05** | **No hand-written SQL `CHECK` constraints** (`amountCents <> 0`, `Transfer.amountCents > 0`). BR-001/BR-003 are enforced by the `Int` column type, Zod at the boundary, the domain, and tests. | Append CHECKs to the generated migration SQL. Rejected: Prisma cannot express them in `schema.prisma`, so every later `migrate dev` in 002/003/005 would report drift against the shadow database — an expensive failure mode at hour 20. | **Medium.** A direct SQL insert could write `amountCents = 0`. Nothing in the application can. **Recorded as new technical debt TD-011.** |
| **ASM-001-06** | **`method ∈ {ach, wire} ⇒ amountCents < 0` applies only to *user-created* movements.** Seeded historical rows may carry ACH/wire **inflows**. | Forbid ACH/wire inflows outright. Rejected: it contradicts the approved UI-02 wireframe, which shows "Stripe payout · Nov 9 · ACH · **+$48,210.00**", and a business with no incoming ACH is not realistic. | **Low** — but it is a documented-invariant conflict, so `docs/domain/model.md` is amended in the same commit rather than overruled by this spec (MEMORY "Learnings"). |
| **ASM-001-07** | **The 5-item sidebar of FR-004 is kept in full**, with `/cards` (and `/payments` until 005) rendering an honest "not part of this round" state linking to the README. | Shrink the sidebar to 3 items. Rejected: FR-004 is a `Must` and the 5-item sidebar was approved at 🚦 G-Foundational; the roadmap cut removed features, not the approved navigation. | **Low.** An evaluator could read a stub nav item as unfinished — mitigated by explicit copy. Pre-authorised cut **C1** reverses it if time runs out. |
| **ASM-001-08** | **`/home` ships as an honest placeholder in 001**, with no fabricated KPI numbers. | Render placeholder numbers to make the screenshot look complete. Rejected outright: Constitution Title I.4 and Art. 3 — nothing in the UI may claim a capability that does not exist. | **None.** |
| **ASM-001-09** | **The "Move money" CTA is rendered `disabled`** with an accessible name stating it arrives with the money-movement feature. | Omit it until 005. Rejected: FR-004 requires it "reachable from every authenticated screen", and the shell's layout must be final before 002 builds on it. | **Low.** 005 enables it by deleting one prop. |
| **ASM-001-10** | **`next-themes@0.4.6` is added** for FR-005. | Hand-rolled `localStorage` + inline script. Rejected: FR-005's acceptance condition is literally "no unstyled flash on reload", which is exactly where a hand-rolled implementation hides a bug, and `next-themes` injects the blocking script for us. Art. 10 record in plan §7. | **Low.** Pre-authorised cut **C3** drops it for system-only dark mode. |
| **ASM-001-11** | **`date-fns@4.4.0` + `@date-fns/tz@1.5.0`** implement `time.ts`. | Hand-rolled `Intl.DateTimeFormat` offset arithmetic (the "don't add it" option). Rejected: BR-009's DST examples are precisely where hand-rolled offset maths breaks, and both packages were already approved in ADR-0002 / listed in TD-008. | **Low.** `@date-fns/tz` version verified today (plan §7.1), closing part of TD-008. |
| **ASM-001-12** | **The seed runs through `node --experimental-strip-types prisma/seed.ts`** (no new dependency), with a **hard 5-minute experiment budget**; if it fails, install `tsx@4.23.15`. | Add `tsx` immediately. Rejected on Art. 10 "don't add it" first — but the fallback is pre-authorised, exactly as 000 handled `dotenv`. | **Medium.** The generated Prisma client is a large TS tree; if it contains non-erasable syntax, strip-types fails. Bounded by the 5-minute budget and the pre-approved fallback. |
| **ASM-001-13** | **`shadcn@4.23.0` is initialised in 001** and exactly five primitives are added: `button`, `sheet`, `dropdown-menu`, `separator`, `skeleton`. | Hand-write the shell. Rejected: a focus-trapped, `Esc`-dismissible mobile sheet (FR-006 + NFR-003) is more work and more risk hand-rolled than installed. | **Medium.** `shadcn init` may overwrite `src/app/globals.css` and lose the approved teal/slate token block. Mitigated by committing first and diffing immediately after (plan §8 R-3). |
| **ASM-001-14** | **Coverage threshold on `src/server/domain` is switched on at ≥ 80 %** in this feature (000 left it off over an empty directory, CL-05). | Leave it off until 002. Rejected: 001 is the first feature with real domain code, and NFR-007 names the threshold. | **Low.** If 001's domain modules land under 80 %, the fix is writing the missing test, not lowering the bar. |
| **ASM-001-15** | **Production migration runs from the developer machine** against `DIRECT_DATABASE_URL`, not from the Vercel build and not from CI. | A `migrate deploy` step in the Vercel build command, or a `main`-push CI job. Rejected for tonight: both need the direct URL stored in a second place and both run unattended against production — Art. 9 wants a human at the keyboard for the first production migration. | **Low.** Documented as a README "next step"; **recorded as TD-012**. |
| **ASM-001-17** | **The client-singleton fix is a module-level `let` memo** in `src/server/repositories/client.ts`, assigned on first construction and returned thereafter, with the existing `globalThis` branch kept **only** for dev hot-reload. No `$disconnect` handling, no pool-size tuning. | A `globalThis` memo in production too (works, but makes production depend on a mutable global), or an explicit connection-pool module. Rejected: the smallest correct change is a one-line memo, and the measured defect is "the factory runs per access", not "the pool is mis-sized". | **Low.** If Neon still shows connection growth after the fix, the next suspect is Vercel's per-lambda isolation, which a memo cannot fix and which is documented behaviour rather than a defect. |
| **ASM-001-16** | **`Counterparty` names are unique per business, case-sensitively at the database level** (`@@unique([businessId, name])`), with the seed normalising names before insert. | A case-insensitive unique index (needs raw SQL / `citext`). Rejected: raw SQL in the migration reopens the drift problem of ASM-001-05. | **Low.** The seed is the only writer in 001; FR-028 (005) adds a service-level case-insensitive check. |

### Open questions

| ID | Question | Owner | Blocking? |
|---|---|---|---|
| **OQ-001-01** | Does the human want `SESSION_SECRET` rotated between Preview and Production, or one value for both? **Recommended: one value**, since both share the same Neon database and the same fictional demo workspace. | Technical Director | **No** — proceed with one value; rotating later invalidates only demo sessions. |
| **OQ-001-02** | Neon's **direct/unpooled** connection string must be pasted into local `.env.local` as `DIRECT_DATABASE_URL`. | Technical Director | **Yes, for AC-001-21 only.** Tasks T-01…T-12 do not need it. |
| **OQ-008** (carried) | Production-deploy authorisation. Production is live as of tonight, so this is treated as granted for 001; AC-001-21 is still marked human-gated because it writes to Neon. | Technical Director | **No.** |

### New technical debt proposed

| ID | Description | Proposal |
|---|---|---|
| **TD-011** | No database-level `CHECK` constraints on money (`amountCents <> 0`, `Transfer.amountCents > 0`); enforcement is type + Zod + domain + tests (ASM-001-05) | Add them in a dedicated migration once the schema stops changing, or move to a Prisma version that expresses them |
| **TD-012** | The production migration is a manual human step rather than an automated deploy step (ASM-001-15) | Add a `migrate deploy` job on push to `main` using `DIRECT_DATABASE_URL` as a GitHub secret |
| **TD-013** | **No automated test carries the `AC-000-07` id** — the `/api/health` 503 contract is verified manually only (000 validation §6 item 5). 001 deliberately does **not** take it: forcing a database failure inside a test needs a second bad connection string and a separately-started server, which is 20+ min for a contract that already has executed evidence | Add an integration test that constructs the health service against an unreachable URL, in 003 or 008 |
| **TD-008** (partially closed) | `@date-fns/tz` verified at `1.5.0` and `lucide-react` resolved at install time in this feature; `@axe-core/playwright` still open → 003; `sonner` still open → 005 | Record each resolved version in `plan.md` §7.1 |

## 12. Change log

| Version | Date | Change | Approved by |
|---|---|---|---|
| 0.1 | 2026-11-09 | Initial spec, written in the single-invocation planning mode (spec + plan + tasks in one call) with no clarification pass. 16 `ASM`s recorded in place of clarification questions. | **Pending 🚦 G-SpecPlan** |
| 0.2 | 2026-11-09 22:4x | Folded in the five carry-ins from `specs/000-walking-skeleton/validation.md` §6 (verdict CHANGES REQUIRED, 0 blockers, 3 major): new §2.1, scope rows 13–15, **AC-001-22** (Prisma singleton production defect — now the first implementation task), **AC-001-23** (Preview on 001's PR, closing 000's AC-000-12a), **AC-001-24** (`/_dev/boom` gating + favicon), widened **AC-001-20** (`pnpm start` / `db:generate` rows, `.env.example` port 5433, `traceability.md` phantom file), new ASM-001-17 and TD-013. | **Pending 🚦 G-SpecPlan** |
