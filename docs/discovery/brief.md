# Discovery brief — Oakfern (Modern Banking Dashboard case study)
Version: 1.0 · Status: **Approved** at 🚦 G-Foundational by the human on 2026-11-09 (no changes requested) · Date: 2026-11-09

> Source: `KICKOFF.md` §2–§3 (preloaded discovery, SP-1). This file is the cleaned-up, structured
> copy required by SP-3. Where a template section adds nothing for a 24 h case study it is marked
> `N/A — <reason>` and never deleted.
> **Product brand:** `Oakfern` — fictional and original (OQ-001, decided by the human in Round 0).

---

## 1. Vision and problem

| Aspect | Content |
|---|---|
| Product | `Oakfern` — fictional digital banking for US startups and SMBs. One company workspace with several accounts, cards and money movements. |
| Problem | A founder or finance lead cannot answer, in under 10 seconds, how much cash they have, how much they burn per month, how much runway is left and what has moved; and they need to move money safely. |
| Affected parties | Founder / finance lead (`admin`); bookkeeper (`viewer`, out of scope — see §3). |
| Current process and its cost | Spreadsheets plus a legacy bank portal: slow, stale, error-prone, no cash-flow insight. |
| Why now | The real driver is the Post Oak Group technical case study: a 24 h window to demonstrate full-stack skill, UI/UX, technical judgment and efficient AI use. |
| Actual client | Post Oak Group hiring team (evaluator). The "users" above are the fictional product's users. |

### Success KPIs (verifiable by the evaluator)

| # | KPI | Threshold |
|---|---|---|
| K-1 | CR-1…CR-6 demonstrable in the deployed app | walkthrough < 3 min |
| K-2 | Deployed app usable with no manual steps | 1-click demo login, data already seeded |
| K-3 | Lighthouse on the deployed Home | Performance ≥ 85, Accessibility ≥ 95 |
| K-4 | CI green on `main` | unit + integration + e2e |
| K-5 | README explains architecture, SDD flow with agents and AI usage | present and accurate |

### Client requirements (primary source: the assignment email)

| CR | Requirement | Covered by spec |
|---|---|---|
| CR-1 | Modern UI/UX: clean, responsive, professional, intuitive navigation, polished fintech experience | 001, 007 (cross-cutting) |
| CR-2 | Account Overview: balances, financial summaries, cash position, banking metrics | 002 |
| CR-3 | Transaction Management: history with filtering, search, details, realistic sample data | 001 (data), 003 |
| CR-4 | Data Visualization: interactive charts (activity, spending, cash flow, performance) | 004 |
| CR-5 | Functional Features: interactive elements that work as on a real platform | 005, 006 |
| CR-6 | Technical Implementation: modern frameworks; clean, scalable, well-structured code | 000 + architecture + tests + CI |
| CR-7 | Submission: deployed link, GitHub repo, brief write-up of technologies and AI tools | 008 |

**Originality constraint (Art. 3, Art. 8).** Mercury and Slash are references for *patterns* (density,
hierarchy, sobriety) only. Copying their logos, names, palettes, copy or layouts is forbidden.

---

## 2. Stakeholders and actors

| Stakeholder | Interest | Decision power |
|---|---|---|
| Post Oak Group hiring team | Evaluate full-stack quality, UI/UX, judgment and AI usage | Makes the hiring decision |
| Hernán Cardona (human) | Deliver an outstanding case study on time | Technical Director: approves all gates |
| AI agent team (Coordinator / Planner / Implementer / Reviewer) | Execute the SDD flow | None: proposes, the human decides |

| User role | Goals | Usage frequency | Technical level | Devices |
|---|---|---|---|---|
| `admin` (founder / finance lead) | See cash, analyze spending, move money, manage cards | Daily | Medium | Desktop (primary), mobile |
| `viewer` (bookkeeper) | Browse and categorize transactions; cannot move money | Weekly | Medium | Desktop |
| `anonymous` (evaluator before login) | Reach the demo in one click | Once | Any | Desktop, mobile |

