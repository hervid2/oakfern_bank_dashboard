# MEMORY.md — living status board (≤ 50 lines, no secrets)

**Project:** Oakfern — modern banking dashboard (Post Oak Group technical case study)
**Profile:** Sprint (GENESIS 1.1.0, KICKOFF §1) · **Stage:** Genesis complete → feature `000-walking-skeleton` (SDD phase 4–5, /sdd-plan + /sdd-tasks)
**Deadline:** 2026-11-10 18:00 America/New_York · **Started:** 2026-11-09 ~17:00 ET
**Repo:** https://github.com/hervid2/oakfern_bank_dashboard (final name, remote set, connected to Vercel by the human)
**Supreme Law now lives at** `docs/governance/GENESIS.md` (moved in G4.8).

## Consumed per feature
| Item | Timebox | Consumed | Status |
|---|---|---|---|
| Genesis G0–G3 | ~1 h 05 min | ~1 h 05 min | ✅ G-Foundational approved 2026-11-09 |
| Genesis G4 | 25 min | ~25 min | ✅ 🚦 G-Harness approved 2026-11-09 18:35 ET |
| 000 walking-skeleton | 1 h 45 min | started 18:40 ET | spec 0.3 + clarifications done; plan/tasks in progress |
| 001–008 | ~16 h 30 min | — | not started |
Estimated remaining work ~18 h 15 min against ~23 h 20 min to deadline (~5 h buffer, re-measured 18:40 ET).

## Decided (do not re-litigate)
- Brand: **Oakfern**. Original, collision-checked. No Mercury/Slash resemblance (KICKOFF §2).
- ADR-0001: **Option A** — Next.js App Router modular monolith, `src/server` layered domain → services → repositories, Prisma only in repositories.
- ADR-0006: single **Vercel** Hobby deployment + **Neon** Free Postgres (project `sweet-feather-13830390`, org `org-winter-river-10341535`); Docker Compose locally. **Railway rejected** (no permanent free tier). Cost USD 0.
- Money: signed integer cents (`amountCents`), `direction` derived, `Int` not `BigInt`. Time zone `America/New_York`.
- Session: jose HS256 JWT in httpOnly cookie, 8 h, no refresh.
- Identity: deep **teal** single accent on cool slate neutrals; **Geist** via `next/font`.
- Package manager **pnpm** (via corepack). `viewer` role **out of scope**. Shared demo workspace + reset.
- ADR-0002 pins **prisma + @prisma/client 7.10.1** — the `latest` CLI tag is an 8.0.0 RC. Do not run a bare `pnpm add prisma`.
- **Human 2026-11-09:** feature 000 may close at 🚦 G-Merge on green CI + a working Vercel **Preview**; production deploy (AC-000-12b) deferred until OQ-008 is granted. Recorded in brief OQ-008 + roadmap, not only in the spec.
- **Human 2026-11-09:** Vercel Preview **shares the Neon primary** (`sweet-feather-13830390`) for 000 (OQ-010 resolved); revisit before 001's real migration.
- **Human 2026-11-09:** timebox protected — `@axe-core/playwright` and the axe scan **deferred from 000 to 003**. 000 keeps only document-shell assertions in e2e. TD-008 stays open.

## Open / blocking
- **OQ-008 (remaining):** production deploy authorisation. Vercel project now connected to the repo by the human; the deploy itself still needs his explicit go-ahead (Art. 9).
- **MCP:** `.mcp.json` has `playwright` + `neon` (http, `?projectId=sweet-feather-13830390`) + **`chrome-devtools`** (`chrome-devtools-mcp@1.12.0`, pinned; `--headless --isolated --no-usage-statistics --no-performance-crux --redactNetworkHeaders`; local Chrome 156 verified). Added at the human's request 2026-11-09 **after** G-Harness — harness amendment, `.harness/mcp.md` §1/§2/N-7/N-8 updated first, `.mcp.json` regenerated from it. `context7` omitted — needs `CONTEXT7_API_KEY`; Art. 14 falls back to WebSearch, which works. The `neon` server needs the human's trust-dialog approval and possibly a Claude Code restart (N-5); its OAuth is unconfirmed until first use.
- **Neon:** ✅ human logged in 2026-11-09 (`hdcardonab`, OAuth DEFAULT profile). Project `sweet-feather-13830390` verified live: Postgres 18, `aws-us-east-1`, 0 B used, still named `my-first-project` (cosmetic). `neon init` was **deliberately not run** — it also does agent-setup/`neon.ts`/skills, out of scope; the project-scoped MCP entry was written by hand per `.harness/mcp.md` N-4.
- **Docker:** ✅ daemon up (29.7.2), zero containers running. The human's unrelated `aac27-mysql` / `aac27-redis` were stopped at his request (restore with `docker start aac27-mysql aac27-redis`); they used 3307/6379 and never conflicted with Postgres 5432. Feature 000 still has to create `docker-compose.yml`.
- **TD-008:** still open, **no longer due in 000**. `@axe-core/playwright` moves to 003 with the axe scan; `@date-fns/tz`, `lucide-react`, `sonner` are not needed by 000. Versions stay unverified until install time (Art. 14).
- **RSK-04:** Neon autosuspends after 5 min; NFR-001 must be measured on a warmed deployment, cold figure reported honestly in the README.

- **clarifications.md CL-07 row is stale:** the reviewer closed it against spec 0.2, where ASM-026 was verified by an axe assertion. Axe is now deferred, so that row must be reopened once spec 0.3 lands.

## Learnings
- Windows PowerShell 5.1 renders UTF-8 docs as mojibake in the console; the files are valid UTF-8. Verify with `file`/`od` before "fixing" an encoding that is not broken.
- `.gitignore` was created during Genesis (SP-8) *before* any tool could write `.env`. Feature 000 replaces it with the full version.
- A spec cannot overrule the brief or the roadmap with an `ASM` (clarify CL-02). When the human defers a recorded prerequisite, amend **those** documents too.
- `neon init` does far more than write an MCP entry (agent setup, `neon.ts`, skills). For a governed harness, write the project-scoped MCP entry by hand.
- Three different repo URLs had drifted across `docs/`. `MEMORY.md` is authoritative; the stale spellings were `.../oakfern` and `.../PostOakGroupBankingDasboardAssestment`.

## Next step
Feature `000-walking-skeleton`: spec **0.3** + `clarifications.md` done (7 findings, all applied). Planner is writing `plan.md` + `tasks.md` with Art. 14 version checks. Then 🚦 **G-SpecPlan** → implement task by task → `/sdd-validate 000 combined` → 🚦 G-Merge on Preview evidence. Spec has **15 ACs** (12 split into 12a/12b).
