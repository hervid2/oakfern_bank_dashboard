# Tasks — Spec 001 (domain-data-shell)

Spec `specs/001-domain-data-shell/spec.md` **v0.2** · Plan `specs/001-domain-data-shell/plan.md`
Template D.21 · Sprint Profile · Planner, 2026-11-09 22:4x ET · Branch `feat/001-domain-data-shell`

> `[P]` = parallelizable (shares **no files** with another pending `[P]` task).
> The Implementer runs these **strictly sequentially**, one task per invocation, **one commit per
> task**. Conventional Commits with the task id, e.g. `fix(repositories): memoise the prisma client [T-01]`.

> 🚨 **Read §"Timebox reckoning" before approving.** Raw total **7 h 40 min** against a **2 h 30 min**
> box. Applying the measured 000 calibration gives **≈ 3 h 46 min** — still **+50 %**, past SP-6's
> +30 % trigger. A decision is needed at 🚦 G-SpecPlan: approve the cut list in §"Pre-authorised
> scope cuts", or amend the box.

> 🛑 **Ordering rule, from the Coordinator:** **T-01 comes before everything** (it is a measured
> production defect). Then the **backend core** (T-03…T-09), then the **app shell** (T-10…T-13).
> If the night runs out, the valuable half is already done.

---

## Tasks

### Phase 0 — carry-ins from the 000 validation (before any new code)

- [x] **T-01** — 🔴 **Fix the measured production defect in the Prisma client singleton.** Add a
  **module-level `let client`** memo to `getPrismaClient()` in `src/server/repositories/client.ts`,
  keeping the existing `globalThis` branch for dev hot-reload only (plan §1.0a). **Nothing else in
  that file changes** — no `$disconnect`, no pool tuning (ASM-001-17). Write
  `tests/unit/client.test.ts` **red first**: it spies the construction path and asserts the factory
  ran **once** across ~20 property accesses on the exported proxy, and that two accesses resolve to
  the same underlying instance. Then take the measurement: `pnpm build && pnpm start`, hit
  `/api/health` 25×, and read `SELECT count(*) FROM pg_stat_activity WHERE datname='oakfern' AND
  backend_type='client backend'` **before and after** — it must stay flat (the 000 baseline was
  1 → 27 over 26 requests). Paste both counts.
  · **AC:** AC-001-22 · **Files:** `src/server/repositories/client.ts`, `tests/unit/client.test.ts`
  · **Verify:** `pnpm test` (red, then green) · `pnpm build && pnpm start` + the two
  `pg_stat_activity` counts · **Depends on:** — · **Est. 20 min**

- [x] **T-02** — **Documentation and template honesty sweep** (000 T-14, which never ran, plus 000
  validation §6 items 2 and 4). Correct `AGENTS.md`'s "Project commands" table exactly as
  `plan.md` §3.5 specifies: remove the ⚠️ UNVERIFIED block; add the missing **`pnpm start`** and
  **`pnpm db:generate`** rows; note that `pnpm lint` is `eslint . && prettier --check .`, that
  `pnpm test` is the `unit` project only, that `pnpm test:int` needs Compose on host port **5433**,
  that `pnpm test:e2e` builds its own server, and that `pnpm db:migrate` is `prisma migrate dev` and
  wants **`--name`**; label `pnpm db:seed` honestly (a stub today, real as of this feature). Fix
  `.env.example`: port **5433**, plus empty placeholders for `SESSION_SECRET` and
  `DIRECT_DATABASE_URL`. Fix `docs/traceability.md:64`, which cites the non-existent
  `tests/e2e/error-states.spec.ts`. **Then run every command in the corrected table once** and paste
  the exit statuses — the table may not claim anything unexecuted.
  · **AC:** AC-001-20, AC-001-19 (partial) · **Files:** `AGENTS.md`, `.env.example`,
  `docs/traceability.md` · **Verify:** every row of the table executed, exit statuses pasted ·
  `git ls-files | grep '^\.env'` → only `.env.example` · **Depends on:** T-01 · **Est. 20 min**

### Phase 1 — backend core (the valuable half; finish this tonight)

