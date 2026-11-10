# Tasks — Spec 002 (account-overview)

Spec `specs/002-account-overview/spec.md` **v1.0** · Plan `specs/002-account-overview/plan.md`
Template D.21 · Sprint Profile · Planner, 2026-11-10 · Branch `feat/002-account-overview`

> ✅ **🚦 G-SpecPlan APPROVED 2026-11-10.** Every `OQ` of v0.1 is resolved (spec §10) and cut ladder
> **L-2** (pending payments folded into the recent list) and **L-4** (sparkline dropped, FR-012b
> deferred, **no `recharts`**) are **applied**. Nothing in this list is gated on a decision any more.
> **No task may re-open those decisions.**

> The Implementer runs these **strictly sequentially**, one task per invocation, **one commit per
> task**, Conventional Commits with the task id — e.g.
> `feat(domain): add flow totals, net burn and runway [T-01]`. No task is marked `[P]`: T-04…T-06
> all touch the Home tree, and the domain block must land before any UI.

> **Ordering rule:** the **domain and service block (T-01…T-03) comes first**, test-first. It is
> where the money mathematics lives, it is the part 003 depends on, and if the clock runs out the
> valuable half is already committed and provable.

> ⏰ **Clock rule:** **008 `ship` starts at 15:30 ET regardless**, and **003 absorbs any slip from
> 002** (`docs/roadmap.md`, second cut, corrected 2026-11-10). If 002 passes ~2 h 35 of elapsed
> agent time, the Coordinator applies the residual ladder in `plan.md` §8 (**L-3**, then **L-5**)
> without a new gate.

---

## Verify commands (from `AGENTS.md`)

`pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm test <path>` · `pnpm test:int` (needs
`docker compose up -d`, host port 5433, and a seeded database) · `pnpm test:e2e` (builds its own
server; needs `pnpm db:seed` and `SESSION_SECRET` >= 32 chars in `.env.local`) · `pnpm build`

---

## Tasks

### Phase 0 — branch

- [x] **T-00** — 🛑 **Human-gated: create the branch from the right base.** If 001 has merged to
  `main`, branch `feat/002-account-overview` from `main`. If 001 is **still unmerged** (the state at
  planning time), branch from `feat/001-domain-data-shell` and **rebase onto `main` after the 001
  merge** (plan §11 R-9). The agent does not push and does not merge.
  · **AC:** — · **Files:** — · **Verify:** `git status` shows the branch and a clean tree
  · **Depends on:** — · **Est. 5 min**

### Phase 1 — pure domain, test-first (the valuable half)

- [x] **T-01** — **`metrics.ts`: 30-day flow totals, net burn, closed-month average, runway.**
  Write `tests/unit/metrics.test.ts` **red first**, one test per BR-008/BR-009/BR-011 example with
  the AC id in the title: the half-open 30-day window, posted-only, the internal-transfer
  neutrality pair, the `2026-11-01T03:30:00Z` → October 31 ET attribution, `avgBurn = 10000000 →
  12.0 months`, the cash-flow-positive branch, the August/September/October selection for a
  November `now`, the empty-month-as-a-term case, and `monthsUsed < 3`. Then implement
  `src/server/domain/metrics.ts` exactly as `plan.md` §3 specifies — **pure TypeScript, no Prisma,
  no Next, no `new Date()`, no `any`**. `round1` only at the very end; `runwayOf` returns the
  discriminated union so `Infinity`/`NaN` are not representable. **`cash-series.ts` is not written
  (L-4).**
  · **AC:** AC-002-06, AC-002-07, AC-002-08, AC-002-09, AC-002-11, AC-002-12, AC-002-13,
  AC-002-14, AC-002-15, AC-002-16 · **Files:** `src/server/domain/metrics.ts`,
  `tests/unit/metrics.test.ts` · **Verify:** `pnpm test tests/unit/metrics.test.ts` (red, then
  green) · `pnpm typecheck` · **Depends on:** T-00 · **Est. 30 min**

### Phase 2 — data access and the one service

