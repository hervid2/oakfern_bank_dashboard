# Traceability matrix

> Art. 4: what has no ID does not exist. Every `FR` must reach at least one `AC`, and every `AC` at
> least one test (KICKOFF §8). This file is the skeleton produced in Phase G3: the **FR → spec**
> mapping is final, while `AC` and `Test(s)` are filled in per feature — by the Planner when the
> spec is written, and by the Implementer / Reviewer when the tests exist.
>
> **Update rule:** the matrix is updated when closing each feature, and a complete matrix is part of
> the Definition of Done for 🚦 G-Merge (`docs/constitution.md` Title V).
>
> **Conventions**
> - `AC` ids are `AC-NNN-xx` where `NNN` is the spec number.
> - `Test(s)` is `tests/<path>::<test name>`, and the test title must contain the `AC` id, e.g.
>   `it('AC-005-03: rejects transfer above available balance', …)`.
> - Status: ⬜ not started · 🟡 spec written, no test yet (or partial) · 🟠 test written and failing ·
>   ✅ passing · ✂️ **cut, not delivered** · ❌ in scope but never verified.
>
> **State at submission (2026-11-10, feature 008).** Features 000, 001 and 002 are merged; features
> 003, 004, 005 and 006 were **cut** and 007 was dissolved into 008 (`docs/roadmap.md`). Rows for
> cut features are marked ✂️ rather than left ⬜, so an empty cell never reads as "pending work in
> flight". Corrected here in 008: `tests/unit/amount.test.ts` was cited on the FR-007 and FR-008
> rows and **never existed** — the coverage is in `tests/unit/format.test.ts` (validation finding
> F-05, `specs/002-account-overview/validation-combined.md`).

## FR coverage

