# Spec 002 — account-overview

Status: **🚦 G-SpecPlan APPROVED 2026-11-10** (cut ladder **L-2** and **L-4** applied) · Version: **1.0**
Branch: `feat/002-account-overview`
FR: FR-007, FR-008, FR-009, FR-010, FR-011 (read-only), FR-012 · BR: BR-001, BR-002, BR-008, BR-009,
BR-011 · NFR: NFR-003, NFR-004, NFR-005, NFR-007, NFR-010, NFR-011 · CR-2 · Depends on: 001
Template D.18 · Sprint Profile · Planner, 2026-11-10

> **Planning mode:** single-invocation (spec + plan + tasks in one planner call), per the Sprint
> Profile amendment in `docs/roadmap.md` §"Sprint Profile amendments".
> **All five `OQ`s of v0.1 were resolved by the Technical Director at 🚦 G-SpecPlan on 2026-11-10**
> (§10). The two scope-reducing resolutions — **L-2** (no separate pending panel) and **L-4** (no
> cash sparkline) — are already **applied throughout this document**. FR-012b is therefore **not**
> delivered by this feature, and three acceptance criteria were formally withdrawn (§5, "Withdrawn").
> The decisions are closed; agents must not re-open them.

---

## 1. Goal

Feature 001 made the product real below the waterline — schema, seeded ledger, session, shell — and
deliberately left `/home` showing **no numbers at all**. Feature 002 is the feature that makes
Oakfern a dashboard: it reads that ledger and answers, above the fold, the four questions a founder
actually has. How much cash do we have? What came in and went out in the last 30 days? How fast are
we burning it, and how long does it last? What just happened, and what is still in flight?

For the evaluator, 002 is the screen the case study is judged on. For feature 003 it is the layer
that must not be rebuilt: the balance service, the flow/burn/runway domain and the signed-amount
renderer defined here are the **single source** every later view reuses (NFR-011).

## 2. Scope

**Includes**

| # | Item | FR / BR / NFR |
|---|---|---|
| 1 | Total cash across all accounts of the business | FR-007, BR-001, BR-002 |
| 2 | Money in / money out over the last 30 ET days, internal transfers excluded | FR-008, BR-009, BR-011 |
| 3 | Monthly net burn and runway, with the cash-flow-positive branch | FR-010, BR-008 |
| 4 | Account cards: name, type, masked number, current and available balance | FR-009, BR-002 |
| 5 | Pending payments **as rows inside the recent-transactions list** — counterparty, signed amount, method, `pending · Expected <ET date>` badge; **read-only, no cancel control** (cut ladder **L-2** + OQ-002-01 A) | FR-011 (degraded), BR-004 |
| 6 | Recent transactions (>= 8) with a link to the full list | FR-012, BR-001 |
| 7 | New pure-domain module `metrics.ts` (30-day flows, monthly net burn, runway); new `businessId`-scoped repository reads; one `overview` service that composes them | ADR-0001, NFR-005, NFR-011 |
| 8 | Empty, loading (content-shaped skeleton) and error states for the whole view — 007 was dissolved, so this happens here, task by task | NFR-010, FR-039 |
| 9 | Responsive verification at 375 px and 1280 px, in CI, not only on the laptop | NFR-004 |

**Excludes (and why)**

| Item | Reason |
|---|---|
| **Cash sparkline (FR-012b)** and the `cash-series.ts` domain module | **Cut ladder L-4, approved 2026-11-10** (−35 min). FR-012b is deferred, not deleted; nothing in this delivery renders a time series. `recharts` stays pinned in ADR-0002 and **uninstalled** (OQ-002-02, now moot) |
| **A dedicated pending-payments panel** | **Cut ladder L-2, approved 2026-11-10** (−20 min). Pending rows are folded into the recent list (scope item 5) |
| Cancelling a pending payment (FR-032) | Feature **005 is CUT**. FR-011's cancel path is **out of scope for this delivery**, recorded as a dated note on FR-011 in `docs/requirements/functional.md` (OQ-002-01 A) |
| A primary **"Move money" CTA** on Home | `/move-money` is a placeholder because 005 is cut; a primary CTA that leads nowhere is worse than none (OQ-002-03 A). The sidebar's three items are unchanged |
| Monthly cash-flow chart, balance-over-time chart, spending by category, period selector, chart drill-down (FR-021…FR-025) | Feature **004 is CUT**. The originally approved UI-02 wireframe draws two of these panels; the removal is recorded as a dated amendment in `docs/ux/ui-brief.md` §8 (OQ-002-04 A) |
| Account detail screen UI-04 (FR-041) | `Could`, second in the roadmap cut order |
| "vs previous 30 days" deltas on the in/out tiles (drawn in the wireframe) | Not a requirement in `docs/requirements/functional.md`; see **ASM-002-04** |
| Lazy settlement of due pending payments (BR-004) | The `settleDuePayments` service belonged to 005. See **ASM-002-02** |
| Lighthouse / axe runs (NFR-001, NFR-003 scan) | Owned by 003 (`@axe-core/playwright`, TD-008) and by 008 |