- [x] **T-02** — **Three scoped repository reads.** Add `listPostedFlowRows`,
  `listRecentTransactions` (now also selecting `settleAt`) and `listPendingPayments` to
  `src/server/repositories/transactions.ts` exactly as `plan.md` §4 specifies: `businessId` is the
  **first** parameter and is always in the `where`; narrow `select`s; the `postedAt: Date | null`
  → `Date` mapping happens at this boundary so the domain never sees a nullable. `listPendingPayments`
  is kept under L-2 — the panel was cut, the data was not. No schema change, no migration. Existing
  methods are untouched.
  · **AC:** AC-002-29 (partial) · **Files:** `src/server/repositories/transactions.ts`
  · **Verify:** `pnpm typecheck` · `pnpm lint` · **Depends on:** T-01 · **Est. 15 min**

- [x] **T-03** — **`overview` service + its integration test.** Implement
  `src/server/services/overview.ts` per `plan.md` §5: one `Promise.all`, `now` injected, total cash
  and account balances taken from the **existing** `getAccountBalances` (never re-derived), flows
  and runway from `metrics.ts`, and the **L-2 merge rule** — `recentTransactions` is the union of
  the 8 recent rows and every pending payment, deduped by `id`, sorted by effective ET date
  descending, each pending row carrying its `settleAt`. **There is no `cashSeries` field.** Write
  `tests/integration/overview.test.ts` against the seeded Compose database asserting: the seeded
  runway is between **14.0 and 24.0** months (AC-002-17); the total equals `getAccountBalances`' own
  total (AC-002-01); every pending payment appears in `recentTransactions` with a counterparty name
  and a `settleAt` (AC-002-21); `>= 8` rows newest-first (AC-002-23 data shape); an **empty
  business** returns all zeros, the cash-flow-positive branch and no throw (AC-002-27); and an
  **anti-IDOR** case — a second business's rows are never returned by any of the three new methods
  (AC-002-29).
  · **AC:** AC-002-01, AC-002-17, AC-002-21 (data), AC-002-27, AC-002-29 · **Files:**
  `src/server/services/overview.ts`, `tests/integration/overview.test.ts` · **Verify:**
  `docker compose up -d && pnpm db:seed && pnpm test:int` · **Depends on:** T-02
  · **Est. 20 min**

### Phase 3 — UI (the block that ran 3× on 001; estimate accordingly)

- [x] **T-04** — **The shared `Amount` renderer, the KPI tiles and the format helpers.** Create
  `src/components/money/amount.tsx` — the **only** place a signed amount becomes markup:
  `formatCents`, `tabular-nums`, explicit `+`/`−`, `--positive` for inflow, neutral foreground for
  outflow, `--destructive` only for `failed`. Create `src/components/overview/kpi-tile.tsx` and
  `runway-tile.tsx` (both `Runway` branches plus the `monthsUsed < 3` label). Extend
  `src/lib/format.ts` with `maskAccountNumber` and `formatEtDate`/`formatEtDateTime`. Add
  `tests/unit/amount.test.ts` and `tests/unit/format.test.ts` for the sign/format/mask strings.
  **No `cash-sparkline.tsx` (L-4). No arithmetic on `amountCents` in any of these files.**
  · **AC:** AC-002-02, AC-002-10, AC-002-12 (render), AC-002-16 (render), AC-002-18 (masking)
  · **Files:** `src/components/money/amount.tsx`,
  `src/components/overview/{kpi-tile,runway-tile}.tsx`, `src/lib/format.ts`,
  `tests/unit/{amount,format}.test.ts` · **Verify:** `pnpm test` · `pnpm lint` · `pnpm typecheck`
  · **Depends on:** T-03 · **Est. 25 min**

- [x] **T-05** — **Account cards and the recent-transactions list, pending rows folded in (L-2).**
  Create `src/components/overview/account-cards.tsx` (name, type, `••••NNNN`, current and
  available, each via `Amount`; empty state through `EmptyState`) and
  `src/components/overview/recent-transactions.tsx` (newest first, counterparty or an internal
  label, category, ET date, method, a status badge when not `posted`, right-aligned signed amount,
  a "View all" link to `/transactions`, empty state). Pending payments render as **rows of this
  list** with a `pending · Expected <ET date>` badge, plus **one footnote sentence** stating that
  cancelling a pending payment is not available in this round — and **no cancel button, link or
  disabled control anywhere, and no link to `/move-money`** (OQ-002-01 A). Internal legs are
  **shown** and labelled (BR-011 excludes them from metrics, not from lists). Below 768 px both
  render as card lists. **`pending-payments.tsx` is not created (L-2).**
  · **AC:** AC-002-18, AC-002-19, AC-002-20, AC-002-21, AC-002-22, AC-002-23, AC-002-24,
  AC-002-25 · **Files:** `src/components/overview/{account-cards,recent-transactions}.tsx`
  · **Verify:** `pnpm lint` · `pnpm typecheck` · `pnpm build` · **Depends on:** T-04
  · **Est. 35 min**

