# Submission email — draft

> Feature 008 (FR-043). Draft for the Technical Director to review, adjust and send. Nothing here is
> sent by an agent.
>
> **Before sending, confirm:** the recipient name and address, the repository URL below, and that
> <https://oakfernbankdashboard.vercel.app> still signs in through "Continue as demo". The
> repository is **public** (verified 2026-11-10), so the hiring team needs no access grant.

---

**Subject:** Modern Banking Dashboard case study — Hernán Cardona

---

Hi <name>,

Here is my submission for the Modern Banking Dashboard case study.

**Live demo:** https://oakfernbankdashboard.vercel.app — click "Continue as demo". No sign-up and no
setup; the workspace is already seeded.
**Repository:** https://github.com/hervid2/oakfern_bank_dashboard — start with the `README.md`.

**What I built.** "Oakfern" is a banking dashboard for US startups and SMBs. The delivered screen is
the **account overview**: total cash, 30-day money in and out, monthly net burn, runway, per-account
balances and a recent-activity list with pending payments folded in. Underneath it are a Prisma
schema with its migration, a deterministic seed of 1,369 transactions across 375 days, a signed
session, and the full application shell with its empty, loading and error states.

**What I did not build, and why.** The brief names five areas; **I delivered one** — accounts. I cut
transaction management, data visualization, money movement and cards. The 24-hour window contained
about 11 h 30 min of my actual working time against a scope I had estimated at roughly 19 h 45 min,
so the gap was visible on the first evening and I took the cuts deliberately, in a pre-agreed order,
rather than discover them at the deadline. I would rather hand you one vertical slice with its money
rules, layering, tests, CI and deployment intact than five half-screens. The decisions, their dates
and their reasoning are in `docs/roadmap.md`, and the README states the scope in its first section.

**What I would like you to look at.** The engineering judgement rather than the surface:

- The one-direction layering (`domain` pure → `services` → `repositories` as the only Prisma
  importer, with `app/` and `actions/` as thin adapters), enforced by lint rather than by discipline.
- Money as signed integer USD cents end to end, with no float anywhere, and `America/New_York` as
  the business time zone with UTC storage and half-open ranges so daylight saving cannot
  double-count a day.
- A spec-driven workflow with human approval gates and four separate AI agent roles, where the
  reviewer is independent of the implementer. The README's "What this process caught" section has
  three concrete incidents, including a correctness defect on the main screen that every green test
  suite had missed.
- An honest limitations section. One feature shipped without an independent validation pass, and
  several known defects and debts are written down with their reasons rather than left to be found.

I am happy to walk through any part of it, including the parts I cut and what I would do next.

Best regards,
Hernán Cardona
hdcardonab@gmail.com
