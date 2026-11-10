# Oakfern

A banking dashboard for US startups and SMBs — one company workspace, several accounts, a seeded
ledger of just over a year, and the four numbers a founder actually opens a bank for: how much cash
there is, what came in and went out, how fast it is burning, and how long it lasts.

**Live:** <https://oakfernbankdashboard.vercel.app> — click **Continue as demo**. No sign-up, no
form, no seeding step; the workspace is already there. The deployment serves the merged `002` build
(`main` at `fec01b6`), verified live at 1280 px and 375 px with a clean console.

Oakfern is fictional and original. It was built as a technical case study for the Post Oak Group
hiring team against a hard 24-hour deadline. Mercury and Slash were looked at for *patterns* only
(density, hierarchy, restraint); no logo, name, palette, copy or layout is taken from either.

---

## 1. Scope — read this first

The assignment names five areas. **This delivers one of them: the account overview.**

| Area | Spec | Status |
|---|---|---|
| Account overview — balances, cash position, banking metrics | `002` | **Delivered** |
| Transaction management — search, filters, sorting, pagination, detail | `003` | **Cut** 2026-11-10 ~11:30 ET |
| Data visualization — charts, period selector, drill-down | `004` | **Cut** 2026-11-09 |
| Money movement — transfers, payments, idempotency, settlement | `005` | **Cut** 2026-11-10 |
| Cards — list, freeze/unfreeze, limits | `006` | **Cut** 2026-11-09 |

Two features below the waterline *were* delivered and are what the overview stands on: `000`
(walking skeleton — CI, deployment, health endpoint) and `001` (domain model, migration,
deterministic seed, session, application shell, every error/empty/loading state). All three — 000,
001 and 002 — are **merged** into `main` (PR #3 merged 2026-11-10, `main` at `fec01b6`, all four
checks green) and **live in production**: the deployed build is the 002 build, verified in a browser
rather than inferred.

### Why

The window was 24 hours of wall clock but **11 h 30 min of human-available time** (3 h 45 the first
night, 7 h 45 the next day). The planned 000–008 scope was estimated at **~19 h 50 min**. That gap
was visible the first evening, so the cuts were taken deliberately and in a pre-agreed order rather
than discovered at the deadline:

1. **006 `cards`** — already the lowest priority, first in the cut order.
2. **004 `cash-insights`** — mostly chart configuration; the lowest technical signal per hour.
3. **007 `polish`** — dissolved: empty/loading/error states are done task by task, not as a phase.
4. **005 `move-money`** — cut on delivery day. It was the feature that best showed backend judgment
   (atomicity, idempotency, a balance invariant), and cutting it is the most expensive decision in
   this list. It went because one calibration assumption failed: `001`'s UI block ran 2 h 40 against
   a ~56 min estimate, roughly 3×, and the hours it would have needed no longer existed.
5. **003 `transactions`** — cut last, mid-morning, to protect a clock rule: *feature 008 (this
   README, production verification, the submission) starts at 15:30 ET regardless of where anything
   else has reached.* A 2 h 15 feature started near the close would have produced neither a finished
   feature nor a finished submission.

Two further cuts were applied **inside** 002 at its approval gate: no cash sparkline (FR-012b), and
no separate pending-payments panel (pending rows are folded into the recent list, read-only).

What this means for an evaluator: judge Oakfern on the depth of one vertical slice — the money
rules, the layering, the tests, the deployment, the process — not on feature count. That was the
explicit trade, and the alternative (five shallow half-screens) was rejected on purpose.

---

## 2. What the delivered screen does

`/home` answers four questions from a single server read:

- **Total cash** across every account of the business.
- **Money in / money out** over the last 30 business days.
- **Net burn per month and runway**, averaged over the last three *closed* months, with a distinct
  cash-flow-positive branch instead of a nonsense number.
- **Account cards** (name, type, masked number, current and available balance) and a **recent
  activity list** with pending payments folded in, newest first, internal legs labelled.

On the seeded workspace those read: total cash **$913,518.54**, money in **+$254,746.64**, money out
**−$281,636.79**, net burn **$50,751.03/month**, runway **18.0 months** — the figures the five seed
self-checks and the integration tests assert.

