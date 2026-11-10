# AGENTS.md — Oakfern
> Operating code for any AI agent on this repository. Concise by design: when in doubt, consult the
> linked documents. It summarises the Supreme Law — it never replaces it.

## Project
**Oakfern** is a fictional modern banking dashboard for US startups and SMBs (accounts, transactions,
cash insights, money movement, cards), built as a technical case study for the Post Oak Group hiring
team under a hard 24 h deadline. Status: 🚦 G-Foundational approved 2026-11-09. Feature
`000-walking-skeleton` is **merged and deployed**; feature `001-domain-data-shell` is **implemented
through T-14 with the full local gate green** (domain model + migration, deterministic seed, demo
session, app shell) and waits on its two human-gated tasks (T-15 Neon deploy, T-16 PR and Preview),
`/sdd-validate` and 🚦 G-Merge. Next after that: feature `002-account-overview`.

## Supreme Law (summary of `docs/governance/GENESIS.md`)
1. No approved spec, no code. Plan before Build.
2. Don't invent: ask, or record an `ASM` / `OQ` with its risk.
3. Traceability: everything has an ID; every AC has its test.
4. Verify before declaring; evidence is executed output, not "it should work".
5. Minimal changes; one task, one commit.
6. Secure by default; secrets never in the repository.
7. Destructive or costly actions, or anything touching GitHub / Vercel / Neon → human confirmation (Art. 9).
8. Max 3 self-correction cycles, then escalate with diagnosis, hypotheses and options.
9. Spec-Anchored: if behaviour changes, the spec changes first.
10. Context travels through files; `MEMORY.md` is the status board.

## Non-negotiables for this project
| # | Rule | Source |
|---|---|---|
| 1 | **Money is signed integer USD cents** (`amountCents`, `Int`). No floats, no decimals, ever. Format with `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })`; figures use `tabular-nums`. | BR-001, ADR-0003, `money-and-time` skill |
| 2 | **Business time zone is `America/New_York`.** The database stores UTC; every daily/monthly aggregation is computed in the business zone. | BR-009, ADR-0003 |
| 3 | **Internal transfers are excluded** from inflow/outflow totals and from spending by category. | BR-011 |
| 4 | **Originality.** Mercury and Slash are pattern references only. No copied logo, name, palette, copy or layout. Any flagged resemblance is a mandatory stop. | KICKOFF §2, Art. 3/8 |
| 5 | **Identity is decided:** deep **teal** single accent on cool slate neutrals; green/red reserved for money semantics and always paired with a sign or icon; typeface **Geist** via `next/font`. | `docs/ux/ui-brief.md` §1 |
| 6 | **Every repository file is in English** (docs, specs, code, commits, UI). Chat with the human is in Spanish. | SP-10 |
| 7 | **No secrets in the repo.** Zod on every server input; data access always scoped by the session's `businessId` (anti-IDOR). | NFR-005 |

## Reading order when starting a session
`AGENTS.md` → `MEMORY.md` → the active spec in `specs/NNN-*/` → the documents that spec references.

## Document map
| I need… | I read… |
|---|---|
| Non-negotiable principles (ratified v1.0.0) | `docs/constitution.md` |
| Vocabulary and names | `docs/glossary.md` |
| What the system does | `docs/requirements/` (functional, non-functional, business-rules, roles-permissions) |
| Why it's built this way | `docs/adr/` (0001–0006, all **Accepted**) · `docs/architecture/overview.md` |
| Product context, ASM / OQ / risks · domain model · UI | `docs/discovery/brief.md` · `docs/domain/model.md` · `docs/ux/ui-brief.md` |
| What's next, timeboxes, cut order · AC → test coverage | `docs/roadmap.md` · `docs/traceability.md` |
| Full agent rules · approved MCP servers | `docs/governance/GENESIS.md` (Supreme Law) · `.harness/mcp.md` |

## Stack and versions
Authoritative pins are in **ADR-0002** (`docs/adr/0002-stack-and-versions.md`). Exact pins, no `^`.