> **Round 0 decision:** the `viewer` role is **out of scope** (removed from Could). The RBAC design
> still documents where it would plug in — see `docs/requirements/roles-permissions.md`.

---

## 3. Scope

### Must (MVP)
| # | Item | Spec |
|---|---|---|
| M-1 | 1-click demo login with a secure session (optionally a form with prefilled demo credentials) | 001 |
| M-2 | App shell: sidebar, topbar, "Move money" CTA, light/dark mode, responsive | 001 |
| M-3 | Overview: total cash, balance per account, 30-day money in/out, net burn, runway, pending payments, recent transactions | 002 |
| M-4 | Transactions: search, combinable filters, sorting, server-side pagination with URL state, side detail panel, empty/loading/error states | 003 |
| M-5 | Interactive charts: monthly cash flow (in vs out), balance over time, spending by category, period selector, click-to-drill-down | 004 |
| M-6 | Move money: internal transfer (immediate, atomic) and ACH/wire payment (pending to simulated settlement), review step, idempotency | 005 |
| M-7 | Realistic, deterministic seed data relative to the current date | 001 |
| M-8 | CI, tests and Vercel deployment; README in English | 000, 008 |

### Should
| # | Item | Spec |
|---|---|---|
| S-1 | Cards: list of virtual/physical cards, freeze/unfreeze, monthly limit with usage bar | 006 |
| S-2 | Recategorize a transaction and add a note (charts reflect the change) | 003 |
| S-3 | Export filtered transactions to CSV | 003 |
| S-4 | "Reset demo data" button | 008 |

### Could
| # | Item | Spec |
|---|---|---|
| C-1 | Command palette (Cmd+K) with global search | 007 |
| C-2 | Account detail page with masked account/routing numbers and a copy button | 002 |
| C-3 | Documented read-only REST API `/api/v1/*` | 007 |

> Removed from Could in Round 0: *role switcher in demo mode (`admin` / `viewer`)* — the `viewer`
> role is out of scope.

### Won't (explicit out of scope)
Real banking integrations (Plaid, real ACH) · KYC/KYB · real money · real multi-company support ·
user invitations · real MFA · invoicing · full accounting · reconciliation · native mobile app.

### Deadlines and milestones
| Milestone | Time (America/New_York) |
|---|---|
| Project start | 2026-11-09 ~17:00 |
| **Hard deadline (submission)** | **2026-11-10 18:00** |
| Early-submission goal | If < 6 h remain when 005 is done, skip 006 and go to 007–008 |

Per-feature timeboxes: see `docs/roadmap.md`. Cut order (SP-6): 006 → Could items → 004 reduced to
2 charts → CSV → recategorize.

---

## 4. Raw functionality

### User stories (`admin`)
| # | Story |
|---|---|
| US-01 | As an `admin` I want to enter the demo in one click so I can evaluate the product with no setup. |
| US-02 | As an `admin` I want total cash and per-account balances on one screen so I know my position in seconds. |
| US-03 | As an `admin` I want net burn and runway so I know how long the company survives. |
| US-04 | As an `admin` I want to search, filter and sort transactions so I can find a specific movement. |
| US-05 | As an `admin` I want to open a transaction's detail, recategorize it and add a note so my reporting is accurate. |
| US-06 | As an `admin` I want interactive charts of cash flow, balance and spending so I can spot trends. |
| US-07 | As an `admin` I want to click a chart data point and land on the matching transactions so analysis leads to evidence. |
| US-08 | As an `admin` I want to transfer between my own accounts instantly so I can rebalance cash. |
| US-09 | As an `admin` I want to pay a recipient by ACH or wire with a review step so I do not send money by mistake. |
| US-10 | As an `admin` I want to cancel a pending payment so I can correct an error. |
| US-11 | As an `admin` I want to freeze a card and set its monthly limit so I can control spend. |
| US-12 | As an `admin` I want to export my filtered transactions to CSV so I can share them with my accountant. |
| US-13 | As an `admin` I want to reset the demo data so the workspace is clean for the next evaluator. |

