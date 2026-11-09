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
> - Status: ⬜ not started · 🟡 spec written, no test yet · 🟠 test written and failing · ✅ passing.

## FR coverage

| FR | BR | Spec | AC | Test(s) | Status |
|---|---|---|---|---|---|
| FR-001 | — | 001 | AC-001-xx | `tests/e2e/demo-login.spec.ts` | ⬜ |
| FR-002 | BR-009 | 001 | AC-001-xx | `tests/integration/auth-scope.test.ts` | ⬜ |
| FR-003 | — | 001 | AC-001-xx | `tests/e2e/demo-login.spec.ts` | ⬜ |
| FR-003b | BR-006 | 001 | AC-001-xx | `tests/integration/auth-scope.test.ts` | ⬜ |
| FR-004 | — | 001 | AC-001-xx | `tests/e2e/shell.spec.ts` | ⬜ |
| FR-005 | — | 001 | AC-001-xx | `tests/e2e/shell.spec.ts` | ⬜ |
| FR-006 | — | 001 | AC-001-xx | `tests/e2e/responsive.spec.ts` | ⬜ |
| FR-007 | BR-001, BR-002 | 002 | AC-002-xx | `tests/unit/domain/balances.test.ts` · `tests/e2e/home.spec.ts` | ⬜ |
| FR-008 | BR-008, BR-009, BR-011 | 002 | AC-002-xx | `tests/unit/domain/metrics.test.ts` | ⬜ |
| FR-009 | BR-001, BR-002 | 002 | AC-002-xx | `tests/unit/domain/balances.test.ts` | ⬜ |
| FR-010 | BR-008 | 002 | AC-002-xx | `tests/unit/domain/metrics.test.ts` | ⬜ |
| FR-011 | BR-004, BR-005 | 002 | AC-002-xx | `tests/e2e/home.spec.ts` | ⬜ |
| FR-012 | BR-001 | 002 | AC-002-xx | `tests/e2e/home.spec.ts` | ⬜ |
| FR-012b | BR-002, BR-009 | 002 | AC-002-xx | `tests/unit/domain/balances.test.ts` | ⬜ |
| FR-013 | BR-001, BR-009 | 003 | AC-003-xx | `tests/unit/domain/filters.test.ts` · `tests/e2e/transactions.spec.ts` | ⬜ |
| FR-014 | — | 003 | AC-003-xx | `tests/integration/transactions-query.test.ts` | ⬜ |
| FR-015 | BR-009, BR-011 | 003 | AC-003-xx | `tests/integration/transactions-query.test.ts` | ⬜ |
| FR-016 | — | 003 | AC-003-xx | `tests/integration/transactions-query.test.ts` | ⬜ |
| FR-017 | BR-001, BR-004 | 003 | AC-003-xx | `tests/e2e/transactions.spec.ts` | ⬜ |
| FR-018 | BR-011 | 003 | AC-003-xx | `tests/integration/transaction-mutations.test.ts` | ⬜ |
| FR-019 | — | 003 | AC-003-xx | `tests/integration/transaction-mutations.test.ts` | ⬜ |
| FR-020 | BR-001, BR-009 | 003 | AC-003-xx | `tests/unit/domain/csv.test.ts` · `tests/integration/csv-export.test.ts` | ⬜ |
| FR-020b | — | 003 | AC-003-xx | `tests/e2e/transactions.spec.ts` | ⬜ |
| FR-021 | BR-008, BR-009, BR-011 | 004 | AC-004-xx | `tests/unit/domain/metrics.test.ts` | ⬜ |
| FR-022 | BR-002, BR-009 | 004 | AC-004-xx | `tests/unit/domain/balances.test.ts` | ⬜ |
| FR-023 | BR-011 | 004 | AC-004-xx | `tests/unit/domain/metrics.test.ts` | ⬜ |
| FR-024 | BR-009 | 004 | AC-004-xx | `tests/e2e/insights.spec.ts` | ⬜ |
| FR-025 | BR-009, BR-011 | 004 | AC-004-xx | `tests/e2e/insights.spec.ts` | ⬜ |
| FR-026 | BR-001, BR-002, BR-003, BR-011 | 005 | AC-005-xx | `tests/unit/domain/transfer-rules.test.ts` · `tests/integration/transfer.test.ts` | ⬜ |
| FR-027 | BR-001, BR-004, BR-007 | 005 | AC-005-xx | `tests/integration/payment.test.ts` | ⬜ |
| FR-028 | — | 005 | AC-005-xx | `tests/integration/counterparty.test.ts` | ⬜ |
| FR-029 | BR-003, BR-004 | 005 | AC-005-xx | `tests/e2e/move-money.spec.ts` | ⬜ |
| FR-030 | BR-006 | 005 | AC-005-xx | `tests/integration/idempotency.test.ts` | ⬜ |
| FR-030b | BR-001, BR-003, BR-007 | 005 | AC-005-xx | `tests/unit/domain/transfer-rules.test.ts` | ⬜ |
| FR-030c | BR-002, BR-003 | 005 | AC-005-xx | `tests/integration/concurrency.test.ts` | ⬜ |
| FR-031 | BR-002, BR-004 | 005 | AC-005-xx | `tests/integration/settlement.test.ts` | ⬜ |
| FR-032 | BR-005 | 005 | AC-005-xx | `tests/integration/cancel-payment.test.ts` | ⬜ |
| FR-033 | BR-010 | 006 | AC-006-xx | `tests/e2e/cards.spec.ts` | ⬜ |
| FR-034 | BR-010 | 006 | AC-006-xx | `tests/integration/cards.test.ts` | ⬜ |
| FR-035 | BR-001, BR-009, BR-010 | 006 | AC-006-xx | `tests/unit/domain/cards.test.ts` | ⬜ |
| FR-036 | BR-001, BR-004, BR-008, BR-009 | 001 | AC-001-xx | `tests/integration/seed.test.ts` | ⬜ |
| FR-037 | — | 008 | AC-008-xx | `tests/integration/reset-demo.test.ts` | ⬜ |
| FR-038 | — | 000 | AC-000-xx | `tests/e2e/health.spec.ts` | ⬜ |
| FR-039 | — | 001, 007 | AC-001-xx, AC-007-xx | `tests/e2e/error-states.spec.ts` | ⬜ |
| FR-040 | — | 007 (Could) | AC-007-xx | `tests/e2e/command-palette.spec.ts` | ⬜ |
| FR-041 | — | 002 (Could) | AC-002-xx | `tests/e2e/account-detail.spec.ts` | ⬜ |
| FR-042 | — | 007 (Could) | AC-007-xx | `tests/integration/api-v1.test.ts` | ⬜ |
| FR-043 | — | 008 | AC-008-xx | Manual checklist (KICKOFF §9) + `tests/e2e/smoke-production.spec.ts` | ⬜ |

