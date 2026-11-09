---
description: SDD phase 6 — implements the next pending task or the one given (implementer agent)
argument-hint: <NNN> [T-xx | T-xx..T-yy]
---
Delegate to the `implementer` sub-agent. Arguments: $ARGUMENTS

- Only after 🚦 G-SpecPlan has been approved (check `MEMORY.md` or the spec).
- GENESIS §C.2 procedure:
  1. failing test;
  2. minimal change;
  3. verification (task + lint + typecheck + affected suite);
  4. commit `type(scope): desc [T-xx]`;
  5. check off the task with evidence.
- If the task requires leaving the plan or an unapproved dependency: STOP and report it.
- Max. 3 self-correction cycles per task (Art. 12).