### Main flows (step by step)
| Flow | Steps |
|---|---|
| F-1 Enter | Landing → "Continue as demo" → Home |
| F-2 Understand cash | Home → read KPIs → click a bar in the cash-flow chart → Transactions opens filtered by that month and direction |
| F-3 Investigate an expense | Transactions → search "aws" → filter by category and date range → open detail → recategorize or add a note |
| F-4 Move money (internal) | "Move money" → Transfer → choose source, destination, amount → Review → Confirm → balances update, success toast, transaction visible in both accounts |
| F-5 Pay a recipient | "Move money" → Pay → pick or create a recipient → choose ACH or wire, amount, memo → Review → Confirm → transaction stays `pending` and settles to `posted` when `settleAt` is reached |
| F-6 Cards | Cards → freeze a card (status changes) → edit the monthly limit |

### "What happens if…?" cases the specs must cover
| # | Case | Spec |
|---|---|---|
| E-01 | Double click on confirm (idempotency) | 005 |
| E-02 | Amount greater than the available balance | 005 |
| E-03 | Source equals destination | 005 |
| E-04 | Amount 0, negative, or with more than 2 decimals | 005 |
| E-05 | Canceling a pending payment | 005 |
| E-06 | Filters with no results | 003 |
| E-07 | Database error | 001, 007 |
| E-08 | Session expired mid-flow | 001, 005 |
| E-09 | Two tabs transferring at the same time (balance concurrency) | 005 |

---

## 5. Detected business rules

Refined, with examples and IDs, in `docs/requirements/business-rules.md` (BR-001…BR-011).
Origin: KICKOFF §3.5; each rule is backed by assumption ASM-001…ASM-011.

| ID | Rule (one line) |
|---|---|
| BR-001 | Money is stored as integer USD cents; displayed with `Intl.NumberFormat('en-US', …)`. |
| BR-002 | `currentBalance` = sum of posted; `availableBalance` = `currentBalance` minus pending outflows. |
| BR-003 | Internal transfer: amount > 0, source not equal to destination, amount <= available; 2 linked legs in one DB transaction, `posted`. |
| BR-004 | External payment: ACH `pending` + 120 s, wire `pending` + 30 s; lazy settlement on read. |
| BR-005 | Only a `pending` payment can be canceled; it becomes `canceled` and releases available balance. |
| BR-006 | Every money mutation requires an `idempotencyKey`; a repeated key returns the original result. |
| BR-007 | Limits: USD 250,000.00 per operation; USD 500,000.00 per day of external payments. |
| BR-008 | `netBurn(month)` = outflows minus inflows (excluding internal transfers); `runway` = total cash / average net burn of the last 3 closed months; if the average <= 0 show "Cash-flow positive". |
| BR-009 | Business time zone `America/New_York`; storage in UTC. |
| BR-010 | A `frozen` card accepts no new charges; monthly limit within [0, USD 100,000]. |
| BR-011 | Internal transfers are excluded from inflow/outflow totals and from spending by category. |

---

## 6. Data (entities, volumes, sensitivity, retention, migration)

| Aspect | Content |
|---|---|
| Entities | `User`, `Business`, `Account` (checking / savings / treasury), `Transaction`, `Counterparty`, `Card`, `Category`, `Transfer` |
| Key `Transaction` attributes | `amountCents` (signed, ADR-0003), `status` (`pending`/`posted`/`canceled`/`failed`), `method` (`ach`/`wire`/`card`/`internal`/`check`/`fee`/`interest`), `category`, `counterpartyId`, `memo`, `note`, `postedAt`, `settleAt`, `createdAt`, `idempotencyKey`, `cardId?` |
| Seed volume | 4 accounts, 5 cards, ~60 counterparties, 1,200–1,800 transactions over 12 months |
| Seed method | `@faker-js/faker` with a **fixed seed**; dates relative to the seeding day |
| Seed realism | Revenue growing ~4–6 % month over month; bi-weekly payroll; monthly rent, cloud and SaaS; variable marketing, travel, meals; monthly treasury interest; a few large wires; 2–4 `pending` payments at all times; resulting runway between 14 and 24 months |
| Sensitivity | 100 % fictional. Account and routing numbers generated and displayed masked (`••••4821`). No real personal data (Art. 8). |
| Retention | N/A — evaluation artifact; data is regenerable at will by the seed and the "Reset demo data" action. |
| Migration | N/A — greenfield project, no legacy data to migrate. |