| FR | BR | Spec | AC | Test(s) | Status |
|---|---|---|---|---|---|
| FR-001 | — | 001 | AC-001-09 | `tests/e2e/shell.spec.ts` · `tests/unit/session.test.ts` | ✅ |
| FR-002 | BR-009 | 001 | AC-001-10 | `tests/integration/scoping.test.ts` · `tests/helpers/db.ts` (two-business fixture) | ✅ |
| FR-003 | — | 001 | AC-001-11 | `tests/e2e/shell.spec.ts` | ✅ |
| FR-003b | BR-006 | 001 | AC-001-12, AC-001-17 | `tests/unit/session.test.ts` · `tests/integration/scoping.test.ts` | ✅ |
| FR-004 | — | 001 | AC-001-13 | `tests/e2e/shell.spec.ts` | ✅ |
| FR-005 | — | 001 | AC-001-14 | `tests/e2e/shell.spec.ts` | ✅ |
| FR-006 | — | 001 | AC-001-15 | `tests/e2e/shell.spec.ts` (375 / 768 / 1280 / 1440 px; no separate `responsive.spec.ts` — 003 would have added one and is CUT) | ✅ |
| FR-007 | BR-001, BR-002 | 002 | AC-002-01, AC-002-02 | `tests/integration/overview.test.ts` · `tests/unit/format.test.ts` | ✅ |
| FR-008 | BR-008, BR-009, BR-011 | 002 | AC-002-06…AC-002-10 | `tests/unit/metrics.test.ts` · `tests/unit/format.test.ts` · `tests/integration/overview.test.ts` | ✅ |
| FR-009 | BR-001, BR-002 | 002 | AC-002-18, AC-002-19, AC-002-20 | `tests/unit/format.test.ts` · `tests/unit/balances.test.ts` (under `AC-001-05` ids — see F-04) · `tests/e2e/home.spec.ts` | 🟡 **Behaviour green, two ids unlinked** (AC-002-19, AC-002-20) |
| FR-010 | BR-008 | 002 | AC-002-11…AC-002-17 | `tests/unit/metrics.test.ts` · `tests/unit/format.test.ts` · `tests/integration/overview.test.ts` | 🟡 **Green; AC-002-16 met at the domain level only** — the service can never produce `monthsUsed < 3` (validation F-02) |
| FR-011 | BR-004, BR-005 | 002 | AC-002-21, AC-002-22 | `tests/integration/overview.test.ts` · `tests/e2e/home.spec.ts` | ✅ **Read-only only** — cancellation out of scope (`functional.md` Amendment C-1; 005 CUT) |
| FR-012 | BR-001 | 002 | AC-002-23, AC-002-24, AC-002-25 | `tests/e2e/home.spec.ts` · `tests/integration/overview.test.ts` (AC-002-23 ordering, AC-002-25 internal legs) | ✅ |
| ~~FR-012b~~ | BR-002, BR-009 | ~~002~~ | **none — AC-002-03/04/05 withdrawn** | **none** | ⏸️ **Deferred, not delivered** (cut ladder L-4, `functional.md` Amendment C-2). No `cash-series.ts`, no `recharts` |
| FR-013 | BR-001, BR-009 | 003 | AC-003-xx | `tests/unit/domain/filters.test.ts` · `tests/e2e/transactions.spec.ts` | ✂️ **CUT — not delivered, no test written** |
| FR-014 | — | 003 | AC-003-xx | `tests/integration/transactions-query.test.ts` | ✂️ **CUT — not delivered, no test written** |
| FR-015 | BR-009, BR-011 | 003 | AC-003-xx | `tests/integration/transactions-query.test.ts` | ✂️ **CUT — not delivered, no test written** |
| FR-016 | — | 003 | AC-003-xx | `tests/integration/transactions-query.test.ts` | ✂️ **CUT — not delivered, no test written** |
| FR-017 | BR-001, BR-004 | 003 | AC-003-xx | `tests/e2e/transactions.spec.ts` | ✂️ **CUT — not delivered, no test written** |
| FR-018 | BR-011 | 003 | AC-003-xx | `tests/integration/transaction-mutations.test.ts` | ✂️ **CUT — not delivered, no test written** |
| FR-019 | — | 003 | AC-003-xx | `tests/integration/transaction-mutations.test.ts` | ✂️ **CUT — not delivered, no test written** |
| FR-020 | BR-001, BR-009 | 003 | AC-003-xx | `tests/unit/domain/csv.test.ts` · `tests/integration/csv-export.test.ts` | ✂️ **CUT — not delivered, no test written** |
| FR-020b | — | 003 | AC-003-xx | `tests/e2e/transactions.spec.ts` | ✂️ **CUT — not delivered, no test written** |
| FR-021 | BR-008, BR-009, BR-011 | 004 | AC-004-xx | `tests/unit/domain/metrics.test.ts` | ✂️ **CUT — not delivered, no test written** |
| FR-022 | BR-002, BR-009 | 004 | AC-004-xx | `tests/unit/domain/balances.test.ts` | ✂️ **CUT — not delivered, no test written** |
| FR-023 | BR-011 | 004 | AC-004-xx | `tests/unit/domain/metrics.test.ts` | ✂️ **CUT — not delivered, no test written** |
| FR-024 | BR-009 | 004 | AC-004-xx | `tests/e2e/insights.spec.ts` | ✂️ **CUT — not delivered, no test written** |
| FR-025 | BR-009, BR-011 | 004 | AC-004-xx | `tests/e2e/insights.spec.ts` | ✂️ **CUT — not delivered, no test written** |
| FR-026 | BR-001, BR-002, BR-003, BR-011 | 005 | AC-005-xx | `tests/unit/domain/transfer-rules.test.ts` · `tests/integration/transfer.test.ts` | ✂️ **CUT — not delivered, no test written** |
| FR-027 | BR-001, BR-004, BR-007 | 005 | AC-005-xx | `tests/integration/payment.test.ts` | ✂️ **CUT — not delivered, no test written** |
| FR-028 | — | 005 | AC-005-xx | `tests/integration/counterparty.test.ts` | ✂️ **CUT — not delivered, no test written** |
| FR-029 | BR-003, BR-004 | 005 | AC-005-xx | `tests/e2e/move-money.spec.ts` | ✂️ **CUT — not delivered, no test written** |
| FR-030 | BR-006 | 005 | AC-005-xx | `tests/integration/idempotency.test.ts` | ✂️ **CUT — not delivered, no test written** |
| FR-030b | BR-001, BR-003, BR-007 | 005 | AC-005-xx | `tests/unit/domain/transfer-rules.test.ts` | ✂️ **CUT — not delivered, no test written** |
| FR-030c | BR-002, BR-003 | 005 | AC-005-xx | `tests/integration/concurrency.test.ts` | ✂️ **CUT — not delivered, no test written** |
| FR-031 | BR-002, BR-004 | 005 | AC-005-xx | `tests/integration/settlement.test.ts` | ✂️ **CUT — not delivered, no test written** |
| FR-032 | BR-005 | 005 | AC-005-xx | `tests/integration/cancel-payment.test.ts` | ✂️ **CUT — not delivered, no test written** |
| FR-033 | BR-010 | 006 | AC-006-xx | `tests/e2e/cards.spec.ts` | ✂️ **CUT — not delivered, no test written** |
| FR-034 | BR-010 | 006 | AC-006-xx | `tests/integration/cards.test.ts` | ✂️ **CUT — not delivered, no test written** |
| FR-035 | BR-001, BR-009, BR-010 | 006 | AC-006-xx | `tests/unit/domain/cards.test.ts` | ✂️ **CUT — not delivered, no test written** |
| FR-036 | BR-001, BR-004, BR-008, BR-009 | 001 | AC-001-02, AC-001-03, AC-001-04, AC-001-05, AC-001-06, AC-001-07 | `tests/integration/seed.test.ts` · `tests/unit/{money,balances,time}.test.ts` | ✅ |
| FR-037 | — | 008 | AC-008-xx | `tests/integration/reset-demo.test.ts` | ✂️ **CUT — not delivered.** No "Reset demo data" control exists; a human re-runs `pnpm db:seed` (TD-006 stands) |
| FR-038 | — | 000 | AC-000-06, AC-000-07, AC-000-12a, AC-000-12b (deferred) | `tests/e2e/health.spec.ts`, `tests/integration/health.test.ts` | 🟡 |
| FR-039 | — | 000 (root shell), 001, 007 | AC-000-08 (root `error.tsx` + `not-found.tsx`), AC-001-16, AC-001-17, AC-001-18, AC-001-24 | `tests/e2e/shell.spec.ts` — now automated: the `(app)` `error.tsx` via the gated `/_dev/shell-boom` probe, the shell 404, the per-route `loading.tsx` skeletons, and the AC-001-24 production gating of `/_dev/boom`. AC-000-08's root boundary stays manually evidenced in `specs/000-walking-skeleton/validation.md` | ✅ |
| FR-040 | — | ~~007~~ (Could) | AC-007-xx | `tests/e2e/command-palette.spec.ts` | ✂️ **CUT — Could item, never started** |
| FR-041 | — | ~~002~~ (Could) | AC-002-xx | `tests/e2e/account-detail.spec.ts` | ✂️ **CUT — Could item, never started** |
| FR-042 | — | ~~007~~ (Could) | AC-007-xx | `tests/integration/api-v1.test.ts` | ✂️ **CUT — Could item, never started** |
| FR-043 | — | 008 | AC-008-xx | Manual checklist (KICKOFF §9); `tests/e2e/smoke-production.spec.ts` **never written** | 🟡 **Partly met** — `README.md` and `docs/submission-email.md` written in 008; production verified manually on <https://oakfernbankdashboard.vercel.app> (demo sign-in → `/home`, zero overflow at 375 px, console clean, `/api/health` 200 `database:"ok"`, recorded as AC-001-23 in `MEMORY.md`). No automated production smoke test |

