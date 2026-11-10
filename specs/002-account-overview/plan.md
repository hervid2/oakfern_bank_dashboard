# Plan — Spec 002 (account-overview)

Spec `specs/002-account-overview/spec.md` **v1.0** · Branch `feat/002-account-overview`
Template D.20 · Sprint Profile · Planner, 2026-11-10 · Timebox **2 h 00, with cut ladder L-2 and
L-4 already applied** (see §8)

> ADR-0001 layering is the spine of this plan: `src/server/domain` is **pure TypeScript** (no Next,
> no Prisma, no clock) → `services` orchestrate → `repositories` are the **only** layer importing
> Prisma → `app/` is a thin adapter. 002 adds **no Server Action, no mutation and no dependency**.
>
> **Approved at 🚦 G-SpecPlan, 2026-11-10, with L-2 and L-4 applied:** no cash sparkline
> (FR-012b deferred, no `cash-series.ts`, `recharts` **not** installed) and no dedicated pending
> panel (pending rows fold into the recent list, read-only). This plan already reflects both.

---

## 1. Approach in one paragraph

Home becomes a Server Component that calls exactly **one** service, `getOverview(businessId, now)`.
That service fans out three scoped repository reads plus the existing `getAccountBalances`, then
hands the rows to one new pure domain module, `metrics.ts` (30-day flows, monthly net burn, runway).
`now` is read **once** in the page adapter and injected downwards, so no domain function touches the
system clock and every BR-009 / BR-008 edge case — DST, the October/November boundary, the partial
current month — is an ordinary unit test. The UI then only formats: no component performs arithmetic
on `amountCents` (NFR-011, AC-002-30).

## 2. What already exists and is reused unchanged

| Asset | Path | Used for |
|---|---|---|
| ET time module (half-open ranges, `lastNDaysRange`, `closedMonthsBefore`, `dayKeyOf`, `monthKeyOf`) | `src/server/domain/time.ts` | the 30-day window and the 3 closed months |
| Money primitives (`sumCents`, `assertSafeCents`, `directionOf`, `MAX_SAFE_CENTS`) | `src/server/domain/money.ts` | every sum |
| `computeBalances` (BR-002) | `src/server/domain/balances.ts` | per-account balances |
| `getAccountBalances` — the single balance source | `src/server/services/accounts.ts` | FR-007 total cash **and** FR-009 cards; returns `totalCurrentBalanceCents` already |
| `formatCents` — the only money formatter | `src/lib/format.ts` | every figure |
| Session guard | `src/server/services/auth.ts` (`requireSession`), `src/app/(app)/layout.tsx` | `businessId` |
| Designed states | `src/components/states/{empty-state,error-state,section-placeholder}.tsx`, `src/components/ui/skeleton.tsx` | NFR-010 |
| Existing content-shaped skeleton for Home | `src/app/(app)/home/(section)/loading.tsx` | already drawn for 4 tiles + a wide panel + a list; **adjust, do not rewrite** |

`getAccountBalances` is deliberately **not** modified: FR-007's total already comes out of it, which
is what makes AC-002-01 a property of the code rather than a convention.

## 3. New pure domain — `src/server/domain/metrics.ts`

```ts
export interface FlowRow {            // what the repository hands over
  readonly amountCents: number;
  readonly method: TransactionMethod; // 'ach' | 'wire' | 'card' | 'internal' | 'check' | 'fee' | 'interest'
  readonly postedAt: Date;            // posted rows always have one
}

export interface FlowTotals {
  readonly inflowCents: number;       // Σ positive
  readonly outflowCents: number;      // Σ |negative|  (positive magnitude)
}

export const isMetricRow = (row: FlowRow): boolean => row.method !== 'internal';   // BR-011
export const flowTotals  = (rows: readonly FlowRow[], range: Range): FlowTotals;
export const netBurnCents = (totals: FlowTotals): number;                          // out − in
export interface BurnAverage { readonly avgBurnCents: number; readonly monthsUsed: number; }
export const averageClosedMonthBurn = (rows: readonly FlowRow[], months: readonly Range[]): BurnAverage;
export type Runway = { kind: 'cash-flow-positive' } | { kind: 'months'; months: number };
export const runwayOf = (totalCashCents: number, avgBurnCents: number): Runway;
```

**Exact formulas, per BR-008 and BR-009 — no deviation.**