- [x] **T-03** — **Schema + the one migration.** Replace `SkeletonCheck` in `prisma/schema.prisma`
  with the 8 models and 8 enums of `plan.md` §3.1–§3.2, including all NFR-002 indexes, the
  `(businessId, idempotencyKey)` uniques, explicit relation names on `Transfer`'s two `Account`
  FKs, `onDelete: Cascade` from `Business` and `Restrict` from `Category`. Money columns are `Int`,
  and `Account` has **no balance column**. Edit `prisma.config.ts` so the CLI datasource resolves
  `DIRECT_DATABASE_URL ?? DATABASE_URL` (plan §3.4) and add `migrations.seed`. Generate the
  migration, hand-write `down.sql` beside it (plan §3.3). Verify `@default(cuid())` is accepted —
  fall back to `@default(uuid(7))` and record it in the plan if not (R-7).
  · **AC:** AC-001-01, AC-001-02 · **Files:** `prisma/schema.prisma`, `prisma.config.ts`,
  `prisma/migrations/<ts>_domain_model/{migration.sql,down.sql}`, `package.json` (`db:reset`)
  · **Verify:** `pnpm exec prisma validate` · `pnpm db:migrate --name domain_model` ·
  `pnpm db:generate` · `pnpm exec prisma migrate status` · `pnpm typecheck` ·
  `grep -Ei '(double precision|numeric|real|decimal)' prisma/migrations/*/migration.sql` → empty
  · **Depends on:** T-02 · **Est. 35 min**

- [x] **T-04** `[P]` — **Money primitives, test-first.** Write `tests/unit/money.test.ts` and
  `tests/unit/balances.test.ts` from the BR-001 and BR-002 example tables (every id in the title),
  **run them red and paste the output**, then implement `src/server/domain/money.ts`
  (`parseMoneyToCents`, `sumCents`, `assertSafeCents`, `directionOf`),
  `src/server/domain/balances.ts` (`computeBalances`, `assertBalanceInvariant`),
  `src/server/domain/errors.ts` and `src/lib/format.ts` (`formatCents` — the only formatter,
  `Intl.NumberFormat('en-US', …)`). No `parseFloat`, no `toFixed`, no `any`.
  · **AC:** AC-001-02, AC-001-05 · **Files:** `src/server/domain/{money,balances,errors}.ts`,
  `src/lib/format.ts`, `tests/unit/{money,balances}.test.ts` · **Verify:** `pnpm test` (red first,
  then exit 0) · `pnpm lint` (proves the domain stays pure) · **Depends on:** T-02 · **Est. 25 min**

- [x] **T-05** `[P]` — **Business time zone, test-first.** Install `date-fns@4.4.0` and
  `@date-fns/tz@1.5.0` (versions verified, plan §7.1). Write `tests/unit/time.test.ts` from the four
  BR-009 examples — the October-bucket case, the 23-hour spring DST day, the 25-hour autumn DST day
  and the exactly-30-buckets case — **run red**, then implement `src/server/domain/time.ts` with the
  signatures of `plan.md` §4.1. Half-open `[start, end)` everywhere; `now` is always a parameter;
  **the module never calls `new Date()`**.
  · **AC:** AC-001-07 · **Files:** `src/server/domain/time.ts`, `tests/unit/time.test.ts`,
  `package.json` · **Verify:** `pnpm test` (red first, then exit 0) · `pnpm lint` ·
  **Depends on:** T-02 · **Est. 25 min**

- [x] **T-06** — ⚠️ **Riskiest task (R-1). The deterministic seed.** Build `prisma/seed.ts` plus the
  pure modules `prisma/seed/{catalog,generate,write,checks,hash}.ts`. Install
  `@faker-js/faker@10.6.0` (dev). Fixed faker seed `20261110`; `runDay` = ET midnight of today; **the
  seed mints every `id` and every timestamp itself** (ASM-001-03). Truncate the per-business tables
  in dependency order and **upsert `Category` by `key`** (ASM-001-02). Emit the §6.4 volumes in
  chronological order carrying a running per-account balance with the USD 50,000 floor and
  deterministic internal-transfer injection (spec §5 BR-002). Then the four self-checks — BR-002
  invariant via `computeBalances`, BR-011 internal-leg shape, `int4` range, and the bounded runway
  search landing in 14–24 months — each exiting non-zero on failure. Print the summary table and the
  SHA-256 content hash. Wire `db:seed` to `node --experimental-strip-types prisma/seed.ts`; **5-minute
  budget**, then fall back to `tsx@4.23.15` (ASM-001-12) and record which one was used.
  · **AC:** AC-001-03, AC-001-04, AC-001-05, AC-001-06, AC-001-08 · **Files:** `prisma/seed.ts`,
  `prisma/seed/*.ts`, `package.json` · **Verify:** `pnpm db:seed` twice → identical `content-hash`,
  both exit 0, summary pasted · **Depends on:** T-03, T-04, T-05 · **Est. 40 min**

- [x] **T-07** — **Env, repositories and services.** `src/lib/env.ts` (Zod over `DATABASE_URL`,
  `DIRECT_DATABASE_URL?`, `SESSION_SECRET` min 32 — fails loudly, **no default ever**).
  `src/server/repositories/{users,accounts,transactions}.ts` with the §2.3 methods; **every exported
  function takes `businessId` first** and every Prisma call filters on it, the single documented
  exception being `findDemoUser()`. `src/server/services/{auth,accounts}.ts` with
  `getAccountBalances(businessId)` as the one source of truth for a balance (NFR-011).
  · **AC:** AC-001-10 (foundation), AC-001-19 · **Files:** `src/lib/env.ts`,
  `src/server/repositories/{users,accounts,transactions}.ts`,
  `src/server/services/{auth,accounts}.ts` · **Verify:** `pnpm lint` (proves services never import
  Prisma) · `pnpm typecheck` · **Depends on:** T-03, T-04 · **Est. 30 min**

