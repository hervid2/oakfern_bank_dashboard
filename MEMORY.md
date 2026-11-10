# MEMORY.md — living status board (≤ 50 lines, no secrets)

**Project:** Oakfern — banking dashboard (Post Oak Group case study) · **Stage:** feature `001-domain-data-shell`, implementing
**Repo:** https://github.com/hervid2/oakfern_bank_dashboard · **Supreme Law:** `docs/governance/GENESIS.md`
**Production (live, 000 shipped):** https://oakfernbankdashboard.vercel.app — `/api/health` 200 against Neon

## ⏰ DELIVERY DAY — 2026-11-10, deadline 18:00 ET
At 08:40 there are **~9 h 20** left for: finishing 001, then 002, 003, 005, 008 — plus a validation
and a 🚦 G-Merge each. **Calibration that matters:** 000's box was 1 h 45 and actual implementation
~1 h 25 (≈ 0.8 of box). Planner *task* estimates run ≈ 0.43 of raw; roadmap *boxes* run ≈ 0.8.
Projected remainder ≈ 7 h work + ~1 h validation ≈ **8 h against 9 h 20**.
**CHECKPOINT MISSED → acted on.** 2026-11-10 11:50: **005 CUT entirely**; **008 starts at 16:15 ET**
regardless of where 003 is — a clock rule, not an estimate. Delivers **2 of 5** areas: accounts + transactions.
**The 0.43 calibration did NOT hold for UI work** (T-10…T-13 ran 3× its estimate). Do not trust it again.
Human is on a **Pro ($20) plan** — two agents were already killed by session limits. Be economical.

## Where 001 stands
Committed on `feat/001-domain-data-shell`: **T-01…T-07**. T-08 (session/middleware) was interrupted
mid-task by a session limit and left uncommitted work; an implementer is finishing T-08 + T-09 now.
Remaining after that: T-10 shadcn primitives · T-11 shell · T-12 routes/states · T-13 e2e ·
T-14 gate + doc debts · **T-15 🛑 human: Neon migrate+seed** · **T-16 🛑 human: push, PR, Preview**.

## Decided (do not re-litigate)
- **Scope cut** (top of `docs/roadmap.md`): 004 and 006 **CUT**, 007 dissolved into 008, 003 Must-only, 005 reduced to internal transfer + idempotency + BR-002. Delivers **3 of the 5 areas** the case names; the README must say so plainly.
- **Sprint Profile amendments:** planning is **one** planner invocation per feature; `/sdd-clarify` only for 002 and 005; **one `combined` reviewer** per feature.
- **Cut C1 taken** in 001: sidebar is **3 items** (Home, Transactions, Move money), not FR-004's 5 — 004 and 006 are cut, so two links would never resolve. `AC-001-13` amended.
- Money = signed integer cents (`Int`); `America/New_York`; internal transfers excluded (BR-011); every repository method takes `businessId`; jose HS256 httpOnly cookie 8 h, no refresh; teal/slate + Geist.
- **Prisma 7:** `prisma.config.ts`, mandatory `@prisma/adapter-pg`, explicit generator `output`, client imported from `src/generated/prisma`, `migrate dev` does **not** generate. CLI `latest` is `8.0.0-rc.33` — always pin `@7.10.1`.
- ADR-0002 amended with install-time resolutions: `pnpm@11.28.9`, `typescript@5.9.3`, `@prisma/adapter-pg@7.10.1`, `@date-fns/tz@1.5.0`, `next-themes@0.4.6`.
- `.gitattributes` (`* text=auto eol=lf`) added — before it, `pnpm lint` could not pass on Windows at all.

## Open / blocking
- **T-15 needs the human:** paste Neon's **direct/unpooled** string as `DIRECT_DATABASE_URL` (the pooled one cannot run `migrate deploy` — session advisory locks), and add `SESSION_SECRET` to Vercel for **Production and Preview**.
- **T-16 needs the human:** `gh` is absent (OQ-007) — the PR is opened in the GitHub web UI. It must produce a real **Preview**, which closes 000's permanently-unverified AC-000-12a.
- **000 debts carried in:** AC-000-12a never verified (no Preview existed); `/_dev/boom` is still public in production; no automated test carries the `AC-000-07` id; no favicon (console 404 on every page).
- **MCP:** `playwright` and `chrome-devtools` **failed to connect this session** (30 s timeout) — `pnpm test:e2e` is unaffected (local Playwright), but ad-hoc browser checks are not available until they reconnect. `neon` MCP needs auth.
- **Branch protection on `main`** can only be configured after the first CI run has named its checks.

## Learnings
- Verify by breaking it: the lint guardrail, the 503 path, the non-vacuous integration test and the connection-leak fix were all proved by making them fail first.
- 000 shipped with a real defect no AC caught (a `PrismaClient` per request, 1→27 connections). A lazy proxy without a module-level memo is a trap.
- A spec cannot overrule the brief or the roadmap with an `ASM`; amend those documents too.
- `next dev`/`next build` append their own rules block to `AGENTS.md` — disabled via `agentRules: false`.

## Next step
Finish T-08/T-09 → T-10…T-14 → 🛑 T-15 and T-16 with the human → `/sdd-validate 001 combined` → 🚦 G-Merge. Then 002.
