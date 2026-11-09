---
description: Orchestrates a feature's full SDD cycle (Sprint Profile) with human gates
argument-hint: <NNN> <slug or description>
---
Feature: $ARGUMENTS

You are the Coordinator. Run GENESIS Part C under the Sprint Profile (KICKOFF §1):

1. **Constitutional check:** confirm the feature is in `docs/roadmap.md` and fits `docs/constitution.md`. Assign `NNN` and branch `feat/NNN-slug`. Record the start time and timebox in `MEMORY.md`.
2. `planner` → `/sdd-specify NNN`.
3. `reviewer` → `/sdd-clarify NNN`. Bring only BLOCKER/MAJOR findings to the human; the `planner` updates the spec.
4. `planner` → `/sdd-plan NNN` and `/sdd-tasks NNN`.
5. 🚦 **G-SpecPlan**: present spec + plan + tasks + estimate vs. timebox. Wait for "yes".
6. `implementer` → `/sdd-implement NNN`, task by task or in blocks of contiguous tasks. Review each handoff report.
7. Open the PR (`gh pr create`) linking spec, plan and tasks. Wait for CI and the Vercel preview.
8. Validation:
   - features 002–005 → 3 `reviewer`s in parallel (`compliance`, `e2e`, `quality-security`);
   - all others → 1 `reviewer` with focus `combined`;
   - pass them the URL (preview, or a local server already running).
9. Consolidate the reports into `validation.md`. If the verdict is CHANGES → back to step 6 (max. 3 cycles).
10. 🚦 **G-Merge**: DoD checklist (§C.6) + time left. After "yes":
    - merge the PR (no *force*);
    - verify the production deployment.
11. Update `traceability.md`, `roadmap.md` and `MEMORY.md`; run the harness retrospective (§C.9).

If at any point the timebox is exceeded by +30 %, stop and propose a scope cut (SP-6). Stop at each 🚦 until you receive explicit approval.