- [x] **T-08** — **Session, guard, middleware.** Install `jose@6.2.17` (registry-verified as
  `latest`, plan §7.1). `src/lib/session.ts` (HS256 sign/verify, 8 h `exp`, cookie
  `oakfern_session` `httpOnly`+`secure`+`sameSite=lax`+`path=/`; `verifySession` returns `null` on
  **any** failure). `requireSession()` / `requireAdmin()` in `services/auth.ts`.
  `src/actions/auth.ts` (`signInAsDemo`, `signOut` — Zod `z.object({})` → service → cookie →
  `redirect`). `middleware.ts` gating `(app)` paths, using only `jose` + WebCrypto so the edge
  runtime is clean (R-9). `tests/unit/session.test.ts` includes the expired-token case.
  · **AC:** AC-001-09, AC-001-11, AC-001-12, AC-001-19 · **Files:** `src/lib/session.ts`,
  `src/server/services/auth.ts`, `src/actions/auth.ts`, `middleware.ts`,
  `tests/unit/session.test.ts`, `package.json` · **Verify:** `pnpm test` · `pnpm build` (proves the
  middleware bundles for edge) · **Depends on:** T-07 · **Est. 30 min**

- [x] **T-09** — **Integration tests over the real database, and the coverage threshold.**
  `tests/helpers/db.ts` (truncate helper + the **two-business** fixture).
  `tests/integration/seed.test.ts`: volumes (AC-001-04), BR-002 invariant per account (AC-001-05),
  BR-011 internal-leg shape and the "30-day money-out excluding internal is strictly less than
  including it" assertion (AC-001-06), and the `Int`/integer money assertion (AC-001-02).
  `tests/integration/scoping.test.ts`: one anti-IDOR test per repository method (AC-001-10). Switch
  the `src/server/domain` coverage threshold on at **80 %** in `vitest.config.ts` (ASM-001-14) and
  make it pass by writing tests, never by lowering it (R-8).
  · **AC:** AC-001-02, AC-001-03, AC-001-04, AC-001-05, AC-001-06, AC-001-10 · **Files:**
  `tests/helpers/db.ts`, `tests/integration/{seed,scoping}.test.ts`, `vitest.config.ts`
  · **Verify:** `pnpm test:int` · `pnpm test --coverage` (≥ 80 % on `src/server/domain`)
  · **Depends on:** T-06, T-07 · **Est. 30 min**

> 🌙 **NATURAL STOPPING POINT FOR TONIGHT: end of T-09.**
> At T-09 the backend core is complete and provable: schema, migration, deterministic seed with its
> self-checks, session and guard, `businessId` scoping, and green unit + integration suites. The
> repository is in a coherent, committed, CI-passable state with no half-built UI.
> **Hard floor if the night collapses: end of T-06** (schema + migration + a working seed). Never
> stop mid-task — if a task cannot be finished, revert it rather than committing it half-done.

### Phase 2 — the app shell

- [ ] **T-10** — **UI dependencies and primitives.** `pnpm dlx shadcn@4.23.0 init` (`--src-dir`,
  pointing at the existing `src/app/globals.css`), then add exactly `button`, `sheet`,
  `dropdown-menu`, `separator`, `skeleton`. ⚠️ **Commit before running it**, then `git diff --stat`
  immediately: the approved teal/slate token block in `globals.css` must survive, and
  `eslint.config.mjs` must be untouched — restore either if the CLI rewrote it (R-3). Install
  `next-themes@0.4.6` and `lucide-react` at whatever version `shadcn add` resolves (record it; if it
  resolves nothing, pin `1.70.0` — R-4). Add `src/components/brand/wordmark.tsx` (inline SVG, no
  raster asset) and `src/app/icon.svg` (favicon, AC-001-24).
  · **AC:** AC-001-24 (favicon half) · **Files:** `components.json`, `src/components/ui/*.tsx`,
  `src/lib/utils.ts`, `src/components/brand/wordmark.tsx`, `src/app/icon.svg`, `package.json`,
  `src/app/globals.css` (verified unchanged in substance) · **Verify:** `pnpm lint` ·
  `pnpm typecheck` · `git diff --stat` reviewed and pasted · **Depends on:** T-09 · **Est. 25 min**

