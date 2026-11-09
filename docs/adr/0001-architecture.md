# ADR-0001 — Application architecture: layered modular monolith on Next.js

- **Status:** **Accepted** — decided by the human in Round 0 (OQ-002) and re-confirmed when
  resolving OQ-003. The **deployment topology and managed-database host** are decided separately and
  are now also **Accepted** in [ADR-0006](0006-deployment-and-database-hosting.md): a single Vercel
  Hobby deployment with Neon as the managed PostgreSQL host.
- **Date:** 2026-11-09
- **Supersedes / superseded by:** —

## Context

Forces at play:

| Force | Detail |
|---|---|
| Hard deadline | Submission by 2026-11-10 18:00 ET; ~18 h of feature work budgeted against ~24 h wall clock (KICKOFF §5–§6). Deployment risk must be front-loaded, not deferred. |
| What is evaluated | Full-stack skill, UI/UX, **technical judgment**, and efficient AI use (CR-6). The evaluator must be able to see backend judgment, not only React screens (ASM-013). |
| NFR-006 reliability | Money movements must be atomic and idempotent, with the BR-002 balance invariant always holding, including under concurrency. This needs real database transactions in a layer that is testable without a browser. |
| NFR-001 performance | Lighthouse Performance >= 85 and LCP < 2.5 s on the deployed Home argue for server rendering rather than a client-side fetch waterfall. |
| NFR-007 maintainability | TypeScript `strict`, no `any` in the domain, >= 80 % coverage in `src/server/domain`. The business logic must be unit-testable with no framework in the way. |
| KICKOFF §3.10 | The stack must build on the human's existing CV stack; new technology only with justification (Art. 10). |
| Risk RSK-02 | "Deployment breaks at the end" — mitigated by fewer moving parts and by deploying from feature 000 onward. |

## Options considered

(Trade-off table reproduced from KICKOFF §4.1.)

| Option | Pros | Cons | Fit with NFRs and the deadline |
|---|---|---|---|
| **A. Full-stack Next.js modular monolith** — App Router, RSC for reads, Server Actions for mutations, Route Handlers for health / CSV / optional REST, an `src/server` layer with `domain → services → repositories`, Prisma + PostgreSQL | One deployment and one repository; maximum speed; end-to-end types; the human masters the stack; business logic isolated and testable without the framework | An evaluator might read it as "frontend with extras" — mitigated by the explicit `src/server` layer, this ADR and the README | ✅ **Chosen.** Best NFR-001 (RSC), NFR-006 (one DB, real `$transaction`), NFR-007 (pure domain), lowest deployment risk |
| B. Turborepo: Next.js + a separate NestJS API (Railway / Render) + managed Postgres | Shows NestJS and physical separation; matches the CV | Two deployments, CORS, cross-domain cookies, +4–6 h, more failure surface at the last moment | ⚠️ Risky inside 24 h. Kept as the README "next step" |
| C. React SPA (Vite) + Fastify | Classic separation | Loses RSC/SSR (worse LCP, so NFR-001 at risk), two deployments, more fetching code to write by hand | ❌ Rejected |

## Decision

**Option A** — a layered modular monolith on Next.js App Router, with Prisma and PostgreSQL.

Binding layering rule:

| Layer | Content | Hard constraint |
|---|---|---|
| `src/server/domain` | Pure TypeScript: money, balances, metrics, time, transfer rules, filters, CSV escaping | No Next.js, no Prisma, no React, no `process.env`, no `new Date()` — `now` is injected |
| `src/server/services` | Use cases; owns the `$transaction` boundary; orchestrates domain + repositories + rails | No React, no Next.js request APIs |
| `src/server/repositories` | **The only layer that imports Prisma.** Every method takes `businessId` | No service logic, no framework |
| `src/actions`, `src/app` | Thin adapters: Zod parse → auth guard → service call → revalidate | Must not import Prisma or repositories directly |
| `src/components/**` | Presentation only | No money arithmetic (NFR-011) |

Rationale in one sentence (SP-7): option A maximises delivered quality per hour and minimises
last-minute deployment risk while still demonstrating backend judgment through an explicit,
framework-free server layer — the discarded alternative being option B, whose two deployments,
CORS and cross-domain cookie work would cost 4–6 h we do not have.

## Decided separately (OQ-003, now resolved)

| Sub-decision | Outcome | Where |
|---|---|---|
| Deployment topology | **Single Vercel Hobby deployment** — frontend and server layer together; no separate backend service | [ADR-0006](0006-deployment-and-database-hosting.md) |
| Managed PostgreSQL host | **Neon** for Preview and Production; Docker Compose Postgres locally | [ADR-0006](0006-deployment-and-database-hosting.md) |
| USD 0 cost constraint (KICKOFF §3.10, brief TC-2) | **Upheld** — Vercel Hobby + Neon Free, both permanently free; Railway rejected because it has no permanent free tier | [ADR-0006](0006-deployment-and-database-hosting.md) |

The human had created Railway and Vercel accounts and initially preferred Railway for the database
"and the backend". A modular monolith has **no separately deployable backend**, so that preference
was resolved explicitly: option B (a separate NestJS API on Railway) was rejected again on deadline
risk and stays a README "next step", and Railway as the database host was rejected on cost
(RSK-10). Option A therefore stands unchanged.

## Consequences

**Positive**
- One build, one deployment, one set of environment variables: the smallest surface that can break at 18:00 on deadline day (RSK-02).
- RSC reads remove most client fetching code, directly serving NFR-001.
- The pure `domain` layer makes BR-001…BR-011 unit-testable with injected `now`, serving NFR-007 and the money-and-time skill rules.
- Services own the `$transaction` boundary, so NFR-006 atomicity, idempotency and concurrency have one place to be enforced and tested.
- Because `src/server` imports no framework, option B remains reachable later as an added adapter rather than a rewrite (ASM-020).

**Negative**
- Server Actions are a Next.js-specific mutation mechanism; porting to another framework means rewriting `src/actions` (thin by design).
- NestJS, present on the human's CV, is not demonstrated in running code. Mitigated by the layering, this ADR and a README "next steps" section.
- A single deployment couples frontend and backend release cadence. Irrelevant at this scope.

**Risks**
- ASM-013: the evaluator may read a monolith as "frontend only". Mitigation: the `src/server` tree, this ADR, the layering table in the README, and integration tests that exercise services without any UI.
- RSK-04: Neon's compute autosuspends after 5 minutes of inactivity, so the evaluator's first request pays a cold start. Mitigated by loading skeletons (NFR-010) and a README note; the NFR-001 Lighthouse run must be performed on a warmed deployment (ADR-0006).

**What would make us reconsider**
- The human requiring a separately deployed, independently scalable API (then: option B, and this ADR is superseded).
- A need for a non-HTTP consumer (mobile app, partner integration) that makes a standalone API worthwhile.
- Server Action limitations blocking a required behaviour (none identified so far).

## Sources

- KICKOFF §4.1 trade-off table (human's own discovery), §3.10 constraints, §5 timeboxes.
- Round 0 decision record: OQ-002 → Option A, `docs/discovery/brief.md`.