---

## 3. Architecture

### One-direction layering (ADR-0001)

```text
src/app/ · src/actions/      thin adapters: Zod parse → call one service → map the result
        ↓
src/server/services/         use cases, orchestration, transaction boundaries
        ↓
src/server/repositories/     the ONLY layer that imports Prisma; every method takes businessId first
        ↓
src/server/domain/           PURE TypeScript: money, balances, metrics, time. No Next, no Prisma, no any
```

Dependencies point one way only, and the rule is **enforced by ESLint, not by discipline**:
`src/components` may not import `@/server/**` (type imports included), and `@prisma/client` /
`@/generated/prisma` resolve in exactly one file, `src/server/repositories/client.ts`. Both are
checked by `git grep` at every validation pass, and both are currently clean.

The point of the pure domain is testability: `flowTotals`, `averageClosedMonthBurn`, `runwayOf`,
`computeBalances` and the time ranges are ordinary functions over plain data, so every daylight-saving
and empty-month edge case is a millisecond-fast unit test rather than a database fixture. Domain
coverage measures **99 % statements · 97.56 % branches · 100 % lines**.

Business logic in a component or a Server Action is treated as a defect, not a style preference.

### Money is signed integer USD cents

`amountCents` is a Postgres `Int` everywhere, signed: negative is an outflow. There is no float, no
`Decimal`, no `parseFloat` and no `toFixed` anywhere in the money path — parsing is by regular
expression and integer arithmetic, and the single division by 100 happens at the last step before
display (`src/lib/format.ts`). A `git grep` gate (AC-002-30) proves no component performs arithmetic
or a comparison on `amountCents`; the only sign flip in the codebase lives in the page adapter, with
a comment saying why. Figures render through `Intl.NumberFormat('en-US', …)` with `tabular-nums`, and
a sign or icon always accompanies colour so green/red is never the only signal.

### `America/New_York` is the business time zone

The database stores UTC. Every daily and monthly aggregation is computed in the business zone:
`src/server/domain/time.ts` is the only module that knows the zone, it carries a `TZDate` through the
`date-fns` arithmetic, and **every range is half-open**, so an instant lands in exactly one bucket
even across a 25-hour autumn DST day. There is **no `new Date()` below the adapter** — the page reads
the clock once and injects it as a parameter, which is precisely what makes the boundary cases unit
testable.

### Internal transfers are excluded from flows (BR-011)

A transfer between two Oakfern accounts is real money movement but not business inflow or outflow, so
it is excluded from in/out totals and from every month's burn, while still appearing in the activity
list labelled "Internal transfer". The exclusion is observable rather than vacuous: on the seeded
workspace, 30-day outflow is **$281,636.79** excluding internal legs and **$472,336.79** including
them.

### One boundary per figure (NFR-011)

Home performs exactly one service call, `getOverview`. Total cash and the per-account balances both
come out of the same `getAccountBalances` result, so FR-007's total and FR-009's cards *cannot*
disagree — that is a property of the code, not a convention someone has to remember. Any later view
reuses this service or adds a repository method; it never re-derives a balance.

### The deterministic seed

`pnpm db:seed` replaces the whole demo workspace with a realistic ledger: 1 business, 1 admin user,
4 accounts, 5 cards, 14 categories, 61 counterparties, 24 transfers and **1,369 transactions**
spanning **375 days**, including 48 internal legs and 3 pending outflows. It then runs five
self-checks — the balance invariant, the internal-leg exclusion, the `int4` range, row volumes and
the runway band — and **exits 1 if any fails**, so a seeded database is never silently wrong. Finally
it prints a SHA-256 `content-hash`; two runs on the same ET day print the same hash
(`91bd39c0ffb1c349541a4eef34457a6e53e9e6449fd703f33961ca143850be44` on 2026-11-10), which is how
"deterministic" is checked rather than asserted.

### Stack

