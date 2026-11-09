---
name: testing-conventions
description: Use it when writing, organizing or running tests (Vitest unit and integration, React Testing Library, Playwright e2e with axe) and when mapping acceptance criteria to tests for traceability.
---
# Testing conventions

## When it applies
Everything in `tests/**`, every task in `tasks.md` and every validation.

## Deterministic rules
1. **Location:**
   - `tests/unit/**`: pure domain, no DB or network;
   - `tests/integration/**`: services + real Postgres (Docker locally, *service container* in CI);
   - `tests/e2e/**`: Playwright.
2. **Traceability:**
   - if a test covers an AC, its title starts with the ID: `it('AC-005-03: rejects transfer above available balance', …)`;
   - an AC can have several tests;
   - `git grep "AC-005-03" tests` must find it.
3. **Determinism:**
   - no uncontrolled `new Date()` or `Math.random()` in tests; inject `now` or use `vi.setSystemTime`;
   - the faker seed is fixed;
   - nothing depends on execution order.
4. **Integration:**
   - each test is isolated with a `TRUNCATE` between tests or a schema per *worker*;
   - never point at the production Neon DB: use a separate test `DATABASE_URL` (Art. 8).
5. **Money:** each BR has its examples table turned into `it.each`. Mandatory cases:
   - atomicity: a mid-way failure leaves no half transfers;
   - idempotency: the same key twice → a single effect;
   - concurrency: 2 simultaneous transfers that together exceed the balance → one fails;
   - anti-IDOR: an account from another `businessId` → 404/403.
6. **UI (RTL):**
   - query by role and accessible name (`getByRole`), not by classes; test-ids only as a last resort;
   - test behavior, not implementation.
7. **E2E:**
   - few, and only on critical flows (KICKOFF §3.4);
   - use the demo login;
   - wait for visible state, never `waitForTimeout`;
   - include `AxeBuilder` on key pages and a mobile *project* (375 px);
   - always run with `--trace off`, except when debugging.
8. **Coverage:** `src/server/domain` ≥ 80 % lines (threshold in the Vitest config; CI fails if it drops).
9. **Naming:** `describe('<unit or use case>')` + `it('<expected behavior in present tense>')`.

## Example
```ts
describe('transferBetweenAccounts', () => {
  it('AC-005-02: moves funds atomically and updates both balances', async () => { /* … */ })
  it('AC-005-06: returns the original result when the idempotency key is reused', async () => { /* … */ })
})
```

## Anti-examples
- Huge component snapshots.
- Tests calling external services.
- `sleep(2000)`.
- Integration tests against the development DB with mutable seed data.

## Verification
- `pnpm test && pnpm test:int && pnpm test:e2e` green locally and in CI.
- A script or command that lists the spec's ACs without a test:
  - `grep -o "AC-NNN-[0-9]*" spec.md | sort -u`, compared with `git grep -o` in `tests/`;
  - the difference must be empty.