## 3. Actors and permissions

| Actor | May | Source |
|---|---|---|
| `admin` (the seeded demo user) | Read every figure on Home for **their own** business | `roles-permissions.md` |
| `anonymous` | Nothing. `/home` redirects to `/` through the 001 guard | FR-002, AC-001-12 |
| `viewer` | Out of scope (TD-005) | — |

Every read in this feature is scoped by the session's `businessId` and goes through
`requireSession()`. There is no new Server Action and no new mutation in 002.

## 4. Main flow and error cases

**Happy path.** Signed-in `admin` opens `/home` → the server resolves the session → one `overview`
service call derives every figure from the ledger → the page renders KPI tiles (total cash, money
in, money out, runway + burn), account cards and the recent-transactions list, which carries the
pending rows inline.

| Case | Behaviour |
|---|---|
| E-01 anonymous visit | Redirect to `/` (001 shell guard, unchanged) |
| E-02 database unreachable / query throws | Segment `error.tsx`: human sentence, "Try again", link Home. No stack trace, no digest in the body |
| E-03 business has no accounts | Empty state on the accounts panel; total cash renders `$0.00`, never blank or `NaN` |
| E-04 business has no transactions | Every figure renders `$0.00`; runway renders the cash-flow-positive branch; the recent list shows its empty state |
| E-05 no pending payments | **No dedicated panel exists (L-2)**: the recent list simply contains no `pending` row, and no "pending" heading, count or empty state is rendered for them |
| E-06 fewer than 3 closed months of data | Average is taken over the closed months that exist, and the tile says so (BR-008 exception) |
| E-07 slow load | Content-shaped skeleton with the final layout's boxes; no full-page spinner, no layout shift |

## 5. Acceptance criteria

> Given / When / Then. Every criterion is independently testable and **references only components
> that ship in this delivery**; the test strategy per criterion is in `plan.md` §7. Test titles carry
> the id: `it('AC-002-07: …', …)`.
>
> **Ids are stable.** AC-002-03, AC-002-04 and AC-002-05 were **withdrawn** when L-4 was approved and
> their numbers are **not reused** — see "Withdrawn acceptance criteria" at the end of this section.
> **Active count: 28.**

### Total cash

| ID | Given | When | Then | Traces |
|---|---|---|---|---|
| **AC-002-01** | a business whose accounts derive balances B1…Bn from the ledger | the overview service runs | the total cash figure equals `sumCents([B1…Bn])` and is produced by `getAccountBalances`, not recomputed anywhere else | FR-007, BR-002, NFR-011 |
| **AC-002-02** | a total cash value of `128431055` cents | Home renders | the tile shows `$1,284,310.55` via `formatCents`, carries `tabular-nums`, and for a value of `0` shows `$0.00` — never blank, `NaN` or `undefined` | FR-007, BR-001 |

### Money in / money out (30 days)

| ID | Given | When | Then | Traces |
|---|---|---|---|---|
| **AC-002-06** | an injected `now` | the 30-day window is computed | it is `[startOfBusinessDay(now, -29), startOfBusinessDay(now, 1))` in `America/New_York`, half-open, i.e. exactly 30 ET days including today | FR-008, BR-009 |
| **AC-002-07** | a ledger containing `posted`, `pending`, `canceled` and `failed` rows in the window | money in / money out are computed | only `posted` rows contribute; money in is the sum of positive `amountCents`, money out the **absolute** sum of negative ones | FR-008, BR-008 |
| **AC-002-08** | a window whose rows include an internal transfer pair of `5000000` cents | the totals are computed | money in and money out are **unchanged** by the pair (`method = 'internal'` excluded), while total cash is also unchanged | FR-008, BR-011 |
| **AC-002-09** | a posted transaction at `2026-11-01T03:30:00Z` (2026-10-31 23:30 ET) and a `now` of 2026-11-01 ET | the window membership is evaluated | the row is attributed to **October 31 ET**, never to November 1 | BR-009 |
| **AC-002-10** | money in `31248000` and money out `19812044` | Home renders | the tiles read `+$312,480.00` and `−$198,120.44`; the inflow carries a `+` sign (colour is never the only signal) and the outflow is neutral foreground with `−`, not red | FR-008, ui-brief §1.1 |

