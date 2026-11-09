# MEMORY.md — living status board (≤ 50 lines, no secrets)

**Project:** Oakfern — modern banking dashboard (Post Oak Group technical case study)
**Profile:** Sprint (GENESIS 1.1.0, KICKOFF §1) · **Stage:** Genesis, G4 complete → 🚦 G-Harness pending
**Deadline:** 2026-11-10 18:00 America/New_York · **Started:** 2026-11-09 ~17:00 ET
**Repo:** https://github.com/hervid2/oakfern_bank_dashboard (final name, remote set, connected to Vercel by the human)
**Supreme Law now lives at** `docs/governance/GENESIS.md` (moved in G4.8).

## Consumed per feature
| Item | Timebox | Consumed | Status |
|---|---|---|---|
| Genesis G0–G3 | ~1 h 05 min | ~1 h 05 min | ✅ G-Foundational approved 2026-11-09 |
| Genesis G4 | 25 min | in progress | 🚦 G-Harness pending |
| 000 walking-skeleton | 1 h 45 min | — | not started |
| 001–008 | ~16 h 30 min | — | not started |
Estimated remaining work ~19 h 45 min against ~24 h to deadline (~4 h buffer).

## Decided (do not re-litigate)
- Brand: **Oakfern**. Original, collision-checked. No Mercury/Slash resemblance (KICKOFF §2).
- ADR-0001: **Option A** — Next.js App Router modular monolith, `src/server` layered domain → services → repositories, Prisma only in repositories.
- ADR-0006: single **Vercel** Hobby deployment + **Neon** Free Postgres (project `sweet-feather-13830390`, org `org-winter-river-10341535`); Docker Compose locally. **Railway rejected** (no permanent free tier). Cost USD 0.
- Money: signed integer cents (`amountCents`), `direction` derived, `Int` not `BigInt`. Time zone `America/New_York`.
- Session: jose HS256 JWT in httpOnly cookie, 8 h, no refresh.
- Identity: deep **teal** single accent on cool slate neutrals; **Geist** via `next/font`.
- Package manager **pnpm** (via corepack). `viewer` role **out of scope**. Shared demo workspace + reset.
- ADR-0002 pins **prisma + @prisma/client 7.10.1** — the `latest` CLI tag is an 8.0.0 RC. Do not run a bare `pnpm add prisma`.

## Open / blocking
- **OQ-008 (remaining):** production deploy authorisation. Vercel project now connected to the repo by the human; the deploy itself still needs his explicit go-ahead (Art. 9).
- **MCP:** only `playwright` installed in `.mcp.json` (verified, no auth). `context7` omitted — needs `CONTEXT7_API_KEY`; Art. 14 falls back to WebSearch, which is working. `neon` MCP entry will be written by `neon init` once the human logs in; reconcile to a single project-scoped server then.
- **`neon login` is pending the human** (needs an interactive browser; CLI 9.3.2 installed globally). Then I run `neon init -y --agent claude-code --no-config --org-id … --project-id …`.
- **Docker Desktop:** human is starting it. Needed by 000 for local Postgres.
- **TD-008:** `@axe-core/playwright`, `@date-fns/tz`, `lucide-react`, `sonner` versions deliberately unverified — Implementer must verify at install time (Art. 14).
- **RSK-04:** Neon autosuspends after 5 min; NFR-001 must be measured on a warmed deployment, cold figure reported honestly in the README.

## Learnings
- Windows PowerShell 5.1 renders UTF-8 docs as mojibake in the console; the files are valid UTF-8. Verify with `file`/`od` before "fixing" an encoding that is not broken.
- `.gitignore` was created during Genesis (SP-8) *before* any tool could write `.env`. Feature 000 replaces it with the full version.

## Next step
Finish G4 (Planner: ADR statuses → Accepted, `AGENTS.md`, `.harness/mcp.md`; Coordinator: `.mcp.json`), request 🚦 **G-Harness**, then first commit `chore: bootstrap project harness (genesis)` and start feature 000.
