# MEMORY.md — living status board (≤ 50 lines, no secrets)

**Project:** Oakfern — modern banking dashboard (Post Oak Group technical case study)
**Profile:** Sprint (GENESIS 1.1.0) + the two amendments below · **Stage:** feature `000-walking-skeleton`, implementing
**Repo:** https://github.com/hervid2/oakfern_bank_dashboard (authoritative URL — do not retype from memory)
**Supreme Law:** `docs/governance/GENESIS.md`

## ⏰ Real time budget (this is the number that matters)
**Deadline 2026-11-10 18:00 ET.** Human-available working time is **12 h 45 min**, NOT ~21 h:
tonight **20:45 → 00:30** (3 h 45 min, hard stop — the human sleeps) and tomorrow **09:00 → 18:00** (9 h).
Revised plan after the cut: **~11 h 45 min**, buffer ~1 h.
**Human is on a Pro ($20) plan.** A planner agent was already killed by a session limit tonight.
Sub-agent calls are a hard constraint: never spawn a planner or reviewer casually.

## Consumed
| Item | Box | Consumed | Status |
|---|---|---|---|
| Genesis G0–G4 | ~1 h 30 | ~1 h 30 | ✅ G-Foundational + 🚦 G-Harness approved |
| 000 spec+clarify+plan+tasks | — | ~1 h 00 (18:40–20:50) | ✅ 🚦 **G-SpecPlan approved 20:50 ET** |
| 000 implementation | **3 h 00** (amended) | started ~20:55 | T-01…T-03 in progress |

## Decided (do not re-litigate)
- **Scope cut 2026-11-09 20:50 ET** (detail at the top of `docs/roadmap.md`): **004 cash-insights CUT · 006 cards CUT · 007 polish DISSOLVED into 008 · 003 Must-only** (no CSV, no recategorize) · **005 reduced** to internal transfer + idempotency + BR-002. 000/001/002/008 kept in full. Delivers 3 of the 5 areas the case names; the README must say so plainly.
- **Sprint Profile amendments (Pro-plan token budget):** planning is **one** `planner` invocation per feature (spec+plan+tasks together); `/sdd-clarify` only for **002 and 005**; **SP-5 → a single `combined` reviewer for every feature**.
- **Next cuts if 001 overruns:** 005 entirely, then 003's side detail panel.
- ADR-0001 layering; money = signed integer cents; `America/New_York`; jose HS256 8 h cookie; teal on slate + Geist; pnpm via corepack. `viewer` role out of scope.
- **Prisma 7 ≠ Prisma 6** (Art. 14, `plan.md` §7.2): needs `prisma.config.ts`, a **mandatory** driver adapter **`@prisma/adapter-pg@7.10.1`** (Art. 10 justified), explicit generator `output`, client imported from the generated folder, and `migrate dev` no longer runs `generate`. This mispriced 000 by +90 %.
- `prisma` CLI `latest` = **8.0.0-rc.33** — always pin `@7.10.1`. Every other ADR-0002 pin verified on the registry 2026-11-09.
- 000 closes at 🚦 G-Merge on green CI + a working Vercel **Preview**; production (AC-000-12b) deferred until OQ-008 is granted. Preview shares the Neon primary. Cut **C1 taken**: CI is 2 jobs, not 6.
- axe deferred 000 → 003 with the NFR-003 matrix. TD-008 carried forward, not closed.

## Open / blocking
- **OQ-008:** production-deploy authorisation still **not** granted (Art. 9).
- **T-13 is human-gated:** `gh` is absent (OQ-007) — the human opens the PR in the GitHub web UI.
- **MCP:** `.mcp.json` has `playwright`, `neon` (http, `?projectId=sweet-feather-13830390`) and `chrome-devtools` (`@1.12.0`, `--no-usage-statistics --no-performance-crux --redactNetworkHeaders`; both Google-facing defaults are ON upstream and the CrUX call would leak our Preview URLs). **Needs the human's trust dialog + a Claude Code restart.**
- Neon: human logged in; project `sweet-feather-13830390`, Postgres 18, us-east-1. `postgres:18` image already pulled locally.
- **RSK-04:** Neon autosuspends after 5 min; NFR-001 must be measured warm, with the cold figure reported honestly.

## Learnings
- A spec cannot overrule the brief or the roadmap with an `ASM`; amend **those** documents too.
- Estimate against the vendor's *current* major version, not the remembered one — Prisma 7 cost +90 % on the best-specified feature.
- Verify flags by running `--help`, not from a README: `chrome-devtools-mcp`'s real options are `--usageStatistics` / `--performanceCrux`, both defaulting to true.
- `neon init` does far more than write an MCP entry; for a governed harness, write the entry by hand.
- Windows PowerShell 5.1 shows UTF-8 docs as mojibake; the files are fine.

## Next step
Implementer: T-01…T-03 → **T-04 (riskiest: Prisma 7 setup, 30 min)** → T-05…T-11 → T-12 (2-job CI) → T-13 (human opens the PR) → T-14. Then `/sdd-validate 000 combined` → 🚦 G-Merge. Tomorrow 09:00: feature 001 with the collapsed one-invocation planning.
