# Validation — Spec 002 (account-overview) · focus `combined`

Template D.22 · Sprint Profile SP-5 (one combined reviewer) · Reviewer, 2026-11-10 ~14:15–14:50 ET
Branch `feat/002-account-overview` @ `eec8cd5` · PR #3 · Base `main`
Environment: local production server (`pnpm start`, `http://localhost:3000`), Docker Compose
Postgres on host port 5433, seeded (`content-hash
91bd39c0ffb1c349541a4eef34457a6e53e9e6449fd703f33961ca143850be44`).

---

## 1. Verdict

> ## **PASS WITH FINDINGS** — **not APPROVED for 🚦 G-Merge as it stands**

One **MAJOR** finding (F-01) is a user-visible correctness defect on the hero list of the screen the
case study is judged on, and it means **AC-002-23 is not met** although its test is green. It is a
**one-line fix in one repository method**. Everything else in this feature is in unusually good
shape: five suites green, the layering clean, the money rules honoured, no secrets, no overflow at
375 px, console clean in both themes.

**Recommendation:** send F-01 back to the Implementer (≈10 min including a tightened test), then
merge. Do **not** merge first and fix in 003 — the defect is on the first screen the evaluator sees.

| Severity | Count |
|---|---|
| BLOCKER | 0 |
| MAJOR | 1 (F-01) |
| MINOR | 5 (F-02…F-06) |
| SUGGESTION | 2 (F-07, F-08) |

---

## 2. Executed evidence

Every row below was run by the reviewer on this branch, in this session.

| Command | Result |
|---|---|
| `pnpm lint` (`eslint . && prettier --check .`) | **exit 0** |
| `pnpm typecheck` (`tsc --noEmit`) | **exit 0** |
| `pnpm test` (unit) | **8 files, 67 tests passed**, exit 0 |
| `docker compose up -d` → `pnpm db:seed` | **exit 0**, five self-checks passed, `content-hash 91bd39c0…50be44` |
| `pnpm test:int` | **4 files, 29 tests passed**, exit 0 |
| `pnpm test:e2e` (own `webServer`, build + start) | **25 passed (49.9 s)**, exit 0 |
| `vitest run --project unit --coverage --coverage.include='src/server/domain/**'` | **Stmts 99 % · Branch 97.56 % · Funcs 95.83 % · Lines 100 %** — well above the NFR-007 80 % floor |
| `git grep -nE "amountCents" -- src/components` | 6 hits: 3 prop declarations, 1 prop pass, 1 `formatSignedCents` call, 1 comment. **No operator, no comparison** (AC-002-30 holds) |
| `git grep "@/server" -- src/components` | **no hits** (ADR-0001 component boundary) |
| `git grep -E "from '(@prisma/client\|@/generated/prisma)'" -- src` | **only `src/server/repositories/client.ts`** |
| `git grep -nE ":\s*any\b\|as any" -- src/server/domain` | **no hits** (NFR-007) |
| `git grep` for `SESSION_SECRET` / connection strings / `sk-` / `AKIA` / private keys | **no secret in the repo**; only `.env.example` placeholders, the CI workflow's declared non-secret value and error-message text |
| `git grep "console.log\|console.info" -- src` | **no hits** (no PII logging) |
| `git diff` on `package.json` across 002's commits | **empty — this feature adds no dependency** (OQ-002-02 confirmed: `recharts` absent) |
| `gh pr checks 3` | `verify (lint, typecheck, unit, build)` **pass** · `database (integration, e2e)` **pass** · **`Vercel` fail** (see F-03) |
| Playwright MCP, local production server | Home at **1280×900** and **375×812**, **light and dark**: `scrollWidth − innerWidth = 0` at both widths, **0 elements past the viewport edge** at 375 px, **0 console errors, 0 warnings**, exactly one `<h1>`, no full account number in the DOM |

Screenshots (this reviewer's own, additional to the suite's):
`specs/002-account-overview/evidence/reviewer-home-1280-dark.png` ·
`reviewer-home-375-light.png` · `reviewer-home-375-dark.png`.

Figures observed live on the seeded workspace: total cash **$913,518.54**, money in
**+$254,746.64**, money out **−$281,636.79**, runway **18.0 months** at **$50,751.03** net burn per
month, 4 account cards (`••••1934`, `••••1942`, `••••1950`, `••••1968`), 8 recent rows.

---

## 3. Findings

