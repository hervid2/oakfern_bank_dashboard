# Business rules

> Origin for all rules: `KICKOFF.md` §3.5, dated 2026-11-09, proposed by the agent and recorded as
> assumptions ASM-001…ASM-011 in `docs/discovery/brief.md`. Pending human ratification at
> 🚦 G-Foundational.
> Every **Examples** block is written so it can be transcribed into a unit or integration test with
> the ID in the test title (KICKOFF §8). Amounts are written as cents unless a `$` sign appears.
> Reference skill: `.harness/skills/money-and-time/SKILL.md`.

---

## BR-001 — Money is integer cents
- **Type:** constraint
- **Rule:** Every monetary amount is stored, transported and computed as a signed integer number of USD cents (`amountCents`). Floating-point arithmetic on money is forbidden anywhere in the system. Conversion to a human string happens only in the presentation layer, through a single `formatCents` helper based on `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })`. User input is parsed by a single `parseMoneyToCents` helper that accepts `^\d{1,9}(\.\d{1,2})?$` after stripping thousands separators.
- **Formula / decision table:**

| Input string | `parseMoneyToCents` result |
|---|---|
| `"1,234.56"` | `123456` |
| `"0.07"` | `7` |
| `"250000"` | `25000000` |
| `"12.345"` | reject: more than 2 decimals |
| `"-5"` | reject: not positive |
| `"0"` | reject: not positive |
| `""` | reject: empty |
| `"1e3"` | reject: scientific notation |

- **Examples:**
  1. `formatCents(123456)` → `"$1,234.56"`; `formatCents(-123456, { signDisplay: 'always' })` → `"-$1,234.56"`.
  2. **Edge case (float trap):** summing `0.1 + 0.2` style data must not occur; `sum([10, 20])` cents → `30` cents, formatted `"$0.30"`, never `"$0.30000000000000004"`.
  3. **Edge case (parsing trap):** `parseMoneyToCents("12.345")` rejects rather than silently rounding to `1234` or `1235`.
- **Exceptions:** percentages, counts and runway months are not money and are not cents; they are documented separately in BR-008.
- **Origin and date:** ASM-001, 2026-11-09.
- **Requirements that use it:** FR-007, FR-008, FR-009, FR-010, FR-012, FR-013, FR-017, FR-020, FR-026, FR-027, FR-030b, FR-035, FR-036.

---

## BR-002 — Balance definitions and invariant
- **Type:** calculation (invariant)
- **Rule:** For an account, `currentBalance` is the sum of `amountCents` over its `posted` transactions. `availableBalance` is `currentBalance` minus the absolute value of its `pending` outflows. `pending` inflows do not increase either balance. `canceled` and `failed` transactions count in neither balance. Both values are computed in `src/server/domain`, never in a component. `availableBalance` is the only balance a money movement may be validated against.
- **Formula / decision table:**

```
currentBalance   = Σ { t.amountCents | t.status = 'posted' }
availableBalance = currentBalance − Σ { |t.amountCents| | t.status = 'pending' ∧ t.amountCents < 0 }
```

| Transaction status | Direction | Counts in `currentBalance` | Counts in `availableBalance` |
|---|---|---|---|
| `posted` | in | yes | yes |
| `posted` | out | yes | yes |
| `pending` | out | no | yes (reduces it) |
| `pending` | in | no | no |
| `canceled` | any | no | no |
| `failed` | any | no | no |

- **Examples:**
  1. Account with posted `+500000`, posted `−120000`, pending `−80000` → `currentBalance = 380000` (`$3,800.00`), `availableBalance = 300000` (`$3,000.00`).
  2. **Edge case (pending inflow):** account with posted `+500000` and pending `+900000` → `currentBalance = 500000` and `availableBalance = 500000`; the pending inflow is invisible to both.
  3. **Edge case (empty account):** account with no transactions → `currentBalance = 0`, `availableBalance = 0`, and the UI shows `"$0.00"`, never a blank or `NaN`.
  4. **Invariant test:** after any sequence of operations, for every account `availableBalance <= currentBalance`, and `currentBalance` equals a freshly recomputed sum from the transactions table.
- **Exceptions:** none.
- **Origin and date:** ASM-002, 2026-11-09.
- **Requirements that use it:** FR-007, FR-009, FR-012b, FR-022, FR-026, FR-030b, FR-030c, FR-031, FR-032.

---

