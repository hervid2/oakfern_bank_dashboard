# Plan — Spec 000 (walking-skeleton)

Spec: `specs/000-walking-skeleton/spec.md` **v0.3** · Branch: `feat/000-walking-skeleton`
Template D.20 · Sprint Profile · Planner, 2026-11-09

> ⚠️ **Read §7 first.** The Art. 14 verification required by the Coordinator surfaced that
> **Prisma ORM 7 changes project setup substantially** compared with v6: a `prisma.config.ts` file,
> a **mandatory driver adapter** (one dependency not in ADR-0002), an explicit generator `output`,
> the client imported from the generated folder rather than `@prisma/client`, and `migrate dev` no
> longer running `prisma generate`. This is new information discovered today, it changes five files,
> and it is the main reason the honest estimate in `tasks.md` exceeds the 1 h 45 min timebox.

## 1. Technical approach (and discarded alternatives)

| Decision | Approach | Discarded alternative (and why) |
|---|---|---|
| Overall shape | One thin vertical slice through every layer of ADR-0001, with no business logic: route → service → repository → PostgreSQL, plus one unit, one integration and one e2e test over it | A "config-only" skeleton with no request path (would not prove the layering, the client generation or the deployment — the whole point of RSK-02) |
| FR-038 code path | `src/app/api/health/route.ts` (thin) → `src/server/services/health.ts` → `src/server/repositories/health.ts` (sole Prisma importer), exactly as CL-01 ruled | Route Handler calling the repository directly (forbidden by ADR-0001 line 45 and by the very ESLint rule AC-000-03 installs — this was the CL-01 blocker) |
| Making the health mapping unit-testable without a database | The service exports a **pure** mapper `buildHealthResult(ping)` plus the orchestrating `checkDatabaseHealth()`. The unit test covers the mapper (including the frozen key sets); the integration test covers the repository against real PostgreSQL | Mocking Prisma in a unit test (slower to write, proves less, and tests the mock); or having no unit test but a tautological one (CL-04 / AC-000-04 explicitly forbid a vacuous test) |
| Where the pure mapper lives | In `src/server/services/health.ts`. **`src/server/domain/` ships empty**, as spec §2 requires, which is also what makes the AC-000-03 lint probe possible | Putting the mapper in `domain` (would contradict spec §2 "domain ships empty" and complicate the probe) |
| Prisma client instance | A module-scoped singleton in `src/server/repositories/client.ts` with the `globalThis` guard for dev HMR. It is inside `repositories`, so "only repositories import Prisma" stays literally true even though the import path is now a generated folder | `src/lib/prisma.ts` or `src/server/db.ts` (both would put a Prisma import outside `repositories`, breaking ADR-0001 and the ESLint rule) |
| Database ping | `SELECT 1` through `$queryRaw`, measured with `performance.now()` for `latencyMs` | Counting rows in the throwaway table (couples the health check to a table that feature 001 deletes); `$connect()` alone (succeeds lazily and would report healthy against a dead database) |
| Proving `migrate` works | One throwaway model `SkeletonCheck` (ASM-023). An empty schema produces **no** migration, so some model is needed | Running `prisma db push` (creates no committed migration, so AC-000-05 could not be met) |
| Six CI jobs | Six named GitHub Actions jobs, because AC-000-11 names six and fans out in parallel | One job with six steps (cheaper and faster to debug, but AC-000-11 says "every **job** … is green"). **Carried as cut C1 in `tasks.md`** — it needs a one-word spec change, so it is the Coordinator's call, not mine |
| Env loading for the Prisma CLI | Try Node 22's built-in `process.loadEnvFile()` in `prisma.config.ts` first — Art. 10 "don't add it" | `dotenv` (what the Prisma docs example uses). Pre-justified in §7 as a fallback if the built-in does not work with the CLI's config loader; verified at install time, not guessed |

## 2. Files to create / modify

