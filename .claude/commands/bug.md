---
description: Bug flow — reproduce with a test, fix, validate (GENESIS §C.7)
argument-hint: <bug description>
---
Bug: $ARGUMENTS

1. **Coordinator:** classify the bug. Does it reveal a gap in the spec? If so, the `planner` amends the spec first (Art. 13) and you request approval.
2. **`implementer`:**
   1. branch `fix/<slug>`;
   2. test that reproduces the bug (red);
   3. minimal fix → green;
   4. lint, typecheck and suite;
   5. commit `fix(scope): ...`.
3. **`reviewer`:** focus `combined` on the change.
4. 🚦 G-Merge and `MEMORY.md` update.
