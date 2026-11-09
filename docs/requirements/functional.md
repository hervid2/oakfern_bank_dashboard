# Functional requirements

> Writing patterns (EARS):
> - Ubiquitous: "The system shall <response>."
> - Event-driven: "When <trigger>, the system shall <response>."
> - State-driven: "While <state>, the system shall <response>."
> - Optional: "Where <feature enabled>, the system shall <response>."
> - Unwanted: "If <unwanted condition>, then the system shall <response>."
>
> **SP-3 format note.** The D.2 template fields (`Actor(s)`, `Priority`, `Requirement`,
> `Related rules`, `Acceptance criteria (summary)`, `Origin`, `Status`) are kept in full, as table
> columns instead of per-requirement prose blocks. No field is dropped.
> Detailed acceptance criteria (`AC-NNN-xx`, Given/When/Then) live in each `specs/NNN-*/spec.md`.
> Status values: Proposed | Approved | In spec NNN | Implemented. All rows are `Proposed` until
> 🚦 G-Foundational.

## Index

| Group | FRs | Spec | CR |
|---|---|---|---|
| A. Access and session | FR-001…FR-003 | 001 | CR-1, CR-6 |
| B. App shell and navigation | FR-004…FR-006 | 001 | CR-1 |
| C. Account overview | FR-007…FR-012 | 002 | CR-2 |
| D. Transaction management | FR-013…FR-020 | 003 | CR-3 |
| E. Data visualization | FR-021…FR-025 | 004 | CR-4 |
| F. Move money | FR-026…FR-032 | 005 | CR-5 |
| G. Cards | FR-033…FR-035 | 006 | CR-5 |
| H. Demo data and platform | FR-036…FR-039 | 000, 001, 008 | CR-5, CR-6 |
| I. Optional (Could) | FR-040…FR-042 | 002, 007 | CR-1, CR-6 |
| J. Submission | FR-043 | 008 | CR-7 |

---

## A. Access and session

| ID | Actor(s) | Priority | Requirement (EARS) | Related rules | Acceptance criteria (summary) | Origin | Status |
|---|---|---|---|---|---|---|---|
| FR-001 | `anonymous` | Must | When the visitor activates "Continue as demo" on UI-01, the system shall create an authenticated session for the seeded demo `User` and redirect to UI-02 Home. | — | One click from landing to Home; no credentials typed; session cookie is `httpOnly`, `Secure`, `SameSite=Lax`. | brief §3 M-1, flow F-1 | Proposed |
| FR-002 | `admin` | Must | While a valid session exists, the system shall resolve every request's `businessId` from the session and scope all data access to it. | BR-009 | A request carrying another `businessId` returns 404/403, never another workspace's data (anti-IDOR). | NFR-005, ASM-018 | Proposed |
| FR-003 | `admin` | Must | When the user activates "Sign out", the system shall invalidate the session cookie and redirect to UI-01. | — | After sign-out, a direct URL to UI-02 redirects to UI-01. | brief §9 (user menu) | Proposed |
| FR-003b | `admin` | Must | If the session is missing or expired when a protected page or Server Action is requested, then the system shall redirect to UI-01 with an explanatory message and shall not execute the action. | BR-006 | Case E-08: session expires mid-transfer, no money moves, user is told why. | brief §4 E-08 | Proposed |

## B. App shell and navigation

