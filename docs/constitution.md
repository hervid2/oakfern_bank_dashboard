# Constitution — Oakfern
Version: 1.0.0 · Status: **Ratified** 2026-11-09 at 🚦 G-Foundational by Hernán Cardona (Technical Director) · Subordinate to: `GENESIS.md`

> Normative level 2 (GENESIS §A.2). It distils the brief, the requirements, the business rules, the
> domain model, the UI brief and ADR-0001…ADR-0006 into the rules that bind every agent and every
> commit. Where this document and a higher level conflict, the higher level wins and the conflict
> must be raised, not silently resolved (GENESIS §A.2 conflict rule).

## Preamble

Oakfern is a fictional digital-banking dashboard for US startups and SMBs: it must let a founder
answer, within ten seconds, how much cash they have, how much they burn, how much runway is left and
what has moved — and then let them move money safely. It exists to be evaluated by the Post Oak
Group hiring team as evidence of full-stack skill, UI/UX judgment, technical judgment and
disciplined use of AI. Its users are fictional; its quality is not.

## Title I — Product principles (prioritized)

1. **Correctness of money outranks everything.** A wrong balance, a duplicated payment or a drifting
   total is a failure no amount of polish compensates for.
2. **Answer in ten seconds, then allow depth.** Every screen leads with the number the user came
   for, and every number is clickable through to its evidence.
3. **Money is never a surprise.** No movement happens without a review step that names source,
   destination, amount, method and arrival, confirmed by a button stating the amount.
4. **Honesty over illusion.** Rails are simulated, settlement is lazy, data is generated — and the
   product and README say so plainly. Nothing in the UI claims a capability that does not exist.
5. **Originality is a constraint, not a preference.** Mercury and Slash inform patterns only. No
   borrowed name, logo, palette, copy or layout. The brand is `Oakfern`.

## Title II — Technical principles

- **Architecture:** layered modular monolith on Next.js App Router — `domain → services → repositories`, with `actions`/`app` as thin adapters (**ADR-0001**).
- **Deployment:** one Vercel Hobby deployment carrying frontend and server layer, with **Neon** (Free plan) as managed PostgreSQL for Preview and Production and Docker Compose PostgreSQL locally. No separate backend service (**ADR-0006**). Cost: USD 0.
- **Stack and pinned versions (ADR-0002, verified 2026-11-09):** Next.js `16.4.6` · React `19.3.1` · TypeScript `strict` · Tailwind CSS `4.3.5` · shadcn/ui CLI `4.23.0` (components copied into the repo) + `lucide-react` + `sonner` · Recharts `3.10.1` · Prisma + `@prisma/client` **`7.10.1`** (deliberately **not** the `latest` tag, which points at an 8.0.0 release candidate) · Zod `4.6.7` · React Hook Form · `jose` `6.2.17` · `date-fns` `4.4.0` · `@faker-js/faker` `10.6.0` (dev) · Vitest `5.1.0` · `@playwright/test` `1.65.0` · Node `22.17.0` · pnpm via corepack. Versions not yet verified (`@axe-core/playwright`, `@date-fns/tz`, `lucide-react`, `sonner`) must be verified against the registry at install time and recorded in the feature's `plan.md` — **never guessed** (Art. 14).
- **Folder and module structure:** as specified in `docs/architecture/overview.md`. Binding import rules:
  - `server/domain` imports no framework, no Prisma, no `process.env`, and never calls `new Date()`;
  - `server/repositories` is the **only** place that imports Prisma, and every method takes `businessId`;
  - `actions`/`app` never import Prisma or repositories directly;
  - `components/**` performs **no** money arithmetic.
- **Testing strategy and thresholds:** test pyramid — many unit tests in `server/domain`, some integration tests against a real PostgreSQL, few Playwright e2e tests over flows F-1…F-6. Line coverage **>= 80 %** in `src/server/domain`. Every acceptance criterion has at least one test whose title carries its `AC-NNN-xx` id.
- **Code style and tooling:** TypeScript `strict` with zero errors; ESLint with zero errors; Prettier; no `any` in `src/server/domain`.
- **Error handling, logging and observability:** `error.tsx` and `not-found.tsx` per route segment; no stack trace reaches the browser; one structured JSON log line per money mutation (actor, business, operation, amount in cents, idempotency key, result) with **no PII and no account numbers**; `GET /api/health` reports app and database status.