### Net burn and runway

| ID | Given | When | Then | Traces |
|---|---|---|---|---|
| **AC-002-11** | closed-month net burns of `10000000`, `11000000`, `9000000` cents and total cash `120000000` | runway is computed | `avgBurn = 10000000` and the result is `{ kind: 'months', months: 12 }`, rendered "12.0 months" with the monthly burn beside it | FR-010, BR-008 |
| **AC-002-12** | closed-month net burns of `−5000000`, `−2000000`, `−3000000` | runway is computed | the result is `{ kind: 'cash-flow-positive' }` and the tile reads **"Cash-flow positive"** — never `Infinity`, `NaN`, a negative month count or `0.0 months` | FR-010, BR-008 |
| **AC-002-13** | a `now` of 2026-11-10 ET | the closed months are selected | they are **October, September and August 2026**; adding any November row changes neither `avgBurn` nor the runway figure | BR-008 |
| **AC-002-14** | a closed month containing zero transactions, with the other two burning `0` and `3000000` | the average is computed | the empty month contributes `netBurn = 0` as a term (not a skipped one) and `avgBurn = 1000000` | BR-008 |
| **AC-002-15** | a month containing a `5000000`-cent internal transfer pair | its net burn is computed | inflow, outflow and net burn are all unchanged by the pair | BR-008, BR-011 |
| **AC-002-16** | fewer than 3 closed months of data exist | runway is computed | the average is taken over the closed months that exist and the tile states the number of months it is based on | BR-008 (exception), E-06 |
| **AC-002-17** | the **seeded** demo workspace | Home renders | the runway figure is a number between **14.0 and 24.0 months** (the seed self-check's own range) | FR-010 |

### Accounts

| ID | Given | When | Then | Traces |
|---|---|---|---|---|
| **AC-002-18** | the seeded 4-account business | Home renders the accounts panel | each card shows name, type, a number masked to `••••` + the last 4 digits only, current balance and available balance; the full account number never appears in the DOM | FR-009, NFR-005, NFR-009 |
| **AC-002-19** | an account with posted `+500000`, posted `−120000` and pending `−80000` | its card renders | current is `$3,800.00` and available is `$3,000.00`; a pending **inflow** moves neither | FR-009, BR-002 |
| **AC-002-20** | an account with no transactions | its card renders | both figures read `$0.00` | BR-002, E-03 |

### Recent transactions, pending rows included (L-2)

| ID | Given | When | Then | Traces |
|---|---|---|---|---|
| **AC-002-21** | the seeded workspace (2–4 pending external outflows) | Home renders the recent-transactions list | **each pending payment appears as a row of that list** showing counterparty name, amount with a `−` sign, method (`ACH` / `Wire`) and a `pending · Expected <date>` badge whose date is rendered in ET; there is **no separate pending panel, heading or count** | FR-011, BR-004, L-2 |
| **AC-002-22** | the recent-transactions list containing at least one pending row | a user looks for a way to cancel it | the view renders **one honest sentence** stating that cancelling a pending payment is not available in this round, and **no cancel control, link, button or disabled affordance exists anywhere in the view** (`/move-money` is never linked from Home) | FR-011, OQ-002-01 A |
| **AC-002-23** | a business with at least 8 transactions | Home renders the recent list | **at least the 8 most recent** are listed newest first by effective ET date, each with counterparty (or a transfer label), category, ET date, method, status where not `posted`, and a signed amount that is right-aligned and `tabular-nums` | FR-012, BR-001 |
| **AC-002-24** | the recent list | "View all" is activated | it navigates to `/transactions` (UI-03) and nothing links to a route that does not exist | FR-012 |
| **AC-002-25** | a ledger containing internal transfer legs | the recent list renders | internal legs **are shown** (BR-011 excludes them from metrics, not from lists) and are labelled as internal | FR-012, BR-011 |

### States, security and consistency

| ID | Given | When | Then | Traces |
|---|---|---|---|---|
| **AC-002-26** | a slow overview query | the route is requested | a content-shaped skeleton renders with the final layout's boxes (**4 tiles, the accounts panel and the recent list** — no chart box, no sparkline box, no pending panel), announced `sr-only` as busy; no full-page spinner and no layout shift when data arrives | NFR-010, E-07 |
| **AC-002-27** | a business with no accounts and no transactions | Home renders | every figure reads `$0.00`, runway reads cash-flow-positive, and **each panel that ships** (accounts, recent list) shows its designed empty state with an icon, one sentence and an action | NFR-010, E-03, E-04, E-05 |
| **AC-002-28** | the overview read throws | the route is requested | the segment error state renders a human sentence, a working "Try again" and a Home link; the response contains **no stack trace, no SQL and no digest** | FR-039, NFR-009, E-02 |
| **AC-002-29** | a session for business A | every new repository method in this feature is called | each takes `businessId` as its **first** parameter and places it in the `where`; an integration test proves a business-B row is never returned | NFR-005 |
| **AC-002-30** | the finished feature | `git grep` runs over `src/components` | there is **no arithmetic on `amountCents`** and no re-derivation of any total in a component; every figure traces to the `overview` service | NFR-011 |
| **AC-002-31** | the deployed Home at 375 px and 1280 px | the page is measured in CI (Linux chromium, not the laptop) | `document.documentElement.scrollWidth <= window.innerWidth` at both widths, no truncated figure, and the browser console is clean | NFR-004 |

### Withdrawn acceptance criteria

Withdrawn at 🚦 G-SpecPlan, 2026-11-10, when the Technical Director applied **cut ladder L-4**
(drop FR-012b, −35 min). They are recorded here rather than deleted, and their ids are **retired**:
no future criterion in this feature reuses 03, 04 or 05.

| ID | What it asserted | Why withdrawn |
|---|---|---|
| ~~AC-002-03~~ | the 90-day cash series returns exactly 90 ET-day points, oldest first, no gaps, no duplicate day key across a DST boundary | **L-4**: no cash series ships, so `cash-series.ts` is not written. Re-instate verbatim with FR-012b if a time-series visual ever returns |
| ~~AC-002-04~~ | the last series point equals the AC-002-01 total cash figure (one number, two renderings) | **L-4**: there is no series to pin. The NFR-011 single-source property is still covered by AC-002-01 and AC-002-30 |
| ~~AC-002-05~~ | the sparkline exposes an `aria-label` plus a text alternative, with the SVG shape `aria-hidden` | **L-4**: no sparkline renders, so there is nothing to label. NFR-003 in this feature now rests on AC-002-10 (sign, not colour) and the 003 axe scan |

## 6. Out of scope for this spec

Any chart or sparkline; any mutation; any new route; a "Move money" CTA; the command palette; CSV;
account detail; cards; Lighthouse and axe measurement.

## 7. Dependencies

| On | What exactly |
|---|---|
| 001 | `src/server/domain/{time,money,balances}.ts`, `src/server/services/accounts.ts`, `repositories/{accounts,transactions,client}.ts`, `src/lib/{format,session}.ts`, the `(app)` shell, `components/states/*`, `components/ui/skeleton` |
| Seed | `pnpm db:seed` must have run: 4 accounts, ~1,369 transactions, 2–4 pending external outflows, runway 14–24 months |
| Roadmap | 004 and 005 are CUT; the sidebar is 3 items (Cut C1); 002's box is **2 h 00 with L-2 and L-4 already applied** |
| Branch base | 001 is not merged yet: 002 branches from `feat/001-domain-data-shell` and rebases onto `main` after the 001 merge (plan §11 R-9, tasks T-00) |

## 8. Non-functional criteria applying here

| NFR | How 002 satisfies it |
|---|---|
| NFR-003 | Colour is never the sole signal (AC-002-10); one `<h1>`; status conveyed by a text badge, not by hue; the axe scan itself runs in 003. The sparkline `aria` contract left with AC-002-05 (L-4) |
| NFR-004 | AC-002-31, asserted in CI |
| NFR-005 | AC-002-29; no new Server Action; masked account numbers only |
| NFR-007 | `strict`, no `any` in `src/server/domain`; `>= 80 %` line coverage in the domain — the new `metrics.ts` is unit-tested first |
| NFR-010 | AC-002-26, AC-002-27, AC-002-28 |
| NFR-011 | AC-002-01, AC-002-30 |

## 9. Assumptions (`ASM`)

| ID | Assumption | Risk | Mitigation |
|---|---|---|---|
| **ASM-002-01** | "Recent" means the 8 most recent transactions ordered by **effective ET date** = `postedAt ?? createdAt`, descending, **all statuses**, internal legs included. FR-012 says "at least the 8 most recent" without defining the sort key for a row that has no `postedAt`. With L-2 this list is also where pending payments surface, so pending rows sort by `createdAt` among the rest. | Low | Unit-tested ordering; a `pending` row sorts by `createdAt` and carries its status badge |
| **ASM-002-02** | Estimated arrival is rendered from `settleAt` as an **absolute ET date** ("Expected Nov 12"), not a live countdown, and **no lazy settlement runs** — the BR-004 `settleDuePayments` service belonged to the cut feature 005. | Medium: a workspace seeded several days earlier shows a pending row whose `settleAt` is in the past | The copy is "Expected <date>", which stays truthful; the demo reset (008 / FR-037) re-seeds. **Accepted — must appear as a README limitation** |
| ~~ASM-002-03~~ | *(withdrawn with FR-012b, L-4)* The 90-day series would have been derived backwards from today's total cash. | — | No series ships; nothing left to assume |
| **ASM-002-04** | The "↑ 5.1 % vs prev" deltas drawn on the in/out tiles in `docs/ux/ui-brief.md` §8 are **not built**: they are not in any FR and cost a second 30-day window. | Low (wireframe fidelity only) | Recorded in the `docs/ux/ui-brief.md` §8 amendment and as cut ladder L-1 in `plan.md` §8. **Accepted — must appear as a README limitation** |
| **ASM-002-05** | Account cards keep the repository order (`type asc, name asc`) rather than sorting by balance. | Low | Matches the wireframe's grouping intent |
| **ASM-002-06** | Home stays a **Server Component tree**: no client state beyond the existing theme toggle and the segment `error.tsx` boundary. With L-4 there is no visual that could have needed a client chart library at all. | Low | Keeps LCP cheap for NFR-001 later and leaves the client bundle unchanged from 001 |

## 10. Open questions — **all resolved at 🚦 G-SpecPlan, 2026-11-10**

| ID | Question | Resolution (Technical Director, 2026-11-10) | Applied where |
|---|---|---|---|
| **OQ-002-01** | FR-011 requires "a path to cancel each pending payment", but 005 is CUT. | **Option A.** Read-only treatment with one honest sentence and **no dead control**. There is no cancellation path in this delivery. | AC-002-22 (finalised, the Option B branch deleted); dated note on **FR-011** in `docs/requirements/functional.md` |
| **OQ-002-02** | Which sparkline renderer? | **Moot.** L-4 drops FR-012b, so no renderer is needed and **`recharts` is not installed** — verified absent from `package.json`, although pinned at `3.10.1` in ADR-0002. **No dependency is added by this feature.** | Note in `docs/adr/0002-stack-and-versions.md`; `plan.md` §9 |
| **OQ-002-03** | A primary "Move money" CTA on Home? | **Option A. No CTA.** `/move-money` is a placeholder because 005 is cut; a primary CTA that leads nowhere is worse than none. The sidebar's three items are unchanged. | §2 Excludes; AC-002-22; `docs/ux/ui-brief.md` §8 amendment |
| **OQ-002-04** | The approved UI-02 wireframe contains a cash-flow chart and a spending-by-category panel (FR-021/FR-023, feature 004, CUT). | **Option A.** Home ships without them. The amendment to `docs/ux/ui-brief.md` §8 is **explicitly authorised**: dated, naming what was removed and why, with the original approved wireframe kept visible as **superseded** rather than overwritten. | `docs/ux/ui-brief.md` §8 "Amendment 1" |
| **OQ-002-05** | Timebox: raw estimate 3 h 45 min against a 2 h box. | **Apply the pre-authorised cut ladder now: L-2 and L-4.** 002's box in `docs/roadmap.md` is amended to **2 h 00 with L-2 and L-4 already applied**, so nobody later reads the box as covering full scope. Clock rule corrected: **008 `ship` starts at 15:30 ET**, not 16:15, and **003 absorbs the cut**. | `docs/roadmap.md`; `plan.md` §8; `tasks.md` §"Estimate reckoning" |

**No open question remains for this feature.** Any new one must be raised as an `OQ` before the
affected task starts, never resolved by an agent on its own.

## 11. Traceability

| FR | ACs |
|---|---|
| FR-007 | AC-002-01, AC-002-02 |
| FR-008 | AC-002-06, AC-002-07, AC-002-08, AC-002-09, AC-002-10 |
| FR-009 | AC-002-18, AC-002-19, AC-002-20 |
| FR-010 | AC-002-11, AC-002-12, AC-002-13, AC-002-14, AC-002-15, AC-002-16, AC-002-17 |
| FR-011 (degraded, read-only) | AC-002-21, AC-002-22 |
| FR-012 | AC-002-23, AC-002-24, AC-002-25 |
| ~~FR-012b~~ | **Deferred — no AC.** AC-002-03, AC-002-04 and AC-002-05 withdrawn (L-4) |
| FR-039 / NFR-010 | AC-002-26, AC-002-27, AC-002-28 |
| NFR-004 | AC-002-31 |
| NFR-005 | AC-002-18, AC-002-29 |
| NFR-011 | AC-002-01, AC-002-30 |
