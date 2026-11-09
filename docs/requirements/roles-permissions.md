# Roles and permissions

> **Round 0 decision:** only the `admin` role is implemented in this project. The `viewer` role is
> **out of scope** (removed from the Could list). It stays documented here so the RBAC design shows
> where a second role plugs in as a future step, and so the authorization code is written against a
> role abstraction rather than a hard-coded single user.

## Roles

| Role | Implemented | Description | Data scope (which records they can see) |
|---|---|---|---|
| `anonymous` | ✅ | A visitor with no session. May reach UI-01 (landing / demo login), `GET /api/health` and static assets only. | None. No business data whatsoever. |
| `admin` | ✅ | Founder / finance lead of the demo business. Full read and write over their own business: accounts, transactions, counterparties, cards and money movements. | Every record whose `businessId` equals the session's `businessId`. Nothing outside it. |
| `viewer` | ❌ future step | Bookkeeper. Read-only over the business, plus the ability to classify transactions (category, note). May never move or cancel money. | Same as `admin` (own `businessId`), with write access limited to `Transaction.category` and `Transaction.note`. |
| `system` | ✅ (not a login) | Non-interactive execution context: lazy settlement (FR-031), the seed (FR-036) and the demo reset (FR-037). Never reachable from a browser session. | Unrestricted by design; invoked only from server code, never from a request parameter. |

**Authorization model.** A single server-side guard resolves `{ userId, businessId, role }` from the
session (ADR-0004) and is called by **every** Server Action and Route Handler before any work. The
UI never decides permissions; it only hides what the server would refuse (NFR-005). Every repository
query takes `businessId` as a mandatory argument, so a missing scope is a type error rather than a
data leak.

## Permission matrix

Legend: ✅ allowed · ❌ refused · `own` = restricted to the session's `businessId`.
Refusals for records of another business return **not found**, never "forbidden", so existence is
not leaked (anti-IDOR, NFR-005).

| Resource / action | `anonymous` | `viewer` (future) | `admin` | FR |
|---|---|---|---|---|
| Session: start demo session | ✅ | ✅ | ✅ | FR-001 |
| Session: sign out | ❌ | ✅ | ✅ | FR-003 |
| Health endpoint: read | ✅ | ✅ | ✅ | FR-038 |
| Business: view own workspace | ❌ | ✅ own | ✅ own | FR-002 |
| Account: list / view | ❌ | ✅ own | ✅ own | FR-009, FR-041 |
| Account: create / edit / close | ❌ | ❌ | ❌ (out of scope) | — |
| Metrics (total cash, in/out, burn, runway): read | ❌ | ✅ own | ✅ own | FR-007, FR-008, FR-010 |
| Charts / insights: read | ❌ | ✅ own | ✅ own | FR-021…FR-025 |
| Transaction: list / search / filter / sort | ❌ | ✅ own | ✅ own | FR-013…FR-016 |
| Transaction: view detail | ❌ | ✅ own | ✅ own | FR-017 |
| Transaction: recategorize | ❌ | ✅ own | ✅ own | FR-018 |
| Transaction: add or edit note | ❌ | ✅ own | ✅ own | FR-019 |
| Transaction: export CSV | ❌ | ✅ own | ✅ own | FR-020 |
| Transfer: create internal transfer | ❌ | ❌ | ✅ own | FR-026 |
| Payment: create ACH or wire payment | ❌ | ❌ | ✅ own | FR-027 |
| Payment: cancel pending | ❌ | ❌ | ✅ own | FR-032 |
| Counterparty: list / view | ❌ | ✅ own | ✅ own | FR-028 |
| Counterparty: create | ❌ | ❌ | ✅ own | FR-028 |
| Card: list / view | ❌ | ✅ own | ✅ own | FR-033 |
| Card: freeze / unfreeze | ❌ | ❌ | ✅ own | FR-034 |
| Card: edit monthly limit | ❌ | ❌ | ✅ own | FR-035 |
| Demo data: reset workspace | ❌ | ❌ | ✅ own | FR-037 |
| Read-only API `/api/v1/*` (Could) | ❌ | ✅ own | ✅ own | FR-042 |

### Data visibility rules
| # | Rule |
|---|---|
| DV-1 | Every read and write is filtered by the session's `businessId`. There is no "all businesses" query path in `repositories`. |
| DV-2 | Account, routing and card numbers are generated fictional values; only a masked form (`••••4821`) is ever sent to the client (NFR-005). Full values never leave the server. |
| DV-3 | A request for a record of another business returns 404, never 403 or partial data. |
| DV-4 | Structured logs record `businessId` and `userId` but never account numbers, counterparty addresses or any other field classified `confidential` in `docs/domain/model.md` (NFR-009). |
| DV-5 | The CSV export contains exactly the rows the caller's filters select within their own business, with formula-injection neutralisation applied (FR-020). |

## Segregation of duties and audit

| Topic | Decision |
|---|---|
| Actions requiring dual approval | **N/A** — the demo workspace has a single interactive role and no maker-checker workflow. Dual approval of payments is listed in the README as a "next step" for a real product, and the review step of FR-029 is the single-user stand-in. |
| Actions that generate an audit record (who, what, when, old and new value) | Money mutations (FR-026, FR-027, FR-032) emit a structured JSON log line with `userId`, `businessId`, operation, `amountCents`, `idempotencyKey` and the resulting status (NFR-009). `Transaction.idempotencyKey`, `createdAt`, `postedAt` and `settleAt` act as the persisted trail. |
| Actions deliberately **not** audited | Recategorize (FR-018) and note edits (FR-019) overwrite the previous value without history. Recorded as technical debt in `docs/roadmap.md`: a real product would keep a change log. |
| Role elevation | Not possible: the role is a claim in the signed session token and there is no UI, action or API that changes it. Adding `viewer` would mean seeding a second user and extending the guard, not adding a switcher. |