## Title III — Non-negotiable rules

**Security and privacy**
- No secret in code, logs, commits, examples or documentation. Environment variables only; `.env.example` lists every key with no value (Art. 8). A missing `SESSION_SECRET` must fail loudly, never fall back to a default.
- Every server input validated with Zod at the boundary.
- Authorization enforced in **every** Server Action and Route Handler through the shared guard. The UI never decides permissions; middleware is convenience, not the boundary.
- Every data access scoped by the session's `businessId`. A record of another business returns **404**, never 403 or partial data.
- Session cookie `httpOnly` + `Secure` + `SameSite=Lax`, 8 h lifetime, signed with `jose` (ADR-0004). Never homemade cryptography.
- Account, routing and card numbers are generated and only ever leave the server **masked**.
- CSV exports neutralise leading `=`, `+`, `-`, `@`.
- Security headers set: CSP, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`.

**Data**
- **Monetary amounts are never floating point.** Signed integer USD cents everywhere; inflow `> 0`, outflow `< 0`; `direction` is derived, never persisted (BR-001, ADR-0003). One parser (`parseMoneyToCents`) and one formatter (`formatCents`) exist, and no others.
- Amounts are never rounded at an intermediate step; rounding happens once, at the end, with the mode documented.
- Timestamps are stored in UTC; **every** day and month boundary is computed in `America/New_York` through `src/server/domain/time.ts`. Ranges are half-open `[start, end)` (BR-009).
- **Internal transfers are excluded** from money in/out, net burn, runway, the cash-flow chart and spending by category — and included in balances and the transactions list (BR-011).
- Money mutations are atomic (one database transaction) and idempotent (a client-minted key, unique per business) (BR-003, BR-006, NFR-006).
- The BR-002 balance invariant (`currentBalance = Σ posted`, `availableBalance = currentBalance − |pending outflows|`, `availableBalance <= currentBalance`) holds after every operation and is asserted in tests.
- Only `pending` payments may be canceled (BR-005). A `posted` transaction is immutable except for `category` and `note`.
- **Never real production data.** All data is fictional and generated with a fixed seed.

**Regulatory compliance**
- `N/A` — no real money, no real customers, no regulated activity. PCI, SOC 2 and GLBA do not apply to a fictional demo with no real payment instruments. This is stated in the README rather than implied.

**Project-specific prohibitions**
- No borrowed identity: no Mercury or Slash logo, name, palette, copy or layout. Any resemblance flagged by a reviewer is a **mandatory stop** (`CLAUDE.md`).
- No hardcoded hex colours in components; shadcn CSS variables only. Red (`--destructive`) is reserved for errors, failures and destructive confirmations — **not** for ordinary outflows. Colour is never the only signal.
- No full-page spinners; loading states are content-shaped skeletons.
- No money arithmetic in React components (NFR-011).
- No `parseFloat` or `toFixed()` in money logic (verified by `git grep` per the `money-and-time` skill).
- No new dependency without an Art. 10 record (purpose, alternatives including "don't add it", licence, maintenance, weight). "Don't add it" is a legitimate outcome and has already been chosen twice (URL state, client state).
- No `git push --force`, no history rewriting, no skipping hooks.

## Title IV — Conventions

| Topic | Rule |
|---|---|
| Language — documents | **English** (SP-10) |
| Language — code, identifiers, commits, UI | **English** |
| Language — chat with the human | **Spanish** |
| Naming | From `docs/glossary.md`. One concept, one name, across documents, code, database and UI. Forbidden synonyms are listed there and are a review finding |
| Identifiers | `FR-xxx`, `NFR-xxx`, `BR-xxx`, `AC-NNN-xx`, `T-xx`, `ADR-xxxx`, `ASM-xxx`, `OQ-xxx`, `UI-xx`, `RSK-xx`, `CR-n`. What has no ID does not exist (Art. 4) |
| Git — branches | `main` is protected; one `feat/NNN-slug` branch per feature |
| Git — commits | Conventional Commits with the task id, e.g. `feat(transactions): add URL filter parsing [T-03]`. One logical commit per task (Art. 15) |
| Git — pull requests | **One PR per feature**, so the SDD trail is visible to the evaluator. Merge only on green CI |
| Dates | Stored UTC; displayed `en-US` medium format in `America/New_York`, labelled "ET" where ambiguous |
| Currency | USD only, `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })` through `formatCents`; figures in `tabular-nums`, right-aligned in tables |
| Time zone | `America/New_York` for every boundary and every display |
| Locale | `en-US` only |

## Title V — Quality

**Definition of Ready** (to move a spec to planning — GENESIS §C.5 plus):
- the spec's acceptance criteria are written as Given/When/Then with `AC-NNN-xx` ids and cover the happy path, the errors, the empty/loading/error states and every applicable `BR`;
- every referenced screen exists in `docs/ux/ui-brief.md` as a `UI-xx`;
- all BLOCKER and MAJOR clarifications are resolved; MINOR ones are recorded as `ASM`;
- the estimated task time fits the feature's timebox in `docs/roadmap.md`, or a MoSCoW cut has been proposed.

**Definition of Done** (for 🚦 G-Merge — GENESIS §C.6 plus):
- every `AC` has at least one passing test whose title carries its id;
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:int`, `pnpm build` and `pnpm test:e2e` all green in CI on the feature branch;
- coverage in `src/server/domain` >= 80 %;
- the balance invariant test passes (for any feature touching money);
- `axe` reports no serious or critical violations on the touched screens, and the NFR-004 viewports show no horizontal scroll;
- no secret added; `.env.example` updated if a key was introduced;
- `docs/traceability.md` updated; `MEMORY.md` updated with time consumed;
- the validation report(s) exist in `specs/NNN-*/` and are consolidated into `validation.md`;
- the Preview deployment works.