Exact pins, no `^`, each justified in `docs/adr/0002-stack-and-versions.md`:
Next.js `16.4.6` (App Router, RSC) · React `19.3.1` · TypeScript `5.9.3` strict · Tailwind CSS
`4.3.5` with shadcn primitives copied into the repo · Prisma + `@prisma/client` `7.10.1` with
`@prisma/adapter-pg` · Zod `4.6.7` · `jose` `6.2.17` (HS256 JWT in an httpOnly cookie, 8 h, no
refresh) · `date-fns` `4.4.0` + `@date-fns/tz` · Vitest `5.1.0` · Playwright `1.65.0` ·
Node `22.17.0` · pnpm `11.28.9`. Hosting: Vercel Hobby + Neon Postgres; Docker Compose Postgres
locally and in CI.

A NestJS API was considered and rejected on deadline risk (ADR-0001/0006). The `src/server` layer is
framework-agnostic plain TypeScript, so exposing it over HTTP later is an adapter, not a rewrite.

Deeper reading: `docs/architecture/overview.md`, `docs/adr/0001`–`0006`,
`docs/requirements/`, `docs/traceability.md`.

---

## 4. How this was built: a spec-driven AI workflow

The repository is also the record of the process, and the process is deliberately not "chat with an
assistant until it compiles".

**Four agent roles, one at a time.** A *coordinator* that talks to the human and never writes code;
a *planner* that writes specs, plans and task lists and never writes code; an *implementer* that
writes code one task at a time; a *reviewer* that validates and is forbidden from touching code. The
separation matters because the reviewer's independence is what caught the worst defect in the project
(§5).

**Two files carry the context, not the conversation.** `AGENTS.md` is the operating contract —
layering rules, money rules, the command table, what is forbidden. `MEMORY.md` is the status board:
where we are, what is decided, what is open, what the clock says. A new session reads those two files
and is current. Nothing important lives only in a transcript.

**Human gates, and they were used.** `G-Foundational` (the brief, requirements, ADRs and roadmap
before any code), `G-SpecPlan` per feature (spec + clarifications + plan + tasks in a single
approval), `G-Merge` per feature. Every scope cut in §1 was a human decision at a gate, recorded with
its reason and date in `docs/roadmap.md`. Anything touching an external account — GitHub, Vercel,
Neon — or costing money was a mandatory stop; agents never pushed, deployed or migrated production.

**Traceability as a mechanism.** Every requirement has an ID, every acceptance criterion has an ID,
and test titles carry it: `it('AC-002-23: …')`. So `grep -rn 'AC-002-' tests/` reproduces the
coverage table, and an AC with no test is visible instead of arguable.

**Verification is executed output.** "It should work" is not evidence. Each task records the command
it ran and that command's exit status in its `tasks.md`; `docs/roadmap.md` and the task files contain
the real numbers, including the estimates that were wrong by 3×.

Current evidence for `002`: `pnpm lint` 0 · `pnpm typecheck` 0 · **67** unit tests · **29**
integration tests · `pnpm build` 0 · **25** end-to-end tests, plus a browser pass at 1280 px and
375 px in light and dark with zero console errors or warnings. **26 of 28 active acceptance criteria
met, 2 partial (AC-002-16 and AC-002-26), and 3 of the 26 proved without a test carrying their id**
(AC-002-19, AC-002-20, AC-002-30 — see §6).

---

## 5. What the process actually caught

These three incidents are the strongest evidence in this document, because in each case the suites
were green.

**A 3-pixel overflow that passed on Windows and failed on Linux.** The mobile topbar row was
intrinsically 389 px wide at a 375 px viewport. It *looked* fine locally — the content edge sat at
373.13 of 375, a margin of **1.87 px** that came from the overflow spilling into the header's own
right padding. Linux chromium's slightly wider glyph metrics pushed it over, and CI measured
`scrollWidth = 378` against `innerWidth = 375`, deterministically, on both attempts. The fix drops
the wordmark below 640 px, taking the row to 332 px with 43 px of real slack, so the criterion no
longer depends on a rounding accident. The lesson is written into `MEMORY.md`: **a green local suite
is not a green suite; CI is the authority, never the laptop.** When a later proposal would have
trimmed the end-to-end sweep to 1280 px only, it was rejected on exactly this ground.

