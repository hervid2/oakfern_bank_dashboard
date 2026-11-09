---
name: money-and-time
description: Use it whenever code calculates, stores, sums, compares, formats or aggregates money amounts, balances, financial metrics (burn, runway, cash flow) or dates and periods (days, months, ranges, time zones).
---
# Money and time

## When it applies
- Prisma models with amounts
- `src/server/domain/*`
- transaction, transfer and metrics services
- charts, date filters and the seed
- UI formatting

## Deterministic rules
1. **Integer cents.** Every amount is `amountCents: number` (a safe integer) in TypeScript and `Int`/`BigInt` in Prisma.
   - `Int` covers up to ±USD 21.4M. Use `BigInt` if an aggregated balance could exceed that, and convert explicitly in the repository.
   - Storing or summing amounts with decimals is **forbidden**.
2. **Parsing input:** the user types `"1,234.56"`. `parseMoneyToCents()` strips commas, validates with the regex `^\d{1,9}(\.\d{1,2})?$` and returns `123456`. Rejected inputs:
   - empty, negative, `0`;
   - more than 2 decimals, scientific notation;
   - values above BR-007.
3. **Formatting** happens only in the presentation layer, through a single `formatCents(cents, { signDisplay })` helper based on `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })`. Figures use `tabular-nums`.
4. **Sign:** one project-wide convention, decided in an ADR or the glossary. Either:
   - a signed `amountCents` (inflow > 0, outflow < 0), or
   - a positive amount + `direction`.

   Don't mix them.
5. **Balances (BR-002):**
   - `current = Σ posted`;
   - `available = current − Σ |pending outflows|`;
   - computed in `domain`, never in components.
6. **Internal transfers (BR-011)** are excluded from inflows, outflows, burn and spending by category.
7. **Burn and runway (BR-008):**
   - `netBurn(month) = outflows − inflows` (excluding internal transfers);
   - `runway = totalCash / avg(netBurn over the last 3 closed months)`;
   - if the average is ≤ 0, return `{ kind: 'cash-flow-positive' }`, not `Infinity`.
8. **Time (BR-009):**
   - stored in UTC (`DateTime`);
   - day and month boundaries are computed in `America/New_York` through a single module, `src/server/domain/time.ts`;
   - in tests, inject `now` (never `new Date()` inside `domain`).
9. **Ranges** are half-open `[start, end)`. "Last 30 days" = `[startOfDay(now − 29 d), startOfDay(now + 1 d))` in the business time zone.
10. **Rounding:** percentages and averages are computed in integers, or with `Math.round` at the very end, documenting the rounding mode. Never round an intermediate amount.

## Correct examples
```ts
parseMoneyToCents('1,234.56') // 123456
formatCents(-123456)          // "-$1,234.56"
runway({ totalCash: 1_200_000_00, avgBurn: 100_000_00 }) // { kind: 'months', months: 12 }
```

## Anti-examples
```ts
const total = txs.reduce((s, t) => s + t.amount, 0.0) // ❌ floats
Number('12.345') * 100                                 // ❌ 1234.4999…
new Date().getMonth()                                  // ❌ server time zone, not the business one
```

## Verification
- Unit tests with edge cases:
  - `0.1 + 0.2`;
  - more than 2 decimals and the maximum limit;
  - a month with 0 transactions and a negative burn;
  - the March and November DST changes in `America/New_York`.
- `git grep -nE "parseFloat|toFixed\(" src/server` returns nothing in money logic.