### F-01 · **MAJOR** · The recent list is not the 8 most recent transactions — AC-002-23 is not met

**File:** `src/server/repositories/transactions.ts:141`

```ts
orderBy: [{ postedAt: 'desc' }, { createdAt: 'desc' }],
```

In PostgreSQL, `ORDER BY … DESC` sorts **NULLs first**. Every non-`posted` row has
`postedAt = NULL`, so the 8-row window is consumed by the null rows **whatever their age**, and the
real ledger is pushed out. Proved directly against the seeded database:

```
 status   | method |      postedAt       |      createdAt      | amountCents
 pending  | ach    |                     | 2026-11-10 05:00:00 |     -742500
 pending  | ach    |                     | 2026-11-10 05:00:00 |     -318000
 pending  | wire   |                     | 2026-11-10 05:00:00 |    -1850000
 canceled | ach    |                     | 2026-10-18 17:20:00 |     -455000
 failed   | wire   |                     | 2026-10-04 17:20:00 |     -289000
 canceled | ach    |                     | 2026-09-23 17:20:00 |     -612000
 posted   | card   | 2026-11-10 22:21:00 | …
 posted   | card   | 2026-11-10 19:04:00 | …
```

What Home actually renders (read out of the live DOM at 1280 px): **2** posted rows, **3** pending,
**2** canceled, **1** failed — including a **canceled payment from September 23** presented as
"recent", while roughly a month of genuine posted activity (Nov 9, Nov 8, …) never appears.

- **AC-002-23** requires "**at least the 8 most recent** … newest first by effective ET date".
  Newest-first holds (the service re-sorts); "the 8 most recent" does **not**.
- **ASM-002-01** defines the sort key as `postedAt ?? createdAt`. The SQL implements neither that
  nor a documented alternative — the behaviour is an accident of NULL ordering, and nothing in the
  code or comments shows it was considered.
- **Latent worse case:** if a workspace ever has ≥ 8 pending/canceled/failed rows, Home's recent
  list would contain **zero posted transactions**.
- The green test does not catch it: `tests/e2e/home.spec.ts:119` asserts `count >= 8` and the shape
  of each row, never that the rows *are* the most recent ones.

**Recommended action (one line + one assertion).** Order by `createdAt: 'desc'` alone. For a
`posted` row the seed and the writer set `createdAt == postedAt`, so it is the effective date; for a
null-`postedAt` row it is exactly the ASM-002-01 key. `mergeRecent` already re-sorts by
`effectiveAt` and already folds in every pending payment, so nothing else changes. Then strengthen
the AC-002-23 test to assert that the first rendered row's date is today's ET date **and** that no
rendered row is older than the 8th-most-recent ledger row (integration level is enough).

---

### F-02 · **MINOR** · `monthsUsed` can never be below 3, so AC-002-16 is unreachable in production

**Files:** `src/server/services/overview.ts:111` · `src/server/domain/time.ts:62` ·
`src/components/overview/runway-tile.tsx:31`

`closedMonthsBefore(now, 3)` always returns exactly three ranges, so
`averageClosedMonthBurn(...).monthsUsed` is always `3`. The `monthsUsed === 0` / `< 3` branches of
`basis()` are dead code in the running application, and the honest-label behaviour AC-002-16 asks
for cannot occur.

The domain is right and well tested at the unit level (`tests/unit/metrics.test.ts` passes fewer
ranges directly), and AC-002-14 genuinely requires an empty month inside the window to count as a
`0` term. But a workspace with **one** month of history would be averaged over three months, two of
them empty — understating `avgBurn` by 3× and **overstating runway by 3×**, while the tile claims
"Average of the last 3 closed months". That is a money figure that is wrong in the optimistic
direction, which is the direction that matters.

Not MAJOR because the seeded demo has three full closed months and the shipped figure (18.0 months)
is correct. **Recommended action:** record it as a dated `ASM` on AC-002-16 now, and fix in 003+ by
clamping the month list to months at or after the business's first transaction (or `openedAt`).

---

### F-03 · **MINOR (blocking for 008, not for this code)** · The Vercel deployment on PR #3 **failed**

`gh pr checks 3` → `Vercel | failure | Deployment has failed`. Both GitHub Actions jobs pass
(`verify` 44 s, `database` 1 m 34 s), and `pnpm build` succeeds locally inside the e2e `webServer`.

