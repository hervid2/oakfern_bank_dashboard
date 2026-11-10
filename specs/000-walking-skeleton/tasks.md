# Tasks — Spec 000 (walking-skeleton)

Spec v0.3 · Plan: `specs/000-walking-skeleton/plan.md` · Template D.21 · Planner, 2026-11-09
> `[P]` = parallelizable (shares no files with another pending `[P]` task).
> The Implementer runs these **strictly sequentially**, one task per invocation, one commit per task.
> Conventional Commits with the task id, e.g. `chore(setup): scaffold next app with pinned deps [T-01]`.

> 🚨 **Read §"Timebox reckoning" before approving.** The honest total is **3 h 19 min** against a
> **1 h 45 min** timebox (+90 %, far past the SP-6 +30 % trigger). Cuts alone do not close the gap;
> this needs a decision from the human at 🚦 G-SpecPlan.

## Tasks

- [ ] **T-01** — Scaffold the Next.js 16 App Router project with TypeScript `strict`: `package.json` with **exact** ADR-0002 pins (no `^`), `engines.node` `22.17.0`, `packageManager` for corepack, the AGENTS.md script contract, `.nvmrc`, `.npmrc` (`engine-strict=true`), `tsconfig.json` (`strict`, `@/*` → `src/*`), `next.config.ts`, `postcss.config.mjs`. Install `prisma@7.10.1` and `@prisma/client@7.10.1` **with the explicit pin** — never a bare `pnpm add prisma` (RSK-09). · **AC:** AC-000-01, AC-000-02 · **Files:** `package.json`, `pnpm-lock.yaml`, `.nvmrc`, `.npmrc`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs` · **Verify:** `pnpm install` · `pnpm ls prisma @prisma/client` (both `7.10.1`) · `node -v` · `pnpm -v` · **Depends on:** — · **Est. 18 min**

- [ ] **T-02** — ESLint flat config + Prettier, including the four ADR-0001 `no-restricted-imports` override blocks of `plan.md` §4.4. Each block must name **both** `@prisma/client` **and** the generated client path, or the guardrail is toothless (R2). Create the empty layer directories with `.gitkeep`. · **AC:** AC-000-02, AC-000-03 · **Files:** `eslint.config.mjs`, `.prettierrc`, `.prettierignore`, `src/server/domain/.gitkeep`, `src/server/services/.gitkeep`, `src/server/repositories/.gitkeep`, `src/actions/.gitkeep`, `src/lib/.gitkeep`, `tests/{unit,integration,e2e}/.gitkeep` · **Verify:** `pnpm lint` (exit 0) · `pnpm typecheck` (exit 0) · **Depends on:** T-01 · **Est. 14 min**

- [ ] **T-03** `[P]` — Replace the minimal Genesis `.gitignore` with the full version (`.env*` except `.env.example`, `node_modules/`, `.next/`, `out/`, `.playwright-mcp/`, `playwright-report/`, `test-results/`, `coverage/`, the generated Prisma client); add `.env.example` with a **placeholder** `DATABASE_URL`; add the `README.md` stub. · **AC:** AC-000-13 · **Files:** `.gitignore`, `.env.example`, `README.md` · **Verify:** `git ls-files | grep -E '^\.env'` (only `.env.example`) · `git status --short` (no `.env.local` tracked) · **Depends on:** T-01 · **Est. 7 min**

- [ ] **T-04** — ⚠️ **Riskiest task (R1).** Prisma 7 database setup: `docker-compose.yml` (postgres:18 on 5432), `prisma.config.ts` (`defineConfig` with `schema`, `migrations.path`, `datasource.url` — try Node's `process.loadEnvFile()` before adding `dotenv`, §7.4), `prisma/schema.prisma` (datasource **without** `url`, `prisma-client` generator with explicit `output`, the `SkeletonCheck` throwaway model, no numeric column), the client singleton with the **mandatory** `@prisma/adapter-pg@7.10.1` driver adapter, and the `postinstall: prisma generate` script. Run the first migration. **Settle ASM-028 by execution** (whether `"type": "module"` is required). · **AC:** AC-000-05 · **Files:** `docker-compose.yml`, `prisma.config.ts`, `prisma/schema.prisma`, `prisma/migrations/**`, `src/server/repositories/client.ts`, `package.json` (scripts + adapter dep) · **Verify:** `docker compose up -d` · `pnpm db:migrate` · `pnpm db:generate` · `ls prisma/migrations` · `pnpm typecheck` · **Depends on:** T-02 · **Est. 30 min**

- [ ] **T-05** — FR-038 data and service layer, **signatures only** for the pure mapper so T-08 can go red first: `src/server/repositories/health.ts` (`pingDatabase()` — `SELECT 1` via `$queryRaw`, timed, catches its own errors, returns `PingResult`) and `src/server/services/health.ts` (`checkDatabaseHealth()` wired, `buildHealthResult()` declared with the `plan.md` §4.2 discriminated union but **throwing `not implemented`**). · **AC:** AC-000-06, AC-000-07, AC-000-10 (foundation) · **Files:** `src/server/repositories/health.ts`, `src/server/services/health.ts` · **Verify:** `pnpm lint` · `pnpm typecheck` · **Depends on:** T-04 · **Est. 12 min**

- [ ] **T-06** — Vitest config (`test.projects` with `unit` and `integration`; coverage **reporting** for `src/server/domain` with **no threshold** — CL-05) and the **test-first** step: write `tests/unit/health.test.ts` asserting both frozen key sets, **run it and watch it fail**, paste the red output, then implement `buildHealthResult` until green. · **AC:** AC-000-04 · **Files:** `vitest.config.ts`, `tests/unit/health.test.ts`, `src/server/services/health.ts` · **Verify:** `pnpm test` (red first, output pasted; then exit 0) · **Depends on:** T-05 · **Est. 14 min**

- [ ] **T-07** — The FR-038 Route Handler: `src/app/api/health/route.ts`, thin, importing **only** the service, `try/catch` so an unexpected throw still returns the frozen **503** JSON (never a 500 HTML page), `Cache-Control: no-store`. · **AC:** AC-000-06, AC-000-07 · **Files:** `src/app/api/health/route.ts` · **Verify:** `pnpm lint` (proves the handler does not trip the `src/app` → repositories rule) · `pnpm dev` then `curl -i localhost:3000/api/health` · **Depends on:** T-06 · **Est. 8 min**

- [ ] **T-08** — Root UI surfaces: `layout.tsx` (`<html lang="en">`, Geist via `next/font`, `metadata.title`), `page.tsx` (the plain placeholder, exactly one `<h1>`, spec §7 copy), `error.tsx` (message + retry, no stack trace), `not-found.tsx` (message + link home), `globals.css` (`ui-brief.md` §1 teal/slate tokens only), and `_dev/boom/page.tsx` which throws on render so AC-000-08's `error.tsx` half is executable. · **AC:** AC-000-08, AC-000-09 · **Files:** `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/error.tsx`, `src/app/not-found.tsx`, `src/app/globals.css`, `src/app/_dev/boom/page.tsx` · **Verify:** `pnpm build` · `pnpm start` then browse `/`, `/no-such-page`, `/_dev/boom` · **Depends on:** T-07 · **Est. 14 min**

- [ ] **T-09** — The integration test that stops the CI `integration` job passing vacuously (CL-04): `tests/integration/health.test.ts` connects through the **generated** client to the Compose database, asserts `pingDatabase()` reports reachable, and asserts a typed `prisma.skeletonCheck.count()` succeeds — proving migrate + generate + connect agree. · **AC:** AC-000-10 · **Files:** `tests/integration/health.test.ts` · **Verify:** `pnpm test:int` · **Depends on:** T-06, T-04 · **Est. 11 min**

- [ ] **T-10** — Playwright config (chromium only, `webServer` running the built production server) and `tests/e2e/health.spec.ts`: `/` placeholder visible; document shell (`html[lang="en"]`, non-empty `<title>`, `h1` count === 1); `/api/health` → 200 with `Object.keys(body).sort()` exactly `['database','latencyMs','status','timestamp']`; unknown path → 404 with copy and link; `/_dev/boom` → `error.tsx` with retry; console clean. **No axe (deferred to 003).** · **AC:** AC-000-06, AC-000-08, AC-000-09 · **Files:** `playwright.config.ts`, `tests/e2e/health.spec.ts` · **Verify:** `pnpm test:e2e` + retain `playwright-report/` · **Depends on:** T-08 · **Est. 18 min**

- [ ] **T-11** — Evidence task, no production code. Run the full local gate and the two checks that need a deliberately broken environment: (a) the **503 path** — start the built server with `DATABASE_URL` on port 5499 and `curl -i /api/health`, expecting 503, `application/json` and exactly three keys; (b) the **lint probe** — create `src/server/domain/__lint-probe.ts` importing `@prisma/client`, run `pnpm lint`, confirm it **fails** with `no-restricted-imports`, repeat for the generated client path, then delete the file. Paste all output. · **AC:** AC-000-03, AC-000-07, AC-000-10 · **Files:** none committed (`__lint-probe.ts` is deleted; evidence goes to `validation.md`) · **Verify:** `pnpm lint && pnpm typecheck && pnpm test && pnpm test:int && pnpm build && pnpm test:e2e` all green · `git ls-files | grep __lint-probe` empty · **Depends on:** T-10 · **Est. 12 min**

- [ ] **T-12** — **C1 TAKEN (human, 🚦 G-SpecPlan 2026-11-09): two jobs, not six.** `.github/workflows/ci.yml` with `verify` (lint + typecheck + unit + build) and `database` (integration + e2e), `postgres:18` service containers for the two database jobs, `pnpm install --frozen-lockfile`, `prisma migrate deploy` (never `migrate dev`), and a non-secret localhost `DATABASE_URL`. · **AC:** AC-000-11 · **Files:** `.github/workflows/ci.yml` · **Verify:** `pnpm lint` locally, then the Actions run in T-13 · **Depends on:** T-11 · **Est. 18 min**

- [ ] **T-13** — 🛑 **Human-gated (Art. 9).** Push the branch; the **human** opens the PR through the GitHub web UI (`gh` is absent, OQ-007) at `https://github.com/hervid2/oakfern_bank_dashboard`; wait for the six jobs to go green; then verify the Vercel **Preview**: `curl -i <preview-url>/api/health` returns 200 with `status:"ok"` and take a Preview screenshot of `/`. Record the run URL, the body and the screenshot. · **AC:** AC-000-11, AC-000-12a · **Files:** none (evidence into `validation.md`) · **Verify:** Actions run URL green · `curl -i <preview-url>/api/health` · **Depends on:** T-12 · **Est. 15 min** (mostly CI and deploy wall-clock)

- [ ] **T-14** — Correct `AGENTS.md` "Project commands" to the commands that actually ran, remove the UNVERIFIED warning, and label `pnpm db:seed` honestly as not implemented until feature 001. Flip the FR-038 / FR-039 rows in `docs/traceability.md` to ✅ with the real test paths. · **AC:** AC-000-14 · **Files:** `AGENTS.md`, `docs/traceability.md` · **Verify:** `git diff AGENTS.md docs/traceability.md` reviewed against T-11's pasted evidence · **Depends on:** T-13 · **Est. 8 min**

**Deferred, not part of 000:** AC-000-12b (production deploy + production health check) runs only
after the human grants OQ-008's production authorisation. It is carried as an open row in
`docs/roadmap.md`, not as a task here.

**On `[P]`:** only T-03 is marked parallelizable. Everything else forms a single dependency chain
through `package.json`, the Prisma client or the app tree, so parallel marks would be dishonest.

**On test-first (planner rule):** applied where it is genuinely feasible — T-06 writes the unit test
and runs it red before implementing `buildHealthResult`, which is why T-05 ships the mapper as a
signature that throws. T-09 and T-10 necessarily follow the artefacts they exercise (an integration
test cannot connect to a client that does not exist yet); that deviation is recorded here rather
than silently taken.

## Timebox reckoning

| | Minutes |
|---|---|
| T-01 … T-14 summed | **199 min = 3 h 19 min** |
| − C1 taken at the gate (two CI jobs, not six) | **− 8 min → 191 min = 3 h 11 min** |
| Approved box (human, 🚦 G-SpecPlan 2026-11-09) | **180 min = 3 h 00** — C2 and C3 held in reserve |
| Timebox (`docs/roadmap.md`, KICKOFF §5) | **105 min = 1 h 45 min** |
| SP-6 +30 % trigger | 136 min = 2 h 17 min |
| Overrun as planned | **+94 min (+90 %)** |

I am not rounding this kindly. The three honest drivers:
1. **Prisma 7's setup surface was unknown when the timebox was set** (`prisma.config.ts`, mandatory
   driver adapter, explicit generator output, generated-folder import, no auto-generate). That is
   T-04 plus knock-on work in T-02 and T-05 — call it 25–30 min that KICKOFF §5 did not price.
2. **Feature 000 carries 14 ACs across nine artefact groups** (scaffold, lint, ignore/env, database,
   service layer, UI surfaces, three test levels, CI, deployment). At 1 h 45 that is 7.5 min per AC
   including its verification run, which was never realistic.
3. **Wall-clock that cannot be compressed:** `pnpm install`, the Playwright chromium download, four
   production builds, and CI/Vercel round trips.

### Pre-authorised cuts, in the order I recommend pulling them
Listed so the Coordinator can take them mid-feature without re-planning.

| # | Cut | Saves | Cost | My view |
|---|---|---|---|---|
| **C1** | Collapse the six CI jobs into **two** (`verify`: lint + typecheck + unit + build · `database`: integration + e2e with the service container) | ~8 min authoring + ~3 min per red round trip | Needs one word changed in AC-000-11 ("every **job**" → "every **step**"), so it is the human's call, not mine | **Take it.** Six jobs is CI aesthetics; two jobs proves exactly the same thing and debugs faster |
| **C2** | Defer T-14 (`AGENTS.md` table + traceability) to the first task of feature 001 | 8 min | AC-000-14 stays open one feature longer; the UNVERIFIED warning survives a few hours | **Take it if needed.** Low risk — 001 touches these files anyway |
| **C3** | Drop `_dev/boom` and verify only the 404 half of AC-000-08 in 000, deferring the forced-error check to 001 (which owns FR-039 in full) | ~6 min | AC-000-08 half-verified in 000 | Acceptable — 001 owns FR-039 completely |
| **C4** | Drop the real-server 503 run in T-11 and rely on the unit test's key-set assertion | ~5 min | The FR-038 **error path** would never be exercised end to end, under a `combined` reviewer | **Do not take.** This is the one AC an evaluator is most likely to poke at |
| | **C1 + C2 + C3 together** | **≈ 25 min → 2 h 54 min** | | Still **+66 %** over the box |

### What I actually recommend
Cuts do not close a 90 % gap, so the honest options are:

1. **Amend the 000 timebox to 3 h 00** and take C1 immediately (→ ~3 h 08 planned, ~3 h 00 with C2).
   The project budget absorbs it: ~18 h 15 estimated against ~23 h 20 to the deadline, so this
   consumes roughly a quarter of the ~5 h buffer. **This is my recommendation** — 000 is the one
   feature every other feature stands on, and a half-built pipeline costs more later than it saves now.
2. **Keep 1 h 45 and cut content**, which in practice means dropping the CI workflow (T-12/T-13) or
   the integration test (T-09). Both gut the point of a walking skeleton (RSK-02, CL-04). **Not
   recommended.**

**One signal worth escalating now rather than at feature 004:** if 000 — the smallest, best-specified
feature — runs 90 % over its estimate, the roadmap's remaining 16 h 30 for 001–008 deserves a
re-read at the same time. Better to learn that at hour 2 than at hour 18.

## Evidence
> Filled in by the Implementer as each task completes: `T-xx ✅ <commit hash> · <command> → <result>`.

- T-01 ⬜
- T-02 ⬜
- T-03 ⬜
- T-04 ⬜
- T-05 ⬜
- T-06 ⬜
- T-07 ⬜
- T-08 ⬜
- T-09 ⬜
- T-10 ⬜
- T-11 ⬜
- T-12 ⬜
- T-13 ⬜
- T-14 ⬜