- [ ] **T-11** — **The shell.** `src/components/shell/{nav-items.ts,app-sidebar,mobile-nav,topbar,theme-toggle}.tsx`,
  `src/components/theme-provider.tsx`, `src/components/states/{empty-state,error-state,section-placeholder}.tsx`,
  and `src/app/(app)/layout.tsx` calling `requireSession()` then rendering sidebar + topbar.
  `src/app/layout.tsx` gains the `ThemeProvider` and `suppressHydrationWarning`. The 5 FR-004 nav
  items with `aria-current="page"` on exactly one; topbar with menu button (< 1024 px), theme
  toggle, user menu showing the seeded name and "Sign out"; the "Move money" CTA rendered
  `disabled` with an explanatory accessible name (ASM-001-09). No hardcoded hex, teal accent only on
  CTA / active nav / focus ring.
  · **AC:** AC-001-13, AC-001-14, AC-001-15 · **Files:** as listed · **Verify:** `pnpm lint`
  (proves `src/components` never imports `src/server`) · `pnpm build` · browse 1280 px and 375 px
  through the **Playwright MCP**, screenshots + clean console · **Depends on:** T-10 · **Est. 40 min**

- [ ] **T-12** — **Routes, landing and every required state.** Replace `src/app/page.tsx` with UI-01
  (wordmark, value proposition, the honesty line, "Continue as demo"; redirect to `/home` if already
  authenticated, and the expiry explanation when arriving from E-3). Create `(app)/{home,transactions,accounts,payments,cards}/page.tsx`
  with their honest placeholders **and a `loading.tsx` content-shaped skeleton each** — no full-page
  spinner anywhere. Create `(app)/error.tsx` and `(app)/not-found.tsx` inside the shell. Create
  `(app)/_dev/boom/page.tsx` so AC-001-16 is executable inside the shell, and gate **both** boom
  routes behind `NODE_ENV !== 'production'` with `notFound()` (AC-001-24).
  · **AC:** AC-001-09, AC-001-16, AC-001-17, AC-001-18, AC-001-24 · **Files:** `src/app/page.tsx`,
  `src/app/(app)/**`, `src/app/%5Fdev/boom/page.tsx` · **Verify:** `pnpm build && pnpm start`, then
  browse `/`, all five routes, an unknown URL (404) and `/(app)/_dev/boom`; `curl -o /dev/null -w
  '%{http_code}' localhost:3000/_dev/boom` → **404** against the production build
  · **Depends on:** T-11 · **Est. 35 min**

- [ ] **T-13** — **End-to-end suite.** `tests/e2e/shell.spec.ts`, every title carrying its AC id:
  sign-in from `/` with the cookie-flag assertions (AC-001-09); sign-out and the subsequent redirect
  (AC-001-11); the 5 nav items with exactly one `aria-current` (AC-001-13); dark via
  `colorScheme: 'dark'` with no flash, plus toggle-then-reload persistence (AC-001-14); the four
  viewports with `scrollWidth <= innerWidth` and the sheet opening/`Esc`-closing at 375 px
  (AC-001-15); the segment error state with no stack frame in the body (AC-001-16); an unknown URL
  returning 404 (AC-001-17); the placeholder copy and skeletons (AC-001-18); and no `/favicon.ico`
  404 in the console (AC-001-24).
  · **AC:** AC-001-09, 11, 13, 14, 15, 16, 17, 18, 24 · **Files:** `tests/e2e/shell.spec.ts`
  · **Verify:** `pnpm test:e2e` + retain `playwright-report/` · **Depends on:** T-12 · **Est. 30 min**

### Phase 3 — gate, deploy, close

- [ ] **T-14** — **Full local gate and the documentation debts.** Run the complete gate and paste
  every output. Update `docs/traceability.md` with AC-001-01…24 → test rows; amend
  `docs/domain/model.md` with the one-line ACH/wire-inflow clarification (**ASM-001-06** — a spec may
  not overrule a documented invariant without amending it); amend `docs/adr/0002-stack-and-versions.md`
  with the resolved versions (`@date-fns/tz@1.5.0`, `lucide-react@<resolved>`, `next-themes@0.4.6`,
  `tsx` if taken) and `docs/adr/0006-deployment.md` with the pooled-vs-direct Neon paragraph; add
  TD-011, TD-012, TD-013 to `docs/roadmap.md` and set 001's status.
  · **AC:** all (evidence consolidation) · **Files:** `docs/traceability.md`,
  `docs/domain/model.md`, `docs/adr/0002-stack-and-versions.md`, `docs/adr/0006-deployment.md`,
  `docs/roadmap.md` · **Verify:** `pnpm lint && pnpm typecheck && pnpm test --coverage && pnpm
  test:int && pnpm build && pnpm test:e2e` all green · **Depends on:** T-13 · **Est. 25 min**