| Path | Action | Reason |
|---|---|---|
| `package.json` | create | ADR-0002 exact pins (no `^`), `engines.node` `22.17.0`, `packageManager` for corepack, and the AGENTS.md script contract (AC-000-01, AC-000-02, AC-000-14) |
| `pnpm-lock.yaml` | create (committed) | Reproducible installs (AC-000-01) |
| `.nvmrc` | create | `22.17.0` (AC-000-02) |
| `.npmrc` | create | `engine-strict=true` so a wrong Node fails loudly rather than subtly |
| `.gitignore` | **replace** the minimal Genesis version | Must cover `.env*` (except `.env.example`), `node_modules/`, `.next/`, `out/`, `.playwright-mcp/`, `playwright-report/`, `test-results/`, `coverage/`, and the generated Prisma client (AC-000-13) |
| `.env.example` | create | Documents `DATABASE_URL` with a placeholder only (AC-000-13) |
| `README.md` | create (stub) | Placeholder; the real README is FR-043 / feature 008 |
| `tsconfig.json` | create | `strict: true`, path alias `@/*` → `src/*` (AC-000-02) |
| `next.config.ts` | create | Minimal; no experimental flags |
| `eslint.config.mjs` | create | Flat config: Next.js + TS rules **plus the ADR-0001 `no-restricted-imports` layer rules** (§4.4, AC-000-03) |
| `.prettierrc` + `.prettierignore` | create | Formatting; Prettier is run through ESLint-independent `--check` in the lint script |
| `postcss.config.mjs` | create | Tailwind v4 via `@tailwindcss/postcss` |
| `src/app/globals.css` | create | Tailwind v4 `@import "tailwindcss"` + the `ui-brief.md` §1 teal/slate tokens (tokens only, no components) |
| `src/app/layout.tsx` | create | Root layout: `<html lang="en">`, Geist via `next/font`, `metadata.title` — the three document-shell facts AC-000-09 asserts |
| `src/app/page.tsx` | create | The plain `/` placeholder with exactly one `<h1>` (spec §7 copy) |
| `src/app/error.tsx` | create | FR-039 root error boundary: message + retry, no stack trace (AC-000-08) |
| `src/app/not-found.tsx` | create | FR-039 root 404: message + link home (AC-000-08) |
| `src/app/_dev/boom/page.tsx` | create | A route that throws on render, so AC-000-08's `error.tsx` half is **executable** rather than hand-waved. Deleted in feature 007 at the latest; recorded as a known temporary |
| `src/app/api/health/route.ts` | create | FR-038 Route Handler — thin, no Prisma, no repository import (§4.1) |
| `src/server/services/health.ts` | create | `checkDatabaseHealth()` + the pure `buildHealthResult()` (§4.2) |
| `src/server/repositories/health.ts` | create | `pingDatabase()` — **the only file that imports the Prisma client** (§4.3) |
| `src/server/repositories/client.ts` | create | Prisma client singleton with the mandatory driver adapter (§4.3, §7) |
| `src/server/domain/.gitkeep` | create | Layer exists and is **empty** (spec §2); keeps the AC-000-03 probe location valid |
| `src/actions/.gitkeep`, `src/lib/.gitkeep` | create | ADR-0001 directory skeleton (AC-000-02) |
| `prisma/schema.prisma` | create | PostgreSQL datasource (no `url` — v7 reads it from the config file), `prisma-client` generator with explicit `output`, and the `SkeletonCheck` model (§3) |
| `prisma.config.ts` | create | **Required by Prisma 7**: schema path, migrations path, `datasource.url` (§3, §7) |
| `prisma/migrations/<timestamp>_init_skeleton/migration.sql` | create (generated, committed) | AC-000-05 |
| `docker-compose.yml` | create | Local PostgreSQL 18 on 5432, matching Neon's major version (OQ-006, AC-000-02) |
| `vitest.config.ts` | create | `test.projects` with `unit` and `integration`; coverage **reporting** for `src/server/domain` with **no threshold** (CL-05, AC-000-04) |
| `playwright.config.ts` | create | chromium only; `webServer` runs the built production server (AC-000-09) |
| `tests/unit/health.test.ts` | create | AC-000-04 — real assertions on `buildHealthResult`, including both frozen key sets |
| `tests/integration/health.test.ts` | create | AC-000-10 — real connection through the generated client to Compose/CI PostgreSQL (CL-04) |
| `tests/e2e/health.spec.ts` | create | AC-000-09 — `/` placeholder, document shell, `/api/health` 200 |
| `.github/workflows/ci.yml` | create | Six jobs (§4.5, AC-000-11) |
| `AGENTS.md` | modify (end of feature) | AC-000-14 — correct the command table, remove the UNVERIFIED warning |
| `docs/traceability.md` | modify (end of feature) | Flip FR-038 / FR-039 rows to ✅ with the real test paths |
| `specs/000-walking-skeleton/validation.md` | create (by the reviewer) | Evidence, including the AC-000-12a Preview body and the deferral sign-off |