- [x] **T-06** — **Compose the page and its three states.** Rewrite
  `src/app/(app)/home/(section)/page.tsx` as a Server Component: session, `const now = new Date()`,
  **one** `getOverview` call, then the panels in the order of the **amended** wireframe
  (`docs/ux/ui-brief.md` §8 Amendment 1): 4 KPI tiles → recent list + accounts. **No cash-flow
  chart, no spending-by-category panel, no sparkline, no pending panel, no "Move money" CTA.** Add
  `src/app/(app)/home/(section)/error.tsx` wrapping `ErrorState` and taking no error payload into
  the body. Adjust the existing `loading.tsx` so the skeleton matches the final layout (4 tiles,
  recent list, accounts) and **drop its chart plot-area box**. Then verify in a browser through the
  **Playwright MCP** at 1280 px and 375 px, light and dark: screenshots attached, console clean.
  · **AC:** AC-002-26, AC-002-27, AC-002-28, AC-002-30 · **Files:**
  `src/app/(app)/home/(section)/{page,error,loading}.tsx` · **Verify:** `pnpm build` ·
  `pnpm lint` · `pnpm typecheck` · Playwright MCP screenshots at 1280 and 375 px ·
  `git grep -nE 'amountCents' src/components` shows no operators · **Depends on:** T-05
  · **Est. 20 min**

### Phase 4 — end-to-end and evidence

- [x] **T-07** — **`tests/e2e/home.spec.ts` and the full local gate.** One spec covering the ACs
  that only a browser can prove: `••••` masking with **no full account number anywhere in the DOM**
  (AC-002-18); `>= 8` recent rows with signed amounts (AC-002-23); "View all" reaching
  `/transactions` (AC-002-24); internal legs visible and labelled (AC-002-25); pending rows with
  their `pending · Expected` badge inside the recent list (AC-002-21); the honest no-cancel
  sentence **and zero cancel affordances / zero links to `/move-money`** (AC-002-22); the
  `role="status"` loading sentence (AC-002-26); the error state with **no stack frame in the body**
  (AC-002-28); and `scrollWidth <= innerWidth` at **375 and 1280 px** with a clean console
  (AC-002-31). Assertions are structural — signs, formats, invariants — **never a hard-coded dollar
  figure** (plan §11 R-8). Then run the whole gate and paste the output: `pnpm lint`,
  `pnpm typecheck`, `pnpm test`, `pnpm test:int`, `pnpm build`, `pnpm test:e2e`.
  · **AC:** AC-002-18, AC-002-21, AC-002-22, AC-002-23, AC-002-24, AC-002-25, AC-002-26,
  AC-002-28, AC-002-31 · **Files:** `tests/e2e/home.spec.ts` · **Verify:** all six commands above,
  exit statuses pasted · **Depends on:** T-06 · **Est. 25 min**

- [ ] **T-08** — 🛑 **Human-gated: push, PR and Preview.** Push `feat/002-account-overview`, open
  the PR through the GitHub web UI (`gh` is absent, OQ-007), confirm CI green — **CI on Linux is
  the authority, not the laptop** (`MEMORY.md`: AC-001-15) — and check the Vercel Preview renders
  Home with real figures. Then `/sdd-validate 002 combined` and 🚦 G-Merge.
  · **AC:** AC-002-31 (CI run) · **Files:** — · **Verify:** CI green; Preview URL loading `/home`
  · **Depends on:** T-07 · **Est. 15 min (human)**

---

## Estimate reckoning