- [ ] **T-15** — 🛑 **Human-gated (Art. 9 — writes to Neon).** The human (a) pastes Neon's **direct /
  unpooled** connection string into `.env.local` as `DIRECT_DATABASE_URL` (the host **without**
  `-pooler` — confirm this by eye before running anything, R-6), and (b) adds `SESSION_SECRET` to
  `.env.local` **and to Vercel for Production *and* Preview** (`node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`).
  Then: `pnpm exec prisma migrate status` (before), `pnpm exec prisma migrate deploy`,
  `pnpm db:seed`, `pnpm exec prisma migrate status` (after). Note that this drops `SkeletonCheck`
  from the live database while production still runs 000's code — harmless, because 000's
  `/api/health` only issues `SELECT 1`.
  · **AC:** AC-001-21 (database half), AC-001-19 · **Files:** none committed (evidence into
  `validation.md`); `.env.local` is git-ignored · **Verify:** `migrate status` reports all applied,
  no drift · the seed's self-checks exit 0 · `curl -i https://oakfernbankdashboard.vercel.app/api/health`
  → 200 `status:"ok"` · **Depends on:** T-14 · **Est. 25 min**

- [ ] **T-16** — 🛑 **Human-gated. Push, PR, and the Preview that 000 never got.** Push
  `feat/001-domain-data-shell`; the **human** opens the PR through the GitHub web UI (`gh` is absent,
  OQ-007) at the repository URL recorded in `MEMORY.md`; wait for CI green. **Then verify the Vercel
  Preview on that head — this is the only remaining way to close 000's permanently-unverifiable
  AC-000-12a (AC-001-23). Do not merge on CI-green alone; that is exactly how AC-000-12a was lost
  (R-12).** Verify `<preview>/api/health` → 200 `status:"ok"` and complete "Continue as demo" on
  `<preview>/`. Only then merge, and re-verify production `/` and `/api/health`.
  · **AC:** AC-001-21, AC-001-23 · **Files:** none (evidence into `validation.md`) · **Verify:**
  Actions run URL green · Preview URL + `curl -i <preview>/api/health` + a Preview screenshot of `/`
  · production re-check after merge · **Depends on:** T-15 · **Est. 25 min**

---

## Timebox reckoning (honest, not shaved)

| Phase | Tasks | Raw estimate |
|---|---|---|
| 0 — 000 carry-ins | T-01, T-02 | 40 min |
| 1 — backend core | T-03 … T-09 | 215 min |
| 2 — app shell | T-10 … T-13 | 130 min |
| 3 — gate + deploy | T-14 … T-16 | 75 min |
| **Raw total** | **16 tasks** | **460 min = 7 h 40 min** |
| **Timebox (`docs/roadmap.md`)** | | **150 min = 2 h 30 min** |
| **Raw overrun** | | **+207 %** |

**The calibration, stated rather than applied silently.** Feature 000 was estimated at 199 min and
took about **85 min** of implementation — a factor of **≈ 0.43**. I believe the same bias applies
here for the same reason: these estimates price every task as if the Implementer had to discover the
API surface, whereas Prisma 7, Vitest projects, Playwright and the ESLint layering are now *known*
and 000's plan documented them. Applying 0.43 to the implementation tasks only:

| Slice | Raw | × 0.43 | Note |
|---|---|---|---|
| T-01 … T-14 (implementation) | 410 min | **≈ 176 min** | the calibration is defensible here |
| T-15 + T-16 (human-gated) | 50 min | **≈ 50 min** | mostly deploy and CI wall-clock; **does not calibrate down** |
| **Calibrated total** | | **≈ 226 min = 3 h 46 min** | **+50 % over the 2 h 30 box** |

**Verdict: even calibrated, this is past SP-6's +30 % trigger**, so it needs a decision at
🚦 G-SpecPlan rather than optimism. Two honest caveats in opposite directions: the seed (T-06) is the
least-known work in the feature and is the one task where I would *not* apply the 0.43 factor; and
T-15/T-16 depend on a human being awake, which tonight they will not be after 00:30.

**What fits tonight.** It is ~22:45 by the time this is approved, and the human stops at 00:30 —
about **1 h 45** of working time left. T-01 … T-09 is **255 min raw ≈ 110 min calibrated**, which
fits that window only if the calibration holds. So:

- **Target tonight: through T-09** (backend core complete, CI-passable).
- **Hard floor tonight: through T-06** (schema + migration + working deterministic seed) ≈ 71 min calibrated.
- **Tomorrow 09:00:** T-10 … T-16, ≈ 116 min calibrated, well inside the morning.

## Pre-authorised scope cuts (priority order)

> Proposed for approval **with** the plan at 🚦 G-SpecPlan, so the Implementer can take them without
> another round trip. 000's cut list was used and it worked. **Take them in order, top first.**