**Not created in 000:** anything under `src/components/`, `src/server/rails/`, `src/server/auth/`,
`prisma/seed.ts`, or any second service / repository.

## 3. Data changes and migrations (with rollback strategy)

**Schema (Prisma 7 shape — note the datasource has no `url`; see §7):**

| Element | Definition |
|---|---|
| `datasource db` | `provider = "postgresql"` only. In v7 the URL comes from `prisma.config.ts`, not from `env()` in the schema |
| `generator client` | `provider = "prisma-client"` with an **explicit** `output` (planned: `output = "../src/generated/prisma"`) — required in v7 |
| `model SkeletonCheck` | `id String @id @default(uuid())`, `createdAt DateTime @default(now())`. **No numeric column at all**, so BR-001 cannot be pre-violated (spec §5) |

| Topic | Decision |
|---|---|
| Migration | One: `prisma migrate dev --name init_skeleton`, committed under `prisma/migrations/` |
| Client generation | **Must be run explicitly** — in Prisma 7 `migrate dev` no longer triggers `prisma generate` (§7, source cited). Handled by a `postinstall` script plus an explicit `db:generate`, so CI type-checks against a generated client |
| Generated client in git | **Ignored**, regenerated by `postinstall`. Keeps the diff clean and proves generation really works in CI |
| CI / production application | `prisma migrate deploy` (never `migrate dev`, which is development-only) |
| **Rollback strategy** | The migration creates one table that **no business code references** (the health ping uses `SELECT 1`, deliberately — §1). Rollback paths, cheapest first: (1) do nothing — feature 001's migration supersedes it; (2) locally, `prisma migrate reset`; (3) on Neon, `DROP TABLE "SkeletonCheck";`. Nothing depends on the table, so no data loss is possible. Forward-only during the sprint, per `architecture/overview.md` |
| Risk if 001 edits instead of supersedes | ASM-023 — the reviewer checks feature 001's plan removes or supersedes `SkeletonCheck` |

## 4. Contracts (API, events, interfaces)

### 4.1 `GET /api/health` — Route Handler
Thin adapter. No Zod (no input — spec §6). Imports **only** the service.
Returns `Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })`.
`Response.json` is the current documented Next.js App Router form (source in §7).
The handler wraps the service call in `try/catch` so an unexpected throw still yields the **503**
JSON body and never a 500 HTML page (spec §8.1, AC-000-07).

### 4.2 `src/server/services/health.ts`
```
export type PingResult =
  | { reachable: true; latencyMs: number }
  | { reachable: false };

export type HealthResult =
  | { status: 200; body: { status: 'ok'; database: 'ok'; latencyMs: number; timestamp: string } }
  | { status: 503; body: { status: 'degraded'; database: 'unreachable'; timestamp: string } };

export function buildHealthResult(ping: PingResult, now: Date): HealthResult   // pure
export async function checkDatabaseHealth(): Promise<HealthResult>             // calls the repository
```
`buildHealthResult` is pure and takes `now` as an argument, so the unit test is deterministic and no
`new Date()` hides inside the mapping. The two body shapes are the **frozen, closed key sets** of
spec §8.1 — the discriminated union is what makes `Object.keys` agreement a type-level fact as well
as a tested one.

### 4.3 `src/server/repositories/health.ts` and `client.ts`
```
// client.ts — the ONLY Prisma import site in the repository
export const prisma: PrismaClient            // singleton, globalThis-guarded, driver adapter attached

// health.ts
export async function pingDatabase(): Promise<PingResult>   // SELECT 1 via $queryRaw, timed
```
`pingDatabase` catches its own connection errors and returns `{ reachable: false }` — it never throws
into the service, which is what keeps the 503 path deterministic.

### 4.4 ESLint `no-restricted-imports` — the rules AC-000-03's probe must trip
Four override blocks, by file pattern:

| Files | Forbidden | Why |
|---|---|---|
| `src/server/domain/**` | `next`, `next/*`, `react`, `@prisma/client`, **the generated client path**, `../repositories/*`, `../services/*` | Domain is pure TS (ADR-0001). **This is the rule the AC-000-03 probe trips.** |
| `src/server/services/**` | `next`, `next/*`, `react`, `@prisma/client`, the generated client path | Services orchestrate; they must not touch Prisma or the framework |
| `src/app/**`, `src/actions/**` | `@prisma/client`, the generated client path, `@/server/repositories/*` | ADR-0001 line 45 verbatim — the CL-01 rule |
| `src/components/**` | `@/server/*` | Pre-installed for 001; no component exists yet |

**Important consequence of Prisma 7:** because the client is imported from a generated folder, each
pattern list must name **both** `@prisma/client` **and** the generated path
(`@/generated/prisma`, `**/generated/prisma/**`). A rule naming only `@prisma/client` would be
silently toothless — the exact defect class AC-000-03 exists to catch.

### 4.5 GitHub Actions `ci.yml`
Triggers: `pull_request`, `push` to `main`. Shared setup per job: checkout → corepack → Node
`22.17.0` → `pnpm install --frozen-lockfile` (which runs `postinstall` → `prisma generate`).

| Job | Needs | Runs | Service container |
|---|---|---|---|
| `lint` | — | `pnpm lint` | — |
| `typecheck` | — | `pnpm typecheck` | — |
| `unit` | — | `pnpm test` | — |
| `integration` | — | `prisma migrate deploy` then `pnpm test:int` | `postgres:18` |
| `build` | — | `pnpm build`, upload `.next` | — |
| `e2e` | `build` | download `.next`, `prisma migrate deploy`, `pnpm test:e2e` | `postgres:18` |

`DATABASE_URL` for the two database jobs points at the service container and is a literal
non-secret localhost URL in the workflow; **no GitHub secret is needed in 000**, which keeps
AC-000-13 trivially true.

## 5. UI components

**N/A — feature 000 creates no reusable component.** No `src/components/` directory, no shadcn
component, no chart. The four `app/` files (`layout.tsx`, `page.tsx`, `error.tsx`, `not-found.tsx`)
are route-level files, not components, and carry the spec §7 copy verbatim. `globals.css` defines
the `ui-brief.md` §1 tokens (teal accent, cool slate neutrals) so feature 001 inherits them, but
styles nothing beyond document defaults. Geist is loaded through `next/font` in `layout.tsx` — no
external font request (ADR-0002).

## 6. Test strategy mapped to each AC