This is **not** the known `SESSION_SECRET` sign-in 500 that the Technical Director already ruled
external: that is a *runtime* 500 on an otherwise successful deployment. This is the deployment
itself failing. Production is the verification environment for 008, and 008 starts at 15:30.
**Recommended action:** before 008, a human runs `npx vercel inspect dpl_7JeNemoD9N6m5ToDZF4meeWfiYaf
--logs` (external account → Art. 9 human action). No agent should touch it.

---

### F-04 · **MINOR** · Three active ACs have no test carrying their id

`docs/traceability.md` and `AGENTS.md` both require `it('AC-002-NN: …')`. Missing:

| AC | Status | Where the behaviour is in fact covered |
|---|---|---|
| **AC-002-19** (current vs available with a pending outflow) | behaviour covered, id absent | `tests/unit/balances.test.ts` under **`AC-001-05`** ids; the card render is exercised by the AC-002-18 e2e test |
| **AC-002-20** (account with no transactions reads `$0.00`) | behaviour covered, id absent | `tests/unit/balances.test.ts:38` under `AC-001-05` |
| **AC-002-30** (no arithmetic on `amountCents` in `src/components`) | proved by **`git grep`**, not by a test | reproduced by this reviewer, clean |

**Recommended action:** either add three one-line titles, or record in `traceability.md` that
AC-002-19/20 inherit 001's `computeBalances` tests and AC-002-30 is a grep gate. Do not leave the
gap silent.

---

### F-05 · **MINOR** · `docs/traceability.md` is stale and names a file that does not exist

`docs/traceability.md:28,29` cite **`tests/unit/amount.test.ts`** as evidence for FR-007 and FR-008.
That file was never written (see §4, deviation 2). Every 002 row — lines 28–33, 116, 135, 142 — is
still `⬜`, although the feature is implemented and green. The compliance focus requires
traceability to be up to date. **Recommended action:** the Implementer or Planner replaces
`tests/unit/amount.test.ts` with `tests/unit/format.test.ts` and flips the 002 rows to the evidence
actually produced.

---

### F-06 · **MINOR** · A primary "Move money" CTA is visible on Home, against OQ-002-03's rationale

**File:** `src/components/shell/topbar.tsx:57` (a **001** file, commit `e69aae9` — not a 002
regression).

OQ-002-03 was resolved "**Option A. No CTA.** `/move-money` is a placeholder because 005 is cut; a
primary CTA that leads nowhere is worse than none." The letter of AC-002-22 is satisfied — the
e2e assertion is scoped to `main`, Home's own content links nowhere — but the rendered page carries
a **teal, primary-styled "Move money" button in the topbar**, on every screen including Home
(confirmed in the 1280 px screenshot). An evaluator will click it and land on a placeholder.

Graded MINOR because it predates 002 and was approved at 001's gate. **Recommended action:** a
Technical Director decision before 008 — either remove the topbar CTA (one line; the sidebar item
stays, which OQ-002-03 explicitly allows) or accept it and make `/move-money` read as a deliberate
"coming in a later round" page.

---

### F-07 · **SUGGESTION** · `sumCents` imposes the `int4` bound on an *aggregate*, not just a row

`src/server/domain/money.ts:60-71` calls `assertSafeCents` on the running total. `flowTotals` sums
30 days of inflow through it, so a workspace whose 30-day inflow exceeds **$21,474,836.47** throws a
`domainError` and Home renders the error boundary — even though every individual row is storable.
The seed's own `int4` self-check keeps the demo far below this, so it is not a defect today. Worth a
deliberate decision (a separate aggregate bound, or `bigint` accumulation) before a larger dataset.

### F-08 · **SUGGESTION** · `listPostedFlowRows` masks an impossible null instead of failing loudly

`src/server/repositories/transactions.ts:68` — `postedAt: row.postedAt ?? range.start`. The comment
is honest that this is unreachable, but if the invariant ever broke, a row would be silently
attributed to the window's first instant and would quietly distort a flow total. A `throw` would be
louder and equally type-safe.

---

## 4. The four implementer deviations, judged

**1 · `FlowRow.status` and `isMetricRow` requiring `status === 'posted'` (`domain/metrics.ts:60`).**
**Sound — genuine defence in depth, and AC-002-07 now holds.** The plan had the repository filter
alone carry the rule, which would have made AC-002-07 ("only `posted` rows contribute") provable
only against a database. With `status` on the row, `tests/unit/metrics.test.ts` feeds `posted`,
`pending`, `canceled` and `failed` rows to a pure function and proves the rule in milliseconds. It
also means a future caller that reuses `flowTotals` with an unfiltered list cannot get a wrong
answer. Cost: one extra selected column. **Accept.**

