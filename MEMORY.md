# MEMORY.md — living status board (≤ 50 lines, no secrets)

**Project:** Oakfern — banking dashboard (Post Oak Group case study) · **Stage:** 002 validated → 🚦 G-Merge → 008
**Repo:** https://github.com/hervid2/oakfern_bank_dashboard · **Supreme Law:** `docs/governance/GENESIS.md`
**Production (001 live):** https://oakfernbankdashboard.vercel.app — verified working, sign-in and all

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
✅ **002 MERGED AND LIVE.** PR #3 merged 19:48Z, `main` → `fec01b6`, all four checks green including the
Vercel deployment. **Production verified live 15:00**: $913,518.54 cash, +$254,746.64 in, −$281,636.79 out,
18.0 months runway, recent list showing Nov 10 activity (F-01 fix live), no banner CTA (F-06 live),
375 px `scrollWidth == innerWidth`, 0 elements past the edge, console 0 messages.
✅ **002 IMPLEMENTED — T-00…T-07 in 29 min** (vs a 2 h 55 estimate), **no residual cut applied** (L-5 unused,
so AC-002-19 ships). Branch `feat/002-account-overview` @ `eec8cd5`, off `4baf9cd` which is already in `main`.
**PR #3 OPEN, MERGEABLE, CI GREEN on both jobs** (run 42882368058). Local gate: lint 0 · typecheck 0 ·
unit 67 · integration 29 · build 0 · **e2e 25** · same seed hash. **27 of 28 active ACs proved**
(AC-002-26 partial: skeleton asserted at source, not against a live Suspense fallback).
⚠️ One line removed from `tests/e2e/shell.spec.ts` (001's `AC-001-18` Home-placeholder assertion, which 002 deletes) — **without it 001's suite would have gone red on merge**; the reviewer confirmed it was necessary and correctly scoped. **Components cannot import TYPES from `src/server`** (ESLint boundary rule); plan §6 assumed they could. Worth an ADR-0001 note.
🔎 **`/sdd-validate 002 combined` done → PASS WITH FINDINGS** (`validation-combined.md`, evidence PNGs in
`specs/002-account-overview/evidence/`): 0 blocker, 1 MAJOR, 5 minor. **All three acted on, pushed as
`a5da5ac` / `e690de1` / `eafc4c3`** (remote head `eafc4c3`):
 • **F-01 (MAJOR)** — `transactions.ts` ordered by `postedAt desc` and **Postgres sorts NULLs FIRST**, so the 8-row "recent" list filled with pending/canceled/failed rows of any age (one from September) while real posted activity never showed. **Every suite was green** — the e2e test only asserted `count >= 8`. Fixed to `createdAt desc`, new integration test proved red first. **This finding alone justifies the validation gate.**
 • **F-06** — "Move money" CTA dropped (OQ-002-03). A test asserted it and would have passed **vacuously** after removal (`.last()` resolving to the sidebar link); inverted, not deleted.
 • **Vercel build failure** — `src/generated/` is gitignored and only `postinstall` built it; Vercel **restored its build cache**, so install did nothing, `postinstall` never ran, `next build` could not resolve `@/generated/prisma/client`. Fixed: **`"build": "prisma generate && next build"`** (+ `AGENTS.md` row). **CI structurally cannot catch this** — it never has a cache to restore. Vercel's own Next+Prisma guide recommends only `postinstall`; Prisma's caching page is the right source.
⚠️ **A stray local `pnpm start` silently invalidates an e2e run** (`reuseExistingServer: !CI` adopts it) and
the failure looks like a product bug. Kill port 3000 before trusting a local e2e result.
🔎 Open for 008's README: F-02 (burn understated 3× on a workspace under 3 months old), F-04 (AC-002-19/20/30 lack a test carrying their id), F-05 (`docs/traceability.md:28,29` cite a nonexistent `tests/unit/amount.test.ts`; 002 rows still ⬜), F-07/F-08 suggestions.
🔥 **SESSION LIMIT BURNED ~70 min (12:20→13:30)**: two Opus agents launched at once after this file had warned twice. **One agent at a time, always.** Context window is NOT the constraint; the Pro-plan session limit is, and it is account-wide — switching sessions does not reset it.
⚠️ Vercel env vars inject **per deployment**: saving one changes nothing until a new build (the Redeploy button did not produce one; an empty commit did). **Never** detect a new build by Next chunk hashes — they are content hashes. Test behaviour. **008 will hit both.**

## Decided (do not re-litigate)
- ✂️ **003 CUT (human, 11:30).** Do not reopen it — starting a 2 h 15 feature near the close is the mistake we avoided all day. ❌ **L-3 REJECTED**: it would cut the e2e sweep to 1280 px only, and today's one real defect was a 375 px overflow invisible on Windows. **Never trade the 375 px check for 15 minutes.**
- 🚦 **002 G-SpecPlan APPROVED ~11:20** with **L-2** (pending folded into the recent list) and **L-4** (sparkline dropped). Resolved: FR-011 **read-only, no dead control**; **no `recharts`, no new dependency**; **no "Move money" CTA**; no 004 chart/category panels, recorded as `docs/ux/ui-brief.md` §8 **Amendment 1** with the original kept as superseded.
- **Scope** (`docs/roadmap.md`): 003, 004, 005, 006 **CUT**, 007 dissolved into 008. Delivers **1 of the 5 areas** the case names — accounts. The README must say so plainly, with the reason.
- Money = signed integer cents (`Int`); `America/New_York`; internal transfers excluded (BR-011); every repository method takes `businessId`; jose HS256 httpOnly cookie 8 h, no refresh; teal/slate + Geist.
- **Prisma 7:** `prisma.config.ts`, mandatory `@prisma/adapter-pg`, explicit generator `output`, client from `src/generated/prisma`, `migrate dev` does **not** generate. CLI `latest` is `8.0.0-rc.33` — always pin `@7.10.1`. ADR-0002 amended with install-time resolutions (`pnpm@11.28.9`, `typescript@5.9.3`, `@prisma/adapter-pg@7.10.1`, `@date-fns/tz@1.5.0`, `next-themes@0.4.6`).
- **`SESSION_SECRET` is the SAME value in Production and Preview** — deliberate call by the Technical Director (11:15): fictional data, no real money, a case study not a real deployment. **The README states it and notes real deployments separate them.** Not a defect; do not "fix" it.

## Open / blocking
- ✅ **`gh` 2.103.3 installed and authenticated as `hervid2`** (not on the agent shell's `PATH` — call it as `"/c/Program Files/GitHub CLI/gh.exe"`). CI logs, PR state and checks readable directly; **OQ-007 closed**. Pushing and merging stay human-gated.
- ⚠️ **The repo is PUBLIC** (`gh repo view` → `visibility=PUBLIC`; anonymous API returns 200). An earlier note here claimed it was private — wrong. GitHub asks for a sign-in to read **Actions logs** even on public repos; "cannot read the logs" is not "cannot read the repo". **Do not infer visibility from a logs paywall.**
- 🛑 **Preview 500s on sign-in** — human confirms `SESSION_SECRET` exists in Vercel's **Preview** environment (not just Production), or pastes the deployment's runtime log.
- **000 debts are CLOSED, not open** — `/_dev/boom` returns **404 in production** (gated by `OAKFERN_ENABLE_DEV_ROUTES`, `src/lib/dev-routes.ts:19`, verified live 15:00) and `src/app/icon.svg` ships. This file wrongly listed both as open for hours and the coordinator passed them to the planner as fact; the planner checked the code and refused to write them. **Verify a debt before repeating it.** Still real: `AC-000-07` has no test carrying its id, and there is no `.ico`/apple-touch icon.

## Learnings
- Verify by breaking it. A spec cannot overrule the brief or roadmap with an `ASM` — amend those too. `next dev`/`next build` append their own rules to `AGENTS.md` — disabled via `agentRules: false`.
- **A green local suite is not a green suite.** AC-001-15 passed on Windows and failed deterministically on Linux CI. Cross-OS rendering gaps hide real defects — CI is the authority, never the laptop.

## Next step
`implementer` lands the AC-001-15 fix → human pushes → CI green → `SESSION_SECRET` in Preview → re-run
AC-001-23 → `/sdd-validate 001 combined` → 🚦 G-Merge → merge. Then 002, 003, 008.