| AC | Level | Artefact / method | Exact verification command |
|---|---|---|---|
| AC-000-01 | command | `pnpm install`, then inspect resolved versions | `pnpm install` · `pnpm ls prisma @prisma/client` (expect `7.10.1` for both) · `grep -n '\^' package.json` (expect no dependency hit) |
| AC-000-02 | command | Config + filesystem facts | `pnpm lint` · `pnpm typecheck` · `node -v` · `cat .nvmrc` · `pnpm -v` · `ls src/server/domain src/server/services src/server/repositories src/actions src/lib tests/unit tests/integration tests/e2e docker-compose.yml` |
| AC-000-03 | command (probe) | Temporary `src/server/domain/__lint-probe.ts` importing `@prisma/client`; lint must fail with `no-restricted-imports`; then delete | `pnpm lint` (expect **non-zero exit**, output pasted) · `git ls-files \| grep __lint-probe` (expect empty) |
| AC-000-04 | unit | `tests/unit/health.test.ts` — `it('AC-000-04: buildHealthResult returns the frozen 200 body when the database is reachable')` and `…('…returns the frozen 503 body when it is not')`, each asserting `Object.keys(body).sort()` | `pnpm test` |
| AC-000-05 | command | Migration + generation | `docker compose up -d` · `pnpm db:migrate` · `ls prisma/migrations` · `git status --short prisma/migrations` |
| AC-000-06 | e2e | `tests/e2e/health.spec.ts` — `test('AC-000-06: GET /api/health returns 200 with exactly the frozen ok body')`, asserting status, `content-type`, and `Object.keys(body).sort()` === `['database','latencyMs','status','timestamp']` | `pnpm test:e2e` |
| AC-000-07 | command + unit | The **real** 503 is produced by running the built server against a deliberately wrong `DATABASE_URL` (port 5499) and calling the endpoint; the key set is additionally pinned by the unit test | `DATABASE_URL=postgresql://x:x@127.0.0.1:5499/x pnpm start` then `curl -i http://localhost:3000/api/health` (expect `503`, `application/json`, body with exactly 3 keys) — output pasted in `validation.md` |
| AC-000-08 | e2e | Two assertions: unknown path → 404 + copy + link; and `/_dev/boom` → `error.tsx` + retry affordance, console clean | `pnpm test:e2e` |
| AC-000-09 | e2e | Document-shell assertions: `html[lang="en"]` present, `<title>` non-empty, `h1` count === 1, placeholder text visible, `/api/health` 200. **No axe (deferred to 003).** | `pnpm test:e2e` + retained `playwright-report/` |
| AC-000-10 | integration + command | `tests/integration/health.test.ts` — `it('AC-000-10: pingDatabase reports the database reachable through the generated client')`, plus a typed `prisma.skeletonCheck.count()` call proving migrate + generate + connect agree | `pnpm build` · `pnpm test:int` |
| AC-000-11 | CI | The six jobs of §4.5 | GitHub Actions run URL pasted in `validation.md` |
| AC-000-12a | manual, executed | Preview deployment health check | `curl -i <preview-url>/api/health` — URL + body pasted in `validation.md`; plus a Preview screenshot of `/` |
| AC-000-12b | deferred | Same against production, after OQ-008 is granted | `curl -i <production-url>/api/health` |
| AC-000-13 | command | Secret hygiene | `git ls-files \| grep -E '^\.env' ` (expect only `.env.example`) · `cat .gitignore` · `cat .env.example` |
| AC-000-14 | review | `AGENTS.md` table vs executed commands | `git diff AGENTS.md` reviewed against the pasted evidence |

**Test naming:** every test title carries its AC id, per `AGENTS.md` and `docs/traceability.md`.
**Honest gap:** `pnpm db:seed` appears in the AGENTS.md contract but has no implementation in 000
(seed is FR-036 / feature 001). The script is created as a stub that exits non-zero with
`"not implemented until feature 001"`, and the AGENTS.md row is labelled accordingly — so AC-000-14
is satisfied truthfully rather than by pretending the command works.

## 7. New dependencies (justification per Art. 10)

### 7.1 Art. 14 version verification — every pin checked today against the npm registry
Checked 2026-11-09 against `https://registry.npmjs.org/-/package/<pkg>/dist-tags`:

| Package | ADR-0002 pin | Registry result | Verdict |
|---|---|---|---|
| `next` | `16.4.6` | `latest` = `16.4.6` | ✅ exists, is `latest` |
| `react`, `react-dom` | `19.3.1` | `latest` = `19.3.1` | ✅ |
| `tailwindcss` | `4.3.5` | `latest` = `4.3.5` | ✅ |
| `vitest` | `5.1.0` | `latest` = `5.1.0` | ✅ |
| `@playwright/test` | `1.65.0` | `latest` = `1.65.0` | ✅ |
| `zod` | `4.6.7` | `latest` = `4.6.7` | ✅ (installed in 000, first used in 001) |
| `@prisma/client` | `7.10.1` | `latest` = `7.10.1` | ✅ |
| `prisma` (CLI) | `7.10.1` | **`latest` = `8.0.0-rc.33`**, `prev` = `7.10.1`, `next` = `8.0.0-rc.10` | ✅ `7.10.1` exists and is the stable line. **RSK-09 / TD-009 re-confirmed today** — a bare `pnpm add prisma` would install an 8.0.0 release candidate. The explicit `@7.10.1` pin is mandatory |

**No ADR-0002 pin failed to resolve.** Nothing was substituted.