**2 · `tests/unit/amount.test.ts` not written; `tests/unit/format.test.ts` claimed to cover it.**
**The coverage is real; the bookkeeping is not.** `format.test.ts` carries `AC-002-02`, `AC-002-10`,
`AC-002-16` and `AC-002-18` and tests the pure functions (`formatCents`, `formatSignedCents`,
`maskAccountNumber`, `formatMonths`, the ET date) that `Amount` merely renders — and `Amount` itself
is covered end-to-end by the `data-direction` / `tabular-nums` assertions in `home.spec.ts`. There
is **no behavioural gap**. There *is* a documentation gap: `docs/traceability.md` still points at
the file that does not exist (**F-05**). **Accept the test decision, fix the traceability.**

**3 · AC-002-25's deterministic proof moved from e2e to integration.**
**Sound, and arguably stronger.** The AC is about the *service* including internal legs in the list
while excluding them from metrics. Integration asserts it against the seeded ledger deterministically
(`tests/integration/overview.test.ts`), where e2e could only assert it if an internal leg happened
to land in the rendered window — a flaky assertion dressed as a strict one. The e2e suite still
carries an `AC-002-25` test for the *label* ("Internal transfer"), which is the part that is genuinely
a rendering concern. Nothing is weakened. **Accept.** (Footnote: F-01 is exactly the hazard this
split guards against — a list-window assumption that only holds by luck.)

**4 · Components restating domain prop types locally.**
**Correct given the ESLint rule, and the drift risk is small but real.** The boundary rule in
`eslint.config.mjs` block 4 bans `@/server/**` from `src/components`, type imports included, and the
restated shapes (`RunwayProp`, `AccountCardData`, `RecentRowData`) are satisfied structurally — so
`page.tsx` passing `overview.runway` straight through **is** the compile-time check, and a drift in
a field the page passes becomes a type error at the call site, not a silent mismatch. The residual
risk is narrower than claimed: a field **added** to the domain type and never passed, or a local
type **widened** (e.g. `status?: string` in `amount.tsx:36`, which already accepts anything). Not a
finding today. If it recurs in 003, the clean answer is a `src/shared/` or `src/types/` module that
both layers may import — not an eslint exception.

**Plus: the `tests/e2e/shell.spec.ts` change — confirmed, necessary and correctly scoped.**
`git diff` on that file shows **exactly one removed line**:
`await expect(page.getByText('No figures on this screen yet')).toBeVisible();` at
`shell.spec.ts:278`, replaced by a three-line comment explaining why. It was **necessary** — 002
replaced Home's placeholder with real figures, so 001's assertion is now false — and **correctly
scoped**: the AC-001-18 test still asserts Home's `<h1>`, and still asserts the placeholder sentence
on `/transactions` and `/move-money`, which remain placeholders. The file-tree half of AC-001-18
(every route ships a `loading.tsx`) is untouched. The whole 001 shell suite is green (16 tests).
Nothing was weakened to make 002 pass.

---

## 5. Acceptance criteria — 28 active

