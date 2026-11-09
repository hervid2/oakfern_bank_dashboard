# Glossary (ubiquitous language)

> One concept = one name across the whole system (documents, code, database, UI).
> Code identifiers are the canonical names. Anything not in this table does not exist as a concept.

## Core entities

| Business term | Code identifier | Definition | Forbidden synonyms | Source |
|---|---|---|---|---|
| Workspace / Business | `Business` | The fictional company that owns all accounts, cards, counterparties and transactions. Single tenant boundary: every query is filtered by `businessId`. | company, tenant, org, organization | brief §6 |
| User | `User` | A person who signs in to the workspace. In the MVP there is exactly one seeded demo user with role `admin`. | member, profile | brief §2 |
| Role | `Role` | Permission set attached to a `User`. Implemented values: `admin`. Designed-but-not-implemented: `viewer`. | permission group | roles-permissions.md |
| Account | `Account` | A bank account held by the `Business`. `type` is one of `checking`, `savings`, `treasury`. | wallet, ledger, sub-account | brief §6 |
| Transaction | `Transaction` | A single money movement recorded against exactly one `Account`. The atom of the ledger. | entry, movement, txn (in UI copy), payment (unless external), operation | brief §6 |
| Transfer | `Transfer` | The aggregate that links the two `Transaction` legs of one internal transfer. | internal payment, move | brief §6 |
| Counterparty | `Counterparty` | The other side of an external movement: a payment recipient or a merchant. | vendor, payee, beneficiary, merchant (as a separate entity) | brief §6 |
| Card | `Card` | A virtual or physical card tied to one `Account`, with a monthly spend limit. | debit, plastic | brief §6 |
| Category | `Category` | Business classification of a transaction (for example `payroll`, `software`, `rent`). | tag, label, bucket | brief §6 |
| Payment rail | `PaymentRailPort` / `SimulatedRail` | The port abstraction over the settlement network (`ach`, `wire`, `card`, `internal`), plus its simulated implementation. | provider, gateway, processor | ADR-0005 |
| Demo session | `Session` | The signed JWT stored in an httpOnly cookie that identifies the signed-in `User` and their `businessId`. | token, auth, login | ADR-0004 |
| Idempotency key | `idempotencyKey` | Client-generated UUID that makes a money mutation safe to retry (BR-006). | request id, nonce, dedup key | BR-006 |

## Money and metrics

| Business term | Code identifier | Definition | Forbidden synonyms | Source |
|---|---|---|---|---|
| Amount in cents | `amountCents` | Signed integer number of USD cents. Inflow > 0, outflow < 0 (ADR-0003). Never a float, never a string in the domain. | amount, value, total (as a raw number), price | BR-001, ADR-0003 |
| Direction | `direction` | Derived value `'in' \| 'out'` computed from the sign of `amountCents`. Never persisted as a second source of truth. | type, kind, flow, sign | ADR-0003 |
| Current balance | `currentBalance` | Sum of `amountCents` over the account's `posted` transactions. | balance (bare), ledger balance | BR-002 |
| Available balance | `availableBalance` | `currentBalance` minus the absolute value of pending outflows on the account. The only balance a money movement may be validated against. | spendable, free balance | BR-002 |
| Total cash | `totalCash` | Sum of `currentBalance` across all accounts of the `Business`. | cash position, net worth, assets | BR-008 |
| Money in | `inflowCents` | Sum of positive `amountCents` in a period, excluding internal transfers. | revenue, income, credits | BR-008, BR-011 |
| Money out | `outflowCents` | Absolute sum of negative `amountCents` in a period, excluding internal transfers. | spend, expenses, debits | BR-008, BR-011 |
| Net burn | `netBurnCents` | `outflowCents - inflowCents` for a month, excluding internal transfers. Positive means the company is burning cash. | burn rate, loss, deficit | BR-008 |
| Runway | `runway` | Result object: `{ kind: 'months', months }` or `{ kind: 'cash-flow-positive' }`. Months = `totalCash / avg(netBurnCents of the last 3 closed months)`. | months left, survival, lifespan | BR-008 |
| Closed month | `closedMonth` | A calendar month in `America/New_York` that has fully elapsed before `now`. The current month is never a closed month. | complete month, past month | BR-008 |
| Spending by category | `spendByCategory` | Outflows grouped by `Category` for a period, excluding internal transfers. | expenses breakdown, costs | BR-011 |
| Business time zone | `BUSINESS_TIME_ZONE` | `'America/New_York'`. The only time zone in which day and month boundaries are computed. | local time, server time, UTC (for boundaries) | BR-009 |
| Period | `DateRange` | A half-open interval `[start, end)` of instants, computed in the business time zone. | date filter, window, span | money-and-time skill rule 9 |
| Settlement time | `settleAt` | Instant at which a `pending` transaction becomes `posted` under simulated settlement. | eta, clearing date, value date | BR-004 |
| Posted time | `postedAt` | Instant at which the transaction actually became `posted`. Null while `pending`. | date (bare), effective date | brief §6 |