## BR coverage

Every business rule needs at least one unit or integration test per documented example, including
the edge case (`docs/requirements/business-rules.md`).

| BR | Spec(s) | Primary test file | Status |
|---|---|---|---|
| BR-001 Integer cents | 001, 003, 005 | `tests/unit/domain/money.test.ts` | ⬜ |
| BR-002 Balance definitions + invariant | 002, 005 | `tests/unit/domain/balances.test.ts` · `tests/integration/invariant.test.ts` | ⬜ |
| BR-003 Internal transfer validity and atomicity | 005 | `tests/unit/domain/transfer-rules.test.ts` · `tests/integration/transfer.test.ts` | ⬜ |
| BR-004 Simulated settlement | 005 | `tests/integration/settlement.test.ts` | ⬜ |
| BR-005 Cancel pending | 005 | `tests/integration/cancel-payment.test.ts` | ⬜ |
| BR-006 Idempotency | 005 | `tests/integration/idempotency.test.ts` | ⬜ |
| BR-007 Limits | 005 | `tests/unit/domain/transfer-rules.test.ts` · `tests/integration/daily-limit.test.ts` | ⬜ |
| BR-008 Burn and runway | 002, 004 | `tests/unit/domain/metrics.test.ts` | ⬜ |
| BR-009 Time zone and ranges (incl. both DST changes) | 001–005 | `tests/unit/domain/time.test.ts` | ⬜ |
| BR-010 Card status and limit | 006 | `tests/unit/domain/cards.test.ts` | ⬜ |
| BR-011 Internal transfers excluded from metrics | 002, 004 | `tests/unit/domain/metrics.test.ts` | ⬜ |