### 7.2 API shapes verified (Art. 14), with sources
| Fact | Verified shape | Source |
|---|---|---|
| Next.js App Router Route Handler | `export async function GET(request: Request)`; return `Response.json(body)`; a custom status/headers via `new Response(...)` or `Response.json(body, { status, headers })`. Since `v15.0.0-RC` **GET handlers default to dynamic, not static** — so `/api/health` is not accidentally cached at build time | https://nextjs.org/docs/app/api-reference/file-conventions/route (doc `lastUpdated` 2026-04-30) |
| `prisma migrate dev` | `prisma migrate dev [--name <n>]`; development only; flags `--create-only`, `--schema`, `--config`, `--url`. **In v7 it no longer triggers `prisma generate` or the seed script — they must be run explicitly.** `prisma migrate deploy` is the CI/production command | https://www.prisma.io/docs/cli/v7/migrate/dev · https://www.prisma.io/docs/orm/v7/prisma-migrate/getting-started |
| `prisma.config.ts` (v7) | `import { defineConfig, env } from "prisma/config"` with `schema`, `migrations.path`, `migrations.seed`, `datasource.url: env("DATABASE_URL")`. The datasource URL is read **from this file**, not from `env()` inside `schema.prisma` | https://www.prisma.io/docs/orm/v7/reference/prisma-config-reference |
| Prisma 7 client generation | Generator `provider = "prisma-client"` with an **explicit `output`**; the client is imported from the generated folder, not from `@prisma/client` | https://www.prisma.io/docs/orm/v7 |
| Prisma 7 driver adapter | "Starting with Prisma 7, providing a driver adapter is **mandatory** for direct database connections." PostgreSQL adapter = `@prisma/adapter-pg` | https://www.prisma.io/docs/orm/v7 |
| Vitest multi-project config | `test.projects: [...]` in `vitest.config.ts`; `workspace` / `vitest.workspace.ts` is **deprecated since 3.2** and replaced by `projects`; project names must be unique | https://vitest.dev/guide/projects |

### 7.3 `@prisma/adapter-pg` — the one genuinely new dependency (Art. 10)
| Art. 10 field | Answer |
|---|---|
| Purpose | Prisma 7 **requires** a driver adapter for a direct database connection. Without it the client cannot connect to PostgreSQL at all, so FR-038 is unimplementable |
| Version | **`7.10.1`** — verified: `https://registry.npmjs.org/-/package/@prisma/adapter-pg/dist-tags` shows `latest` = `7.10.1`, matching the pinned ORM exactly |
| Alternatives, including "don't add it" | **"Don't add it" is not available** — it is mandatory in v7, not a convenience. Alternatives: (a) downgrade to Prisma 6 to avoid adapters — rejected, it reopens a settled ADR and 6.19.3 is a line behind; (b) wait for Prisma 8 GA — rejected, `latest` is a release candidate (RSK-09); (c) `@prisma/adapter-neon` — rejected, it would couple the local Docker Compose path to Neon's serverless driver and break the "local and CI identical" goal of OQ-006. `@prisma/adapter-pg` works against Docker, the CI service container **and** Neon over TCP |
| Licence | Apache-2.0, same as the Prisma packages already approved in ADR-0002 |
| Maintenance | Published by the Prisma team, in lockstep with the ORM (`7.10.1` on the same release train) |
| Weight | Small. It bundles `pg` `^8.16.3`, `@types/pg`, `postgres-array` and `@prisma/driver-adapter-utils` as **regular dependencies** (verified on the packument), so **no separate `pg` install is needed** — one line in `package.json`, not three |

### 7.4 `dotenv` — deliberately **not** added (Art. 10 "don't add it")
The Prisma docs example for `prisma.config.ts` opens with `import "dotenv/config"`. Node `22.17.0`
ships `process.loadEnvFile()`, so the plan uses that inside a `try/catch` and adds no dependency.
**Pre-authorised fallback:** if the Prisma CLI's config loader does not pick the variable up that
way, add `dotenv` (MIT, ubiquitous, ~1 file, zero transitive deps) and record the registry-verified
version in this section. Decided at install time by an executed check, not by guessing.

