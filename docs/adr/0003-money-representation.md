# ADR-0003 — Money representation: signed integer cents

- **Status:** **Accepted** — approved as written by the human (Technical Director) at 🚦 G-Foundational on 2026-11-09, with no changes requested.
- **Date:** 2026-11-09
- **Relates to:** BR-001, BR-002, BR-008, BR-011, `.harness/skills/money-and-time/SKILL.md`

## Context

Every figure the evaluator sees is money, and the `money-and-time` skill requires one project-wide
decision on both **storage type** and **sign convention**, explicitly forbidding mixing conventions.
Forces:

- **NFR-006 / BR-002:** the balance invariant must always hold, which rules out any representation with rounding error.
- **NFR-011:** totals appearing in several views must come from one calculation, so the representation must be identical across domain, database, API and UI.
- **NFR-007:** no `any` in `src/server/domain`, >= 80 % coverage there — the representation must be trivially unit-testable.
- **ASM-017:** the largest seeded figures are per-account balances in the hundreds of thousands of USD, and a per-operation cap of USD 250,000 (BR-007).
- The ledger needs double-entry-like legs for internal transfers (BR-003), which must sum to zero across accounts.

## Options considered

### Storage type

| Option | Pros | Cons | Fit with NFRs |
|---|---|---|---|
| **`Int` cents (JS `number`, safe integer)** | Exact; trivial arithmetic; native Prisma `Int`; sums are plain integer addition; smallest cognitive load | Range limited to about ±USD 21.4 M per column value | ✅ **Chosen.** Ample for this domain (ASM-017); exactness satisfies NFR-006 |
| `BigInt` cents | Effectively unlimited range | `BigInt` serialisation friction across the Prisma / RSC / JSON boundary; every arithmetic site needs conversion; more code for no benefit at this scale | ⚠️ Reserve for a real product with 9-figure balances |
| `Decimal` / `Numeric` | Exact and wide | Prisma returns a Decimal object; arithmetic needs a library in the domain; pushes a dependency into the layer that must stay pure | ❌ Overkill here |
| `Float` / `Double` | Simple-looking | **Inexact.** `0.1 + 0.2 !== 0.3`; breaks the BR-002 invariant | ❌ Forbidden by BR-001 |

### Sign convention

| Option | Pros | Cons | Fit with NFRs |
|---|---|---|---|
| **Signed `amountCents` (inflow > 0, outflow < 0), `direction` derived** | One source of truth; a balance is a plain `SUM(amountCents)`; transfer legs sum to zero, which makes the BR-003 atomicity test obvious; impossible to have an amount and a direction disagree | Spending-by-category needs `ABS()`; the UI must always add an explicit sign | ✅ **Chosen** |
| Positive amount + persisted `direction` column | Reads naturally in the UI; no `ABS()` in category queries | **Two** sources of truth that can drift (a positive amount with direction `out` is representable and wrong); every aggregate needs a `CASE WHEN`; the invariant test gets harder | ⚠️ Rejected |
| Debit/credit pair rows for everything | Textbook double entry | A full accounting model is far beyond this scope and would cost hours | ❌ Rejected |

## Decision

1. **Storage:** every monetary value is an **integer number of USD cents** in a Prisma `Int` column and a TypeScript `number` constrained to safe integers. Floating-point arithmetic on money is forbidden anywhere in the system (BR-001).
2. **Sign:** `amountCents` is **signed** — inflow `> 0`, outflow `< 0`, never `0`. `direction` is a **derived** value (`amountCents > 0 ? 'in' : 'out'`) and is **never persisted** as an independent column.
3. **Single entry points:** exactly one parser and one formatter exist.
   - `parseMoneyToCents(input: string): number` — strips thousands separators, validates `^\d{1,9}(\.\d{1,2})?$`, rejects empty, zero, negative, >2 decimals, scientific notation and values above BR-007. Lives in `src/server/domain/money.ts`.
   - `formatCents(cents: number, opts?): string` — built on `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })`. Lives in `src/lib/` and is the **only** place money becomes a string. Compact form (`$1.2M`) is a separate, explicitly named helper used only on chart axes.
4. **Where arithmetic may happen:** `src/server/domain` only. `src/components/**` performs **no** money arithmetic (NFR-011); components receive already-computed cents and format them.
5. **Rounding:** never on an intermediate amount. Percentages and averages round once, at the end, with the rounding mode documented at the call site (BR-008 uses `Math.round` for `avgBurn` and one-decimal rounding for runway months).
6. **Transport:** cents cross the server/client boundary as plain `number`. No currency objects, no strings, no `Decimal`.
7. **Presentation rule:** a money figure is always rendered with `tabular-nums`, right-aligned in tables, and an explicit `+`/`−` sign or icon — colour is never the only signal (NFR-003, `ui-system` rule 3).

Rationale in one sentence (SP-7): signed integer cents makes a balance literally `SUM(amountCents)`
and a transfer literally two rows summing to zero, which is what lets the BR-002 invariant be
asserted after every test — the discarded alternative, a positive amount plus a persisted
`direction`, creates a second source of truth that can silently disagree with the first.

## Consequences

**Positive**
- `currentBalance` is one `SUM`; the invariant test is a one-line recomputation (BR-002).
- Internal transfer legs provably sum to zero, which makes BR-003 atomicity and BR-011 neutrality easy to test.
- No rounding error can exist, so NFR-006 is structurally satisfied rather than tested into existence.
- One parser and one formatter give a single place to enforce BR-001 and BR-007, and a single place for the reviewer to check.

**Negative**
- Spending-by-category and money-out aggregates need `ABS()` / sign filtering, which must be written carefully once in the repository layer.
- The UI must add signs deliberately; a bare `formatCents` on an outflow shows `-$X`, which is correct but requires the `signDisplay` option to be used consciously on KPI tiles.
- `Int` caps a single column value at about ±USD 21.4 M (ASM-017).

**Risks**
| Risk | Mitigation |
|---|---|
| A developer (or an AI pass) introducing `parseFloat` / `toFixed()` in money logic | Verification command from the skill: `git grep -nE "parseFloat|toFixed\(" src/server` must return nothing in money logic; run by Reviewer C. ESLint `no-restricted-syntax` where practical |
| Aggregate totals exceeding the safe-integer range | Not reachable at this scale (total cash is ~USD 1.3 M = 130 M cents, against `Number.MAX_SAFE_INTEGER` ≈ 9.0e15). Asserted by a unit test on the seed's largest totals (ASM-017) |
| Mixed conventions creeping in via a new feature | The glossary marks `direction` as derived and lists "sign" among forbidden synonyms; any persisted direction column is a review blocker |

**What would make us reconsider**
- Multi-currency support (then: amount + currency code, and a money value object).
- Balances plausibly exceeding USD 21 M (then: `BigInt`, converted explicitly in the repository layer, as the skill allows).
