# ADR-0005 — Simulated payment rails behind a port

- **Status:** **Accepted** — approved as written by the human (Technical Director) at 🚦 G-Foundational on 2026-11-09, with no changes requested.
- **Date:** 2026-11-09
- **Relates to:** BR-004, BR-005, BR-006, FR-027, FR-031, FR-032, brief §7, NFR-006

## Context

| Force | Detail |
|---|---|
| Brief "Won't" | No real banking integrations (Plaid, real ACH), no real money, no KYC. The product is a case study. |
| CR-5 | "Functional features: interactive elements that work as they would on a real platform." A payment must therefore *behave* like a payment: it goes `pending`, it has an estimated arrival, it settles, it can be canceled. |
| BR-004 | ACH settles after `ACH_SETTLE_SECONDS` (default 120 s), wire after `WIRE_SETTLE_SECONDS` (default 30 s), so the evaluator can watch a payment settle inside a 3-minute walkthrough. |
| Deadline | Whatever is built must fit inside feature 005's 3 h timebox together with the transfer, the recipients and idempotency. |
| Deployment | One Vercel deployment with no always-on process (ADR-0006), so there is no reliable place for a background worker or cron at this scope. |
| NFR-006 | Settlement must not corrupt balances and must be idempotent under concurrent reads. |
| Technical judgment (CR-6) | The evaluator should see that the fake is *isolated*, so replacing it with a real provider is an adapter swap, not a rewrite. |

## Options considered

### How to model the rail

| Option | Pros | Cons | Fit |
|---|---|---|---|
| **A port (`PaymentRailPort`) with a `SimulatedRail` implementation, injected into the payment service** | The service depends on an interface, not on the fake; a real provider becomes a second adapter; trivially stubbed in unit tests; makes the architectural point explicit for the evaluator | One small abstraction that has exactly one implementation today (a mild YAGNI charge) | ✅ **Chosen** |
| Settlement logic inline in the payment service | Fewer files | Hard-codes the fake into the business logic; the "swap in a real provider" story becomes a claim with no evidence; harder to test timing in isolation | ⚠️ Rejected |
| A real sandbox provider (for example a Stripe or Plaid sandbox) | Maximum realism | Account setup, API keys, network flakiness, possible cost, and an Art. 9 external-service decision — all against a 24 h deadline | ❌ Rejected |

### How to advance time

| Option | Pros | Cons | Fit |
|---|---|---|---|
| **Lazy settlement on read** — any read touching pending transactions first promotes those whose `settleAt <= now` | No infrastructure; works on a serverless deployment with no always-on process; naturally consistent with what the user is about to see; cheap to test with an injected `now` | A pending transaction stays `pending` in the database until someone looks; settlement is therefore observation-driven, which must be stated honestly in the README | ✅ **Chosen** (BR-004) |
| Vercel Cron / scheduled function | "Real" background settlement | Platform-specific, needs a schedule and an endpoint to secure, minimum granularity is coarser than a 30 s wire, and Hobby cron frequency is limited | ⚠️ Rejected for this scope |
| Client-side timer that calls a settle action | Visually immediate | Trusting the client to advance financial state is wrong, and it breaks if the tab closes | ❌ Rejected |
| `setTimeout` in the server process | Trivial to write | Does not survive a serverless invocation ending; silently loses settlements | ❌ Rejected |

## Decision

1. **Port.** `src/server/rails/payment-rail-port.ts` defines:
   - `submit(payment): { railReference, settleAt, status }` — accepts a validated payment intent and returns the simulated acknowledgement;
   - `cancel(railReference): { accepted: boolean }` — simulates a cancellation request;
   - `describe(method): { label, estimatedArrival }` — supplies the human copy for the review step (FR-029).
2. **Implementation.** `src/server/rails/simulated-rail.ts` implements the port with **no network access and no randomness by default**: `settleAt = now + delay(method)` where the delays come from `ACH_SETTLE_SECONDS` (default 120) and `WIRE_SETTLE_SECONDS` (default 30), read from the environment at the service edge and passed in — never read inside `domain`.
3. **Determinism.** The rail never fails spontaneously. A `failed` outcome is reachable only through an explicit, opt-in test seam (a configurable `failureMode` used by integration tests), so the `failed` status and its `--destructive` styling are exercised by tests without making the live demo flaky.
4. **Settlement is lazy (BR-004).** A single `settleDuePayments({ businessId, now })` service runs at the start of any read path that can show pending transactions (Home, Transactions, Payments, account reads). It:
   - promotes every `pending` transaction of that business with `settleAt <= now` to `posted`, setting `postedAt = settleAt` (not `now`, so the timeline stays truthful);
   - is **idempotent** — implemented as a conditional update guarded on `status = 'pending'`, so two concurrent reads promote a row exactly once and never overwrite `postedAt`;
   - never touches `canceled` or `failed` rows (BR-005).
5. **Time injection.** `now` is always passed in; `src/server/domain` never calls `new Date()` (money-and-time skill rule 8), which is what makes BR-004's timing testable without sleeping in tests.
6. **Cancellation.** FR-032 calls `cancel` on the port and then applies BR-005 in the service, inside a transaction, guarded on the row still being `pending` — so the cancel/settle race resolves deterministically to whichever condition still holds.
7. **Honesty.** The README states plainly that rails are simulated, that settlement is lazy and observation-driven, and that a real integration would be a second adapter behind the same port. No screen or copy claims a real network was contacted.

Rationale in one sentence (SP-7): a port plus lazy settlement gives a payment that genuinely behaves
like a payment on a deployment with no background process, while keeping the fake in one swappable
file — the discarded alternative, scheduled settlement, buys marginal realism for platform-specific
infrastructure we would have to secure and debug inside a 3 h timebox.

## Consequences

**Positive**
- A pending payment visibly settles during the evaluator's walkthrough, satisfying CR-5 without any real integration.
- `services` depend on an interface, so a real provider is an added adapter — the architectural claim in the README is backed by the code shape.
- No background infrastructure to configure, secure or pay for; nothing to break at 18:00 on deadline day.
- Settlement timing is unit-testable by injecting `now`, with no sleeping tests and no flakiness.
- The deterministic `failed` seam means the `failed` state is tested without random demo failures.

**Negative**
- Settlement happens only when someone reads, so a pending row can sit past its `settleAt` in the database. Honest and documented, but it is a difference from a real system.
- `settleDuePayments` must be called on every relevant read path; forgetting one leaves a stale `pending` on that screen. Mitigated by placing the call in the shared service used by each read, not in each page.
- One abstraction with a single implementation today (accepted YAGNI cost, justified by the swap story and by testability).

**Risks**
| Risk | Mitigation |
|---|---|
| Double settlement under concurrent reads | Conditional update guarded on `status = 'pending'`; integration test with two parallel reads asserting exactly one transition and an unchanged `postedAt` (BR-004 example 2) |
| A read path missing the settle call | The settle call lives inside the shared read services; an e2e test waits out an ACH delay and asserts the status flips on Home, Transactions and Payments |
| Cancel/settle race | Both paths are conditional updates inside a transaction; BR-005 example 2 is an explicit test |
| Settlement cost added to every read, on a cold database | The update is a single indexed, conditional statement over `(businessId, status, settleAt)`; measured as part of NFR-002 |

**What would make us reconsider**
- A real provider integration becoming in scope (then: a second adapter behind the same port, plus webhook handling, which would make scheduled or event-driven settlement the right model).
- A requirement that settlement be observable without anyone reading (then: a scheduled job, and `settleDuePayments` is already the function it would call).