**The "recent transactions" list was not showing recent transactions.** The independent reviewer on
002 read the live DOM instead of trusting the test, and found 2 posted rows, 3 pending, 2 canceled
and 1 failed — including a canceled payment from **September 23** presented as recent — while roughly
a month of genuine posted activity never appeared. Cause: `orderBy postedAt DESC`, and PostgreSQL
sorts **NULLs first**; every non-posted row has a null `postedAt`, so the 8-row window was consumed
by null rows of any age. Worse, with ≥ 8 pending rows the list would have contained zero posted
transactions. **Every suite was green**, because the end-to-end test asserted `count >= 8` and each
row's shape, never that the rows *were* the most recent ones. Fixed by ordering on `createdAt` (which
equals `postedAt` for posted rows and is exactly the documented fallback key otherwise), with a new
integration test proved red first. One finding of this kind pays for the validation gate several
times over.

**Vercel deployments failed for a reason CI structurally cannot catch.** The generated Prisma client
lives in a gitignored directory and was produced only by the `postinstall` hook. Vercel restored its
build cache, so `pnpm install` had nothing to do, `postinstall` never ran, and `next build` could not
resolve the client. **CI never has a cache to restore, so it can never reproduce this class of
defect** — and Vercel's own Next + Prisma guide recommends only the `postinstall` form. The fix is to
make the build itself self-sufficient: `"build": "prisma generate && next build"`.

A fourth, smaller one is worth naming because it is the failure mode tests are supposed to prevent:
when a "Move money" call-to-action was removed, the test asserting it would have kept passing
**vacuously** (its locator resolved to a different element). The assertion was inverted rather than
deleted.

---

## 6. Known limitations and technical debt

Nothing here is hidden; each item has its reason.

**Process**

- **Feature 001 shipped without an independent validation pass.** It was deferred by the Technical
  Director for time, so 001's assurance rests on CI evidence (lint, typecheck, unit, integration,
  end-to-end, build, all green on two commits) and on its production verification, not on a
  reviewer's `validation-combined.md`. 000 and 002 both had full validation passes.
- **Three acceptance criteria have no test carrying their id** (AC-002-19, AC-002-20, AC-002-30).
  The behaviour is covered — the first two by `computeBalances` unit tests written under 001's ids,
  the third by a `git grep` gate — but the id linkage is missing, and the gap is recorded rather than
  quietly closed.

**Product**

- **Pending payments are read-only.** FR-011 shows them; there is no cancellation path anywhere in
  the product, because the feature that owned every money mutation (005) was cut. There is no
  disabled control pretending otherwise.
- **No lazy settlement.** Nothing advances a pending payment, so on an old seed the `Expected` dates
  go stale. Deliberate: the settlement service belonged to 005.
- **No period-over-period deltas.** The KPI tiles show the current figure without a "vs last month"
  comparison. The comparison window was out of 002's scope.
- **Burn is understated and runway overstated, roughly 3×, on a workspace younger than three
  months.** Burn always averages over the last three closed months, and a one-month-old workspace is
  averaged over two empty months while the tile still claims "Average of the last 3 closed months".
  The demo workspace has three full closed months, so the shipped 18.0 months is correct — but the
  error direction is optimistic, which is the direction that matters for a cash figure. The fix is to
  clamp the month list to the business's first transaction.
- **`sumCents` applies the `int4` bound to aggregates, not only to rows.** A workspace whose 30-day
  inflow exceeded $21,474,836.47 would render the error boundary instead of a total. Unreachable on
  this data; it needs a deliberate decision (a separate aggregate bound, or `bigint` accumulation)
  before a larger dataset.
- **One shared demo workspace.** Two evaluators browsing at once see the same data. Acceptable for an
  evaluation artifact; a per-visitor workspace is the real answer.
- **Only an SVG app icon** (`src/app/icon.svg`) — no `.ico` or apple-touch variants.

**Operational**

- **`SESSION_SECRET` is the same value in Preview and Production.** A deliberate case-study decision
  by the Technical Director — fictional data, no real money, no real user. A real deployment
  separates secrets per environment, and would rotate them.
