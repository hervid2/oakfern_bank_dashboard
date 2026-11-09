---
description: SDD phase 5 — breaks plan.md down into tasks.md (planner agent)
argument-hint: <NNN>
---
Delegate to the `planner` sub-agent. Plan: `specs/$ARGUMENTS-*/plan.md`.

- Use template D.21.
- Tasks are atomic (≤ 45 min), one commit per task and ordered.
- Each task states `AC`, `Files`, `Verify: <command from AGENTS.md>` and `Depends on`.
- Mark `[P]` only if tasks don't share files.
- Add up the estimate and compare it with the KICKOFF §5 timebox. If it's over, propose a cut.
- When done, the Coordinator requests 🚦 G-SpecPlan.