| ID | Actor(s) | Priority | Requirement (EARS) | Related rules | Acceptance criteria (summary) | Origin | Status |
|---|---|---|---|---|---|---|---|
| FR-004 | `admin` | Must | The system shall present an application shell with a persistent sidebar (Home, Transactions, Accounts, Payments, Cards), a topbar with the user menu, and a primary "Move money" call to action reachable from every authenticated screen. | — | Current section is visually and programmatically marked (`aria-current`); the CTA opens UI-05 from any screen. | brief §3 M-2, §9 | Proposed |
| FR-005 | `admin` | Must | The system shall render in light or dark theme following the operating-system setting, and when the user activates the theme toggle it shall switch theme and remember the choice for subsequent visits. | — | No unstyled flash on reload; both themes meet NFR-003 contrast. | brief §9 | Proposed |
| FR-006 | `admin` | Must | While the viewport is narrower than 1024 px, the system shall collapse the sidebar into a dismissible sheet opened from the topbar. | — | NFR-004 viewports 375/768/1280/1440 with no horizontal scroll. | brief §9, NFR-004 | Proposed |

## C. Account overview (UI-02)

| ID | Actor(s) | Priority | Requirement (EARS) | Related rules | Acceptance criteria (summary) | Origin | Status |
|---|---|---|---|---|---|---|---|
| FR-007 | `admin` | Must | The system shall display total cash across all accounts of the business, formatted as USD. | BR-001, BR-002 | Equals the sum of per-account `currentBalance` shown in FR-009 (NFR-011). | brief §3 M-3 | Proposed |
| FR-008 | `admin` | Must | The system shall display money in and money out for the last 30 days, excluding internal transfers. | BR-008, BR-009, BR-011 | Range is `[startOfDay(now-29d), startOfDay(now+1d))` in `America/New_York`; an internal transfer changes neither figure. | brief §3 M-3 | Proposed |
| FR-009 | `admin` | Must | The system shall display, for each account, its name, type, masked number, current balance and available balance. | BR-001, BR-002 | A pending outflow lowers available but not current balance. | brief §3 M-3 | Proposed |
| FR-010 | `admin` | Must | The system shall display monthly net burn and the resulting runway; where the average net burn of the last 3 closed months is not positive, the system shall display "Cash-flow positive" instead of a number of months. | BR-008 | Runway on seeded data lands between 14 and 24 months; no `Infinity` or `NaN` is ever rendered. | brief §3 M-3, BR-008 | Proposed |
| FR-011 | `admin` | Must | The system shall list pending payments with counterparty, amount, method and estimated arrival, and shall offer a path to cancel each one. | BR-004, BR-005 | 2–4 pending items exist on seeded data; cancel navigates to or opens the FR-032 confirmation. | brief §3 M-3 | Proposed |
| FR-012 | `admin` | Must | The system shall list the most recent transactions of the business and shall link to the full list (UI-03) and to each transaction's detail. | BR-001 | Shows at least the 8 most recent; amounts right-aligned with `tabular-nums` and a sign. | brief §3 M-3 | Proposed |
| FR-012b | `admin` | Must | The system shall display a sparkline of total cash over the last 90 days next to the total cash figure. | BR-002, BR-009 | Sparkline has an `aria-label` and a text alternative (NFR-003). | brief §3 M-3 | Proposed |

## D. Transaction management (UI-03)