| AC | Verdict | Evidence |
|---|---|---|
| AC-002-01 | **Met** | `tests/integration/overview.test.ts` (`AC-002-01`), green. `overview.ts:127` takes the total from `getAccountBalances`; no second derivation exists (`git grep` on `computeBalances`) |
| AC-002-02 | **Met** | `tests/unit/format.test.ts:23` + `home.spec.ts:44`, green. Live DOM: `$913,518.54`, `tabular-nums` on `kpi-value` |
| AC-002-06 | **Met** | `tests/unit/metrics.test.ts` (`AC-002-06`), green. `lastNDaysRange` = `[startOfBusinessDay(now,-29), startOfBusinessDay(now,1))` |
| AC-002-07 | **Met** | `tests/unit/metrics.test.ts` (`AC-002-07`), green — strengthened by deviation 1 (`isMetricRow` checks `status`) |
| AC-002-08 | **Met** | `tests/unit/metrics.test.ts` + `tests/integration/overview.test.ts` (`AC-002-08`), green |
| AC-002-09 | **Met** | `tests/unit/metrics.test.ts` (`AC-002-09`), green — `2026-11-01T03:30:00Z` attributed to Oct 31 ET |
| AC-002-10 | **Met** | `tests/unit/format.test.ts:31` + `home.spec.ts:44`, green. Live DOM: `+$254,746.64` teal, `−$281,636.79` neutral foreground, U+2212 minus |
| AC-002-11 | **Met** | `tests/unit/metrics.test.ts` (`AC-002-11`), green |
| AC-002-12 | **Met** | `tests/unit/metrics.test.ts` (`AC-002-12`), green. `runwayOf` (`metrics.ts:125`) returns the union; `Infinity`/`NaN`/negative months are **not representable** — the `<= 0` guard makes the division unreachable at a zero divisor. Confirmed by reading the type and the single call site |
| AC-002-13 | **Met** | `tests/unit/metrics.test.ts` (`AC-002-13`), green |
| AC-002-14 | **Met** | `tests/unit/metrics.test.ts` (`AC-002-14`), green |
| AC-002-15 | **Met** | `tests/unit/metrics.test.ts` (`AC-002-15`), green |
| AC-002-16 | **Met at the domain level only** | `tests/unit/metrics.test.ts` + `format.test.ts:77` green, but the service can never produce `monthsUsed < 3` → **F-02** |
| AC-002-17 | **Met** | `tests/integration/overview.test.ts` (`AC-002-17`) green; live Home reads **18.0 months**, inside 14.0–24.0 |
| AC-002-18 | **Met** | `tests/unit/format.test.ts:56` + `home.spec.ts:92` green. Live DOM: `••••1934/1942/1950/1968`; a `\b\d{9,}\b` scan of `body.innerText` returns **false** |
| AC-002-19 | **Met, id missing** | `computeBalances` proves it under `AC-001-05` (`tests/unit/balances.test.ts:32`); live cards show Current $317,325.53 / Available $288,220.53 → **F-04** |
| AC-002-20 | **Met, id missing** | `tests/unit/balances.test.ts:38` under `AC-001-05`; `services/accounts.ts:51` passes `[]` for an account with no rows → **F-04** |
| AC-002-21 | **Met** | `tests/integration/overview.test.ts` + `home.spec.ts:148` green. Live DOM: three rows with `pending · Expected Nov 11/12/14, 2026`, counterparty, method, `−` amount; no pending heading or count |
| AC-002-22 | **Met for Home's content** | `home.spec.ts:148` green: zero cancel/stop/void controls, zero `a[href*="/move-money"]` and zero disabled buttons inside `main`; one read-only sentence rendered. The **topbar** CTA is outside `main` → **F-06** |
| AC-002-23 | **NOT MET** | List is ≥ 8 rows and newest-first, but it is **not the 8 most recent** — see **F-01**. The green test does not assert the "most recent" half |
| AC-002-24 | **Met** | `home.spec.ts:119` clicks "View all" → `/transactions`, green; `/transactions` exists (001) |
| AC-002-25 | **Met** | `tests/integration/overview.test.ts` (`AC-002-25`, deterministic) + `home.spec.ts:182` (label), green. `overview.ts:82` labels an unnamed internal leg "Internal transfer" and `isInternal` drives an icon |
| AC-002-26 | **Met** | `home.spec.ts:209` green. `loading.tsx` renders 4 tile boxes, an 8-row list box and 4 account boxes — the final layout's boxes, **no chart/sparkline/pending box** — `aria-hidden` with an `sr-only role="status"`. *Partial only in that no layout-shift metric was measured*; the implementer's "partial" self-assessment is fair and I did not find a shift at either width |
| AC-002-27 | **Met** | `tests/integration/overview.test.ts` (`AC-002-27`) green: an empty business returns zeros, cash-flow-positive and no throw; both panels have designed `EmptyState`s with icon, sentence and action |
| AC-002-28 | **Met** | `home.spec.ts:238` green. `home/(section)/error.tsx` accepts `error` and never forwards it; `ErrorState` has **no prop able to receive** a message, digest or stack — a property of the signature, not of discipline |
| AC-002-29 | **Met** | `tests/integration/overview.test.ts` + `tests/integration/scoping.test.ts` green. All three new reads take `businessId` **first** and place it in the `where` (`transactions.ts:58,140,158`); the optional `accountId` narrows and never replaces |
| AC-002-30 | **Met (grep, not a test)** | `git grep -nE "amountCents" -- src/components` → 6 hits, all declarations/passes plus one `formatSignedCents` call; an operator-pattern grep returns nothing. The one sign flip lives in the adapter (`page.tsx:66`), deliberately and documented → id gap in **F-04** |
| AC-002-31 | **Met** | `home.spec.ts:277` + `:326` green in CI chromium; independently reproduced via Playwright MCP against the local production build: `scrollWidth − innerWidth = 0` at 1280 and 375, **0 elements past the viewport edge at 375**, **0 console errors/warnings**, light and dark |