**Timebox rule (SP-6):** if a feature exceeds its timebox by +30 %, work stops and a MoSCoW cut is
proposed before continuing. Cut order: 006 → Could items → 004 reduced to 2 charts → CSV →
recategorize.

## Title VI — Collaboration with agents

| Topic | Setting |
|---|---|
| Mentor mode | **on**, short form (SP-7): at most one sentence of "why" per relevant decision, with the discarded alternative named |
| Autonomy level | The Implementer works autonomously **within** an approved plan; at most 3 diagnose→fix→verify cycles per failure, then escalate with diagnosis, hypotheses and options (Art. 12) |
| Gates | 🚦 G-Foundational · 🚦 G-Harness · per feature 🚦 G-SpecPlan and 🚦 G-Merge (SP-2) |
| Evidence | Nothing is "done" without executed evidence: command output, green tests, screenshots or an e2e report (Art. 5). "It should work" is not evidence |
| Context | Decisions and handoffs travel through files, never through remembered conversation (Art. 11) |
| Current sources | Versions, APIs and library signatures are verified against current documentation or the registry before being written (Art. 14). An unverifiable fact is declared as a risk, never guessed |
| Additional project-specific stops | Any action touching external accounts (GitHub, Vercel, Neon), any production deployment, any cost; any scope cut or MoSCoW change; **any brand or UI resemblance to Mercury or Slash flagged by a reviewer** |

## Amendment log

| Version | Date | Change | Reason | Approved by |
|---|---|---|---|---|
| 1.0.0 | 2026-11-09 | Initial constitution distilled from the brief, requirements, domain model, UI brief and ADR-0001…ADR-0006 | Phase G3 of the Genesis Protocol under the Sprint Profile | **Ratified** at 🚦 G-Foundational, 2026-11-09, by Hernán Cardona (no changes requested) |