Full model, invariants and state machine: `docs/domain/model.md`.

---

## 7. Integrations

`N/A` for real integrations. Banking rails (ACH, wire, card) are **simulated** in the service layer
behind a port `PaymentRailPort` with a `SimulatedRail` implementation (ADR-0005), so a real provider
would be just another adapter.

External managed services (decided, OQ-003 → ADR-0006): **Vercel** Hobby for a single deployment
carrying both the frontend and the `src/server` layer, and **Neon** (Free plan) as the managed
PostgreSQL host for Preview and Production. Local development uses Docker Compose PostgreSQL.
Railway was considered and rejected on cost (RSK-10).

---

## 8. Raw non-functional requirements

Refined, with thresholds and verification methods, in `docs/requirements/non-functional.md`
(NFR-001…NFR-011). Categories: performance (x2), accessibility, responsive, security, reliability,
maintainability, compatibility, observability, usability, consistency.

---

## 9. Stakeholder's interface vision

| Aspect | Content |
|---|---|
| 3 adjectives | calm · precise · trustworthy |
| References liked (patterns only) | Mercury (whitespace, typographic hierarchy, soft neutrals); Slash (useful density, powerful tables) |
| References disliked | "Rainbow" dashboards, excessive cards, gradients, decorative shadows |
| Identity | Original name `Oakfern` and wordmark; cool neutrals with a **single accent**; green/red reserved for money semantics with a non-color indicator; `tabular-nums`; one modern sans (Inter or Geist — license checked) |
| Navigation | Sidebar: Home, Transactions, Accounts, Payments, Cards, Insights (optional, can live inside Home). "Move money" primary CTA. Topbar with search (Cmd+K if built) and user menu. Sidebar becomes a sheet on mobile. |
| Screens | UI-01 Landing/demo login · UI-02 Home · UI-03 Transactions + side detail · UI-04 Account detail (Could) · UI-05 Move money (form → review → result) · UI-06 Payments · UI-07 Cards · UI-08 error and 404 states |
| Dark mode | Yes, follows the system setting, with a manual toggle |
| Visual design | Delegated to the agent by the human (time reasons), constrained by the `ui-system` skill |

Detail plus ASCII wireframes of Home and Transactions: `docs/ux/ui-brief.md`.

---

## 10. Technical and operational constraints

| # | Constraint |
|---|---|
| TC-1 | The stack must build on the human's CV stack: React, Next.js, Node, NestJS, TypeScript, Prisma, PostgreSQL, Tailwind, Zod, RHF, Zustand, Vitest, Playwright, Docker, GitHub Actions, Vercel. New technology only with architectural or functional justification (Art. 10). |
| TC-2 | Cost: **USD 0** (KICKOFF §3.10) — **upheld** by ADR-0006: Vercel Hobby + Neon Free are both permanently free, so no Art. 9 cost approval is required. Any future cost still triggers an Art. 9 stop. |
| TC-3 | Environments: local (Docker Compose Postgres) → Preview (Vercel per PR, Neon branch) → Production (Vercel on `main`, Neon). **Single deployment**: no separate backend service (ADR-0001, ADR-0006). |
| TC-4 | Package manager `pnpm`, enabled via corepack (no global install). |
| TC-5 | Every repo file in English (SP-10); chat with the human in Spanish. |
| TC-6 | Ongoing maintenance: none, but the code must look like a maintainable product. |
| TC-7 | Environment facts: Node v22.17.0 · npm 10.9.2 · corepack 0.33.0 · Docker CLI 29.7.2 (daemon stopped) · Vercel CLI 50.43.0 · `gh` CLI **not installed** (GitHub operations go through the web UI or plain `git`). |
| TC-8 | Repo: https://github.com/hervid2/PostOakGroupBankingDasboardAssestment (created, empty; `git init -b main` done, remote `origin` set). |