| # | Cut | Saves (raw) | Cost | Amends |
|---|---|---|---|---|
| **C1** | **Drop the `/payments` and `/cards` placeholder routes and their sidebar items** → a 3-item sidebar (Home, Transactions, Accounts) | ~10 min | A dead-end nav item disappears, which is arguably *better*; but FR-004 says five | FR-004, ASM-001-07 |
| **C2** | **Drop `next-themes`: dark mode becomes system-only** via `prefers-color-scheme`, with **no toggle** | ~15 min | FR-005's toggle and persistence halves go unmet; AC-001-14 reduces to "renders dark under a dark OS preference with no flash" | FR-005, ASM-001-10 |
| **C3** | **Trim the e2e suite to one smoke spec** (sign-in → shell → sign-out) and verify AC-001-13…18 by Playwright-MCP screenshots instead of assertions | ~15 min | Those ACs become manually-evidenced rather than regression-protected | NFR-004, NFR-010 evidence level |
| **C4** | **Drop `services/accounts.getAccountBalances` and the `accounts` repository**, pushing both into 002; prove BR-002 in the integration test directly off the `transactions` repository | ~12 min | 002 inherits slightly more work; AC-001-05 is unaffected | plan §2.3–§2.4 |
| **C5** | **Reduce the shadcn install to `button` + `sheet` + `skeleton`**; hand-write the user menu as a `<details>` disclosure instead of `dropdown-menu` | ~10 min | Slightly weaker keyboard semantics on the user menu | ASM-001-13 |
| **C6** | **Drop the bounded runway search in the seed**: use a fixed outflow multiplier and report whatever runway results, honestly, instead of forcing 14–24 months | ~12 min | **AC-001-08 is not met** and must be recorded as such; the dashboard may show an odd runway | FR-036 |
| **C7** | **Drop the two-business anti-IDOR fixture**; assert scoping by unit-testing each repository's `where` clause instead | ~10 min | Weakens NFR-005 evidence from "proven against a database" to "proven against a call shape". **Last resort — NFR-005 is a `Must` and the 000 reviewer cleared anti-IDOR as clean; losing that would be a regression in rigour** | NFR-005 |

**Never cut, whatever happens:** T-01 (the production defect), the `Int` money columns, the BR-002
self-check and its integration test, `businessId` on every repository method, the Zod env guard, the
Neon migration (T-15 — Preview *and* Production read that database, so without it every deployed
page breaks), and the Preview verification in T-16 (AC-001-23 is the only way to close 000's
AC-000-12a).

## Evidence

> The Implementer appends one line per task as it closes: `T-xx ✅ <commit hash> · <command> → <result>`.

- **T-01 ✅ `eadd89c`** · `pnpm test tests/unit/client.test.ts` → red first (3 failed: **41** client
  constructions across 20 property accesses), then **4 passed**; full `pnpm test` → **7 passed**.
  Runtime measurement on the Compose database, `pnpm build && pnpm start`, 25× `GET /api/health`
  (all `200`), `SELECT count(*) FROM pg_stat_activity WHERE datname='oakfern' AND
  backend_type='client backend'`: **before the fix 1 → 26**, **after the fix 1 → 2** (the second
  backend is the psql counting session itself). AC-001-22 met.
- **T-02 ✅ `c1ee2b5`** · every row of the corrected table executed once:
  `pnpm install` → 0 · `pnpm dev` → serves `/` 200 · `pnpm lint` → **1** (Prettier half only; see the
  note below) · `pnpm exec eslint .` → 0 · `pnpm typecheck` → 0 · `pnpm test` → 0 ·
  `pnpm test <path>` → 0 · `pnpm test:int` → 0 · `pnpm test:e2e` → 0 (4 passed) · `pnpm build` → 0 ·
  `pnpm start` → `/` 200, `/api/health` 200 · `pnpm db:migrate --name noop_check` → 0 ("Already in
  sync", no migration created) · `pnpm db:generate` → 0 · `pnpm db:seed` → **1**, the deliberate stub.
  `git ls-files | grep '^\.env'` → only `.env.example`.
  **Finding, since fixed:** on Windows with `core.autocrlf=true` the Prettier half of `pnpm lint`
  failed on **all 25 pre-existing files** (`.prettierrc` sets `endOfLine: "lf"`, the working tree was
  CRLF). Fixed on the Coordinator's instruction in the standalone commit **`44a86fc`** (`.gitattributes`
  with `* text=auto eol=lf`): `pnpm lint` now **exits 0** locally, so every later task's
  `Verify: pnpm lint` is a real check. `git add --renormalize .` was a no-op — `core.autocrlf=true`
  had always normalised to LF on the way *into* the index, so no blob needed rewriting; the defect was
  checkout-only and was cleared with `git rm --cached -r . && git reset --hard`. The `AGENTS.md` lint
  row was corrected to drop the "local substitute" workaround.