## BR-003 — Internal transfer validity and atomicity
- **Type:** validation + state transition
- **Rule:** An internal transfer is accepted only if: the amount is a positive integer number of cents; the source and destination accounts both belong to the session's business; the source differs from the destination; and the amount is less than or equal to the source account's `availableBalance`; and the amount respects BR-007. On acceptance the system creates exactly two `Transaction` rows with `method = 'internal'` and `status = 'posted'` (source `−amount`, destination `+amount`) linked by one `Transfer` row, all inside a single database transaction. A partial result is impossible.
- **Formula / decision table:**

| Condition | Outcome |
|---|---|
| `amountCents <= 0` | reject `AMOUNT_NOT_POSITIVE` |
| `sourceAccountId = destinationAccountId` | reject `SAME_ACCOUNT` |
| account not in session business | reject `NOT_FOUND` (never "forbidden", to avoid leaking existence) |
| `amountCents > source.availableBalance` | reject `INSUFFICIENT_FUNDS` |
| `amountCents > 25000000` | reject `OVER_OPERATION_LIMIT` (BR-007) |
| all conditions pass | 2 posted legs + 1 `Transfer`, one DB transaction |

- **Examples:**
  1. Source available `$10,000.00`, transfer `$2,500.00` to savings → source `currentBalance` falls by `250000`, destination rises by `250000`, both legs `posted`, one `Transfer` row links them, totals across accounts unchanged.
  2. **Edge case (exact balance):** source available `$2,500.00`, transfer `$2,500.00` → accepted; source `availableBalance` becomes `0`; a second identical transfer is rejected `INSUFFICIENT_FUNDS`.
  3. **Edge case (atomicity):** if writing the destination leg fails, no source leg and no `Transfer` row remain; the source balance is unchanged.
  4. **Edge case (same account):** source equals destination → rejected `SAME_ACCOUNT`, zero rows written (case E-03).
- **Exceptions:** none. Internal transfers are excluded from metrics by BR-011.
- **Origin and date:** ASM-003, 2026-11-09.
- **Requirements that use it:** FR-026, FR-029, FR-030b, FR-030c.

---

## BR-004 — External payment settlement (simulated)
- **Type:** state transition + deadline
- **Rule:** An accepted external payment is created as a single `pending` outflow with `postedAt = null` and `settleAt = now + delay(method)`, where `delay('ach') = ACH_SETTLE_SECONDS` (default 120 s) and `delay('wire') = WIRE_SETTLE_SECONDS` (default 30 s), both read from the environment. Settlement is **lazy**: whenever data touching a `pending` transaction is read, any transaction whose `settleAt <= now` is transitioned to `posted` with `postedAt = settleAt`, idempotently, before the read result is produced. No background worker exists.
- **Formula / decision table:**

| `method` | initial `status` | `settleAt` | `postedAt` after settlement |
|---|---|---|---|
| `ach` | `pending` | `now + 120 s` | `settleAt` |
| `wire` | `pending` | `now + 30 s` | `settleAt` |
| `internal` | `posted` immediately | `null` | creation instant |

- **Examples:**
  1. ACH payment of `$4,200.00` created at `10:00:00` → `pending`, `settleAt = 10:02:00`, estimated arrival shown as "in about 2 minutes"; at `10:02:05` the first read of Home or Transactions returns it as `posted` with `postedAt = 10:02:00`, and `currentBalance` drops by `420000`.
  2. **Edge case (idempotent settlement):** two concurrent reads at `10:02:05` must result in exactly one transition; the transaction is `posted` once and `postedAt` is not overwritten by the second read.
  3. **Edge case (not yet due):** a wire created at `10:00:00` with `settleAt = 10:00:30`, read at `10:00:29`, stays `pending` and keeps reducing `availableBalance` only.
- **Exceptions:** a `canceled` payment is never settled, even if `settleAt` has passed (BR-005).
- **Origin and date:** ASM-004, 2026-11-09.
- **Requirements that use it:** FR-011, FR-027, FR-031, FR-032, FR-036.

---

## BR-005 — Cancellation of a pending payment
- **Type:** state transition + authorization
- **Rule:** Only a transaction whose `status` is `pending` and whose `method` is `ach` or `wire` may be canceled, and only by a user of the owning business. Cancellation sets `status = 'canceled'`, leaves `postedAt` null, and releases the amount reserved against `availableBalance`. Any other current status makes cancellation a no-op that returns an error. Cancellation never deletes the row.
- **Formula / decision table:**