| ID | Actor(s) | Priority | Requirement (EARS) | Related rules | Acceptance criteria (summary) | Origin | Status |
|---|---|---|---|---|---|---|---|
| FR-013 | `admin` | Must | The system shall list the business's transactions with server-side pagination, and shall encode page, page size, filters, search term and sort order in the URL query string. | BR-001, BR-009 | Copying the URL into a new tab reproduces the exact same view; browser Back restores the previous view. | brief §3 M-4 | Proposed |
| FR-014 | `admin` | Must | When the user submits a search term, the system shall return transactions whose counterparty name or memo matches it, case-insensitively. | — | Searching "aws" finds the AWS rows; searching a 1-character term is debounced, not fired per keystroke. | flow F-3 | Proposed |
| FR-015 | `admin` | Must | The system shall allow filters on account, direction, status, method, category and date range to be applied in any combination, and shall apply them conjunctively. | BR-009, BR-011 | Combining account + category + date range narrows the result; filters are server-applied, not client-applied. | brief §3 M-4 | Proposed |
| FR-016 | `admin` | Must | When the user activates a sortable column header, the system shall sort the full result set server-side by that column, toggling ascending and descending. | — | Sortable: date, amount, counterparty, status. Sort state survives pagination. | brief §3 M-4 | Proposed |
| FR-017 | `admin` | Must | When the user selects a transaction row, the system shall open a side detail panel showing counterparty, account, amount, status, method, category, memo, note and the relevant timestamps. | BR-001, BR-004 | Panel is keyboard-dismissible, focus-trapped, and linkable by URL. | brief §3 M-4 | Proposed |
| FR-018 | `admin` | Should | When the user changes a transaction's category in the detail panel, the system shall persist the new category and all derived metrics and charts shall reflect it on the next read. | BR-011 | Recategorizing moves the amount between buckets in FR-023; internal transfers remain excluded. | brief §3 S-2 | Proposed |
| FR-019 | `admin` | Should | When the user saves a note on a transaction, the system shall persist it and display it in the detail panel. | — | Note is optional, max 500 characters, validated server-side with Zod. | brief §3 S-2 | Proposed |
| FR-020 | `admin` | Should | When the user activates "Export CSV", the system shall return a CSV file containing exactly the rows matching the current filters, with amounts in decimal USD and dates in the business time zone. | BR-001, BR-009, NFR-005 | Field values beginning with `=`, `+`, `-` or `@` are neutralised against formula injection; the export respects the session's `businessId`. | brief §3 S-3 | Proposed |
| FR-020b | `admin` | Must | If a filter combination matches no transactions, then the system shall display an empty state explaining which filters are active and offering to clear them. | — | Case E-06; the table header and filter controls remain usable. | brief §4 E-06, NFR-010 | Proposed |

## E. Data visualization (UI-02 / Insights)

| ID | Actor(s) | Priority | Requirement (EARS) | Related rules | Acceptance criteria (summary) | Origin | Status |
|---|---|---|---|---|---|---|---|
| FR-021 | `admin` | Must | The system shall display a monthly cash-flow chart comparing money in and money out per month over the selected period, excluding internal transfers. | BR-008, BR-009, BR-011 | Month buckets are computed in `America/New_York`; tooltip shows formatted amounts and the month. | brief §3 M-5 | Proposed |
| FR-022 | `admin` | Must | The system shall display total balance over time across the selected period. | BR-002, BR-009 | The last point equals the FR-007 total cash figure (NFR-011). | brief §3 M-5 | Proposed |
| FR-023 | `admin` | Must | The system shall display spending by category for the selected period, excluding internal transfers. | BR-011 | Sum of the buckets equals FR-008 money out for the same period. | brief §3 M-5 | Proposed |
| FR-024 | `admin` | Must | When the user selects a period (3, 6 or 12 months), the system shall recompute every chart on the server for that period and reflect the choice in the URL. | BR-009 | Period choice is shareable by URL and survives reload. | brief §3 M-5 | Proposed |
| FR-025 | `admin` | Must | When the user activates a bar, point or segment in a chart, the system shall navigate to UI-03 with the equivalent filters (period, direction and category where applicable) pre-applied through the URL. | BR-009, BR-011 | Flow F-2: clicking an outflow bar for a month opens Transactions filtered to that month and direction; the row count matches the chart value. | brief §3 M-5, flow F-2 | Proposed |

## F. Move money (UI-05, UI-06)