**Tally: 27 met · 1 not met (AC-002-23) · 0 unverifiable.** Three of the 27 (AC-002-19, -20, -30)
are met by evidence that does not carry their id.

---

## 6. Money, time, layering, security — the heart of the feature

**Money (BR-001, ADR-0003).** Clean. `amountCents` is `Int` everywhere; `src/server/domain/money.ts`
parses by regular expression and integer arithmetic with **no `parseFloat` and no `toFixed`**; the
single division by 100 lives at the last step before display in `formatCents` (`src/lib/format.ts:36`).
No component performs arithmetic or a comparison on `amountCents` (grep above). The only sign flip
is `page.tsx:66`, in the adapter, with a comment saying why. `sumCents` validates every term and the
total — see F-07 for the aggregate-bound edge.

**Time (BR-009).** Clean. `src/server/domain/time.ts` is the only module that knows the zone;
`TZDate` carries `America/New_York` through the `date-fns` arithmetic; every range is half-open, so
an instant falls in exactly one bucket across the 25-hour autumn DST day. **No `new Date()` anywhere
below the adapter** — the page reads the clock once (`page.tsx:36`) and injects it, which is what
makes AC-002-09 and AC-002-13 ordinary unit tests. Displayed dates go through
`Intl.DateTimeFormat(..., { timeZone: 'America/New_York' })`.

**BR-011.** `isMetricRow` excludes `method === 'internal'` from flows and from every month's burn;
`toView` marks internal legs `isInternal` so the list still shows them, labelled. Proved by
AC-002-08, AC-002-15 (unit) and AC-002-25 (integration).

**BR-008 / ASM-008.** Burn is averaged over closed months only, every month is a term, `round1`
happens once at the very end (`metrics.ts:127`). `runwayOf` returns
`{kind:'cash-flow-positive'} | {kind:'months', months}` and the `avgBurnCents <= 0` guard makes the
division unreachable at a zero divisor — `Infinity` and `NaN` are genuinely unrepresentable, not
merely unproduced. The single caveat is F-02.

**ADR-0001 layering.** Clean and lint-enforced. `src/server/domain` imports nothing but itself (no
Next, no React, no Prisma, no `any`); Prisma appears only in `src/server/repositories/client.ts`;
`src/components` has zero `@/server` imports; `page.tsx` is a 45-line adapter that resolves the
session, reads the clock, calls **one** service and formats.

**NFR-011.** Structural, not conventional: `getOverview` takes total cash and the per-account
figures from the same `getAccountBalances` call, so FR-007's total and FR-009's cards cannot
disagree. No figure on Home is derived anywhere else.

**Security.** `requireSession()` is called in the page *and* the layout guards the segment. All
three new reads are `businessId`-first and scoped, proved by an anti-IDOR integration test. 002 adds
**no Server Action, no mutation and no new route**, so there is no new Zod surface to audit and the
002 attack surface is read-only. The error boundary cannot leak a message, digest, stack or SQL by
construction. Account numbers are masked at the only render site, and a `\d{9,}` scan of the live
DOM finds nothing. No secret, no `console.log`, **no new dependency**.

---

## 7. Recommendation on 🚦 G-Merge

**Fix F-01, then merge.** It is one line in `src/server/repositories/transactions.ts:141` plus one
tightened assertion; the merge/dedupe logic in `overview.ts` already does the rest. Re-run
`pnpm test:int` and `pnpm test:e2e` as the gate.

If the clock makes even that impossible (008 starts at 15:30): merging with F-01 open is survivable
— nothing is *wrong* on the screen, it is *incomplete* — but it must then be written into the
README's limitations **and** F-01 must be the first task of 003, which owns the transactions list
and will hit the same ordering question on page 1.

F-02, F-04 and F-05 are cheap paperwork (an `ASM`, three test titles, a traceability refresh) and
can ride along. **F-03 (the failed Vercel deployment) needs a human before 008 starts** and is
independent of this code.

---

*Reviewer did not modify any code, test or configuration, and did not push, merge or comment on
PR #3.*
