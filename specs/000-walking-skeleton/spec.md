# Spec 000 — Walking skeleton
Status: Draft · Version: 0.3 · Branch: feat/000-walking-skeleton · FR: FR-038, FR-039 (root shell only) · Depends on: — (🚦 G-Foundational ✅, 🚦 G-Harness ✅)

> **Version 0.2** applies all seven findings of `specs/000-walking-skeleton/clarifications.md`
> (CL-01…CL-07) and records two decisions granted by the Technical Director on 2026-11-09:
> the **production-deploy deferral** (OQ-008, see §10 AC-000-12a / AC-000-12b and the amended rows in
> `docs/discovery/brief.md` and `docs/roadmap.md`) and **sharing the Neon primary database for
> Preview** (OQ-010, resolved).
>
> **Version 0.3** applies the Technical Director's decision of 2026-11-09 to **protect the 1 h 45 min
> timebox**: `@axe-core/playwright` is **not** installed in feature 000 and **no axe scan runs in
> 000**. This is scope-cut candidate (a), already sanctioned in §4.2 of version 0.2. The whole
> NFR-003 surface — the axe scan of `/` included — moves to **feature 003**, where the axe matrix is
> due anyway. Feature 000 keeps only what it can execute: the document-shell assertions in the e2e
> test. **TD-008 stays open** and is carried forward, not closed.

## 1. Goal
Prove the whole toolchain end to end before any business logic exists: a Next.js App Router
application with TypeScript `strict`, linting, unit / integration / e2e test runners, a real
PostgreSQL reached through Prisma, an unauthenticated `GET /api/health` reporting database
reachability (FR-038), a GitHub Actions CI that gates the PR, and a Vercel deployment backed by Neon.
This front-loads the deployment and infrastructure risk (RSK-02) so features 001–008 can assume a
working pipeline, and it turns the UNVERIFIED command table in `AGENTS.md` into executed, verified
fact.

## 2. Scope

| Includes | Does not include |
|---|---|
| `package.json` with the ADR-0002 pinned dependencies and the `AGENTS.md` script contract; pnpm via corepack; Node `22.17.0` pinned (`.nvmrc` + `engines`) | Any dependency not needed by the skeleton (Recharts, shadcn components, jose, faker, React Hook Form, `@date-fns/tz`, `lucide-react`, `sonner` — they arrive with 001+), and **`@axe-core/playwright`, deferred to feature 003 by the human's decision of 2026-11-09 (TD-008 stays open)** |
| Next.js App Router scaffold with TypeScript `strict`, ESLint + Prettier, Tailwind CSS v4 base and the `next/font` Geist setup | The app shell (sidebar, topbar, theme switch, responsive layout, dark mode) — feature 001 |
| A minimal placeholder route at `/` whose only purpose is to be rendered by the e2e test | UI-01 landing / demo login, UI-02…UI-08 — features 001+ |
| ADR-0001 directory skeleton (`src/server/{domain,services,repositories}`, `src/actions`, `src/lib`, `tests/{unit,integration,e2e}`) with the ESLint `no-restricted-imports` layering rules, including the rule that forbids `src/app` and `src/actions` from importing `@prisma/client` or `src/server/repositories` | Any domain logic — `src/server/domain` ships **empty** in 000 |
| **One health service/repository pair required by FR-038 (CL-01):** `src/server/services/health.ts` (`checkDatabaseHealth()`) and `src/server/repositories/health.ts` (`pingDatabase()`, the only file importing Prisma). The skeleton must itself obey the ADR-0001 layer rules it installs | Any other service or repository with behaviour — features 001+ |
| Vitest configured with a `unit` and an `integration` project + **one real unit test** that asserts actual behaviour of project code (not `expect(true)`) | — |
| **One real integration test (CL-04):** connects through the generated Prisma client to the Docker Compose / CI Postgres and asserts the FR-038 health repository reports the database reachable | Integration tests for atomicity, idempotency, concurrency, anti-IDOR and query timing — features 003 / 005 |
| Coverage **reporting** enabled for `src/server/domain` with **no threshold** (CL-05) | The NFR-007 >= 80 % line-coverage **threshold**, which is added in feature 001 in the same task as the first `domain` code (recorded as an explicit 001 task) |
| Playwright configured (chromium) + **one e2e test** covering the placeholder `/`, its document shell (`<html lang="en">`, a `<title>`, exactly one `<h1>`) and `GET /api/health` | **The whole NFR-003 surface — the axe scan of `/` included — plus the NFR-004 viewport matrix, the `webkit` project and the keyboard pass. All of it moves to features 003 / 007** |
| `docker-compose.yml` with PostgreSQL for local dev and integration tests (OQ-006) | A seeded database, `prisma/seed.ts`, demo reset — features 001 / 008 |
| `prisma/schema.prisma` with the PostgreSQL datasource, a generated client, and **one** throwaway migration proving `pnpm db:migrate` works | The real domain schema (Business, Account, Transaction, …), indexes, enums — feature 001 |
| `src/app/api/health/route.ts` implementing FR-038 as a thin Route Handler | Zod validation (the endpoint takes no input) and structured money-mutation audit logging (NFR-009) — features 001 / 005 |
| Root `error.tsx` + `not-found.tsx` only (the FR-039 root-shell portion) | Per-segment error states for data views (FR-039 in full) — features 001 / 007 |
| GitHub Actions workflow: `lint → typecheck → unit → integration → build → e2e` against a Postgres service container | Lighthouse and a11y-matrix jobs in CI — feature 007 |
| `.env.example`, full `.gitignore` (covers `.env*`, `.next/`, `node_modules/`, `.playwright-mcp/`, test output), `README.md` stub | The submission README (FR-043) — feature 008 |
| One PR against `main` (GitHub web UI, OQ-007) with green CI, and a Vercel **Preview** deployment against the Neon primary database (OQ-010) | The **Production** deployment, deferred by the human's decision of 2026-11-09 and carried as AC-000-12b |