| Current status | Cancel request | Result |
|---|---|---|
| `pending` | allowed | `canceled`, available balance released |
| `posted` | refused | error `NOT_CANCELLABLE`, nothing written |
| `canceled` | refused | error `NOT_CANCELLABLE` (already canceled) |
| `failed` | refused | error `NOT_CANCELLABLE` |
| `pending`, `method = 'internal'` | refused | internal transfers are created `posted`, so this cannot occur; guarded anyway |

- **Examples:**
  1. Pending ACH of `$4,200.00`, available balance `$30,000.00` → after cancel: status `canceled`, available balance back to `$34,200.00`, `currentBalance` unchanged, row still visible in Transactions with a `canceled` badge.
  2. **Edge case (race with settlement):** the payment settles to `posted` at `10:02:00` and the cancel arrives at `10:02:01` → refused `NOT_CANCELLABLE`; the balance reflects a posted payment and the user sees a clear message.
  3. **Edge case (double cancel):** cancelling the same pending payment twice → the first succeeds, the second returns `NOT_CANCELLABLE`; the available balance is released exactly once.
- **Exceptions:** none.
- **Origin and date:** ASM-005, 2026-11-09.
- **Requirements that use it:** FR-011, FR-032.

---

## BR-006 — Idempotency of money mutations
- **Type:** constraint
- **Rule:** Every money mutation (internal transfer, external payment, cancellation) carries an `idempotencyKey`: a UUID v4 generated by the client when the dialog opens and reused for every retry of that same user intent. The key is stored with the resulting movement under a unique constraint scoped to the business. If a mutation arrives with a key that already produced a result, the system returns that original result unchanged and creates nothing new.
- **Formula / decision table:**

| Key seen before | Stored outcome | Response |
|---|---|---|
| no | — | execute, persist key with result |
| yes | success | return the original success result (same transaction ids) |
| yes | validation error | return the original error; still no rows written |
| missing / malformed | — | reject `IDEMPOTENCY_KEY_REQUIRED` before any work |

- **Examples:**
  1. Confirm button double-clicked, two requests with key `3f2c…`: exactly one `Transaction` pair exists, one success toast is shown, and the second response carries the same transaction ids as the first (case E-01).
  2. **Edge case (different intents, same amount):** two separate transfers of `$1,000.00` opened in two dialogs carry two different keys → both execute; the system must not deduplicate by amount or timestamp.
  3. **Edge case (missing key):** a request without `idempotencyKey` is rejected before validation or persistence, with no partial write.
- **Exceptions:** read-only operations and non-money mutations (recategorize, note, card limit, freeze) do not require a key.
- **Origin and date:** ASM-006, 2026-11-09.
- **Requirements that use it:** FR-026, FR-027, FR-030, FR-032.

---

## BR-007 — Movement limits
- **Type:** validation
- **Rule:** No single money movement may exceed USD 250,000.00 (`25_000_000` cents). The sum of external payments (`ach` + `wire`) created by the business within one business day, counting `pending` and `posted` and excluding `canceled` and `failed`, may not exceed USD 500,000.00 (`50_000_000` cents). Day boundaries follow BR-009. Internal transfers are subject to the per-operation limit but not to the daily external limit.
- **Formula / decision table:**

| Check | Threshold | Applies to |
|---|---|---|
| per-operation | `amountCents <= 25_000_000` | internal transfer, ACH, wire |
| daily external | `Σ external created today <= 50_000_000` | ACH, wire |

- **Examples:**
  1. Payment of `$250,000.00` → accepted (boundary is inclusive). Payment of `$250,000.01` → rejected `OVER_OPERATION_LIMIT`.
  2. **Edge case (daily cap reached mid-day):** two ACH payments of `$250,000.00` already created today → a third payment of `$0.01` is rejected `OVER_DAILY_LIMIT`, and the error states the remaining allowance (`$0.00`).
  3. **Edge case (canceled does not consume the cap):** `$250,000.00` paid and then canceled, plus `$250,000.00` paid → a further `$200,000.00` is accepted, because the canceled payment is excluded from the daily sum.
  4. **Edge case (day boundary):** a payment created at `23:59` ET counts against that day; one created at `00:01` ET counts against the next day, even though both may share the same UTC date.
