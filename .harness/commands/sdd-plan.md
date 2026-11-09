---
description: SDD phase 4 — writes plan.md for an approved spec (planner agent)
argument-hint: <NNN>
---
Delegate to the `planner` sub-agent. Spec: `specs/$ARGUMENTS-*/spec.md`.

1. Read the spec, `docs/architecture/overview.md`, the ADRs and the relevant existing code.
2. Write `plan.md` (template D.20), respecting the ADR-0001 layers.
3. List:
   - exact paths;
   - migrations with their rollback;
   - contracts (service and Server Action signatures, Zod schemas);
   - UI components.
4. Test strategy mapped to each AC.
5. New dependencies need an Art. 10 justification. If there's an architecture decision, create a new ADR.
6. Check library APIs against current docs (Art. 14) and cite the source.