| ID | Actor(s) | Priority | Requirement (EARS) | Related rules | Acceptance criteria (summary) | Origin | Status |
|---|---|---|---|---|---|---|---|
| FR-026 | `admin` | Must | When the user confirms an internal transfer between two of the business's own accounts, the system shall create two linked `posted` transactions in a single database transaction and update both balances atomically. | BR-001, BR-002, BR-003, BR-011 | Both legs exist or neither does; the transfer appears in both accounts; metrics are unchanged (BR-011). | brief §3 M-6, flow F-4 | Proposed |
| FR-027 | `admin` | Must | When the user confirms an external payment, the system shall create a `pending` outflow transaction with `method` `ach` or `wire` and a `settleAt` derived from the configured settlement delay for that method. | BR-001, BR-004, BR-007 | ACH `settleAt = now + ACH_SETTLE_SECONDS` (default 120 s), wire `now + WIRE_SETTLE_SECONDS` (default 30 s). | brief §3 M-6, flow F-5 | Proposed |
| FR-028 | `admin` | Must | The system shall allow the user to select an existing counterparty or create a new one (name plus masked destination details) as part of the payment flow. | NFR-005 | New counterparty is scoped to the session's business; destination numbers are stored generated and displayed masked. | flow F-5 | Proposed |
| FR-029 | `admin` | Must | Before any money movement is executed, the system shall present a review step summarising source, destination, amount, method and estimated arrival, and shall require an explicit confirmation naming the amount. | BR-003, BR-004, NFR-010 | The confirm button reads the concrete verb and amount (for example "Send $1,250.00"); no movement happens before confirmation. | brief §3 M-6, ui-system rule 9 | Proposed |
| FR-030 | `admin` | Must | The system shall require an idempotency key on every money mutation, and if a key is replayed, then the system shall return the original result without creating a second movement. | BR-006 | Case E-01: double-clicking confirm produces exactly one transaction and one success message. | brief §3 M-6, §4 E-01 | Proposed |
| FR-030b | `admin` | Must | If a money movement request fails validation (amount not positive, more than two decimals, above the per-operation or daily limit, source equal to destination, or amount above the source's available balance), then the system shall reject it with a field-level message and shall create no transaction. | BR-001, BR-003, BR-007 | Cases E-02, E-03, E-04; validation is enforced server-side even if the client is bypassed. | brief §4 E-02…E-04 | Proposed |
| FR-030c | `admin` | Must | If two concurrent requests would both spend the same available balance, then the system shall allow at most the movements that keep the balance invariant and shall reject the rest. | BR-002, BR-003 | Case E-09: two parallel transfers of the full available balance leave exactly one succeeding. | brief §4 E-09, NFR-006 | Proposed |
| FR-031 | system | Must | While a transaction is `pending` and its `settleAt` has passed, the system shall mark it `posted` on the next read of the affected data, setting `postedAt`. | BR-002, BR-004 | Lazy settlement is idempotent and runs inside the read path; no background worker is required. | BR-004 | Proposed |
| FR-032 | `admin` | Must | When the user cancels a payment that is `pending`, the system shall set it to `canceled` and release the reserved available balance; if the payment is not `pending`, then the system shall refuse the cancellation. | BR-005 | Case E-05; a `posted` payment cannot be canceled; the action is behind a confirmation dialog. | brief §3 M-6, §4 E-05 | Proposed |

## G. Cards (UI-07)

| ID | Actor(s) | Priority | Requirement (EARS) | Related rules | Acceptance criteria (summary) | Origin | Status |
|---|---|---|---|---|---|---|---|
| FR-033 | `admin` | Should | The system shall list the business's cards with holder, form factor (virtual or physical), linked account, masked number, status and monthly limit. | BR-010, NFR-005 | 5 seeded cards; full numbers never leave the server. | brief §3 S-1 | Proposed |
| FR-034 | `admin` | Should | When the user freezes or unfreezes a card, the system shall persist the new status and reflect it immediately in the list. | BR-010 | Freezing is behind a confirmation dialog; status change is visible without a full reload. | brief §3 S-1, flow F-6 | Proposed |
| FR-035 | `admin` | Should | The system shall display each card's month-to-date usage against its monthly limit, and when the user edits the limit it shall accept only values between USD 0 and USD 100,000. | BR-001, BR-009, BR-010 | Usage is the sum of the card's charges in the current month in the business time zone; a limit of 150,000 is rejected. | brief §3 S-1, BR-010 | Proposed |

## H. Demo data and platform

| ID | Actor(s) | Priority | Requirement (EARS) | Related rules | Acceptance criteria (summary) | Origin | Status |
|---|---|---|---|---|---|---|---|
| FR-036 | operator | Must | The system shall provide a deterministic seed that creates one business, one demo user, 4 accounts, 5 cards, about 60 counterparties and 1,200–1,800 transactions over 12 months, with dates relative to the run day and a fixed random seed. | BR-001, BR-004, BR-008, BR-009 | Two runs with the same run day produce identical data; 2–4 pending payments always exist; runway lands between 14 and 24 months. | brief §3 M-7, §6 | Proposed |
| FR-037 | `admin` | Should | When the user activates "Reset demo data", the system shall restore the shared demo workspace to its seeded state and report completion. | — | Idempotent; safe to run repeatedly (ASM-012); verified on production before submission. | brief §3 S-4, ASM-012 | Proposed |
| FR-038 | operator | Must | The system shall expose an unauthenticated health endpoint reporting application status and database reachability. | — | `GET /api/health` returns 200 with a JSON body when the database answers, and a non-200 when it does not; no secrets in the response. | NFR-009, roadmap 000 | Proposed |
| FR-039 | `admin` | Must | If a data view fails to load, then the system shall render a segment-level error state with a human message and a retry affordance, and for an unknown route it shall render a not-found screen offering navigation back to Home. | — | Cases E-07; `error.tsx` and `not-found.tsx` exist per route segment; no stack trace reaches the browser. | brief §4 E-07, NFR-009, NFR-010 | Proposed |

## I. Optional (Could)

| ID | Actor(s) | Priority | Requirement (EARS) | Related rules | Acceptance criteria (summary) | Origin | Status |
|---|---|---|---|---|---|---|---|
| FR-040 | `admin` | Could | Where the command palette is enabled, when the user presses Cmd+K or Ctrl+K the system shall open a global search over transactions, accounts, counterparties and navigation targets. | — | Fully keyboard-operable; cut first under SP-6 if time runs short. | brief §3 C-1 | Proposed |
| FR-041 | `admin` | Could | The system shall provide an account detail screen showing the account's masked account and routing numbers with a copy action, its balance history and its transactions. | NFR-005 | Copy action copies the generated value, not a real one; numbers remain masked on screen. | brief §3 C-2 | Proposed |
| FR-042 | `admin` | Could | Where the read-only public API is enabled, the system shall expose documented `GET /api/v1/*` endpoints returning the session's business data only. | NFR-005 | Same authorization path as the UI; documented in the README. | brief §3 C-3 | Proposed |

## J. Submission

| ID | Actor(s) | Priority | Requirement (EARS) | Related rules | Acceptance criteria (summary) | Origin | Status |
|---|---|---|---|---|---|---|---|
| FR-043 | human | Must | The system shall ship a README covering the product summary, light and dark screenshots, how each of CR-1…CR-6 is met, the architecture and stack with reasons, how to run it locally with tests and CI, the AI-assisted SDD workflow, and trade-offs with next steps; plus a submission email draft. | — | Checklist in KICKOFF §9; verified against the deployed production URL. | CR-7, brief §1 | Proposed |

---

## Coverage check

| CR | FRs |
|---|---|
| CR-1 | FR-004, FR-005, FR-006, FR-039, FR-040 |
| CR-2 | FR-007…FR-012b, FR-041 |
| CR-3 | FR-013…FR-020b, FR-036 |
| CR-4 | FR-021…FR-025 |
| CR-5 | FR-026…FR-035, FR-037 |
| CR-6 | FR-001…FR-003b, FR-038, FR-042 (plus architecture, tests and CI, which are NFR-005…NFR-011) |
| CR-7 | FR-043 |
