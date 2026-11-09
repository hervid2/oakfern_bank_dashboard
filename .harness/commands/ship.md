---
description: Feature 008 — prepares the submission (README, production verification, email)
---
Run feature 008 with `/feature 008 ship`. Its scope is KICKOFF §9:

- **`README.md`**, with:
  - summary and screenshots (light and dark), and the demo link;
  - mapping of CR-1…CR-6 to features;
  - architecture (Mermaid + layers), stack and why;
  - local setup, tests and CI;
  - **AI-assisted development**: SDD flow with sub-agents, human gates, MCPs, what the human decided vs. what the AI did, how quality was ensured;
  - trade-offs and next steps.
- **Production verification:**
  - `reviewer` with focus `e2e`, in a clean window: landing → demo → KICKOFF §3.4 flows 1–6 → demo reset;
  - Lighthouse (Performance and Accessibility) on the production URL.
- **`docs/submission-email.md`**, from the KICKOFF §10.2 template, with the real URLs, stack and highlights.
- **Final checks:** the repo is public, CI is green on `main`, and there are no secrets (`git grep` for key patterns).
- Present the checklist with evidence and the final email text to the human.