---

## 11. Risks

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| RSK-01 | Not finishing before 2026-11-10 18:00 ET | Medium | High | Timeboxes per feature, SP-6 scope cut, cut order 006 → Could → 004 to 2 charts → CSV → recategorize |
| RSK-02 | Deployment breaks at the end | Medium | High | Deploy in feature 000 (walking skeleton) and on every merge |
| RSK-03 | Several evaluators mutate the same demo data at once | Medium | Medium | Shared demo workspace + "Reset demo data" + idempotent seed (ASM-012) |
| RSK-04 | **Neon cold start.** Compute autosuspends after 5 min of inactivity, so the evaluator's first request pays a cold start — this can pull NFR-001 (Lighthouse Performance >= 85 on the deployed Home) below threshold if measured cold | High | Medium | Content-shaped skeletons on every data view (NFR-010); the NFR-001 Lighthouse run is performed on a **warmed** deployment and this is stated in the NFR verification method; the README documents the cold start honestly. Sources in ADR-0006 |
| RSK-05 | Looking like a copy of Mercury or Slash | Low | High | Originality constraint, `ui-system` skill, checked by Reviewer A (mandatory stop) |
| RSK-06 | API hallucination (Next, Prisma, shadcn change fast) | Medium | Medium | Art. 14: verify versions and APIs on the web / docs MCP before writing |
| RSK-07 | Docker daemon stopped, so no local Postgres | Medium | Medium | Start Docker Desktop in feature 000, or fall back to a Neon branch database for local dev |
| RSK-08 | `gh` CLI missing, so PR flow has friction | High | Low | Use `git push` plus the GitHub web UI for PRs; the per-feature PR history is still produced |
| RSK-09 | Prisma CLI `latest` dist-tag points at an 8.0.0 release candidate | Medium | Medium | Pin `prisma` and `@prisma/client` to 7.10.1 explicitly (ADR-0002) |
| RSK-10 | **Mitigated / closed by ADR-0006 (Railway not used).** Recorded because it drove the decision: Railway has no permanent free tier. A new account gets a one-time USD 5 credit valid 30 days; afterwards the account falls back to a Free plan carrying only about USD 1/month of usage credit, which a 24/7 Postgres instance will exceed (Hobby is USD 5/month). Had Railway hosted the database, the deployed demo would likely have stopped working for the evaluator roughly 30 days after submission unless the human kept a paid plan, conflicting with TC-2. Sources: https://www.saaspricepulse.com/tools/railway · https://costbench.com/software/developer-tools/railway/free-plan/ | High (if Railway were chosen) | High (post-submission) | **Avoided:** ADR-0006 chose Neon Free (permanent free plan). Railway is not used. |
| RSK-11 | **Avoided by ADR-0006.** Option (c) — a separately deployed NestJS API on Railway — would have added a second deployment, CORS and cross-domain cookies, estimated +4–6 h, against a ~24 h deadline | Medium | High | Rejected; Option A with a single Vercel deployment stands. The layering keeps the choice reversible later (ASM-020); option B stays a README "next step" |

---

## Assumptions