## AC coverage — feature 001 (domain, data and shell)

Filled in by the Implementer at 001 T-14 from the executed suites. Every test title carries its
`AC` id, so `grep -rn 'AC-001-' tests/` reproduces this table.

| AC | Test(s) | Status |
|---|---|---|
| AC-001-01 | `prisma/migrations/20261110034318_domain_model/migration.sql` applied by `pnpm exec prisma migrate deploy`; `pnpm exec prisma migrate status` → all applied, no drift (evidence in `tasks.md` T-03) | ✅ |
| AC-001-02 | `tests/unit/money.test.ts` · `tests/integration/seed.test.ts` · `grep -Ei '(double precision\|numeric\|real\|decimal)' prisma/migrations/*/migration.sql` → empty | ✅ |
| AC-001-03 | `tests/integration/seed.test.ts` (same-day `content-hash` equality) | ✅ |
| AC-001-04 | `tests/integration/seed.test.ts` (row counts) | ✅ |
| AC-001-05 | `tests/unit/balances.test.ts` · `tests/unit/money.test.ts` · `tests/integration/seed.test.ts` | ✅ |
| AC-001-06 | `tests/integration/seed.test.ts` (BR-011 internal legs) | ✅ |
| AC-001-07 | `tests/unit/time.test.ts` (all four BR-009 examples) · `tests/integration/seed.test.ts` | ✅ |
| AC-001-08 | `pnpm db:seed` self-check 5 (runway), exit 0 — the seed fails the run rather than print a bad figure | ✅ |
| AC-001-09 | `tests/e2e/shell.spec.ts` · `tests/e2e/health.spec.ts` · `tests/unit/session.test.ts` | ✅ |
| AC-001-10 | `tests/integration/scoping.test.ts` against the two-business fixture in `tests/helpers/db.ts` | ✅ |
| AC-001-11 | `tests/e2e/shell.spec.ts` | ✅ |
| AC-001-12 | `tests/unit/session.test.ts` (expired `exp`) | ✅ |
| AC-001-13 | `tests/e2e/shell.spec.ts` | ✅ |
| AC-001-14 | `tests/e2e/shell.spec.ts` (no-flash dark boot) | ✅ |
| AC-001-15 | `tests/e2e/shell.spec.ts` (375 / 768 / 1280 / 1440 px) | ✅ |
| AC-001-16 | `tests/e2e/shell.spec.ts` via the gated `/_dev/shell-boom` probe | ✅ |
| AC-001-17 | `tests/e2e/shell.spec.ts` · `tests/integration/scoping.test.ts` | ✅ |
| AC-001-18 | `tests/e2e/shell.spec.ts` (per-route `loading.tsx` skeletons) | ✅ |
| AC-001-19 | `tests/unit/session.test.ts` (missing and <32-character secret) | ✅ |
| AC-001-20 | Documentation AC, no automated test: `AGENTS.md`'s command table, `.env.example` and this file, each row executed in 001 T-02 and re-confirmed at T-14 | ✅ |
| AC-001-21 | 🛑 Human-gated (T-15, writes to Neon) — **not verified by an agent** | ⬜ |
| AC-001-22 | `tests/unit/client.test.ts` plus the measured `pg_stat_activity` counts in `tasks.md` T-01 | ✅ |
| AC-001-23 | 🛑 Human-gated (T-16, Vercel Preview on 001's PR head) — **not verified by an agent** | ⬜ |
| AC-001-24 | `tests/e2e/shell.spec.ts` (`/_dev/boom` → 404 in a production build without `OAKFERN_ENABLE_DEV_ROUTES=1`) | ✅ |

## AC coverage — feature 002 (account overview)

Filled in at 008 from `specs/002-account-overview/validation-combined.md` §5 (the reviewer's own
executed run) plus the three post-validation fixes `a5da5ac` / `e690de1` / `eafc4c3`.
**28 active ACs; AC-002-03, -04 and -05 were withdrawn with FR-012b (cut ladder L-4).**
**Tally: 26 of 28 met, 2 partial (AC-002-16 and AC-002-26), and 3 of the 26 — AC-002-19, AC-002-20
and AC-002-30 — proved without a test carrying their id (validation finding F-04).** "Met, id not
linked" is ✅ with that caveat spelled out in the row, not 🟡: the behaviour is proved, only the
traceability link is missing, and the two cases are not the same thing.
Reproduce the test side with `grep -rn 'AC-002-' tests/` — which under-reports by those 3 rows.

| AC | Test(s) | Status |
|---|---|---|
| AC-002-01 | `tests/integration/overview.test.ts` | ✅ |
| AC-002-02 | `tests/unit/format.test.ts` · `tests/e2e/home.spec.ts` | ✅ |
| ~~AC-002-03~~ · ~~AC-002-04~~ · ~~AC-002-05~~ | — | ✂️ **Withdrawn** with FR-012b (L-4) |
| AC-002-06 | `tests/unit/metrics.test.ts` | ✅ |
| AC-002-07 | `tests/unit/metrics.test.ts` (`isMetricRow` checks `status`) | ✅ |
| AC-002-08 | `tests/unit/metrics.test.ts` · `tests/integration/overview.test.ts` | ✅ |
| AC-002-09 | `tests/unit/metrics.test.ts` (ET attribution across the UTC boundary) | ✅ |
| AC-002-10 | `tests/unit/format.test.ts` · `tests/e2e/home.spec.ts` | ✅ |
| AC-002-11 | `tests/unit/metrics.test.ts` | ✅ |
| AC-002-12 | `tests/unit/metrics.test.ts` (`Infinity`/`NaN`/negative months not representable) | ✅ |
| AC-002-13 | `tests/unit/metrics.test.ts` | ✅ |
| AC-002-14 | `tests/unit/metrics.test.ts` (an empty month counts as a `0` term) | ✅ |
| AC-002-15 | `tests/unit/metrics.test.ts` (BR-011 exclusion from burn) | ✅ |
| AC-002-16 | `tests/unit/metrics.test.ts` · `tests/unit/format.test.ts` | 🟡 **Domain level only** — the service always produces `monthsUsed === 3`, so the honest-label branch is unreachable in production (**F-02**) |
| AC-002-17 | `tests/integration/overview.test.ts`; live Home reads 18.0 months | ✅ |
| AC-002-18 | `tests/unit/format.test.ts` · `tests/e2e/home.spec.ts` (no full account number in the DOM) | ✅ |
| AC-002-19 | `tests/unit/balances.test.ts` — **under `AC-001-05` ids** | ✅ **Met — no test carries the `AC-002-19` id** (**F-04**) |
| AC-002-20 | `tests/unit/balances.test.ts` — **under `AC-001-05` ids** | ✅ **Met — no test carries the `AC-002-20` id** (**F-04**) |
| AC-002-21 | `tests/integration/overview.test.ts` · `tests/e2e/home.spec.ts` | ✅ |
| AC-002-22 | `tests/e2e/home.spec.ts` (no cancel/stop/void control, no `/move-money` link inside `main`) | ✅ — the topbar CTA flagged by **F-06** was removed in `e690de1` |
| AC-002-23 | `tests/integration/overview.test.ts` (ordering, added with the fix and proved red first) · `tests/e2e/home.spec.ts` | ✅ **after `a5da5ac`** — **failed** at validation: `orderBy postedAt desc` + Postgres NULLS FIRST filled the window with non-posted rows (**F-01**, MAJOR) |
| AC-002-24 | `tests/e2e/home.spec.ts` ("View all" → `/transactions`) | ✅ |
| AC-002-25 | `tests/integration/overview.test.ts` (deterministic) · `tests/e2e/home.spec.ts` (label) | ✅ |
| AC-002-26 | `tests/e2e/home.spec.ts` | 🟡 **Partial** — the skeleton is asserted at source, not against a live Suspense fallback; no layout-shift metric measured |
| AC-002-27 | `tests/integration/overview.test.ts` (an empty business returns zeros and does not throw) | ✅ |
| AC-002-28 | `tests/e2e/home.spec.ts` — `ErrorState` has **no prop able to receive** a message, digest or stack | ✅ |
| AC-002-29 | `tests/integration/overview.test.ts` · `tests/integration/scoping.test.ts` (anti-IDOR) | ✅ |
| AC-002-30 | **`git grep -nE "amountCents" -- src/components`** → 6 hits, no operator and no comparison | ✅ **Met by a `git grep` gate, not by a test carrying its id** (**F-04**) |
| AC-002-31 | `tests/e2e/home.spec.ts` + Playwright MCP against a production build: `scrollWidth − innerWidth = 0` at 1280 and 375 px, 0 console errors/warnings, light and dark | ✅ |

**Tally: 24 ✅ · 4 🟡 · 0 ❌ · 3 withdrawn.**

## BR coverage

Every business rule needs at least one unit or integration test per documented example, including
the edge case (`docs/requirements/business-rules.md`).

| BR | Spec(s) | Primary test file | Status |
|---|---|---|---|
| BR-001 Integer cents | 001, 003, 005 | `tests/unit/money.test.ts` (001 — the file is `tests/unit/`, not `tests/unit/domain/`) | 🟡 001 green |
| BR-002 Balance definitions + invariant | 001, 002, 005 | `tests/unit/balances.test.ts` + `tests/integration/seed.test.ts` (001) · `tests/integration/invariant.test.ts` (005) | 🟡 001 green |
| BR-003 Internal transfer validity and atomicity | 005 | `tests/unit/domain/transfer-rules.test.ts` · `tests/integration/transfer.test.ts` | ⬜ |
| BR-004 Simulated settlement | 005 | `tests/integration/settlement.test.ts` | ⬜ |
| BR-005 Cancel pending | 005 | `tests/integration/cancel-payment.test.ts` | ⬜ |
| BR-006 Idempotency | 005 | `tests/integration/idempotency.test.ts` | ⬜ |
| BR-007 Limits | 005 | `tests/unit/domain/transfer-rules.test.ts` · `tests/integration/daily-limit.test.ts` | ⬜ |
| BR-008 Burn and runway | 002 (004 CUT) | `tests/unit/metrics.test.ts` (flat `tests/unit/`, like 001) + `tests/integration/overview.test.ts` | ✅ 002 green (caveat F-02: `monthsUsed` is always 3 in the running service) |
| BR-009 Time zone and ranges (incl. both DST changes) | 001–005 | `tests/unit/time.test.ts` | 🟡 001 green |
| BR-010 Card status and limit | 006 | `tests/unit/domain/cards.test.ts` | ⬜ |
| BR-011 Internal transfers excluded from metrics | 001 (seed legs), 002 (004 CUT) | `tests/integration/seed.test.ts` (001) · `tests/unit/metrics.test.ts` + `tests/integration/overview.test.ts` (002) | ✅ 001 and 002 green |

## NFR coverage

| NFR | Verified in | Evidence artifact | Status |
|---|---|---|---|
| NFR-001 Performance (Lighthouse, warmed deployment) | ~~007~~ | Lighthouse report | ❌ **Not verified** — 007 dissolved into 008 and no Lighthouse run was executed |
| NFR-002 Query p95 < 300 ms | ~~003~~ | Timing assertion in `tests/integration/transactions-query.test.ts` + index verification | ❌ **Not verified** — 003 CUT |
| NFR-003 Accessibility | ~~003, 005, 007~~ | `@axe-core/playwright` output | ❌ **No axe scan was run** — the entry point was deferred to 003, which is CUT. Partial manual evidence only: exactly one `<h1>` on Home, accessible names on the text-less brand mark, `role="status"` on the skeleton, keyboard-closable mobile sheet |
| NFR-004 Responsive viewports | 001, 002 (003, 007 CUT) | `tests/e2e/shell.spec.ts` (375 / 768 / 1280 / 1440 px) · `tests/e2e/home.spec.ts` (1280 / 375 px, light and dark) · reviewer screenshots in `specs/002-account-overview/evidence/` | ✅ **001 + 002 green** — zero horizontal overflow at every asserted width; no separate `responsive.spec.ts` (003 would have added one) |
| NFR-005 Security | 001, 002 (003, 005 CUT) | `tests/integration/scoping.test.ts` (001 + 002, anti-IDOR, green) · reviewer checklist in `validation-combined.md` §6 | ✅ **001 + 002 green** — 002 adds no Server Action, no mutation and no route, so no new Zod surface |
| NFR-006 Reliability (atomic, idempotent, invariant) | ~~005~~ | `tests/integration/{transfer,idempotency,concurrency,invariant}.test.ts` | ❌ **Not delivered** — 005 CUT; the BR-002 invariant is still asserted by the seed self-checks and `tests/unit/balances.test.ts` |
| NFR-007 Maintainability (strict, lint, coverage >= 80 %) | 000 onward | CI job output · `vitest --coverage --coverage.include='src/server/domain/**'` at the 002 validation: **Stmts 99 % · Branch 97.56 % · Funcs 95.83 % · Lines 100 %** · `git grep` for `any` in `src/server/domain` → no hits | ✅ through 002 |
| NFR-008 Browsers (chromium + webkit) | ~~007~~ | Playwright project matrix in CI | ❌ **chromium only** — the ASM-015 degraded fallback was pre-accepted; webkit was never run |
| NFR-009 Observability (money log, health, error pages) | 000, 001, 002 (005, 007 CUT) | `tests/e2e/health.spec.ts` · `tests/e2e/shell.spec.ts` error/404/loading states (001) · `tests/e2e/home.spec.ts` AC-002-28 (the error boundary cannot leak a message, digest or stack — a property of the component signature) | 🟡 **000–002 green**; no metrics backend, tracing or alerting (TD-007), and the `/api/health` 503 path has no automated test (TD-013) |
| NFR-010 Usability (empty/loading/error, confirmations) | 002, 003, 005, 007 | `tests/e2e/home.spec.ts` (AC-002-26 skeleton, AC-002-27 empty, AC-002-28 error) + reviewer screenshots in `specs/002-account-overview/evidence/` | 🟡 **002 green** (AC-002-26 partial: skeleton asserted at source, not against a live Suspense fallback); 003/005/007 CUT |
| NFR-011 Consistency (one source per figure) | 002 (004 CUT) | `tests/unit/metrics.test.ts` + `tests/integration/overview.test.ts` agreement assertions · the AC-002-30 `git grep` over `src/components` (6 hits, no operator, no comparison) · reviewer trace in `specs/002-account-overview/validation-combined.md` §6 | ✅ (AC-002-30 proved by a grep gate, not by a test carrying its id — F-04) |

## CR coverage (the assignment email)

| CR | FRs | Spec(s) | Status |
|---|---|---|---|
| CR-1 Modern UI/UX | FR-004, FR-005, FR-006, FR-039, ~~FR-040~~ | 001, ~~007~~ | ✅ **Delivered** — shell, theme, responsive layout, every empty/loading/error state; command palette (FR-040) never in scope after the cuts |
| CR-2 Account Overview | FR-007…FR-011, FR-012 (~~FR-012b~~, ~~FR-041~~) | 002 | ✅ **Delivered**, reduced: FR-011 read-only, FR-012b (cash series) and FR-041 (account detail) not delivered |
| CR-3 Transaction Management | FR-013…FR-020b, FR-036 | 001 (data), ~~003~~ | 🟡 **Data only** — the 1,369-row seeded ledger (FR-036) ships; the management screen (003) is **CUT** |
| CR-4 Data Visualization | FR-021…FR-025 | ~~004~~ | ❌ **Not delivered** — 004 CUT 2026-11-09 |
| CR-5 Functional Features | FR-026…FR-035, FR-037 | ~~005~~, ~~006~~ | ❌ **Not delivered** — 005 CUT 2026-11-10, 006 CUT 2026-11-09. No money mutation and no card surface exists |
| CR-6 Technical Implementation | FR-001…FR-003b, FR-038, ~~FR-042~~ + NFR-005…NFR-011 | 000 + all | ✅ **Delivered** for what shipped — ADR-0001 layering lint-enforced, 121 automated tests green, CI on every push, deployed; see the NFR table for the four NFRs that were never verified |
| CR-7 Submission | FR-043 | 008 | 🟡 **This README + `docs/submission-email.md`**; production verified manually, FR-037 (reset demo) **not delivered** and `tests/e2e/smoke-production.spec.ts` was never written |

## Orphan check (run when closing each feature)

| Check | Rule |
|---|---|
| Orphan FR | No `FR` may lack a spec. **Currently: none** — but 26 FRs belong to cut specs and are therefore undelivered, not orphaned. |
| Orphan AC | No `AC` may lack a test. Checked per feature at 🚦 G-Merge. **Known gaps at submission: AC-000-07 (TD-013), AC-002-19, AC-002-20, AC-002-30 (validation F-04).** |
| Orphan test | A test whose title carries no `AC` id is allowed only for unit tests of internal helpers. |
| Orphan BR | No `BR` may lack a test per documented example, including the edge case. |
| Orphan UI | No `UI-xx` screen may lack an `FR`, and no `FR` with a screen may reference a `UI-xx` that does not exist in `docs/ux/ui-brief.md`. |