## 3. Actors and permissions

| Actor | Interaction in this feature |
|---|---|
| `operator` (the human, or an uptime check) | Calls `GET /api/health` unauthenticated and reads app + database status (FR-038) |
| `anonymous` visitor | Can reach the placeholder `/` route and the not-found page; there is nothing authenticated yet |
| `admin`, `viewer` | N/A — no session, no authentication and no authorisation exist until feature 001 (ADR-0004) |
| Implementer agent | Runs every command locally and pastes the output as evidence (Art. 5) |
| Human (Technical Director) | Owns every Art. 9 action: pushing the branch, creating the PR, merging, and authorising the production deployment (OQ-008, deferred) |

No role model, guard or `businessId` scoping exists yet; `GET /api/health` is deliberately
unauthenticated per FR-038 and must therefore expose **no** secrets, connection strings or stack
traces. The response key whitelist in §8.1 is what makes that machine-checkable.

## 4. Flows

### 4.1 Main flow
1. Enable pnpm through corepack; scaffold the Next.js App Router project with TypeScript `strict`.
2. Pin every dependency exactly as ADR-0002 states (no `^`); install `prisma` and `@prisma/client`
   **both at `7.10.1`** — never a bare `pnpm add prisma` (RSK-09, TD-009). None of the four TD-008
   packages is installed in 000; each is verified at install time by the feature that first needs it.
   Guess nothing (Art. 14).
3. Add ESLint + Prettier, including the ADR-0001 `no-restricted-imports` layer rules
   (`src/server/domain` → no Prisma / no Next; `src/app` and `src/actions` → no `@prisma/client` and
   no `src/server/repositories`), and create the empty layer directories.
4. Replace the minimal Genesis `.gitignore` with the full version; add `.env.example`; create
   `.env.local` locally (never committed).
5. Start local PostgreSQL with `docker compose up -d`; point `DATABASE_URL` at it.
6. Add `prisma/schema.prisma` (PostgreSQL datasource) and run `pnpm db:migrate` to produce the first
   committed migration.
7. **Implement FR-038 on the lawful ADR-0001 path (CL-01):** `src/app/api/health/route.ts` is a thin
   Route Handler that calls `checkDatabaseHealth()` in `src/server/services/health.ts`, which calls
   `pingDatabase()` in `src/server/repositories/health.ts` — the only file importing Prisma. The
   Route Handler never imports Prisma or a repository, because the ESLint rules installed in step 3
   forbid exactly that.
8. Add root `error.tsx` and `not-found.tsx` (the FR-039 root-shell portion) and the placeholder `/`
   route with a valid document shell (`<html lang="en">`, a `<title>`, one `<h1>`).
9. Configure Vitest with a `unit` and an `integration` project. Write (a) one real unit test, and
   (b) **one integration test** that connects through the generated Prisma client to the Compose
   database and asserts `pingDatabase()` reports the database reachable. Configure Playwright and
   write one e2e test covering `/`, its document shell and `/api/health`.