| ID | Assumption | Proposed by | Risk if false | Validate with | Status |
|---|---|---|---|---|---|
| ASM-001 | BR-001 — integer USD cents everywhere | agent | Rounding bugs; evaluator doubts rigor | Human at 🚦 G-Foundational | **Ratified (🚦 G-Foundational, 2026-11-09)** |
| ASM-002 | BR-002 — balance definitions | agent | Wrong balances shown | Human at 🚦 G-Foundational | **Ratified (🚦 G-Foundational, 2026-11-09)** |
| ASM-003 | BR-003 — internal transfer rules | agent | Invalid transfers accepted | Human at 🚦 G-Foundational | **Ratified (🚦 G-Foundational, 2026-11-09)** |
| ASM-004 | BR-004 — ACH 120 s / wire 30 s simulated settlement | agent | Demo feels unrealistic | Human at 🚦 G-Foundational | **Ratified (🚦 G-Foundational, 2026-11-09)** |
| ASM-005 | BR-005 — only `pending` can be canceled | agent | Inconsistent states | Human at 🚦 G-Foundational | **Ratified (🚦 G-Foundational, 2026-11-09)** |
| ASM-006 | BR-006 — idempotency key per money mutation | agent | Duplicated payments | Human at 🚦 G-Foundational | **Ratified (🚦 G-Foundational, 2026-11-09)** |
| ASM-007 | BR-007 — 250k per operation / 500k daily limits | agent | Limits the evaluator finds arbitrary | Human at 🚦 G-Foundational | **Ratified (🚦 G-Foundational, 2026-11-09)** |
| ASM-008 | BR-008 — burn and runway formulas | agent | Metrics the evaluator finds unrealistic | Human at 🚦 G-Foundational | **Ratified (🚦 G-Foundational, 2026-11-09)** |
| ASM-009 | BR-009 — `America/New_York` business time zone | agent | Off-by-one-day aggregations | Human at 🚦 G-Foundational | **Ratified (🚦 G-Foundational, 2026-11-09)** |
| ASM-010 | BR-010 — frozen card and limit bounds | agent | Card feature inconsistent | Human at 🚦 G-Foundational | **Ratified (🚦 G-Foundational, 2026-11-09)** |
| ASM-011 | BR-011 — internal transfers excluded from metrics | agent | Inflated metrics | Human at 🚦 G-Foundational | **Ratified (🚦 G-Foundational, 2026-11-09)** |
| ASM-012 | Shared demo workspace with a "Reset demo data" button | agent | Evaluators see data altered by others | Human | **Accepted (Round 0)** |
| ASM-013 | The evaluator does not require a separate backend (NestJS); a modular monolith counts as full-stack | agent | Perceived as "frontend only" | Mitigated by `src/server` layering + ADR-0001 + README | Accepted with mitigation |
| ASM-014 | Package manager `pnpm` | agent | None relevant | Human (Round 0) | **Accepted (Round 0)** |
| ASM-015 | Playwright runs chromium only in CI if time is tight (NFR-008 degraded) | agent | Undetected Safari/WebKit bug | Reviewer B at feature 007 | **Ratified (🚦 G-Foundational, 2026-11-09)** |
| ASM-016 | Charts consume server-aggregated data only; no client-side recomputation (NFR-011) | agent | Duplicated calculations drift | Reviewer A | Pending |
| ASM-017 | `Int` cents is enough (max +/- USD 21.4 M) for amounts and per-account balances; aggregated totals are summed in JS as safe integers | agent | Overflow on an aggregate | Unit test on the seed's largest totals | **Ratified (🚦 G-Foundational, 2026-11-09)** |
| ASM-018 | Session: signed JWT in an httpOnly cookie, 8 h lifetime, no refresh token | agent | Session expires mid-demo | Human at 🚦 G-Foundational | **Ratified (🚦 G-Foundational, 2026-11-09)** |
| ASM-019 | Sign convention: signed `amountCents` (inflow > 0, outflow < 0) — ADR-0003 | agent | Mixed conventions in code | Human at 🚦 G-Foundational | **Ratified (🚦 G-Foundational, 2026-11-09)** |
| ASM-020 | The application architecture (layered `domain` → `services` → `repositories`, Prisma only in repositories, Zod adapters) is **independent of the deployment topology**: the same `src/server` layer can be served by Next.js Route Handlers / Server Actions or wrapped by a separate NestJS API without changing the domain code | agent | A late topology change would require rewriting business logic rather than only its adapters | Reviewer A at feature 000; human at 🚦 G-Foundational | **Ratified (🚦 G-Foundational, 2026-11-09)** |
| ASM-021 | The whole application (frontend + server layer) is deployed as one Vercel Hobby deployment, with Neon as the managed Postgres | human | Hosting rework | — | **Accepted (ADR-0006)** |
| ASM-022 | Neon Free's 1 GB per-project storage is ample for the seed (1,200–1,800 transactions and related rows are a few MB, verified in ADR-0006), so no capacity NFR is needed | agent | Writes would fail at the cap (no overage billing) | Observed database size after the first seed in feature 000 | Pending verification, low risk |