## Transaction vocabulary

| Business term | Code identifier | Definition | Forbidden synonyms | Source |
|---|---|---|---|---|
| Pending | `TransactionStatus.pending` | Created, not yet settled. Reduces `availableBalance` when it is an outflow. | in flight, processing, scheduled | BR-002, BR-004 |
| Posted | `TransactionStatus.posted` | Settled and counted in `currentBalance`. | cleared, completed, settled | BR-002 |
| Canceled | `TransactionStatus.canceled` | A `pending` transaction withdrawn by the user. Counts in no balance or metric. | voided, deleted, reverted | BR-005 |
| Failed | `TransactionStatus.failed` | A transaction the rail rejected. Counts in no balance or metric; the only status rendered in `--destructive`. | error, rejected, bounced | ADR-0005 |
| Method | `TransactionMethod` | How the money moved: `ach`, `wire`, `card`, `internal`, `check`, `fee`, `interest`. | channel, rail (in data), network | brief §6 |
| Internal transfer | `method = 'internal'` | A movement between two accounts of the same `Business`. Excluded from all metrics (BR-011). | book transfer, in-house move | BR-011 |
| External payment | `method in ('ach','wire')` | A movement to a `Counterparty` outside the `Business`. | outgoing, remittance, send | BR-004 |
| Memo | `memo` | Short free text the user attaches at creation time, shown in the list. | description, reference, note | brief §6 |
| Note | `note` | Longer free text added after the fact, from the detail panel. Distinct from `memo`. | comment, memo | FR-019 |
| Masked number | `maskedNumber` | Display-only string such as `••••4821` derived from a generated account, routing or card number. Full numbers are never rendered. | account number, last4 (as a UI label) | NFR-005 |

## Process and project vocabulary

| Business term | Code identifier | Definition | Forbidden synonyms | Source |
|---|---|---|---|---|
| Demo login | `signInAsDemo` | One-click action that creates a session for the seeded demo user. | guest login, anonymous access | FR-001 |
| Reset demo data | `resetDemoData` | Idempotent re-run of the seed that restores the shared workspace to its initial state. | reseed, wipe, restore | FR-037, ASM-012 |
| Seed | `prisma/seed.ts` | Deterministic data generator (fixed faker seed) producing dates relative to the run day. | fixtures, mock data, dummy data | FR-036 |
| Drill-down | `drillDown` | Navigation from a chart data point to Transactions with the equivalent filters encoded in the URL. | zoom, detail view | FR-025 |
| Screen | `UI-xx` | An identified screen in `docs/ux/ui-brief.md`. Specs reference screens by this ID. | page, view (as an ID) | ui-brief.md |
| Spec | `specs/NNN-slug/` | The approved behaviour of one feature (GENESIS level 4). | ticket, story (as a document) | GENESIS §A.2 |
| Client requirement | `CR-n` | One of the seven requirements in the assignment email. | ask, need | brief §1 |