- **Exceptions:** limits are configuration constants in the domain, not user-editable.
- **Origin and date:** ASM-007, 2026-11-09.
- **Requirements that use it:** FR-027, FR-030b.

---

## BR-008 — Net burn and runway
- **Type:** calculation
- **Rule:** For a calendar month in the business time zone, `inflowCents` is the sum of positive `amountCents` of `posted` transactions and `outflowCents` is the absolute sum of negative ones, both excluding `method = 'internal'` (BR-011) and excluding `canceled` and `failed`. `netBurnCents(month) = outflowCents − inflowCents`. `runway` uses the three most recent **closed** months (the current, partial month is never used): `avgBurn = round(Σ netBurnCents(last 3 closed months) / 3)`. If `avgBurn <= 0` the result is `{ kind: 'cash-flow-positive' }`. Otherwise the result is `{ kind: 'months', months: round1(totalCash / avgBurn) }`, where `totalCash` is the sum of `currentBalance` across the business's accounts and `round1` rounds to one decimal place at the very end.
- **Formula / decision table:**

```
netBurnCents(m) = outflowCents(m) − inflowCents(m)        // internal transfers excluded
avgBurn         = round( (netBurn(m-1) + netBurn(m-2) + netBurn(m-3)) / 3 )
runway          = avgBurn <= 0 ? cash-flow-positive : round1(totalCash / avgBurn) months
```

- **Examples:**
  1. Closed months burn `100_000_00`, `110_000_00`, `90_000_00` cents → `avgBurn = 100_000_00`; `totalCash = 1_200_000_00` → `{ kind: 'months', months: 12 }`, rendered "12.0 months of runway".
  2. **Edge case (profitable company):** closed months net burn `−50_000_00`, `−20_000_00`, `−30_000_00` → `avgBurn = −33_333_33` which is `<= 0` → `{ kind: 'cash-flow-positive' }`; the UI shows "Cash-flow positive", never `Infinity`, `NaN` or a negative month count.
  3. **Edge case (month with no transactions):** a closed month with zero transactions contributes `netBurn = 0`, not a skipped term; with burns `0`, `0`, `30_000_00` → `avgBurn = 10_000_00`.
  4. **Edge case (current month excluded):** on 2026-11-09 the closed months are October, September and August 2026; November data must not change the runway figure.
  5. **Edge case (internal transfer neutrality):** adding a `$50,000.00` internal transfer to a month changes neither `inflowCents`, `outflowCents` nor `netBurnCents` (BR-011).
- **Exceptions:** if fewer than three closed months of data exist, the average is taken over the closed months that do exist, and the UI labels the figure as based on fewer months. (Not reachable with the 12-month seed, but guarded.)
- **Origin and date:** ASM-008, 2026-11-09.
- **Requirements that use it:** FR-008, FR-010, FR-021, FR-023.

---

## BR-009 — Business time zone and ranges
- **Type:** constraint + calculation
- **Rule:** The business time zone is `America/New_York`. All instants are stored in UTC. Every day, month and period boundary used by a filter, aggregation, chart bucket or CSV export is computed in the business time zone, through a single module `src/server/domain/time.ts`. Ranges are half-open `[start, end)`. "Last 30 days" is `[startOfDay(now − 29 d), startOfDay(now + 1 d))`. The current instant (`now`) is injected into domain functions and never read from the system clock inside `src/server/domain`.
- **Formula / decision table:**

| Period label | Range |
|---|---|
| Today | `[startOfDay(now), startOfDay(now + 1d))` |
| Last 30 days | `[startOfDay(now − 29d), startOfDay(now + 1d))` |
| Month `m` | `[startOfMonth(m), startOfMonth(m + 1))` |
| Last N months (chart) | `[startOfMonth(now − (N−1) months), startOfMonth(now + 1 month))` |

- **Examples:**
  1. A transaction with `postedAt = 2026-11-01T03:30:00Z` (which is 2026-10-31 23:30 ET) belongs to **October** 2026, not November, in every aggregation, chart bucket and CSV export.
  2. **Edge case (spring DST):** 2026-03-08 in `America/New_York` has 23 hours; `[startOfDay, startOfDay+1d)` for that date must span exactly that local day, and the daily bucket must contain all its transactions.
  3. **Edge case (autumn DST):** 2026-11-01 has 25 hours; a transaction at 01:30 local time (ambiguous) must land in that single day's bucket exactly once, and must not be double-counted.
  4. **Edge case (last 30 days is 30 buckets):** the "last 30 days" range yields exactly 30 daily buckets, including today, and never 29 or 31.