10. Run the full local gate: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:int`,
    `pnpm build`, `pnpm test:e2e`. Paste the output.
11. Run the AC-000-03 lint probe: create `src/server/domain/__lint-probe.ts` importing
    `@prisma/client`, run `pnpm lint`, paste the failing `no-restricted-imports` output, then delete
    the file. It is **never committed**.
12. Add the GitHub Actions workflow; push the branch; the human opens the PR in the GitHub web UI
    (OQ-007).
13. Verify CI is green and the Vercel **Preview** deployment responds, with `DATABASE_URL` pointing
    at the Neon primary (project `sweet-feather-13830390`, OQ-010).
14. Correct the `AGENTS.md` "Project commands" table with the real, executed commands and remove the
    UNVERIFIED warning.
15. Close at 🚦 G-Merge on the AC-000-12a evidence list. **AC-000-12b (production) stays open** until
    the human grants OQ-008's production authorisation; it is carried as an open roadmap row.

### 4.2 Alternative flows
| Trigger | Behaviour |
|---|---|
| Docker daemon unavailable (RSK-07) | Fall back to a dedicated Neon **branch** as the local database by changing `DATABASE_URL` only; `docker-compose.yml` is still committed. Record it as a deviation in `validation.md`. |
| A pinned version fails to install or build | Max 3 self-correction cycles (Art. 12), then escalate. ADR-0002's documented fallbacks are Tailwind `3.4.19` / Next `15.5.x`, and they require an ADR amendment, not an ad-hoc edit. |
| ~~`@axe-core/playwright` proves incompatible~~ | **Moot in 0.3** — the human applied this cut pre-emptively on 2026-11-09 to protect the timebox: no axe in 000, the whole NFR-003 surface moves to feature 003. |
| Production authorisation (OQ-008) granted mid-feature | Run AC-000-12b immediately after merge and mark the deferred roadmap row closed. |
| Production authorisation still not granted at 🚦 G-Merge | Expected case. 000 closes on AC-000-12a; AC-000-12b is verified later. Features 001–007 are **not** blocked. |

### 4.3 Error flows
| Case | Expected behaviour |
|---|---|
| Database unreachable when `/api/health` is called | Respond **503** with exactly the 503 body of §8.1. No stack trace, no connection string, no credential, no host name. |
| Health handler (or the service, or the Prisma call) throws unexpectedly | Also **503** with the same 503 body — the handler catches, so a `500` HTML error page is never produced (an uptime check must always be able to parse JSON). |
| Unknown route requested | Root `not-found.tsx` renders a human message and a link back to `/`. HTTP status 404. |
| A render throws inside the root segment | Root `error.tsx` renders a human message plus a retry affordance; no stack trace reaches the browser (FR-039, NFR-009). |

## 5. Applicable business rules (BR-xxx, with examples)

**N/A — no business rule applies to feature 000.** The skeleton moves no money, computes no metric
and aggregates no date, so BR-001…BR-011 have no surface here. BR-001 (integer cents) and BR-009
(`America/New_York`) first apply in feature 001, where the schema is written. The reviewer confirmed
this reading in `clarifications.md` §"Verified clean".

Two preventive guardrails are nevertheless set up now so the BRs are enforceable later:

| Guardrail | Example 1 (normal) | Example 2 (edge case) |
|---|---|---|
| ESLint layer rules (ADR-0001) | A file under `src/app/` importing `@prisma/client` or `src/server/repositories` fails `pnpm lint` — which is precisely why FR-038 goes through a service (§4.1 step 7) | A file under `src/server/domain/` importing `@prisma/client` fails `pnpm lint` even though it type-checks fine — proved by the AC-000-03 lint probe |
| No floats for money, enforced from the start | `prisma/schema.prisma` declares no `Float` or `Decimal` column | A future `amountCents` column must be `Int`; feature 000's throwaway migration must not introduce any numeric money column at all |

## 6. Data

| Topic | Decision for feature 000 |
|---|---|
| Affected entities | None of the domain model. Exactly **one** throwaway entity whose only purpose is to prove `prisma migrate` and client generation work (ASM-023). |
| New or modified fields | Only that entity's `id` and a timestamp. No money column, no `amountCents`, no enum. |
| Validations | N/A — `/api/health` takes no input, so there is nothing for Zod to parse. Zod is still installed (ADR-0002) and first used in 001. |
| Migrations | One migration committed under `prisma/migrations/`. **Rollback strategy:** the migration creates a single table referenced by no business code, so rollback is `DROP TABLE` (or it is simply superseded by feature 001's schema migration). Nothing depends on it. Forward-only during the sprint. |
| Database access | Only through `src/server/repositories/health.ts` (`pingDatabase()`), the single Prisma importer in 000. |
| Local database | Docker Compose PostgreSQL published on host **`5433`** (container-internal and CI still `5432`). **Corrected 2026-11-09 during T-04:** the earlier claim that 5432 was free was **wrong** — a native Windows service `postgresql-x64-18` is listening on it, and `localhost` connections reached that server instead, failing with `P1000: Authentication failed`. No AC asserts the port; AC-000-05 only requires the migration to apply. Also note `postgres:18` requires its volume mounted at `/var/lib/postgresql`, not the pre-18 `/var/lib/postgresql/data`, or the entrypoint aborts. |
| CI database | A PostgreSQL service container in the GitHub Actions job, so CI and local are identical (ADR-0006). The integration test is what proves they agree. |
| Preview / Production database | Neon project `sweet-feather-13830390` (Postgres 18, `aws-us-east-1`), reached through `DATABASE_URL` set in Vercel. **OQ-010 resolved 2026-11-09: Preview shares the Neon primary** — smallest deadline surface; revisited before feature 001 writes the real migration, when a per-PR Neon branch becomes worthwhile. |
| Seed | N/A — the deterministic seed is FR-036, feature 001. |

## 7. Interface

| Item | Decision |
|---|---|
| Screens (UI-xx) | **None of UI-01…UI-08 is implemented in 000.** UI-01 is feature 001; UI-08 is 001 (shell) / 007 (polish). Feature 000 adds only a deliberately plain placeholder at `/` carrying the product name and a line stating the app is being built — it is replaced by UI-01 in feature 001 and must not attempt a landing-page layout. |
| Behaviour | The placeholder renders server-side with no data fetching. `/api/health` is a Route Handler, not a page. |
| Document shell (applies, CL-07 — **the only UI criterion 000 verifies**) | `<html lang="en">`, a `<title>`, exactly one `<h1>`. All three are DOM facts asserted by the e2e test (AC-000-09), so the requirement has a verifier that actually runs in 000. |
| Deferred to feature 003 with the rest of NFR-003 (0.3) | The `axe` scan of `/` **and the >= 4.5:1 text-contrast check**. Neither has an executable verifier in 000 once axe is cut, and a requirement with no verifier is the defect CL-06 and CL-07 objected to — so rather than leave it unverified, 000 does not claim it. Feature 003 runs axe (which measures contrast) over `/` as well as UI-02 / UI-03 / UI-05. |
| Not applicable in 000 (CL-07) | UI-01 layout criteria; the NFR-004 viewport / table matrix; NFR-010 empty, loading and skeleton states; dark-mode review. There is no data view and no table to measure. |
| Empty state | N/A — no data view exists yet. First applies in 001 / 002. |
| Loading state | N/A — the placeholder fetches nothing, so there is no loading boundary. Skeletons (NFR-010) start in 001. |
| Error state | Root `error.tsx`: heading, one human sentence, a retry button. No stack trace (FR-039). |
| Not-found state | Root `not-found.tsx`: heading, one human sentence, a link to `/`. HTTP 404. |
| Success state | N/A for the UI. For the API, success is the 200 JSON body of §8.1. |
| Key copy (English, SP-10) | Placeholder `<h1>`: "Oakfern" · body: "Banking dashboard — setup in progress." · Error: "Something went wrong loading this page." + "Try again" · Not found: "We couldn't find that page." + "Back to home" |
| Brand | Teal accent on cool slate neutrals, Geist via `next/font` (`ui-brief.md` §1). Nothing resembling Mercury or Slash — trivially satisfied by a text-only placeholder. |

## 8. Integrations and contracts

### 8.1 `GET /api/health` (FR-038, NFR-009) — frozen contract (CL-03)
Unauthenticated. No request parameters. `Cache-Control: no-store`.
`Content-Type: application/json` in **every** case.

| Condition | Status | Body — keys are **exactly** these, no more, no fewer |
|---|---|---|
| App up and the database answers | `200` | `{ "status": "ok", "database": "ok", "latencyMs": <number>, "timestamp": "<ISO-8601 UTC>" }` |
| App up, database does not answer | `503` | `{ "status": "degraded", "database": "unreachable", "timestamp": "<ISO-8601 UTC>" }` |

Contract constraints:
- The 200 key list is exactly `["status","database","latencyMs","timestamp"]`; the 503 key list is
  exactly `["status","database","timestamp"]`. The order is irrelevant; the set is not.
- **`version` is deliberately absent in 000.** A build sha would have to come from an environment
  variable, which collides with the no-environment-value rule below. If a build identifier is ever
  wanted, it is added by a later spec with its own AC — not improvised here.
- **An unexpected throw anywhere in the handler, the service or the Prisma call is also `503` with
  the 503 body — never a `500` HTML page.**
- Because the key set is closed, the body cannot contain a connection string, credential, host name,
  environment-variable value or stack trace. Non-leakage is therefore proved by an executed key
  assertion (AC-000-06, AC-000-07), not by a reviewer's reading.
- `status` is the single field an uptime monitor needs.

### 8.2 Other integrations
| System | Contract in 000 |
|---|---|
| GitHub Actions | Workflow runs on `pull_request` and on `push` to `main`; jobs `lint → typecheck → unit → integration → build → e2e`; a red job blocks the merge. Secrets are GitHub secrets, never repository files. |
| Vercel | Git integration: Preview per PR (mandatory in 000), Production on `main` (deferred, AC-000-12b). `DATABASE_URL` configured by the human in the Vercel dashboard. |
| Neon | Reached only via `DATABASE_URL`; Preview shares the primary (OQ-010). Compute autosuspends after 5 min, so the first Preview request may be slow (RSK-04) — expected, and not to be "fixed" with retry hacks. |
| Repository | `https://github.com/hervid2/oakfern_bank_dashboard` — the authoritative URL per `MEMORY.md`. |
| Payment rails | N/A — simulated and introduced in feature 005 (ADR-0005). |