## NFR coverage

| NFR | Verified in | Evidence artifact | Status |
|---|---|---|---|
| NFR-001 Performance (Lighthouse, warmed deployment) | 007 | Lighthouse report in `specs/007-*/validation-*.md` | ⬜ |
| NFR-002 Query p95 < 300 ms | 003 | Timing assertion in `tests/integration/transactions-query.test.ts` + index verification | ⬜ |
| NFR-003 Accessibility | 003, 005, 007 | `@axe-core/playwright` output | ⬜ |
| NFR-004 Responsive viewports | 003, 007 | `tests/e2e/responsive.spec.ts` + screenshots | ⬜ |
| NFR-005 Security | 001, 003, 005 | `tests/integration/auth-scope.test.ts`, `csv-export.test.ts`, Reviewer C checklist | ⬜ |
| NFR-006 Reliability (atomic, idempotent, invariant) | 005 | `tests/integration/{transfer,idempotency,concurrency,invariant}.test.ts` | ⬜ |
| NFR-007 Maintainability (strict, lint, coverage >= 80 %) | 000 onward | CI job output | ⬜ |
| NFR-008 Browsers (chromium + webkit) | 007 | Playwright project matrix in CI | ⬜ |
| NFR-009 Observability (money log, health, error pages) | 000, 005, 007 | Log sample + `tests/e2e/health.spec.ts` | ⬜ |
| NFR-010 Usability (empty/loading/error, confirmations) | 002, 003, 005, 007 | Reviewer B walkthrough screenshots | ⬜ |
| NFR-011 Consistency (one source per figure) | 002, 004 | `tests/unit/domain/metrics.test.ts` agreement assertions + Reviewer A trace | ⬜ |

## CR coverage (the assignment email)

| CR | FRs | Spec(s) | Status |
|---|---|---|---|
| CR-1 Modern UI/UX | FR-004, FR-005, FR-006, FR-039, FR-040 | 001, 007 | ⬜ |
| CR-2 Account Overview | FR-007…FR-012b, FR-041 | 002 | ⬜ |
| CR-3 Transaction Management | FR-013…FR-020b, FR-036 | 001, 003 | ⬜ |
| CR-4 Data Visualization | FR-021…FR-025 | 004 | ⬜ |
| CR-5 Functional Features | FR-026…FR-035, FR-037 | 005, 006 | ⬜ |
| CR-6 Technical Implementation | FR-001…FR-003b, FR-038, FR-042 + NFR-005…NFR-011 | 000 + all | ⬜ |
| CR-7 Submission | FR-043 | 008 | ⬜ |

## Orphan check (run when closing each feature)

| Check | Rule |
|---|---|
| Orphan FR | No `FR` may lack a spec. **Currently: none.** |
| Orphan AC | No `AC` may lack a test. Checked per feature at 🚦 G-Merge. |
| Orphan test | A test whose title carries no `AC` id is allowed only for unit tests of internal helpers. |
| Orphan BR | No `BR` may lack a test per documented example, including the edge case. |
| Orphan UI | No `UI-xx` screen may lack an `FR`, and no `FR` with a screen may reference a `UI-xx` that does not exist in `docs/ux/ui-brief.md`. |