```
inWindow(row, range)  ⇔  range.start <= row.postedAt < range.end          // half-open, BR-009
eligible(row)         ⇔  isMetricRow(row)                                  // BR-011; the repository
                                                                           // already filters status='posted'

inflowCents(range)    = Σ { r.amountCents          | eligible(r) ∧ inWindow(r) ∧ r.amountCents > 0 }
outflowCents(range)   = Σ { −r.amountCents         | eligible(r) ∧ inWindow(r) ∧ r.amountCents < 0 }
netBurnCents(range)   = outflowCents(range) − inflowCents(range)

months                = closedMonthsBefore(now, 3)      // [Aug, Sep, Oct] for a November `now`
avgBurnCents          = Math.round( Σ netBurnCents(m) / months.length )    // every month is a term,
                                                                           // an empty month contributes 0
runway                = avgBurnCents <= 0
                          ? { kind: 'cash-flow-positive' }
                          : { kind: 'months', months: Math.round((totalCashCents / avgBurnCents) * 10) / 10 }
```

Notes that are requirements, not preferences:

- `round1` happens **once, at the very end** (BR-008). `totalCashCents / avgBurnCents` is a ratio of
  two integers — a dimensionless number of months, **not money** — so it is the one place a
  non-integer is legitimate. `assertSafeCents` is not applied to it.
- `avgBurnCents <= 0` covers both "profitable" and "exactly break-even", so division by zero is
  unreachable. `Infinity` and `NaN` are therefore not representable in the return type (AC-002-12).
- `monthsUsed < 3` is returned, not hidden, so the tile can label the figure (AC-002-16, BR-008
  exception).
- The 30-day window is `lastNDaysRange(now, 30)` — the existing helper, which is
  `[startOfBusinessDay(now, −29), startOfBusinessDay(now, 1))`: 30 ET days including today,
  DST-correct, already unit-tested in 001.

> **`cash-series.ts` is not written.** It belonged to FR-012b, dropped by cut ladder L-4 at
> 🚦 G-SpecPlan. The module specification of v0.1 is intentionally not carried forward here; if a
> time-series visual ever returns, re-plan it with the withdrawn AC-002-03/04/05 text in `spec.md`.

## 4. New repository methods — `src/server/repositories/transactions.ts`

Every signature takes `businessId` **first** and puts it in the `where` (NFR-005, AC-002-29). All
three use existing indexes; **no migration and no schema change in this feature.**

| Method | Query | Index used |
|---|---|---|
| `listPostedFlowRows(businessId, range)` | `status: 'posted'`, `postedAt: { gte: range.start, lt: range.end }`; selects `amountCents, method, postedAt` | `(businessId, postedAt)` |
| `listRecentTransactions(businessId, limit)` | all statuses, `orderBy [{ postedAt: 'desc' }, { createdAt: 'desc' }]`, `take: limit`; selects the row plus `counterparty.name`, `category.label`, `transferId`, `settleAt` | `(businessId, postedAt)` |
| `listPendingPayments(businessId)` | `status: 'pending'`, `method: { in: ['ach','wire'] }`, `orderBy { settleAt: 'asc' }`; selects `amountCents, method, settleAt, createdAt`, `counterparty.name` | `(businessId, status, settleAt)` |
| *(reused)* `listBalanceRows(businessId)` | unchanged, via `getAccountBalances` | — |

`listPendingPayments` survives L-2: the **panel** was cut, not the data. Keeping the dedicated read
is what makes AC-002-21 deterministic — a pending row is guaranteed to appear in the list even if a
burst of posted rows would have pushed it past the 8-row window.

`listPostedFlowRows` is called **twice** by the service with two different ranges (the 30-day window
and the span covering the three closed months) rather than once over a union — two indexed reads of
a few hundred rows each are cheaper to reason about than one wide read plus in-memory partitioning.
Prisma's `postedAt` is nullable in the schema; the `status: 'posted'` filter guarantees non-null, and
the repository maps the row to a non-nullable `FlowRow` at the boundary so the domain never sees
`Date | null`.

## 5. New service — `src/server/services/overview.ts`