## 9. Applicable non-functional requirements (NFR-xxx)

| NFR | How 000 contributes | Verified here? |
|---|---|---|
| NFR-007 (maintainability) | TypeScript `strict` with 0 errors, ESLint 0 errors, the ADR-0001 layer import rules active and **proved** by the lint probe, and all three test runners wired. Coverage **reporting** is enabled for `src/server/domain` with **no threshold** (CL-05): a threshold over an empty directory would report 0 % and fail CI. The NFR-007 >= 80 % threshold is added in feature 001 alongside the first `domain` code. | ✅ partially — AC-000-02, AC-000-03, AC-000-04 |
| NFR-009 (observability / safety) | `GET /api/health` reports app + database status on a frozen, closed-key contract; root `error.tsx` and `not-found.tsx` exist; no PII and no secrets in any log line. | ✅ for the health endpoint and the root error surfaces |
| NFR-005 (security) | 0 secrets in the repository (`.gitignore` covers `.env*`; `.env.example` documents the keys with placeholders); the health response leaks nothing by construction (§8.1). Zod boundaries, session cookie flags, security headers and anti-IDOR tests arrive with 001 / 003 / 005. | ✅ only for the "no secrets, no leakage" part — AC-000-07, AC-000-13 |
| NFR-003 (accessibility) | **Deferred to feature 003** by the human's decision of 2026-11-09 (timebox protection). 000 verifies only the document shell — `<html lang="en">`, a `<title>`, one `<h1>` — which is a DOM assertion, not an a11y audit. The axe scan, the contrast threshold, the Lighthouse >= 95 score and the UI-02 / UI-03 / UI-05 matrix are all features 003 / 007. | Document shell only — AC-000-09. The NFR itself is **not** claimed by 000. |
| NFR-001, NFR-002, NFR-004, NFR-006, NFR-008, NFR-010, NFR-011 | N/A in 000 — there is no data view, no table, no money mutation and no metric to measure. Owned by features 002–007 per `docs/requirements/non-functional.md`. | N/A |