### 7.5 Dependency summary for 000
| Added | `next`, `react`, `react-dom`, `tailwindcss` + `@tailwindcss/postcss`, `typescript` + `@types/*`, `eslint` + the Next config, `prettier`, `prisma`, `@prisma/client`, **`@prisma/adapter-pg`**, `zod`, `vitest` (+ `@vitest/coverage-v8`), `@playwright/test` |
| Deliberately **not** added | `@axe-core/playwright` (human's decision, → 003), `@date-fns/tz`, `lucide-react`, `sonner`, `date-fns`, `jose`, `recharts`, `@faker-js/faker`, React Hook Form, `dotenv`, `nuqs`, Zustand, `tsx` |

## 8. Risks and mitigations

| # | Risk | Likelihood | Mitigation |
|---|---|---|---|
| R1 | **Prisma 7's new setup surface** (`prisma.config.ts`, mandatory adapter, generated output path, no auto-generate) costs more than the roadmap's estimate assumed. This is the dominant schedule risk | **High — it is why `tasks.md` exceeds the timebox** | T-04 is the single riskiest task and is isolated so it can be attacked alone; the exact shapes are verified and cited in §7.2 so the Implementer is not discovering them live; Art. 12 caps it at 3 self-correction cycles |
| R2 | ESLint rules name only `@prisma/client` and miss the generated client path, leaving the ADR-0001 guardrail toothless | Medium | §4.4 names both; AC-000-03's probe is run against the **generated path too**, not just `@prisma/client` |
| R3 | The generated client is gitignored, so `typecheck` / `build` fail in CI before generation | Medium | `postinstall: prisma generate`, which needs no database connection; the `lint`, `typecheck` and `build` jobs therefore have a client without a service container |
| R4 | Prisma 7 requires `"type": "module"` in `package.json` (one source suggested this), which interacts with Next.js / PostCSS / ESLint config file formats | Medium | **Unverified — recorded honestly as ASM-028 rather than asserted.** T-04 settles it by executing; if ESM is required, the `.mjs` config extensions already planned absorb most of it |
| R5 | Playwright browser download time inside the timebox | High | chromium only (ASM-015 already sanctions this); the download is a one-off in T-09 |
| R6 | Red CI round trips, ~4–6 min each with six jobs | Medium | The full gate is run **locally** (T-10) before the first push, so CI should be green first try; cut C1 collapses the six jobs if it is not |
| R7 | Neon autosuspend makes the first Preview request slow (RSK-04) | High, low impact | Expected; AC-000-12a allows a retry and the figure is not an NFR-001 measurement |
| R8 | `prisma migrate deploy` in CI runs against a fresh container each time, so a drifted migration fails loudly | Low | That is the desired behaviour; it is what makes the integration job meaningful |

## 9. New or affected ADRs

| ADR | Effect | Action |
|---|---|---|
| **ADR-0002** (Accepted, ratified at 🚦 G-Foundational) | **Needs a one-line amendment:** it does not list `@prisma/adapter-pg`, which Prisma 7 makes mandatory (§7.3). It also predates the knowledge that v7 requires `prisma.config.ts`, an explicit generator `output` and a generated-folder import | **Flagged for the Coordinator / human at 🚦 G-SpecPlan.** I did not edit a ratified ADR on my own authority. Recommended: amend ADR-0002's pin table with `@prisma/adapter-pg 7.10.1` plus a "Prisma 7 setup requirements" note, rather than open a new ADR — it is the same decision, better informed |
| ADR-0001 (architecture) | **Unchanged, and reinforced.** The mandatory adapter and the generated client both live inside `repositories`, so "repositories are the only layer importing Prisma" still holds literally. Only the *import specifier* changes, which §4.4 accounts for | No change |
| ADR-0006 (hosting) | Unchanged. `@prisma/adapter-pg` speaks plain TCP, so Docker Compose, the CI service container and Neon all work through one code path | No change |
| ADR-0003, 0004, 0005 | No surface in 000 | No change |
| New ADR needed? | **No.** Nothing here is an architecture decision; it is a vendor requirement discovered by Art. 14 verification | — |

### New assumption recorded by this plan
| ID | Assumption | Risk if wrong | Verified by | Status |
|---|---|---|---|---|
| ASM-028 | Prisma 7's generated client works inside the Next.js 16 build without forcing `"type": "module"` on `package.json`; if ESM is in fact required, the `.mjs`/`.ts` config extensions planned here absorb it without redesign | A late ESM conversion of every config file mid-timebox | **T-04, by execution** (`pnpm db:generate` + `pnpm build`). Not asserted anywhere as fact | Pending |