```ts
export interface OverviewData {
  readonly totalCashCents: number;                  // FR-007 — from getAccountBalances
  readonly accounts: readonly AccountWithBalances[];// FR-009 — from getAccountBalances
  readonly last30Days: FlowTotals;                  // FR-008
  readonly burn: { readonly avgBurnCents: number; readonly monthsUsed: number };
  readonly runway: Runway;                          // FR-010
  readonly recentTransactions: readonly RecentTransactionView[]; // FR-012 + FR-011 pending rows
}

export const getOverview = (businessId: string, now: Date): Promise<OverviewData>;
```

- Reads run in a single `Promise.all`: `getAccountBalances`, `listPostedFlowRows(30d)`,
  `listPostedFlowRows(closed-months span)`, `listRecentTransactions(businessId, 8)`,
  `listPendingPayments(businessId)`.
- **L-2 merge rule.** `recentTransactions` is the **union** of the 8 recent rows and every pending
  payment, deduplicated by `id`, sorted by effective ET date (`postedAt ?? createdAt`) descending
  (ASM-002-01). Each view row carries `status` and, when `status === 'pending'`, the `settleAt` the
  UI renders as `Expected <ET date>`. So the list is `>= 8` rows and always contains the pending
  ones (AC-002-21, AC-002-23).
- `now` is a parameter. The service does not call `new Date()`.
- **This is the NFR-011 boundary.** Feature 003 reuses `getAccountBalances` and the
  `RecentTransactionView` mapping; it must not re-derive a balance or a total. If 003 needs a
  filtered/paginated list it adds a *new repository method*, not a second balance derivation.

## 6. UI breakdown

| File | Kind | Responsibility |
|---|---|---|
| `src/app/(app)/home/(section)/page.tsx` | Server Component (rewrite) | read the session, `const now = new Date()`, one `getOverview` call, compose the panels; one `<h1>` via `SectionPlaceholder`; **no "Move money" CTA** (OQ-002-03 A) |
| `src/app/(app)/home/(section)/error.tsx` | Client | segment error state wrapping `ErrorState` (AC-002-28); takes no `error` payload into the body |
| `src/app/(app)/home/(section)/loading.tsx` | Server (adjust) | align the existing skeleton to the final layout: 4 tiles, accounts panel, recent list; **drop the chart plot-area box** that 004 would have filled and **do not add** a sparkline or pending box |
| `src/components/money/amount.tsx` | Server | **the only** signed-amount renderer: `formatCents`, `tabular-nums`, `+`/`−` sign, `--positive` for inflow, neutral foreground for outflow, `--destructive` only for `failed`. Shared with 003 |
| `src/components/overview/kpi-tile.tsx` | Server | label / value / footnote box; 4 of these |
| `src/components/overview/runway-tile.tsx` | Server | renders the `Runway` union: months branch, cash-flow-positive branch, and the `monthsUsed < 3` label |
| `src/components/overview/account-cards.tsx` | Server | FR-009 list + empty state; masking via `maskAccountNumber` |
| `src/components/overview/recent-transactions.tsx` | Server | FR-012 list + "View all" link to `/transactions` + empty state, **plus the folded pending rows** (`pending · Expected <date>` badge) and **one footnote sentence** that cancelling a pending payment is not available in this round — **no control of any kind** (AC-002-21, AC-002-22) |
| `src/lib/format.ts` | extend | `maskAccountNumber(n) → '••••4821'`, `formatEtDate(instant)` and `formatEtDateTime(instant)` via `Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York' })` |

**Not created (L-4 / L-2):** `src/components/overview/cash-sparkline.tsx` and
`src/components/overview/pending-payments.tsx`.

Layout: `grid gap-4 sm:grid-cols-2 xl:grid-cols-4` for the tiles, then
`grid gap-4 lg:grid-cols-[2fr_1fr]` for the recent list and the accounts panel, mirroring the
**amended** wireframe in `docs/ux/ui-brief.md` §8 (Amendment 1, 2026-11-10). Mobile is a single
column, account cards are a card list, and figures stay `tabular-nums` so nothing truncates at
375 px.

## 7. Test strategy per AC

