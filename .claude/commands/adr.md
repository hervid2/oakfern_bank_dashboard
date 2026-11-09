---
description: Creates a new ADR with options and trade-offs (planner agent)
argument-hint: <decision to make>
---
Delegate to the `planner` sub-agent. Decision: $ARGUMENTS

- Create `docs/adr/NNNN-<slug>.md` with template D.9:
  - context (NFRs and constraints);
  - 2–3 options with a trade-off table;
  - recommendation with its why;
  - consequences, and what would make us reconsider.
- Verify versions and maintenance status (Art. 14).
- Status starts as `Proposed`. Only the human moves it to `Accepted`; record who decided.
- Update the ADR index in `docs/architecture/overview.md`.
