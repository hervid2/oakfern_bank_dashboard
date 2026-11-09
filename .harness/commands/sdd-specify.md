---
description: SDD phase 2 — creates or updates a feature's spec (planner agent)
argument-hint: <NNN> <slug>
---
Delegate to the `planner` sub-agent. Request: $ARGUMENTS

1. Read the inputs:
   - `docs/constitution.md`, `docs/glossary.md`, `docs/roadmap.md`, `docs/ux/ui-brief.md`;
   - the related FR/BR/NFR.
2. If the feature is not in the roadmap, stop and propose adding it.
3. Create or update `specs/NNN-<slug>/spec.md` with template D.18.
4. Ask the human only what's missing (≤ 7 questions, with a recommended option).
5. Write ACs in Given/When/Then format with `AC-NNN-xx`, including errors and empty/loading/error states.
6. Don't write code. Gaps → OQ; assumptions → ASM.
7. Close with a summary and recommend `/sdd-clarify NNN`.