| AC | Level | Where |
|---|---|---|
| AC-002-01 | unit + integration | `tests/unit/metrics.test.ts`; `tests/integration/overview.test.ts` asserts the total equals `getAccountBalances`' own total |
| AC-002-02, AC-002-10 | unit | `tests/unit/amount.test.ts` (render-free string assertions on `formatCents` + sign logic) |
| AC-002-06, AC-002-07, AC-002-08, AC-002-09 | unit | `tests/unit/metrics.test.ts` — including the `2026-11-01T03:30:00Z` → October 31 ET attribution |
| AC-002-11…AC-002-16 | unit | `tests/unit/metrics.test.ts` — one test per BR-008 example, ids in the titles |
| AC-002-17, AC-002-29 | integration | `tests/integration/overview.test.ts` against the seeded Compose database; the anti-IDOR case creates a second business and asserts zero cross-business rows |
| AC-002-18, AC-002-19, AC-002-20 | integration + e2e | balances from the seed; e2e asserts `••••` and the absence of any full account number in the DOM |
| AC-002-21, AC-002-22 | integration + e2e | integration: every pending payment appears in `recentTransactions` with its `settleAt`. e2e: the `pending · Expected` badge, the honest sentence, and **zero** elements matching a cancel affordance (`button`/`a` with cancel text, and no link to `/move-money`) |
| AC-002-23, AC-002-24, AC-002-25 | e2e | `tests/e2e/home.spec.ts` |
| AC-002-26 | e2e | skeleton asserted via the `role="status"` sr-only sentence |
| AC-002-27 | integration | `getOverview` against an empty business → all zeros, cash-flow-positive, no throw |
| AC-002-28 | e2e | existing `/_dev/shell-boom` pattern, plus a body assertion that no stack frame appears |
| AC-002-30 | command | `git grep -nE 'amountCents' src/components` returns only prop passing, no operators — pasted as evidence |
| AC-002-31 | e2e | viewport 375 and 1280, `scrollWidth <= innerWidth`, console clean — **the authority is CI on Linux, not Windows** (`MEMORY.md`: AC-001-15 passed locally and failed on CI by 3 px) |

Withdrawn with L-4: `tests/unit/cash-series.test.ts` is **not** written, and the sparkline `aria`
e2e assertion (AC-002-05) is gone.

Unit tests are written **before** their implementation (red first) for `metrics.ts`: that is where
the money mathematics lives and where a wrong sign is invisible by inspection. The UI tasks are not
test-first — asserting a layout before it exists costs more than it catches inside a 2 h box.

## 8. Timebox reckoning — **decided, 2026-11-10**

**The 0.43 calibration factor is deliberately not applied.** `MEMORY.md` records it failing by ~3×
on 001's UI block (T-10…T-13: 2 h 40 against ~56 min). 002 is UI-heavy. The figures below are raw,
honest estimates.

| Block | Tasks | Raw (full scope, v0.1) | After L-2 + L-4 |
|---|---|---|---|
| Domain (test-first) | T-01 | 50 min (incl. `cash-series.ts`) | **30 min** |
| Repository + service | T-02, T-03 | 40 min | **35 min** |
| UI | T-04…T-06 | 1 h 45 min | **1 h 20 min** |
| e2e + evidence | T-07 | 30 min | **25 min** |
| Branch | T-00 | 5 min | **5 min** |
| **Agent total** | T-00…T-07 | **3 h 50 min** | **2 h 55 min** |
| **Box** | | 2 h 00 | **2 h 00 (L-2 + L-4 applied)** |

### What was decided and what remains honest

- **Decision (Technical Director, 2026-11-10):** apply cut ladder **L-2** (−20 min) and **L-4**
  (−35 min) now, and amend 002's box in `docs/roadmap.md` to **2 h 00 with both cuts applied**, so
  the box is never later read as covering full scope. The approved reading of the revised feature is
  **≈ 1 h 55 min**.
- **Planner's uncalibrated sum is 2 h 55 min**, i.e. ~+46 % over the box. This gap is recorded, not
  resolved, and it is **not** a request to re-open the decision: the scope is fixed. What protects
  delivery is the clock rule, not the estimate — **008 `ship` starts at 15:30 ET** and **003 absorbs
  any slip** (`docs/roadmap.md`, second cut, corrected 2026-11-10). If 002 passes ~2 h 35 of elapsed
  agent time, the Coordinator applies the residual ladder below without a new gate.

### Residual cut ladder (still pre-authorised, applied top-down)