- **Exceptions:** none. UI display of instants also uses the business time zone, labelled "ET" where ambiguity is possible.
- **Origin and date:** ASM-009, 2026-11-09.
- **Requirements that use it:** FR-002, FR-008, FR-013, FR-015, FR-020, FR-021, FR-022, FR-023, FR-024, FR-025, FR-035, FR-036, and BR-007, BR-008.

---

## BR-010 — Card status and monthly limit
- **Type:** validation + constraint
- **Rule:** A card has `status` `active` or `frozen`. A `frozen` card accepts no new charges (relevant only for simulated charges). A card's `monthlyLimitCents` must satisfy `0 <= monthlyLimitCents <= 10_000_000` (USD 0 to USD 100,000). `monthToDateUsageCents` is the absolute sum of the card's `posted` and `pending` outflow transactions whose business-time-zone month equals the current month. Usage may exceed the limit on historical seeded data; the UI shows this as an over-limit state rather than hiding it.
- **Formula / decision table:**

| Input | Outcome |
|---|---|
| `monthlyLimitCents = 0` | accepted (card effectively blocked for new spend) |
| `monthlyLimitCents = 10_000_000` | accepted (boundary inclusive) |
| `monthlyLimitCents = 10_000_001` | rejected `LIMIT_OUT_OF_RANGE` |
| `monthlyLimitCents < 0` or non-integer | rejected `LIMIT_OUT_OF_RANGE` |
| charge on a `frozen` card | rejected `CARD_FROZEN` |

- **Examples:**
  1. Card with `monthlyLimitCents = 500_000` (`$5,000.00`) and month-to-date charges of `$1,250.00` → usage bar at 25 %, label "$1,250.00 of $5,000.00".
  2. **Edge case (limit exceeded):** limit `$5,000.00` and usage `$5,400.00` → the bar renders capped at 100 % in an over-limit style, with the text stating `$5,400.00 of $5,000.00`; no division-by-zero and no value above 100 % is rendered.
  3. **Edge case (zero limit):** limit `$0.00` and usage `$0.00` → percentage is reported as 0 %, not `NaN`.
  4. **Edge case (month boundary):** on the 1st of a month at 00:05 ET, usage resets to the charges of the new month only, even though UTC is still the previous day.
- **Exceptions:** simulated card charges are generated by the seed only; the MVP has no "create a charge" action, so `CARD_FROZEN` is enforced defensively in the service.
- **Origin and date:** ASM-010, 2026-11-09.
- **Requirements that use it:** FR-033, FR-034, FR-035.

---

## BR-011 — Internal transfers excluded from metrics
- **Type:** constraint
- **Rule:** Transactions with `method = 'internal'` are excluded from money-in and money-out totals, from net burn and runway, from the cash-flow chart, from spending by category, and from any other metric describing money entering or leaving the business. They remain fully visible in the transactions list, in the account's balance and in balance-over-time, because they do move cash between accounts.
- **Formula / decision table:**

| Surface | Internal transfers included? |
|---|---|
| Transactions list and detail (FR-013, FR-017) | yes |
| Account `currentBalance` / `availableBalance` (BR-002) | yes |
| Balance over time (FR-022) | yes (net effect across accounts is zero) |
| Money in / money out (FR-008) | no |
| Net burn and runway (BR-008) | no |
| Cash-flow chart (FR-021) | no |
| Spending by category (FR-023) | no |
| Daily external payment limit (BR-007) | no |

- **Examples:**
  1. Business with money in `$300,000.00` and money out `$180,000.00` for the last 30 days; a `$50,000.00` internal transfer from checking to treasury is added → money in and money out are unchanged; checking's balance falls and treasury's rises; total cash is unchanged.
  2. **Edge case (category assigned to an internal leg):** an internal leg carrying a category is still excluded from spending by category, so the sum of category buckets still equals the money-out figure for the same period (NFR-011).
  3. **Edge case (chart totals agreement):** for any period, `Σ cash-flow chart outflows = FR-008 money out = Σ spending-by-category buckets`; a dataset containing internal transfers must satisfy this equality.
- **Exceptions:** none.
- **Origin and date:** ASM-011, 2026-11-09.
- **Requirements that use it:** FR-008, FR-010, FR-021, FR-023, FR-026, and BR-008.