- **T-03 ✅ `5012f28`** · `pnpm exec prisma validate` → "The schema at prisma\schema.prisma is valid 🚀"
  (so `@default(cuid())` is accepted; the `uuid(7)` fallback of R-7 was not needed) ·
  `pnpm db:migrate --name domain_model` → applied `20261110034318_domain_model` ·
  `pnpm db:generate` → "Generated Prisma Client (7.10.1)" (so a plain string is accepted in
  `datasource.url`, the §3.4 risk did not materialise) · `pnpm exec prisma migrate status` →
  "2 migrations found … Database schema is up to date!" · `pnpm typecheck` → 0 ·
  `grep -Ein '(double precision|numeric|real|decimal)' prisma/migrations/*/migration.sql` → **empty**
  (exit 1); the three money columns are `INTEGER NOT NULL`. 8 `CREATE TYPE`, 8 `CREATE TABLE`,
  `DROP TABLE "SkeletonCheck"`. AC-001-01 (local half), AC-001-02 met.
- **T-04 ✅ `eef3c0b`** · `pnpm test` → red first (both files unresolvable), then **26 passed** ·
  `pnpm exec eslint .` → 0, which is the proof that `src/server/domain` imports no Prisma and no
  framework · `pnpm typecheck` → 0. AC-001-02, AC-001-05 (domain half) met.
- **T-05 ✅ `95d54e8`** · `date-fns@4.4.0` and `@date-fns/tz@1.5.0` installed `--save-exact`, both
  re-verified against the registry at install time (`date-fns` `latest` = `4.4.0`, `@date-fns/tz`
  `latest` = `1.5.0`) · `pnpm test tests/unit/time.test.ts` → red first, then **10 passed**; full
  `pnpm test` → **36 passed** · also green under `TZ=UTC` and `TZ=Asia/Tokyo`, so CI's UTC host cannot
  make it lie · `pnpm exec eslint .` → 0 · `pnpm typecheck` → 0. AC-001-07 met.
- **Block close (T-01…T-05)** · `pnpm exec eslint .` → 0 · `pnpm typecheck` → 0 · `pnpm test` → 0
  (36 passed) · `pnpm test:int` → 0 (2 passed) · `pnpm build` → 0.
- **T-06 ✅ `1cd1e15`** · runner: the **`tsx@4.23.15` fallback** was taken (`db:seed` is
  `tsx prisma/seed.ts`), so ASM-001-12's pre-authorised fallback is the executed path, not
  `node --experimental-strip-types`. `pnpm db:seed` run **twice** on 2026-11-10 — both **exit 0**,
  both printing `content-hash:
  91bd39c0ffb1c349541a4eef34457a6e53e9e6449fd703f33961ca143850be44` and
  `all self-checks passed`, so AC-001-03 holds. Summary, run day `2026-11-10` (ET): 1 Business ·
  1 User (admin, no password hash) · 14 Category · 4 Account · 5 Card · 61 Counterparty ·
  24 Transfer · **1,369 Transaction** (48 internal legs, 3 pending ach/wire outflows) · ledger span
  **375 days**. Balances via the app's own `computeBalances`: Operating $317,325.53 / $288,220.53 ·
  Payroll $50,072.13 / $50,072.13 · Reserve $310,372.26 / $310,372.26 · Treasury $235,748.62 /
  $235,748.62 · **total cash $913,518.54**. 30 ET days, internal excluded: in $254,746.64, out
  $281,636.79; **out including internal $472,336.79** (so the BR-011 exclusion is observable, not
  vacuous). Average net burn $50,751.03/month over 2026-08…2026-10 → **runway 18.0 months**, inside
  the AC-001-08 14–24 band. AC-001-03, AC-001-04, AC-001-05, AC-001-06, AC-001-08 met.
- **T-07 ✅ `fd719f8`** · `pnpm lint` → **0** (`eslint .` **and** `prettier --check .`), which is the
  mechanical proof that `src/server/services` imports no Prisma and no framework and that only
  `repositories/client.ts` imports the generated client · `pnpm typecheck` → **0**. Every exported
  repository function takes `businessId` first; `findDemoUser()` is the single documented exception
  and T-09 pins that property with a test. AC-001-10 (foundation), AC-001-19 (env guard half) met.
