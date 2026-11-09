---
description: SDD phase 3 — audits a spec and writes clarifications.md (reviewer agent)
argument-hint: <NNN>
---
Delegate to the `reviewer` sub-agent in **Clarification mode**. Spec: `specs/$ARGUMENTS-*/spec.md`.

- Use template D.19, with at most 7 findings, each with a severity and a recommended option (SP-4).
- Return only BLOCKER/MAJOR findings to the Coordinator as questions for the human.
- MINOR findings are resolved with the recommendation and recorded as `ASM` in the spec (done by the planner).