| Phase | Tasks | Estimate |
|---|---|---|
| 0 — branch | T-00 | 5 min |
| 1 — domain (test-first) | T-01 | 30 min |
| 2 — data + service | T-02, T-03 | 35 min |
| 3 — UI | T-04, T-05, T-06 | 1 h 20 min |
| 4 — e2e + evidence | T-07 | 25 min |
| **Agent total** | T-00…T-07 | **2 h 55 min** |
| Human-gated | T-08 | 15 min |
| **Box (L-2 + L-4 applied)** | | **2 h 00** |

**AC coverage check:** the 28 active ACs are all claimed — AC-002-01…02 (T-03, T-04),
AC-002-06…17 (T-01, T-03, T-04), AC-002-18…25 (T-05, T-07), AC-002-26…31 (T-06, T-07, T-08).
AC-002-03, AC-002-04 and AC-002-05 are **withdrawn** (L-4) and intentionally unclaimed.

**Where the numbers stand.** Cut ladder L-2 and L-4 removed 55 min of raw work (3 h 50 → 2 h 55
agent time) and the box was amended to **2 h 00 with both cuts applied**. The approved reading of
the revised feature is **≈ 1 h 55 min**; the planner's **uncalibrated** sum above is **2 h 55 min**,
and that gap is reported rather than compressed away — the 0.43 calibration factor is not applied
because `MEMORY.md` records it failing by 3× on 001's UI block. **This is not a request to re-open
the approved scope.** What protects delivery is the clock rule, not the estimate: **008 starts at
15:30 ET** and **003 absorbs the slip**. If elapsed agent time on 002 passes ~2 h 35, the
Coordinator applies the residual ladder in `plan.md` §8 — **L-3** (e2e at 1280 px only, −15 min),
then **L-5** (account cards drop the available-balance line, −10 min, withdrawing AC-002-19) —
without a new gate.

---

## Evidence log (Implementer, 2026-11-10)

- T-00 ✅ (no commit) · `git checkout -b feat/002-account-overview` from `feat/001-domain-data-shell` @ `4baf9cd` (001 unmerged, plan §11 R-9) → `git branch --show-current` = `feat/002-account-overview`. Not pushed, not merged (Art. 9). ⚠️ The tree was **not** clean: 7 modified `docs/*` files and the untracked `specs/002-account-overview/` from today’s planning run came along. They are outside the Implementer’s edit scope and were left uncommitted for the Coordinator.
- T-01 ✅ `b01b0c2` · `pnpm test tests/unit/metrics.test.ts` → **red first** (`Cannot find package '@/server/domain/metrics'`), then **12 passed** · `pnpm typecheck` → exit 0 · `pnpm lint` → exit 0.
- T-02 ✅ `79702b4` · `pnpm typecheck` → exit 0 · `pnpm lint` → exit 0.
- T-03 ✅ `8f5e3fa` · `docker compose up -d` → exit 0 · `pnpm db:seed` → `content-hash 91bd39c0…`, runway 18.0 months, all self-checks passed · `pnpm test:int` → **4 files, 28 tests passed** (8 of them new).
- T-04 ✅ `ee55668` · `pnpm test` → **8 files, 67 tests passed** · `pnpm typecheck` → exit 0 · `pnpm lint` → exit 0.
- T-05 ✅ `0eb559b` · `pnpm lint` → exit 0 · `pnpm typecheck` → exit 0 · `pnpm build` → compiled successfully.
- T-06 ✅ `fa8b0b8` · `pnpm build` → compiled successfully · `pnpm lint` → exit 0 · `pnpm typecheck` → exit 0 · `git grep -nE 'amountCents' src/components` → **6 hits, all prop declarations/passes plus one `formatSignedCents` call; no operator** (AC-002-30). ⚠️ Browser check done through the **real Playwright harness**, not the Playwright MCP: no `playwright` MCP tool was exposed to this agent session.
- T-07 ✅ `68fa752` · `pnpm lint` exit 0 · `pnpm typecheck` exit 0 · `pnpm test` **67 passed** · `pnpm test:int` **29 passed** · `pnpm build` compiled in 5.6s · `pnpm test:e2e` **25 passed (1.1m)** — 9 new + 001’s 16. Light/dark screenshots at 1280 px and 375 px attached to the run and inspected: no overflow, no truncated figure, console clean.
- T-08 ⬜ **not started — human-gated** (push, PR, Preview, `/sdd-validate 002 combined`, 🚦 G-Merge).