- **T-08 ✅ `489dda0`** · `jose@6.2.17` installed `--save-exact` (registry `latest` = `6.2.17`,
  zero dependencies, WebCrypto) · `pnpm test` → **48 passed / 6 files** (12 new session tests) ·
  `pnpm build` → **0**, route table lists `ƒ Proxy (Middleware)`, so plan §8 **R-9 did not
  materialise**: the edge bundle builds · `pnpm lint` → 0 · `pnpm typecheck` → 0.
  **The matcher was verified by request, not by reading the regex.** `pnpm build && pnpm start`
  with `SESSION_SECRET` **in the process environment only** (never written to a tracked file;
  `git check-ignore -v .env.local` → `.gitignore:8:.env.*`, and `git ls-files | grep '^\.env'` →
  only `.env.example`):
  (1) `GET /api/health` with no cookie → **200** `{"status":"ok","database":"ok",…}` — OQ-009 holds;
  (2) `GET /home` anonymous → **307 → `/`**;
  (3) `GET /` anonymous → **200**;
  (4) `GET /home` with a valid cookie → **404** (the page itself arrives in T-12) — the middleware
  let it through, which is the **positive** half of AC-001-19;
  (5) `GET /` with a valid cookie → **307 → `/home`**;
  (6) `GET /home` with an expired cookie → **307 → `/?session=expired`** plus
  `set-cookie: oakfern_session=; Path=/; Max-Age=0` — AC-001-12 treated as anonymous, nothing
  executed;
  (7) `GET /api/health` with an expired cookie → **200**.
  The same seven probes re-run with `SESSION_SECRET` **unset** fail **closed**: probe (4) became
  `307 → /?session=expired` and probe (5) stayed `200` on `/`, i.e. a valid token is honoured by
  nobody when the secret is absent, while `/api/health` stayed 200. With the secret missing or
  shorter than 32 characters the signing path throws a named `SESSION_SECRET …` error
  (`tests/unit/session.test.ts`, 3 AC-001-19 cases, one of which proves the secret is read **per
  call** rather than memoised at import). AC-001-09 (cookie contract half), AC-001-11 (clear-cookie
  half), AC-001-12, AC-001-19 met; the browser halves of AC-001-09/11 land with T-13.
- **T-09 ✅ `a7bc07e`** · `pnpm test:int` → **19 passed / 3 files** (17 new), every title carrying its
  AC id. AC-001-10, one test per repository method against the **two-business fixture** in
  `tests/helpers/db.ts`: `findUserById`, `findDemoUser` (the documented exception — asserted to take
  **no** caller input, `expect(findDemoUser).toHaveLength(0)`), `listAccounts`, `findAccountById`,
  `listBalanceRows` (including the `accountId`-narrowed form), `countTransactions`, plus the composed
  `services.accounts.getAccountBalances`, plus a forged-`businessId` case. **The suite was proved
  non-vacuous by mutation:** dropping `businessId` from `repositories/accounts.ts`'s two `where`
  clauses turned **5 of 9** scoping tests red — `expected [8 accounts] to have a length of 2 but got
  8` and `expected { id: 'acc_b_a_…' } to be null` — and the file was restored (`git diff --stat` →
  empty) before committing. Seed assertions read **back out of PostgreSQL**: AC-001-04 volumes,
  AC-001-02 (every `amountCents` / `monthlyLimitCents` a safe integer inside `int4`), AC-001-05
  (BR-002 per account **and** `getAccountBalances` agreeing with the ledger, NFR-011), AC-001-06
  (internal-leg shape, legs summing to 0, 30-day out excluding < including, and categorised spending
  **exactly equal** to external posted outflows so no internal leg can enter a category bucket),
  AC-001-07 (30 distinct ET day buckets over stored UTC instants, ≥ 12 ET months).
  **Coverage threshold on** at 80 % for `src/server/domain` (ASM-001-14): `pnpm test --coverage` →
  exit **0**, statements **98.64 %** (73/74) · branches **100 %** (25/25) · functions **94.44 %**
  (17/18) · lines **100 %** (65/65) — met by the existing tests, nothing lowered (R-8). The
  threshold was itself proved enforcing: temporarily raising `statements` to 99.5 gave
  `ERROR: Coverage for statements (98.64%) does not meet global threshold (99.5%)`, exit 1.
  **Deviation from the plan, deliberate:** `tests/helpers/db.ts` ships the two-business fixture but
  **no truncate-everything helper**. The seed owns truncation, `tests/integration/seed.test.ts`
  measures the seeded workspace, and Vitest runs files in parallel — a truncating helper would have
  deleted the dataset its sibling asserts on. The fixture adds two throwaway businesses with unique
  slugs and removes exactly those through `onDelete: Cascade`.
  **Not provable in 001:** AC-001-10's "and the route answers **404**" half. 001 ships no id-bearing
  route (`/accounts/[id]` and `/transactions/[id]` arrive with 002 and 003); what is proved is the
  condition that makes the 404 inevitable — a cross-business read resolves to `null` / `[]`. The
  shell's 404 path is AC-001-17 in T-13.
- **Block close (T-06…T-09)** · `pnpm lint` → 0 · `pnpm typecheck` → 0 · `pnpm test --coverage` → 0
  (48 passed, threshold met) · `pnpm test:int` → 0 (19 passed, against a freshly re-seeded database)
  · `pnpm build` → 0 · `pnpm db:seed` ×2 → identical `content-hash`, both exit 0.
