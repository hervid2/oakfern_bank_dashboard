# MEMORY.md — living status board (≤ 50 lines, no secrets)

**Project:** Oakfern — banking dashboard (Post Oak Group case study) · **Stage:** feature `001-domain-data-shell`, implementing
**Repo:** https://github.com/hervid2/oakfern_bank_dashboard · **Supreme Law:** `docs/governance/GENESIS.md`
**Production (live, 000 shipped):** https://oakfernbankdashboard.vercel.app — `/api/health` 200 against Neon

## ⏰ DELIVERY DAY — 2026-11-10, deadline **16:45 ET** (corrected by the human at 10:45 ET)
Earlier stamps here and in `docs/roadmap.md` were **invented** — read the clock from a tool, never guess.
**005 stays CUT.** **The 0.43 calibration did NOT hold for UI work** (001's T-10…T-13 ran 3×). Human is on a **Pro ($20) plan**; be economical.
⏰ **CLOCK RULE (human, 11:15 ET): 008 `ship` starts at 15:30 ET**, not 16:15 — the old rule came from a wrong 18:00 deadline and left 008 only 30 min. **003 absorbs the cut** (whatever is unfinished at 15:30 is dropped); 002 stays whole. `docs/roadmap.md` still says 18:00/16:15 — **the planner must correct it**.

## Where we are (13:35 ET)
✅ **001 IS MERGED AND VERIFIED IN PRODUCTION.** PR #2 merged 18:33Z; `main` → `6b6f05c`; CI green on
both commits. **AC-001-23 PASSED on https://oakfernbankdashboard.vercel.app**: "Continue as demo" signs
in → `/home`, shell renders at 1280 px, **`scrollWidth 375` == `innerWidth 375` (zero overflow)**,
**console 0 errors 0 warnings**, `/api/health` 200 `database:"ok"`. **This also closes 000's AC-000-12a.**
AC-001-15's fix is now confirmed in three independent environments (Windows, Linux CI, Production).
⚠️ **`/sdd-validate 001 combined` DEFERRED by the human (13:30)** — no `validation-combined.md` exists; 001's validation rests on CI evidence. **The README must say this plainly.**
⚠️ **Preview (not Production) still 500s on sign-in** — open anomaly, **not a code defect** and no longer
blocking. Vercel's runtime log reads `SESSION_SECRET is missing or shorter than 32 characters` even though
the var shows on **both** Production and Preview rows in the Project tab. AC-001-23 was amended to be
satisfied on Production, which it now is.
🔧 **002 in progress** on `feat/002-account-overview` (off `feat/001-domain-data-shell`), one
`implementer`, T-00…T-07, **hard stop 15:30**, pre-authorised to cut L-5 and the §8 ladder — **never L-3**.
🔥 **SESSION LIMIT BURNED ~70 min (12:20→13:30)**: two Opus agents launched at once after this file had warned twice. **One agent at a time, always.** Context window is NOT the constraint; the Pro-plan session limit is, and it is account-wide — switching sessions does not reset it.
⚠️ Vercel env vars inject **per deployment**: saving one changes nothing until a new build (the Redeploy button did not produce one; an empty commit did). **Never** detect a new build by Next chunk hashes — they are content hashes. Test behaviour. **008 will hit both.**

## Decided (do not re-litigate)
- ✂️ **003 `transactions` is CUT (human, 11:30 ET).** The honest 002 estimate is **2 h 55 agent + 15 min human**, not the 1 h 55 the coordinator miscalculated (it subtracted L-2/L-4 from the Must-only baseline instead of the full one). 11:28 → 15:30 leaves ~4 h; 001's close (~45 min) + 002 (3 h 10) consumes it. **Delivers 1 of the 5 areas the case names — accounts.** The README must say so, with the reason, plus FR-011 read-only, ASM-002-02 and ASM-002-04.
- ❌ **Cut L-3 is REJECTED** (human, 11:30): it would reduce the e2e sweep to 1280 px only. Today's single real defect was a 375 px overflow invisible on Windows — **never trade away the 375 px check for 15 minutes.** L-5 (drop the available-balance line, −10 min) stays available as an in-flight lever.
- 🚦 **002 G-SpecPlan APPROVED 2026-11-10 ~11:20 ET** with the cut ladder **L-2** (pending payments folded into the recent list) and **L-4** (**sparkline dropped**) applied → box amended to **2 h**. Resolved: pending payments are **read-only, no dead control** (FR-011 note amended); **no `recharts`, no new dependency**; **no "Move money" CTA on Home** (005 is cut); Home ships **without** the cash-flow chart and spending-by-category panel, with a dated amendment in `docs/ux/ui-brief.md` §8. 002 branches from `feat/001-domain-data-shell` and rebases onto `main` after the 001 merge.
- **Scope cut** (`docs/roadmap.md`): 004, 005 and 006 **CUT**, 007 dissolved into 008, 003 Must-only. Delivers **2 of the 5 areas** the case names — accounts and transactions; the README must say so plainly, with the reason.
- **Sprint Profile:** **one** planner invocation per feature; **one `combined` reviewer** per feature. **Cut C1** in 001: sidebar is **3 items**, not FR-004's 5 — `AC-001-13` amended.
- Money = signed integer cents (`Int`); `America/New_York`; internal transfers excluded (BR-011); every repository method takes `businessId`; jose HS256 httpOnly cookie 8 h, no refresh; teal/slate + Geist.
- **Prisma 7:** `prisma.config.ts`, mandatory `@prisma/adapter-pg`, explicit generator `output`, client from `src/generated/prisma`, `migrate dev` does **not** generate. CLI `latest` is `8.0.0-rc.33` — always pin `@7.10.1`. ADR-0002 amended with install-time resolutions (`pnpm@11.28.9`, `typescript@5.9.3`, `@prisma/adapter-pg@7.10.1`, `@date-fns/tz@1.5.0`, `next-themes@0.4.6`).
- `.gitattributes` (`* text=auto eol=lf`) added — before it, `pnpm lint` could not pass on Windows at all.
- **`SESSION_SECRET` is the SAME value in Production and Preview** — deliberate call by the Technical Director (11:15): fictional data, no real money, a case study not a real deployment. **The README states it and notes real deployments separate them.** Not a defect; do not "fix" it.

## Open / blocking
- ✅ **`gh` 2.103.3 is installed and authenticated as `hervid2`** (11:25 ET). It is NOT on the agent shell's `PATH` — call it as `"/c/Program Files/GitHub CLI/gh.exe"`. CI logs, PR state and checks are now readable directly; **OQ-007 is closed**. Pushing stays human-gated.
- 🛑 **Preview 500s on sign-in** — human confirms `SESSION_SECRET` exists in Vercel's **Preview** environment (not just Production), or pastes the deployment's runtime log.
- **000 debts:** `/_dev/boom` still public in production; no test carries `AC-000-07`; no favicon (404 confirmed again on Preview). Branch protection on `main` needs CI to name its checks first. `neon` MCP needs auth; `gh` absent (OQ-007).

## Learnings
- Verify by breaking it: the lint guardrail, the 503 path and the connection-leak fix were proved by making them fail first. 000 shipped a defect no AC caught (`PrismaClient` per request, 1→27 connections). A spec cannot overrule the brief or roadmap with an `ASM` — amend those too. `next dev`/`next build` append their own rules to `AGENTS.md` — disabled via `agentRules: false`.
- **A green local suite is not a green suite.** AC-001-15 passed on Windows and failed deterministically on Linux CI. Cross-OS rendering gaps hide real defects — CI is the authority, never the laptop.

## Next step
`implementer` lands the AC-001-15 fix → human pushes → CI green → `SESSION_SECRET` in Preview → re-run
AC-001-23 → `/sdd-validate 001 combined` → 🚦 G-Merge → merge. Then 002, 003, 008.