- **The Vercel Preview environment returns 500 on sign-in** for an unresolved environment-variable
  reason, while **Production works**. Preview's runtime log reports the session secret as missing
  even though the variable is present on both rows in the project settings. Not a code defect — the
  same build serves Production correctly — and unresolved at submission.
- **Neon's `sslmode=require` logs a Postgres driver deprecation warning.** Cosmetic, noted so it is
  not mistaken for an error.
- **The production migration is a manual human step** (`prisma migrate deploy` from a developer
  machine against the direct connection string), not an automated deploy job. A deploy can therefore
  ship code ahead of its migration if the human forgets the order.
- **No database-level `CHECK` constraints on money.** Enforcement is the `Int` column type, Zod at
  the boundary, the domain layer and the tests. No writer bypasses the services today.
- **Observability is structured logs plus `/api/health`** — no metrics backend, tracing or alerting.
- **The payment rails are simulated** behind a port interface. There is no ACH or wire integration,
  and no real network is contacted.
- **`/api/health`'s 503-on-database-failure path has no automated test** carrying its id; it is
  verified manually only.
- **The `viewer` role** exists in the permission matrix but is not implemented; the demo has one role.

The full technical-debt register, with impact and proposed fix per item, is the table at the bottom
of `docs/roadmap.md`.

---

## 7. Running it locally

Every command below has been executed in this repository; the command table in `AGENTS.md` records
each one with its exit status and its prerequisites.

```bash
corepack enable pnpm            # pnpm comes from the packageManager field
pnpm install                    # postinstall runs prisma generate
cp .env.example .env.local      # fill DATABASE_URL and a SESSION_SECRET of >= 32 characters

docker compose up -d            # local Postgres on host port 5433
pnpm exec prisma migrate deploy # apply the two existing migrations to an empty database
pnpm db:seed                    # the deterministic demo seed; prints its content-hash

pnpm dev                        # http://localhost:3000
```

Verification:

```bash
pnpm lint         # eslint . && prettier --check .  — "lint passes" means both
pnpm typecheck    # tsc --noEmit
pnpm test         # vitest, unit project only
pnpm test:int     # vitest, integration project; needs the Postgres above
pnpm test:e2e     # playwright; its own webServer runs build && start — do not build first
pnpm build
```

Three things that will otherwise cost time:

- `pnpm test:e2e` needs a **seeded** database and a `SESSION_SECRET` of at least 32 characters in
  `.env.local`. Without the secret, 10 of the tests fail with a server-side throw that looks like a
  product bug.
- Kill anything already listening on port 3000 before trusting an end-to-end run: Playwright adopts
  an existing local server, and the resulting failure also looks like a product bug.
- To *create* a new migration use `pnpm db:migrate --name <name>`; without `--name` it prompts
  interactively, and in Prisma 7 it no longer runs `generate` or the seed for you.
- **`pnpm db:reset` requires a human.** Prisma 7 detects an AI agent and refuses `migrate reset`
  without explicit human consent — the right default, and the one command in this repository no
  agent has run. Never point it at Neon.

---

## 8. Repository map

```text
AGENTS.md              operating contract for any agent on this repo (and a good orientation doc)
MEMORY.md              living status board: stage, decisions, open items, clock
docs/
  constitution.md      non-negotiable principles
  glossary.md          vocabulary
  roadmap.md           features, timeboxes, the cut decisions, the technical-debt register
  traceability.md      FR → AC → test, with status
  requirements/        functional, non-functional, business rules, roles and permissions
  adr/                 0001 architecture · 0002 stack · 0003 money · 0004 session · 0005 rails · 0006 hosting
  architecture/        system context, containers, modules
  discovery/ domain/ ux/
  submission-email.md
specs/NNN-slug/        spec.md · plan.md · tasks.md · validation*.md · evidence/
src/
  app/ actions/ components/ lib/
  server/{domain,services,repositories}
prisma/                schema.prisma · migrations/ · seed.ts
tests/                 unit/ · integration/ · e2e/
```

Screenshots from the 002 validation pass, at 1280 px and 375 px in both themes, are in
`specs/002-account-overview/evidence/`.