## 10. Acceptance criteria

> Every AC is verifiable by an executed command or a browser check, because the reviewer validates
> 000 with focus `combined` and Art. 5 requires executed output as evidence.

| AC | Criterion | Covers |
|---|---|---|
| **AC-000-01** | Given a clean clone of the branch, when the Implementer runs `pnpm install`, then dependencies install with no error and the resolved `prisma` and `@prisma/client` versions are both exactly `7.10.1`, every ADR-0002 version is pinned exactly (no `^` in `package.json`), and `pnpm-lock.yaml` is committed. | ADR-0002, TD-008, TD-009 |
| **AC-000-02** | Given the scaffolded project, when `pnpm lint` and `pnpm typecheck` run, then both exit 0 with 0 errors, `tsconfig.json` has `strict: true`, **`node -v` matches the `22.17.0` pinned in `.nvmrc` and `engines`**, **`pnpm -v` resolves through corepack**, and the ADR-0001 directories (`src/server/{domain,services,repositories}`, `src/actions`, `src/lib`, `tests/{unit,integration,e2e}`) and `docker-compose.yml` all exist. | NFR-007, ADR-0001, ADR-0002 |
| **AC-000-03** | Given the ADR-0001 layer rules, when the single prescribed probe is run — create `src/server/domain/__lint-probe.ts` importing `@prisma/client`, run `pnpm lint` — then lint **fails with `no-restricted-imports`**, the output is pasted in `validation.md`, and the probe file is deleted and never committed (`git ls-files` shows no `__lint-probe.ts`). | NFR-007, ADR-0001 |
| **AC-000-04** | Given Vitest is configured with `unit` and `integration` projects, when `pnpm test` runs, then it executes at least one unit test asserting real behaviour of project code (no tautological assertion), the suite is green, and a coverage report for `src/server/domain` is produced **with no threshold configured** (the run does not fail on an empty directory). | NFR-007 |
| **AC-000-05** | Given `docker compose up -d` has started PostgreSQL locally, when `pnpm db:migrate` runs, then the migration applies successfully, a migration directory is created under `prisma/migrations/` and is committed, and the Prisma client is generated. | ADR-0006 |
| **AC-000-06** | Given the application is running against a reachable database, when `GET /api/health` is called with no credentials, then the status is `200`, `Content-Type` is `application/json`, `status === "ok"`, `database === "ok"`, and **`Object.keys(body).sort()` equals exactly `["database","latencyMs","status","timestamp"]`** — asserted by the e2e test. | FR-038, NFR-009 |
| **AC-000-07** | Given the database is unreachable (`DATABASE_URL` pointed at a stopped container or a wrong port), when `GET /api/health` is called, then the status is `503`, `Content-Type` is `application/json` (never an HTML error page), `status === "degraded"`, `database === "unreachable"`, and **`Object.keys(body).sort()` equals exactly `["database","status","timestamp"]`** — which is what proves non-leakage, since the key set is closed. | FR-038, NFR-005, NFR-009 |
| **AC-000-08** | Given the running application, when a browser requests an unknown path such as `/no-such-page`, then the root not-found screen renders with a human message and a link back to `/` at HTTP 404; **and when a render error is forced in the root segment, `error.tsx` renders with its retry affordance**; in both cases no stack trace appears in the page or in the browser console. | FR-039, NFR-009 |
| **AC-000-09** | Given Playwright is configured (chromium), when `pnpm test:e2e` runs against a locally built production server, then the e2e suite passes, asserting that `/` renders the placeholder `<h1>`, that the document shell is valid (`<html lang="en">` is present, a non-empty `<title>` exists, and `document.querySelectorAll('h1').length === 1`), and that `GET /api/health` returns 200; the Playwright report is retained as evidence. **No axe scan in 000** — deferred to feature 003 (human's decision, 2026-11-09). | FR-038, document shell |
| **AC-000-10** | Given the local gate, when `pnpm build` runs, then the production build completes with exit 0 and no type or lint error; and when `pnpm test:int` runs against the Docker Compose database, then **the integration test `tests/integration/health.test.ts` connects through the generated Prisma client and asserts `pingDatabase()` reports the database reachable**, and it is green — so the job cannot pass vacuously. | FR-038, NFR-007 |
| **AC-000-11** | Given the branch is pushed and the PR is open in the GitHub web UI, when the GitHub Actions workflow runs, then every step (`lint`, `typecheck`, unit, integration, `build`, e2e) is green on the PR, and the run URL is recorded in `validation.md`. **Cut C1 taken at 🚦 G-SpecPlan (human, 2026-11-09):** these six checks run as **two** jobs (`verify` = lint + typecheck + unit + build; `database` = integration + e2e with a `postgres:18` service container). The requirement is that all six checks are green, not that there are six jobs. | NFR-007 |
| **AC-000-12a** | **(Mandatory for 🚦 G-Merge.)** Given the PR, when its Vercel **Preview** deployment finishes, then the deployment succeeds and `GET <preview-url>/api/health` returns `200` with `status: "ok"` against the Neon primary database; the URL and the response body are pasted in `validation.md`. | FR-038, ADR-0006 |
| **AC-000-12b** | **(Deferred by the human's decision of 2026-11-09; carried as an open roadmap row.)** Given the human has granted OQ-008's production-deployment authorisation (Art. 9), when the PR is merged to `main`, then the Vercel **Production** deployment succeeds and `GET <production-url>/api/health` returns `200` with `status: "ok"` against Neon. Feature 008 re-verifies production regardless (FR-043). | FR-038, ADR-0006 |
| **AC-000-13** | Given the repository, when `git ls-files` is inspected and the committed `.gitignore` is read, then no `.env` file, secret or credential is tracked, `.gitignore` covers at minimum `.env*` (excluding `.env.example`), `node_modules/`, `.next/`, `.playwright-mcp/` and the test output directories, and `.env.example` documents every required key with placeholder values only. | NFR-005 |
| **AC-000-14** | Given every command above has been executed, when `AGENTS.md` "Project commands" is read, then each row matches a command that actually ran (including `pnpm test:int`, which now has a real test) and the UNVERIFIED warning is removed. Every version written into `package.json` is a registry-verified one cited in `plan.md` — no version guessed (Art. 14). | Art. 14 |

### Minimum evidence for 🚦 G-Merge under the production deferral (adopted verbatim from CL-02)
> green CI run URL (AC-000-11) + Preview health 200 body + a Preview screenshot of `/` +
> OQ-008/roadmap updated to record the deferral + explicit human sign-off of the deferral in
> `validation.md`; AC-000-12b is carried as an open roadmap row until re-run (feature 008 verifies
> production anyway, FR-043).

The OQ-008 and roadmap updates required by that list were made in version 0.2 of this spec:
`docs/discovery/brief.md` (OQ-008 row) and `docs/roadmap.md` (000 prerequisite row plus a new open
`AC-000-12b` row).

## 11. Assumptions and open questions

### Recorded decisions (were assumptions in version 0.1)

| ID | Decision | Where recorded | Status |
|---|---|---|---|
| ASM-024 | **No longer an assumption.** Feature 000 closes at 🚦 G-Merge on green CI plus a working Vercel **Preview** (AC-000-12a), with the production deploy and production health check deferred to AC-000-12b. Granted by the Technical Director on 2026-11-09, superseding the earlier "required before feature 000 can close" wording of OQ-008. | `docs/discovery/brief.md` OQ-008 row · `docs/roadmap.md` 000 rows · §10 of this spec | **Decided 2026-11-09** |
| OQ-010 | **RESOLVED 2026-11-09:** Vercel Preview shares the **Neon primary** database (project `sweet-feather-13830390`) for feature 000 — the smallest deadline surface. Revisited before feature 001 writes the real migration, when a per-PR Neon branch becomes worthwhile. | §6, §8.2 | **Resolved** |

### Assumptions

| ID | Assumption | Source | Risk if wrong | Verified by | Status |
|---|---|---|---|---|---|
| ASM-023 | A single throwaway Prisma model is enough to prove the migration pipeline; feature 001 supersedes it in a new migration rather than editing this one | planner | A pointless table survives into the demo database | AC-000-05 plus the reviewer checking that feature 001's plan removes or supersedes it | Pending |
| ASM-025 | `/api/health` returns `503` (not `500`) when the database is unreachable or the handler throws, and the closed key sets of §8.1 are the contract an uptime check may rely on | planner | A monitor added later expects a different shape or status | AC-000-06 and AC-000-07, which assert the exact key sets | Pending |
| ASM-026 | The `/` route is an intentionally plain text placeholder. **Not applicable in 000:** UI-01 layout criteria, the NFR-004 viewport / table matrix, NFR-010 empty / loading / skeleton states, and dark-mode review — none has a surface in a text-only page. **Verified in 000:** the document shell only — `<html lang="en">`, a non-empty `<title>`, exactly one `<h1>`. **Deferred to feature 003 (0.3):** the axe scan of `/` and the >= 4.5:1 contrast check, because with axe cut from 000 neither has an executable verifier here, and 000 does not claim a requirement it cannot execute | planner (CL-07) + human's timebox decision 2026-11-09 | A `lang`-less or heading-less page would carry a real defect into 001 — which the retained document-shell assertion prevents. The residual risk is that an unreadable contrast pairing survives until 003; low, because the placeholder uses only the `ui-brief.md` §1 tokens and carries two lines of text | **AC-000-09 — three executed DOM assertions in the Playwright test.** No part of this fence is verified by a reviewer merely writing it down. The fence is additionally restated in `validation.md`'s scope note so the `combined` reviewer does not re-raise the deferred items | Pending |
| ASM-027 | Coverage is **reported** for `src/server/domain` in 000 with **no threshold**; the NFR-007 >= 80 % line threshold is added in feature 001 in the same task as the first `domain` code, recorded there as an explicit task | planner (CL-05) | A threshold configured over an empty include glob reports 0 % and turns CI red for no reason | AC-000-04 plus CI green (AC-000-11) | Pending |

### Open questions

| ID | Question | Blocks | Owner | Needed by | Status |
|---|---|---|---|---|---|
| OQ-009 | Does `GET /api/health` need an authentication-free allowance in the middleware matcher that feature 001 introduces with the session guard? | 001 | planner / implementer | Feature 001's plan | Open — recorded so the guard does not silently break FR-038. No impact on 000. |

### Inherited items still live for this feature

| ID | State for feature 000 |
|---|---|
| **OQ-008** | Production-deployment authorisation **still not granted**, but **no longer blocking 000**: the deferral was granted on 2026-11-09 and recorded in the brief and the roadmap. AC-000-12b is the open remainder. |
| OQ-006 | Resolved: Docker Compose PostgreSQL. 000 creates `docker-compose.yml` (AC-000-02). |
| OQ-007 | Resolved: no `gh` CLI; the PR is opened through the GitHub web UI by the human. |
| TD-008 | **Stays open and is carried forward — 000 does not close it.** None of the four packages is installed in 000: `@axe-core/playwright` is deliberately **not** resolved here and moves to **feature 003** (human's timebox decision, 2026-11-09); `@date-fns/tz`, `lucide-react` and `sonner` are simply not needed by a skeleton and are verified at install time by the feature that first uses them (001 / 003). The `docs/roadmap.md` TD-008 row was updated from "due in feature 000" accordingly, and feature 003's roadmap scope now names the axe scan of `/` so the cut is not silently lost. |
| TD-009 / RSK-09 | Prisma held at `7.10.1`; a bare `pnpm add prisma` is forbidden (AC-000-01 verifies the resolved versions). |
| RSK-04 | Neon autosuspend means the first Preview request may be slow; expected, and not an AC-000-12a failure. |
| RSK-07 | Docker daemon up (29.7.2). **The "port 5432 free" half of this risk materialised** — it was occupied by a native PostgreSQL service; resolved by publishing `5433` on the host (§4.2). The Neon-branch fallback was not needed. |

## 12. Change log
| Version | Date | Change | Approved by |
|---|---|---|---|
| 0.1 | 2026-11-09 | Initial spec for the walking skeleton: scope fenced to the toolchain slice the roadmap assigns to 000, FR-038 health contract, FR-039 root error surfaces, 14 ACs, ASM-023…ASM-027 and OQ-009 / OQ-010 | Superseded |
| 0.2 | 2026-11-09 | Applied CL-01…CL-07. **CL-01:** FR-038 now runs Route Handler → `services/health.ts` → `repositories/health.ts`, and §2 admits that one pair. **CL-02:** AC-000-12 split into mandatory **12a** (Preview) and deferred **12b** (Production); the deferral is recorded in the brief and the roadmap, and ASM-024 became a recorded decision. **CL-03:** §8.1 frozen to closed key sets, `version` dropped, unexpected throw → 503, AC-000-06/07 assert `Object.keys`. **CL-04:** one real integration test added to §2, §4.1 and AC-000-10. **CL-05:** coverage reporting only, no threshold, in §2 / §9 / ASM-027. **CL-06:** single lint-probe method for AC-000-03, AC-000-02 and AC-000-08 extended, AC → FR/NFR column added, `docs/traceability.md` FR-038/FR-039 rows filled with real ids. **CL-07:** narrow NFR-003 waiver with a non-circular verification (AC-000-09 axe + document shell). Also: OQ-010 resolved (Preview shares the Neon primary) and the stale repository URL corrected in `docs/discovery/brief.md` against `MEMORY.md` | Superseded |
| 0.3 | 2026-11-09 | **Timebox protection, decided by the Technical Director (Hernán Cardona) on 2026-11-09** on the question surfaced at 🚦 G-SpecPlan: scope-cut candidate (a) applied pre-emptively. `@axe-core/playwright` is **not** installed in 000 and no axe scan runs in 000; the axe scan of `/` and the >= 4.5:1 contrast check move to **feature 003** with the rest of NFR-003. AC-000-09 keeps the local production build, the `/` placeholder render, the three document-shell DOM assertions and the `/api/health` 200 check. AC-000-14 no longer records an axe version. ASM-026, §2, §4.1 step 2, §4.2, §7 and §9 updated to match, with the deferred items given an explicit owner instead of being left unverified. **TD-008 carried forward, not closed**; `docs/roadmap.md`'s TD-008 row amended and the axe scan of `/` added to feature 003's scope | Pending — 🚦 G-SpecPlan |
