---
description: SDD phase 7 — validates a feature with one focus and writes validation-<focus>.md (reviewer agent)
argument-hint: <NNN> <compliance|e2e|quality-security|combined> [url]
---
Delegate to the `reviewer` sub-agent in **Validation mode**. Arguments: $ARGUMENTS

- Work on the feature branch, against the test URL given by the Coordinator (Vercel preview or a local server already running). Don't start another server on the same port.
- Write `specs/NNN-*/validation-<focus>.md` (template D.22) with evidence; screenshots go in `specs/NNN-*/evidence/`.
- APPROVED verdict only with no BLOCKER or MAJOR findings.
- The Coordinator consolidates into `validation.md` (SP-9).