| Piece | Pin |
|---|---|
| Framework | `next` `16.4.6` (App Router) · `react`/`react-dom` `19.3.1` · TypeScript `strict`, no `any` in `src/server/domain` |
| UI | `tailwindcss` `4.3.5` · `shadcn` CLI `4.23.0` (components copied into the repo) · `recharts` `3.10.1` |
| Validation | `zod` `4.6.7` + React Hook Form |
| ORM / DB | `prisma` + `@prisma/client` **`7.10.1` both.** ⚠️ The `prisma` CLI `latest` tag resolves to an `8.0.0` release candidate — **never run a bare `pnpm add prisma`**; always pin `7.10.1`. |
| Session | `jose` `6.2.17` — HS256 JWT in an httpOnly cookie, 8 h, no refresh (ADR-0004) |
| Tests / dates / seed | `vitest` `5.1.0` · `@playwright/test` `1.65.0` · `date-fns` `4.4.0` · `@faker-js/faker` `10.6.0` (dev, fixed seed) |
| Runtime | Node `22.17.0` · **pnpm** via corepack |
| Hosting | Vercel Hobby + Neon Free Postgres; Docker Compose Postgres locally (ADR-0006) |
| Resolved in 001 (ADR-0002 Amendment 2) | `tsx` `4.23.15` (seed runner) · `lucide-react` `1.70.0` · **`radix-ui` `1.8.1`** (the shadcn 4.23 `radix` base uses the **umbrella** package, not the per-primitive ones) · `class-variance-authority` `0.7.1` · `cn` `0.5.2` (shadcn's own clsx + tailwind-merge drop-in — which is why there is **no** `src/lib/utils.ts`) · `tw-animate-css` `1.4.0` · `next-themes` `0.4.6` · `@date-fns/tz` `1.5.0`. `shadcn` itself was auto-added to `dependencies` by the CLI and **deliberately removed**: it is a `dlx` CLI. |
| Still unverified on purpose | `@axe-core/playwright` (due in 003) and `sonner` (due in 005) — the Implementer verifies each against the registry at install time (Art. 14) and records the resolved version in the feature's `plan.md`. TD-008 is therefore only **partly** closed. |

## Project commands
> Every row below has been executed in this repository (001 T-02 and T-06; exit statuses in
> `specs/001-domain-data-shell/tasks.md`). Nothing in this table is aspirational. The single
> exception is flagged inline: `pnpm db:reset` is agent-blocked by Prisma and needs a human.

| Action | Command | What it actually does |
|---|---|---|
| Install deps | `pnpm install` | Runs `postinstall` → `prisma generate`, so `src/generated/prisma` exists afterwards. `pnpm-workspace.yaml`'s `allowBuilds` must carry a decision for **every** package whose lifecycle scripts pnpm skips, `false` included: `prisma`/`@prisma/engines` are `true`, `esbuild` (transitive via `tsx` and vitest) is `false`. Without the `esbuild` entry, `pnpm install --frozen-lockfile` exits **1** with `ERR_PNPM_IGNORED_BUILDS` — measured, and it reddens every CI job |
| Dev server | `pnpm dev` | `next dev` on `localhost:3000`; reads `.env.local` |
| Lint | `pnpm lint` | **`eslint . && prettier --check .`** — "lint passing" means **both**. Exits 0 on Windows and on CI: `.gitattributes` (`* text=auto eol=lf`) makes LF the line ending in the index **and** in the working tree, matching `.prettierrc`'s `endOfLine: "lf"`. If Prettier ever reports every file at once, the checkout is CRLF — fix it with `git rm --cached -r . && git reset --hard`, never by reformatting files |
| Type check | `pnpm typecheck` | `tsc --noEmit` |
| Unit tests (all / one file) | `pnpm test` / `pnpm test <path>` | `vitest run --project unit` — the **`unit` project only**, never the integration one |
| Integration tests | `pnpm test:int` | `vitest run --project integration`; needs a reachable PostgreSQL — `docker compose up -d`, host port **5433** locally |
| End-to-end tests | `pnpm test:e2e` | `playwright test`; its `webServer` runs `pnpm build && pnpm start` itself — **do not build first**. Two prerequisites, both measured: a **seeded** database (the suite signs a visitor in through "Continue as demo", which resolves the FR-036 demo user, so run `pnpm db:seed` first) and a **`SESSION_SECRET` ≥ 32 chars in `.env.local`** (without it the sign-in action throws and 10 of 16 tests fail). CI satisfies both: a `pnpm db:seed` step and a workflow-level `SESSION_SECRET` in `.github/workflows/ci.yml` |
| Build | `pnpm build` | `next build` |
| Start (production) | `pnpm start` | `next start`; required by the e2e `webServer` and by every production-mode check |
| Migrate (dev) | `pnpm db:migrate --name <name>` | `prisma migrate dev`. In Prisma 7 it no longer runs `generate` or the seed, and without `--name` it prompts interactively |
| Generate client | `pnpm db:generate` | `prisma generate` |
| Seed | `pnpm db:seed` | `tsx prisma/seed.ts` — the FR-036 deterministic demo seed. Replaces the whole demo workspace, runs five self-checks (BR-002 balances, BR-011 internal legs, `int4` range, volumes, runway) and prints a SHA-256 `content-hash`. **Exits 1 on any failed check**, so a seeded database is never left as "fine". Two runs on the same ET day print the same hash |
| Reset (local only) | `pnpm db:reset` | `prisma migrate reset --force` — drops, re-migrates and re-seeds the local Compose database. **Never point this at Neon.** ⚠️ The only row in this table not executed by an agent: Prisma 7 refuses `migrate reset` when it detects an AI agent and demands explicit human consent, which is the right default. A human must run it |

`gh` is **not installed** (OQ-007): pull requests are created through the GitHub web UI. The
repository URL is recorded in `MEMORY.md` — use that value, do not retype it from memory.

## Repository structure
```text
AGENTS.md · MEMORY.md · CLAUDE.md
.harness/   agents · commands · skills · mcp.md     # canonical harness
.claude/    agents · commands · skills              # generated adapters
docs/       constitution · glossary · roadmap · traceability · discovery · requirements · domain · ux · architecture · adr
specs/      NNN-slug/{spec,plan,tasks,validation*}.md
src/        app/ · actions/ · components/ · server/{domain,services,repositories,rails,auth} · lib/
prisma/     schema.prisma · migrations/ · seed.ts
tests/      unit/ · integration/ · e2e/
```

## Code conventions
- **ADR-0001 layering, strictly one direction:** `src/server/domain` is pure TypeScript (no Next, no
  Prisma) → `services` orchestrate use cases and `$transaction` → `repositories` are the **only**
  layer importing Prisma. `app/` and `actions/` are thin adapters: validate with Zod, call a service,
  map the result. Business logic in a component or a Server Action is a defect.
- Money mutations are atomic and idempotent (`idempotencyKey`, BR-003/BR-006); the BR-002 balance
  invariant must always hold.
- Totals shown in several views come from one domain service — never recomputed in the UI (NFR-011).
- Tests carry the AC id in the title: `it('AC-005-03: rejects transfer above available balance', …)`.
- Every data view has empty, loading (skeleton) and error states (NFR-010).
- Conventional Commits with the task id, e.g. `feat(transactions): add URL filters [T-03]`. One task,
  one commit. `main` is protected; one `feat/NNN-slug` branch and one PR per feature. No force push.

## Agents, commands and the per-feature flow
Agents (`.harness/agents/`): **coordinator** (`CLAUDE.md`), **planner**, **implementer**, **reviewer**.
Commands: `/feature`, `/sdd-specify`, `/sdd-clarify`, `/sdd-plan`, `/sdd-tasks`, `/sdd-implement`,
`/sdd-validate`, `/sdd-status`, `/bug`, `/adr`, `/memory`.
Skills (auto-applied): `money-and-time`, `ui-system`, `testing-conventions`.

**Sprint Profile (SP-1…SP-10) gates:** 🚦 G-Foundational ✅ · 🚦 G-Harness · then per feature
🚦 **G-SpecPlan** (spec + clarifications + plan + tasks in one approval) and 🚦 **G-Merge**.
Per-feature flow: `/sdd-specify` → `/sdd-clarify` (≤ 7 findings, SP-4) → `/sdd-plan` → `/sdd-tasks`
→ 🚦 G-SpecPlan → `/sdd-implement` task by task → `/sdd-validate` (3 reviewers in parallel for
002–005; 1 `combined` reviewer for 000, 001, 006–008 — SP-5) → 🚦 G-Merge.
**Timeboxes are binding** (`docs/roadmap.md`): at +30 % over a feature's timebox, stop and propose a
MoSCoW scope cut (SP-6). Cut order: 006 → Could items → 004 with 2 charts → CSV → recategorize.

## Mandatory verification after every change
1. `pnpm lint` + `pnpm typecheck` + the affected tests, with the output pasted as evidence.
2. Any change touching money, balances, burn/runway or aggregation also runs the integration tests.
3. Any UI change is verified in a browser through the **Playwright MCP** (screenshot + console clean)
   at 1280 px and 375 px minimum.
4. Before using an unfamiliar API or writing a version number: **Context7** or the web (Art. 14).
5. Nothing is reported "done" without executed evidence.

## Forbidden
- Writing code before an approved spec, plan and tasks; skipping a gate.
- Floats for money; dates aggregated outside `America/New_York`; Prisma imported outside `repositories`.
- Secrets, real personal data or `.env` values in the repo; `console.log` of PII; `pnpm add prisma` without the `@7.10.1` pin; any dependency without an Art. 10 justification.
- Any resemblance to Mercury or Slash branding; non-English repository files.
- Touching external accounts, deploying to production or incurring cost without the human's explicit approval.
- Editing files outside the agent's permission scope; `git push --force`.

## Tool adapters
`.harness/` is the single source of truth; `.claude/` and `.mcp.json` are **generated** — edit the
harness, then regenerate. Current tool: Claude Code.

| Piece | Destination | Regenerate with |
|---|---|---|
| Root instructions | `CLAUDE.md` (imports `@AGENTS.md`) | manual |
| Sub-agents / commands / skills | `.claude/agents/`, `.claude/commands/`, `.claude/skills/<n>/SKILL.md` | `mkdir -p .claude && cp -R .harness/agents .harness/commands .harness/skills .claude/` |
| MCP servers | `.mcp.json` | Copy the fenced JSON block from `.harness/mcp.md` §2 |

A Claude Code restart may be required for new agents, commands or MCP servers to load. If the human
switches tool, only this section is redone.