## Open questions

| ID | Question | Blocks | Owner | Deadline | Answer |
|---|---|---|---|---|---|
| OQ-001 | Name of the fictional brand | 001 | Human | G0 | **`Oakfern`** (Round 0) |
| OQ-002 | **Application** architecture choice (KICKOFF §4.1) | G3 | Human | 🚦 G-Foundational | **Option A** — layered modular monolith (Round 0); recorded as ADR-0001. Its *deployment topology* was decided separately by OQ-003 → ADR-0006. |
| OQ-003 | **Deployment topology and managed-database host.** Candidates were: (a) Vercel + Railway Postgres, (b) Vercel + Neon Postgres, (c) Vercel frontend + Railway NestJS API + Railway Postgres. | 000 | Human | 🚦 G-Foundational | **RESOLVED 2026-11-09: option (b).** Single Vercel Hobby deployment (frontend + `src/server`), **Neon** Free as the managed Postgres for Preview and Production, Docker Compose Postgres locally. Railway rejected on cost (RSK-10); option B/(c) rejected on deadline risk (RSK-11) and kept as a README "next step". Recorded in `docs/adr/0006-deployment-and-database-hosting.md` (**Accepted**). |
| OQ-008 | Art. 9 execution permissions: create the Vercel project, create the Neon project, push to the public GitHub repo, deploy to production. No cost is involved (TC-2 upheld). | 000 | Human | 🚦 G-Foundational | **PARTIALLY RESOLVED 2026-11-09.** Authorised: push to the public GitHub repo `https://github.com/hervid2/oakfern`, and connecting the already-created Neon project `sweet-feather-13830390` (org `org-winter-river-10341535`). **Still open (the only remaining part):** production-deployment authorisation. The human is creating the Vercel project himself and will confirm. Owner: human. Required before feature 000 can close. |
| OQ-004 | Accent colour family for the `Oakfern` brand | 001 | Human | 🚦 G-Foundational | **RESOLVED 2026-11-09:** deep **teal** as the single accent on cool slate neutrals. Green and red stay reserved for money semantics and are always paired with a non-colour indicator (sign or icon). Recorded in `docs/ux/ui-brief.md` §1 / §1.1. |
| OQ-005 | Font: Inter vs Geist (both free, self-hosted via `next/font`) | 001 | Human | 🚦 G-Foundational | **RESOLVED 2026-11-09: Geist**, loaded through `next/font` (ships with Next.js, no extra dependency, no external font CDN). Recorded in `docs/ux/ui-brief.md` §1 and ADR-0002. |
| OQ-006 | Local database: Docker Compose PostgreSQL (ADR-0006) vs temporarily pointing local dev at a Neon branch, given the Docker daemon was stopped (RSK-07) | 000 | Human | 🚦 G-Foundational | **RESOLVED 2026-11-09:** local PostgreSQL stays on **Docker Compose**, keeping local and CI identical; the human is starting Docker Desktop. The Neon-branch option remains a documented contingency only. |
| OQ-007 | `gh` CLI is not installed: accept PR creation through the GitHub web UI? | 000 | Human | 🚦 G-Foundational | **RESOLVED 2026-11-09:** the `gh` CLI will **not** be installed; pull requests are created through the GitHub web UI. Agents must not assume `gh` is available. |