| # | Cut | Saves | Cost | Status |
|---|---|---|---|---|
| L-1 | No "vs previous 30 days" deltas on the in/out tiles | — | wireframe fidelity only | **Applied** (ASM-002-04; in the §8 wireframe amendment) |
| L-2 | Pending payments folded into the recent list instead of a dedicated panel | 20 min | FR-011 degraded to read-only | **Applied 2026-11-10** |
| L-4 | Drop the sparkline (FR-012b) | 35 min | removes the only time-series visual (004 is cut) | **Applied 2026-11-10** |
| L-3 | e2e reduced to one spec at 1280 px only; the 375 px assertion rides on 003's responsive pass | 15 min | NFR-004 unverified in 002 — **the 001 lesson argues against it; take it last** | Available |
| L-5 | Drop the account cards' *available* balance line, keeping current only | 10 min | FR-009 degraded; AC-002-19 would be withdrawn | Available, **after** L-3 |

The roadmap's global cut order (006 → Could items → 004 to 2 charts → CSV → recategorize) contains
nothing inside 002, which is why this feature-local ladder exists.

## 9. Dependencies (Art. 10)

**No new dependency. Nothing is installed by this feature.**

| Candidate | Purpose | Alternatives | Decision |
|---|---|---|---|
| `recharts@3.10.1` | would have rendered the FR-012b sparkline | (a) **don't add it**; (b) hand-rolled inline SVG; (c) shadcn `chart` wrapper, which pulls its own set (001 measured that surprise) | **(a) Don't add it.** FR-012b is cut (L-4), so there is nothing to render. Verified **absent from `package.json`** on 2026-11-10 although pinned in ADR-0002; the pin stands for a future feature and is noted there |

`@date-fns/tz@1.5.0` and `date-fns@4.4.0` are already installed and already used by
`src/server/domain/time.ts`; `Intl.DateTimeFormat` covers the ET date strings with no package.

## 10. Migrations

**None.** No schema change, no migration, nothing to roll back. Every index 002 needs was created by
001's single migration (`(businessId, postedAt)`, `(businessId, status, settleAt)`,
`(businessId, method, postedAt)`). Rollback for this feature is `git revert` of its commits; the
database is untouched.

## 11. Risks and mitigations

| ID | Risk | Mitigation |
|---|---|---|
| R-1 | **Timebox**: the uncalibrated sum is ~+46 % over the 2 h box even after L-2 and L-4, on the project's most visible feature | §8: residual ladder L-3 → L-5 pre-authorised; the 15:30 ET clock rule protects 008 and 003 absorbs the slip |
| R-2 | A new dependency burns install and configuration time inside the box, exactly as it did in 001 | Zero new dependencies (§9); `recharts` stays uninstalled |
| R-3 | DST arithmetic silently shifting a row between ET days or months, corrupting the 30-day window or a closed month | Day/month keys only, never millisecond arithmetic; `tests/unit/metrics.test.ts` pins the `2026-11-01T03:30:00Z` boundary row and the Aug/Sep/Oct selection |
| R-4 | Sign errors in burn (`out − in` inverted) are invisible by inspection and would still render a plausible number | Test-first domain, one test per BR-008 example, plus AC-002-17's 14–24 month seed range as an end-to-end sanity net |
| R-5 | The seeded pending payments' `settleAt` goes stale if the workspace was seeded days earlier (ASM-002-02) | Absolute "Expected <date>" copy stays truthful; recorded as a README limitation; 008's demo reset re-seeds |
| R-6 | Cross-OS layout defect at 375 px, as measured on 001 (`scrollWidth 378` vs `375`, green on Windows, red on CI) | AC-002-31 asserted in CI; the laptop is never the authority; L-3 is taken **before** L-5 but still after everything else |
| R-7 | A figure recomputed in a component drifts from the service (the NFR-011 defect class) | One `Amount` component, one `getOverview` call per page, and the AC-002-30 `git grep` as executed evidence |
| R-8 | Non-deterministic e2e assertions: `now` is real, so exact amounts move between runs | e2e asserts structure, signs, formats and invariants, **never** a hard-coded dollar figure |
| R-9 | 001 is not merged yet, so `feat/002-account-overview` would branch off an unmerged base | Branch 002 from `feat/001-domain-data-shell` while 001 is unmerged, and rebase onto `main` after the 001 merge — 🛑 flagged in `tasks.md` T-00. **Unchanged by the G-SpecPlan decisions** |
| R-10 | A reader of `docs/roadmap.md` mistakes 002's amended 2 h box for full FR-007…FR-012b scope | The roadmap row, this plan's §8 and `spec.md` §2 all state "L-2 and L-4 applied"; FR-012b is listed as deferred in `spec.md` §11 and `docs/traceability.md` |
