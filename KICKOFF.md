# KICKOFF.md — Technical Case Study "Modern Banking Dashboard" (Sprint Profile, 24 h)

> **Type:** human's bootstrap order + preloaded discovery · **Subordinate to:** `GENESIS.md` (Supreme Law)
> **Date:** 2026-11-09 · **Hard deadline:** 24 h from receipt of the email (goal: submit the same day)
> **Human / Technical Director:** Hernán Cardona · **Evaluating client:** Post Oak Group hiring team

---

## 0. How to use this kit (for the human)

### 0.1 Prepare the repository (5 min)

```bash
mkdir banking-dashboard && cd banking-dashboard && git init -b main
```

Copy **all** the contents of this kit into the repo root:

```text
banking-dashboard/
├── GENESIS.md            # your Supreme Law (v1.0.1; the agent records amendment 1.1.0)
├── KICKOFF.md            # this file
├── CLAUDE.md             # Main Agent (Coordinator) instructions
└── .harness/             # canonical source of the harness (installed into .claude/ in phase G4)
    ├── agents/           # planner.md · implementer.md · reviewer.md
    ├── commands/         # feature, sdd-*, bug, adr, memory, ship
    └── skills/           # money-and-time · ui-system · testing-conventions
```

Have these ready before starting:
- Node LTS
- Docker (for local Postgres)
- A GitHub account with `gh` authenticated
- A Vercel account
- A Neon account (free plan)

Creating accounts, connecting services and deploying are Art. 9 actions: the agent will ask you for confirmation.

### 0.2 Bootstrap prompt (Claude Code in Plan mode)

```text
Read GENESIS.md and KICKOFF.md in full. GENESIS.md is your Supreme Law.
KICKOFF.md §1 contains my direct order to amend GENESIS (v1.1.0, Sprint Profile) and §3–§6 contain the discovery already done.
1) Record the amendment in the Amendment log of GENESIS.md.
2) Run the Genesis Protocol under the Sprint Profile starting at Phase G0.
3) Start with the Environment Report and the Round 0 questions in KICKOFF.md §11.
Do not write code until the protocol allows it.
```

### 0.3 Resume prompt (new session per feature, §A.9)

```text
Read AGENTS.md and MEMORY.md. Tell me the project status, the time left until the deadline and the next step according to the SDD flow (Sprint Profile).
```

---

## 1. Direct order from the human — GENESIS Amendment 1.1.0 "Sprint Profile"

> The human, as the only party authorized to amend level 1 (GENESIS §A.10), **orders** this amendment. The agent copies it into the *Amendment log* of `GENESIS.md` with the row:
> `| 1.1.0 | 2026-11-09 | Adds Sprint Profile (time-boxed) | Technical case study with a 24 h deadline | Human |`

**Scope.** The Sprint Profile applies to projects with a delivery deadline ≤ 72 h. **It does not repeal any article of §A.3.** Art. 1–15 remain fully in force, especially Art. 3, 5, 8 and 9. It only compresses the procedure:

| # | Sprint Profile rule | Replaces |
|---|---|---|
| SP-1 | **Preloaded discovery.** §3–§6 of this KICKOFF are the dump of G1 Step 1 and the classification of G1 Step 2, already done. G1 is reduced to Round 0 (§11) plus asking only the gaps that block the MVP. | Full G1 |
| SP-2 | **Merged gates.** 🚦 G-Brief + 🚦 G-Foundational → a single **🚦 G-Foundational**. 🚦 G-Spec + 🚦 G-Plan → a single **🚦 G-SpecPlan** per feature (spec + resolved clarifications + plan + tasks in one request). 🚦 G-Harness and 🚦 G-Merge are kept. | §A.5 |
| SP-3 | **Compact foundational documents.** All G3 files are generated with their paths and IDs, but in compact form: tables instead of prose, and `N/A — <reason>` where they add nothing. The brief lives in `docs/discovery/brief.md` (a cleaned-up copy of §3). | Length of G2–G3 |
| SP-4 | **Bounded clarification.** The Reviewer reports at most 7 findings per spec. Only BLOCKER/MAJOR findings reach the human as questions; MINOR ones are resolved with the recommended option and recorded as `ASM`. | C.1 phase 3 |
| SP-5 | **Proportional validation.** Features 002–005 (interactive UI and money logic) use 3 reviewers in parallel (§C.3). Features 000, 001, 006, 007 and 008 use 1 reviewer with the `combined` focus. | §C.3 |
| SP-6 | **Timebox and scope cut.** Each feature has a timebox (§5). If a feature exceeds its timebox by +30 %, the Coordinator stops and proposes a MoSCoW scope cut (§3.3) before continuing. `MEMORY.md` always holds the deadline and the time consumed. | — (new) |
| SP-7 | **Short mentor mode.** At most 1 sentence of "why" per relevant decision, with the discarded alternative in parentheses. | §A.1 |
| SP-8 | **Shell during Genesis.** In G0–G4 the Main Agent may run non-destructive setup commands (`git init`, `mkdir`, copying `.harness/` → `.claude/`). Afterwards, the Coordinator only uses read-only shell (`git status`, `git log`, `gh pr view`). | §A.4 (Coordinator without shell) |
| SP-9 | **Parallel validation reports.** Each reviewer writes `specs/NNN-*/validation-<focus>.md` and the Coordinator consolidates them into `validation.md`, so parallel reviewers don't collide on the same file. | §C.3 |
| SP-10 | **Language.** Every file in the repo is in **English** (docs, specs, ADRs, README, code, commits and UI), because the evaluator is a US company and the SDD trail is part of what's evaluated. Chat with the human: **Spanish**. | §A.6 Language (default) |

---

## 2. The assignment (primary source)

Build a **modern banking dashboard** inspired by Mercury or Slash, with an **original implementation and user experience**. Evaluated areas:
- full-stack skills;
- UI/UX;
- technical judgment;
- **efficient use of AI tools without lowering quality**.

| Client req. ID | Requirement from the email | Covered by (spec) |
|---|---|---|
| CR-1 | Modern UI/UX: clean, responsive, professional, intuitive navigation, polished fintech experience | 001, 007 (cross-cutting to all) |
| CR-2 | Account Overview: balances, financial summaries, cash position and other banking metrics | 002 |
| CR-3 | Transaction Management: history with filtering, search, details and realistic sample data | 001 (data), 003 |
| CR-4 | Data Visualization: interactive charts of activity, spending, cash flow or performance | 004 |
| CR-5 | Functional Features: interactive elements that work as they would on a real platform | 005, 006 |
| CR-6 | Technical Implementation: modern frameworks; clean, scalable, well-structured code | 000 + architecture + tests + CI |
| CR-7 | Submission: link to the deployed app, GitHub repo and a brief explanation of technologies and AI tools | 008 |

**Originality constraint (Art. 3, Art. 8).** Copying logos, names, exact palettes, copy or pixel-perfect layouts from Mercury or Slash is forbidden. They are references for *patterns* (density, hierarchy, sobriety), not for identity. The product brand is **fictional and original**; the agent proposes it in Round 0.

---

## 3. Preloaded discovery brief (basis for `docs/discovery/brief.md`)

### 3.1 Vision and problem

- **Fictional product:** digital banking for US startups and SMBs. A single company *workspace* with several accounts, cards and money movements.
- **Problem it simulates solving:** a founder or finance lead needs to know within 10 seconds:
  - how much cash they have;
  - how much they burn per month;
  - how much *runway* is left;
  - what has moved.

  They also need to move money safely.
- **Success KPIs for the case study** (verifiable by the evaluator):
  1. The 6 requirements CR-1…CR-6 can be demonstrated in the deployed app in a walkthrough of under 3 minutes.
  2. The deployed app works with no manual steps: 1-click demo login and data already seeded.
  3. Lighthouse on the deployed Home: Performance ≥ 85, Accessibility ≥ 95.
  4. CI green on `main`, with unit, integration and e2e tests.
  5. The README explains the architecture, the SDD flow with agents and how AI was used.

### 3.2 Stakeholders and actors

| Stakeholder | Interest | Decision power |
|---|---|---|
| Post Oak Group hiring team | Evaluate full-stack quality, UI/UX, judgment and AI usage | Makes the hiring decision |
| Hernán (human) | Deliver an outstanding case study on time | Technical Director: approves all gates |

| User role (in the app) | Goals | Frequency | Technical level | Devices |
|---|---|---|---|---|
| `admin` (founder / finance lead) | See cash, analyze spending, move money and manage cards | Daily | Medium | Desktop (primary), mobile |
| `viewer` (bookkeeper) — *Could* | Browse and categorize transactions; cannot move money | Weekly | Medium | Desktop |

### 3.3 Scope (MoSCoW)

**Must (MVP):**
- 1-click demo login with a secure session. Optionally, a form with prefilled demo credentials.
- App shell: sidebar, topbar, "Move money" CTA and light/dark mode.
- Overview:
  - total cash and balance per account;
  - money in and money out over the last 30 days;
  - *net burn* and *runway*;
  - pending payments and recent transactions.
- Transactions:
  - search, combinable filters and sorting;
  - pagination with state kept in the URL;
  - side detail panel;
  - empty/loading/error states.
- Interactive charts:
  - monthly cash flow (in vs. out);
  - balance over time;
  - spending by category;
  - period selector, and clicking a data point drills down to the filtered transactions.
- Move money:
  - internal transfer between own accounts (immediate and atomic);
  - payment to a recipient via ACH or wire (stays pending, then settles in a simulated way);
  - a review step before confirming, and idempotency.
- Realistic, deterministic seed data, relative to the current date.
- CI, tests and Vercel deployment, with the README in English.

**Should:**
- Cards: list of virtual and physical cards, freeze/unfreeze, monthly limit with a usage bar.
- Recategorize a transaction and add a note to it (the charts reflect the change).
- Export filtered transactions to CSV.
- A "Reset demo data" button.

**Could:**
- Command palette (⌘K) with global search.
- Role switcher in demo mode (`admin` / `viewer`) to demonstrate RBAC.
- Account detail page with masked account and routing numbers and a copy button.
- Documented read-only REST API `/api/v1/*`.

**Won't (explicitly out of scope):**
- Real banking integrations (Plaid, real ACH), KYC/KYB, real money.
- Real multi-company support, user invitations, real MFA.
- Invoicing, full accounting, reconciliation.
- Native mobile app.

### 3.4 Main flows

1. **Enter:** landing → "Continue as demo" → Home.
2. **Understand cash:**
   1. Home → KPIs.
   2. Click a bar in the cash-flow chart.
   3. Transactions opens, filtered by that month and direction.
3. **Investigate an expense:**
   1. Transactions → search "aws".
   2. Filter by category and date range.
   3. Open the detail → recategorize or add a note.
4. **Move money (internal):**
   1. "Move money" → Transfer.
   2. Choose source, destination and amount.
   3. Review → confirm.
   4. Balances update and a success toast appears.
   5. The transaction appears in both accounts.
5. **Pay a recipient:**
   1. "Move money" → Pay.
   2. Pick a recipient (or create one).
   3. Choose ACH or wire, then amount and memo.
   4. Review → confirm.
   5. The transaction stays `pending` and settles to `posted` when its simulated `settleAt` is reached.
6. **Cards:**
   1. Cards → freeze a card; the status changes.
   2. Edit the monthly limit.

**"What happens if…?" cases the specs must cover:**
- double click on confirm (idempotency);
- amount greater than the available balance;
- source equal to destination;
- amount that is 0, negative or has more than 2 decimals;
- canceling a pending payment;
- filters with no results;
- database error;
- session expired in the middle of a flow;
- two tabs transferring at the same time (concurrency on the balance).

### 3.5 Preliminary business rules (refined in `business-rules.md`)

| ID | Rule | Origin |
|---|---|---|
| BR-001 | Every amount is stored as an **integer number of USD cents** (`amountCents`). Floats are never used. Displayed with `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })`. | ASM-001 |
| BR-002 | `availableBalance = currentBalance − Σ pending outflows`. `currentBalance = Σ posted transactions` of the account. This is an invariant, covered by a test. | ASM-002 |
| BR-003 | Internal transfer: amount > 0, source ≠ destination, amount ≤ source's available balance. Creates 2 linked transactions in **a single database transaction**, with status `posted`. | ASM-003 |
| BR-004 | External payment: ACH → `pending` with `settleAt = now + ACH_SETTLE_SECONDS` (default 120 s in the demo). Wire → `pending` with `settleAt = now + WIRE_SETTLE_SECONDS` (default 30 s). Lazy settlement: on read, overdue pending payments become `posted`. | ASM-004 |
| BR-005 | Only a `pending` payment can be canceled. It becomes `canceled` and releases the available balance. | ASM-005 |
| BR-006 | Every money mutation requires an `idempotencyKey` (a UUID generated on the client when the dialog opens). A repeated key returns the original result without duplicating. | ASM-006 |
| BR-007 | Per-operation limit: USD 250,000.00. Daily external payments limit: USD 500,000.00. | ASM-007 |
| BR-008 | Monthly *net burn* = outflows − inflows of the month, excluding internal transfers. *Runway* (months) = total cash ÷ average net burn of the last 3 closed months. If the average burn is ≤ 0, show "Cash-flow positive". | ASM-008 |
| BR-009 | Business time zone: `America/New_York`. Every daily or monthly aggregation is computed in that zone; the database stores UTC. | ASM-009 |
| BR-010 | A `frozen` card doesn't accept new charges (if charges are simulated). Monthly limit ≥ 0 and ≤ USD 100,000; usage is the sum of the card's charges in the current month. | ASM-010 |
| BR-011 | Internal transfers are excluded from inflow/outflow totals and from spending by category, so metrics aren't inflated. | ASM-011 |

### 3.6 Data

- **Entities:**
  - `User`, `Business`;
  - `Account` (checking, savings, treasury);
  - `Transaction`;
  - `Counterparty` (recipient or merchant);
  - `Card`;
  - `Category` (enum or table);
  - `Transfer` (links both legs of an internal transfer).
- **Key `Transaction` attributes:**
  - `amountCents` (signed, or positive + `direction`);
  - `status`: `pending` | `posted` | `canceled` | `failed`;
  - `method`: `ach` | `wire` | `card` | `internal` | `check` | `fee` | `interest`;
  - `category`, `counterpartyId`, `memo`, `note`;
  - `postedAt`, `settleAt`, `createdAt`;
  - `idempotencyKey`, `cardId?`.
- **Seed volume:**
  - 4 accounts, 5 cards, ~60 counterparties;
  - 1,200–1,800 transactions over 12 months;
  - generated with `@faker-js/faker` and a **fixed seed**;
  - dates relative to the seeding day, so the dashboard always looks current.
- **Seed realism:**
  - revenue (Stripe-style payouts, customer transfers) growing ~4–6 % month over month;
  - bi-weekly payroll, monthly rent, monthly cloud and SaaS bills;
  - variable marketing, card travel and meals;
  - monthly interest on treasury and a few large wires;
  - 2–4 `pending` payments at all times;
  - the resulting *runway* must land between 14 and 24 months;
  - counterparties may use real brand names as merchant text (as on a statement), but without logos.
- **Sensitivity:** everything is fictional. Account and routing numbers are generated and shown masked (`••••4821`). No real personal data.

### 3.7 Integrations

`N/A` for real integrations. Banking *rails* (ACH, wire, card) are **simulated** in the service layer through a port (`PaymentRailPort`) with a `SimulatedRail` implementation, so a real integration would just be another adapter.

### 3.8 Non-functional requirements (basis for `non-functional.md`)

| ID | Category | Requirement and threshold | Verification |
|---|---|---|---|
| NFR-001 | Performance | Deployed Home: Lighthouse Performance ≥ 85 (mobile preset), LCP < 2.5 s | Lighthouse on the production URL |
| NFR-002 | Performance | Filtered, paginated transactions query: server p95 < 300 ms with 2,000 rows | Integration test with timing + verified indexes |
| NFR-003 | Accessibility | WCAG 2.2 AA basics: Lighthouse a11y ≥ 95; axe with no *serious* or *critical* violations; full keyboard navigation and visible focus | `@axe-core/playwright` + manual check by the e2e reviewer |
| NFR-004 | Responsive | No horizontal scroll at 375, 768, 1280 and 1440 px. On mobile the table becomes a card list | Playwright with viewports + screenshots |
| NFR-005 | Security | 0 secrets in the repo; Zod on every server input; `httpOnly` + `Secure` + `SameSite=Lax` session cookie; authorization in every Server Action / Route Handler (never only in the UI); data access always filtered by the session's `businessId` (anti-IDOR); security headers; CSV protected against *formula injection* | Reviewer C + integration tests |
| NFR-006 | Reliability | Money movements are atomic and idempotent; the balance invariant (BR-002) always holds | Integration tests, including concurrency |
| NFR-007 | Maintainability | TypeScript `strict`; ESLint with 0 errors; no `any` in `src/server/domain`; line coverage ≥ 80 % in `src/server/domain` | CI |
| NFR-008 | Compatibility | Last 2 versions of Chrome, Edge, Firefox and Safari | Playwright with chromium + webkit in CI (chromium only if time is tight: `ASM`) |
| NFR-009 | Observability | Structured (JSON) log for every money mutation, without PII; `error.tsx` / `not-found.tsx` per segment; `/api/health` endpoint | Review + e2e |
| NFR-010 | Usability | Empty, loading (*skeletons*) and error states in every data view; explicit confirmation before moving money; feedback in < 100 ms for local interactions | Reviewer B |
| NFR-011 | Consistency | Totals shown in several views come from the same domain service, with no duplicated calculations in the UI | Reviewer A + tests |

### 3.9 Interface vision (basis for `docs/ux/ui-brief.md`)

- **3 adjectives:** calm, precise, trustworthy.
- **Pattern references (not identity):**
  - Mercury: whitespace, typographic hierarchy, soft neutrals.
  - Slash: useful density, powerful tables.
  - Avoid "rainbow" dashboards and excessive cards or gradients.
- **Identity:** creative freedom for the agent, with these constraints:
  - original name and wordmark;
  - cool neutrals with **a single accent color**;
  - green and red reserved for money semantics (in/out), always with a non-color indicator (sign or icon);
  - figures in `tabular-nums`;
  - a modern sans font (Inter or Geist; check the license).
- **Navigation:**
  - sidebar with Home, Transactions, Accounts, Payments, Cards and Insights (optional; can live inside Home);
  - "Move money" primary CTA;
  - topbar with search (⌘K if built) and a user menu;
  - on mobile the sidebar becomes a *sheet*.
- **Screens (initial inventory):**
  - UI-01 Landing / demo login
  - UI-02 Home
  - UI-03 Transactions + side detail
  - UI-04 Account detail (*Could*)
  - UI-05 Move money (multi-step dialog: form → review → result)
  - UI-06 Payments (pending and recipients)
  - UI-07 Cards
  - UI-08 global error and 404 states
- **Dark mode:** yes, following the system setting, with a manual toggle.
- **Visual design:** left to the agent (the human's decision, for time reasons), following the `ui-system` skill. Before implementing 002, the Planner adds an ASCII or Mermaid wireframe of Home and Transactions to `ui-brief.md` for the human to approve at G-Foundational.

### 3.10 Technical and operational constraints

- The stack must build on the human's CV stack: React, Next.js, Node, NestJS, TypeScript, Prisma, PostgreSQL, Tailwind, Zod, RHF, Zustand, Vitest, Playwright, Docker, GitHub Actions and Vercel. New technology is added only if it makes architectural or functional sense (Art. 10).
- Cost: **USD 0** (Vercel Hobby + Neon Free). Any cost → Art. 9.
- Environments: local (Docker Postgres) → Preview (Vercel per PR) → Production (Vercel, `main` branch).
- Ongoing maintenance: none. The case study is an evaluation artifact, but it must look like a maintainable product.

### 3.11 Risks

| Risk | Mitigation |
|---|---|
| Not finishing on time | Timeboxes (§6), SP-6 and cut order: 006 → *Could* items → reduce 004 to 2 charts → drop `viewer` |
| Deployment breaks at the end | Deploy in feature 000 (*walking skeleton*) and deploy every merge |
| Several evaluators mutate the same data at once | Shared demo workspace + "Reset demo data" + idempotent seed (`ASM-012`); *Could* alternative: one workspace per visitor |
| Neon cold start (first-request latency) | *Skeletons* + document it in the README |
| Looking like a copy of Mercury or Slash | Originality constraint (§2), checked by Reviewer A |
| API hallucination (Next, Prisma and shadcn change fast) | Art. 14: documentation MCP (Context7) or web before writing |

### 3.12 Assumptions and open questions

| ID | Assumption | Risk if false | Validate with | Status |
|---|---|---|---|---|
| ASM-001…011 | Rules BR-001…BR-011 of §3.5 | Metrics the evaluator finds unrealistic | Human at G-Foundational | Pending |
| ASM-012 | Shared demo workspace with a reset button | Evaluators see data altered by others | Human | Pending |
| ASM-013 | The evaluator doesn't require a separate backend (NestJS); a modular monolith counts as full-stack | Perceived as "frontend only" | Mitigated with the `src/server` layer + ADR + README | Pending |
| ASM-014 | Package manager: `pnpm` | Nothing relevant | Human (Round 0) | Pending |

| ID | Question | Blocks | Owner | Deadline |
|---|---|---|---|---|
| OQ-001 | Name of the fictional brand | 001 | Human (Round 0) | G0 |
| OQ-002 | Architecture choice (§4) | G3 | Human | G-Foundational |

---

## 4. Proposed technical decisions (input for `docs/adr/`)

### 4.1 ADR-0001 — Architecture (the human decides at G-Foundational)

| Option | Pros | Cons | Fit with deadline and NFRs |
|---|---|---|---|
| **A. Full-stack Next.js modular monolith** (App Router, RSC for reads, Server Actions for mutations, Route Handlers for health/CSV/API, `src/server` layer with domain → services → repositories, Prisma + Postgres) | 1 deployment and 1 repo; maximum speed; end-to-end types; the human masters the stack; business logic isolated and testable without the framework | An evaluator might read it as "frontend with extras" (mitigated by the explicit `server` layer and the ADR) | ✅ **Recommended** |
| B. Turborepo: Next.js + separate NestJS API (Railway/Render) + Neon | Shows NestJS and physical separation; matches the CV | 2 deployments, CORS, cross-domain cookies, +4–6 h, more failure surface at the last moment | ⚠️ Risky in 24 h |
| C. React SPA (Vite) + Fastify | Classic separation | Loses RSC/SSR (worse LCP), 2 deployments, more *fetching* code | ❌ |

**Recommendation:** A. It maximizes quality per hour and reduces deployment risk, and the layered separation shows backend judgment without the cost of two deployments. (Discarded alternative: B, kept as a "next step" in the README.)

**Layering rule:**
- `src/server/domain` is pure TypeScript (no Next, no Prisma).
- `services` orchestrates use cases and transactions.
- `repositories` is the only layer that imports Prisma.
- `app/` and `actions/` are thin adapters that validate with Zod and call the services.

### 4.2 Proposed stack (check latest stable version and maintenance status, Art. 14)

| Piece | Choice | In the CV? | Justification (Art. 10) |
|---|---|---|---|
| Framework | Next.js (App Router) + React + TypeScript strict | ✅ | Basis of option A |
| Styling | Tailwind CSS | ✅ | — |
| Components | **shadcn/ui** (Radix UI) + lucide-react + sonner | 🆕 | Components are copied into the repo (no black box), accessible (Radix), and speed up a polished fintech UI. Alternatives: hand-made (slow) or MUI (generic, heavy look) |
| Charts | **Recharts** (via shadcn *charts*) | 🆕 | Declarative in React, native tooltips and interaction, themable with CSS vars. Alternatives: Tremor (less control), visx (slower to build), Chart.js (not declarative) |
| ORM / DB | Prisma + PostgreSQL | ✅ | — |
| Managed DB | **Neon** (serverless Postgres, free plan) | 🆕 hosting | Native Vercel integration and zero cost. Alternative: Railway (✅ CV, but no permanent free plan) |
| Validation / forms | Zod + React Hook Form | ✅ | — |
| Session | **jose** (signed JWT in an httpOnly cookie) + bcryptjs if there's a credentials login | ✅ JWT | Works in the middleware's edge runtime. Alternative: Auth.js (overkill for a single demo user) |
| Dates | `Intl` + **date-fns** (+ `@date-fns/tz` if needed for BR-009) | 🆕 minor | Aggregations in `America/New_York` without time-zone bugs |
| Seed | **@faker-js/faker** (dev only) with a fixed seed | 🆕 | Realistic, deterministic data |
| URL state | Native `useSearchParams` (or **nuqs** if it truly simplifies) | 🆕 optional | Shareable filters through the URL |
| Client state | Zustand **only if** global client state appears (probably not needed) | ✅ | Avoid unused dependencies |
| Tests | Vitest + React Testing Library + Playwright + **@axe-core/playwright** | ✅ / 🆕 axe | axe automates NFR-003 |
| CI/CD | GitHub Actions (lint, typecheck, unit, integration with Postgres as a *service container*, build, e2e) + Vercel Git Integration (Preview per PR, Production on `main`) | ✅ | — |
| Local | Docker Compose (Postgres) | ✅ | — |

### 4.3 Target code structure

```text
src/
├── app/
│   ├── (public)/page.tsx              # UI-01 landing + demo login
│   ├── (app)/layout.tsx               # authenticated shell
│   ├── (app)/home/ · transactions/ · accounts/[id]/ · payments/ · cards/
│   └── api/health/route.ts · api/v1/transactions/export/route.ts
├── actions/                           # thin Server Actions: zod → service
├── components/ui/                     # shadcn
├── components/<feature>/              # per-feature components
├── server/
│   ├── domain/                        # pure: money, balances, runway, transfer-rules, filters
│   ├── services/                      # use cases + $transaction
│   ├── repositories/                  # the only place with Prisma
│   ├── rails/                         # PaymentRailPort + SimulatedRail
│   └── auth/                          # session (jose), guards
├── lib/                               # formatters, utils
prisma/  schema.prisma · migrations/ · seed.ts
tests/   unit/ · integration/ · e2e/
```

---

## 5. Preliminary roadmap (basis for `docs/roadmap.md`)

> Vertical slices: each one can be demoed on its own and is deployed on merge.

| Spec | Feature | Client req. | Priority | Depends on | Timebox |
|---|---|---|---|---|---|
| 000 | `walking-skeleton`: Next + TS strict + ESLint/Prettier + Vitest (1 real test) + Playwright (1 e2e) + Prisma with Docker Postgres + `/api/health` + CI + Vercel deployment with Neon | CR-6 | Must | — | 1 h 45 min |
| 001 | `domain-data-shell`: Prisma schema + migrations + realistic seed + demo session + app shell (sidebar, topbar, theme, responsive layout) | CR-1, CR-3 | Must | 000 | 2 h 30 min |
| 002 | `account-overview`: KPIs (total cash, 30-day in/out, net burn, runway), account cards, pending, recent and *sparkline* | CR-2 | Must | 001 | 2 h |
| 003 | `transactions`: search, filters, sorting, server-side pagination with URL state, side detail, recategorize + note (Should), CSV (Should) | CR-3 | Must | 001 | 3 h |
| 004 | `cash-insights`: monthly cash flow, balance over time, spending by category, period selector and *drill-down* to transactions | CR-4 | Must | 002, 003 | 2 h 15 min |
| 005 | `move-money`: internal transfer + ACH/wire payment + recipients + review + idempotency + simulated settlement + cancel pending | CR-5 | Must | 002 | 3 h |
| 006 | `cards`: list, freeze/unfreeze, monthly limit and usage | CR-5 | Should | 001 | 1 h 15 min |
| 007 | `polish`: a11y and responsive audit, empty/loading/error states, performance (Lighthouse), ⌘K (Could) | CR-1 | Must | 002–006 | 1 h 30 min |
| 008 | `ship`: README, "AI-assisted workflow" section, screenshots, demo reset, production verification and email draft | CR-7 | Must | all | 1 h |

**Estimated total:**
- features: ~18 h 15 min;
- Genesis: ~1 h 30 min;
- overall: ≈ 19 h 45 min, which leaves ~4 h of buffer.

**Cut order (SP-6):** 006 → *Could* items → 004 with 2 charts → CSV → recategorize.

---

## 6. Execution plan by blocks (wall-clock time, including human reviews)

| Block | Duration | What happens | Gates |
|---|---|---|---|
| G0–G1 | 20 min | Environment report, Round 0 and minimal gaps | — |
| G2–G3 | 45 min | Cleaned-up brief + compact foundational documents + ADRs + ASCII wireframes | 🚦 G-Foundational |
| G4 | 25 min | Install `.harness/` → `.claude/`, specialize `AGENTS.md`, `.mcp.json` and `MEMORY.md`; first commit | 🚦 G-Harness |
| F000 | 1 h 45 min | *Walking skeleton* deployed | 🚦 G-SpecPlan · 🚦 G-Merge |
| F001–F006 | ~14 h | SDD cycle per feature (one new session per feature) | 🚦 per feature |
| F007–F008 | 2 h 30 min | Polish, production verification and submission | 🚦 final G-Merge |

Clock rules:
- `MEMORY.md` records `Deadline: <ISO>` and `Consumed per feature`.
- When closing each feature, the Coordinator reports: *time left · pending features · recommended cut?*
- **Early-submission goal:** if less than 6 h remain when 005 is done, skip 006 and go to 007–008.

---

## 7. Harness: pieces and adapters for Claude Code (G4)

| Piece (`.harness/`) | Claude Code destination | Notes |
|---|---|---|
| `CLAUDE.md` (root, already included) | `CLAUDE.md` | In G4 the `@AGENTS.md` line is added at the top |
| `agents/*.md` | `.claude/agents/` | Claude Code frontmatter (`name`, `description`, `tools`, `model`). Check the current format (Art. 14). The session may need a restart for them to load |
| `commands/*.md` | `.claude/commands/` | Invoked as `/feature`, `/sdd-specify`… |
| `skills/<n>/SKILL.md` | `.claude/skills/<n>/SKILL.md` | — |
| `mcp.md` (generated by the agent) | `.mcp.json` | Proposed: **Playwright MCP** for the e2e reviewer (navigation, screenshots, console and network) and **Context7** (current docs for Next, Prisma, shadcn and Recharts). No secrets in the file |

Installation (run by the agent in G4 under SP-8, documented in `AGENTS.md`):

```bash
mkdir -p .claude && cp -R .harness/agents .harness/commands .harness/skills .claude/
```

`AGENTS.md` must include the table of real commands, **verified by running them** in feature 000:

| Purpose | Command |
|---|---|
| Dev server | `pnpm dev` |
| Lint | `pnpm lint` |
| Type check | `pnpm typecheck` |
| Unit tests | `pnpm test` |
| Integration tests | `pnpm test:int` |
| End-to-end tests | `pnpm test:e2e` |
| Run migrations | `pnpm db:migrate` |
| Seed the database | `pnpm db:seed` |
| Production build | `pnpm build` |

---

## 8. Quality strategy

- **Test pyramid:**
  - **Unit (many)** in `src/server/domain`: money, balances, runway, transfer rules, filter parsing, time-zone aggregations.
  - **Integration (some):** services against real Postgres (Docker or CI), including atomicity, idempotency, balance concurrency and anti-IDOR.
  - **E2E (few):** Playwright over flows 1–6 of §3.4, plus axe and the NFR-004 viewports.
- **Traceability:** every test covering an AC has the ID in its title, e.g. `it('AC-005-03: rejects transfer above available balance', …)`. `docs/traceability.md` is updated when closing each feature.
- **CI required on every PR:** lint → typecheck → unit → integration → build → e2e. Merge only with green CI.
- **Git:**
  - `main` is protected; one `feat/NNN-slug` branch per feature.
  - **One GitHub PR per feature**, which keeps the SDD process visible to the evaluator.
  - Conventional Commits with the task ID `[T-03]`; no *force push*.

---

## 9. Definition of Done for the submission (feature 008)

- [ ] Vercel production URL works in a private window: landing → demo → the 6 flows with no console errors.
- [ ] Public GitHub repository with green CI and a per-feature PR history.
- [ ] `README.md` contains:
  - [ ] summary and screenshots (light and dark) and the demo link;
  - [ ] how each requirement CR-1…CR-6 is met;
  - [ ] architecture (Mermaid diagram + layers), stack and why;
  - [ ] how to run it locally, tests and CI;
  - [ ] **"AI-assisted development"**: Claude Code with an SDD flow (Coordinator/Planner/Implementer/Reviewer), human gates, MCPs, what the human decided vs. what the AI did, and how quality was verified;
  - [ ] trade-offs and "next steps" (separate NestJS API, real rails, multi-tenancy, MFA).
- [ ] `docs/` and `specs/` complete, with `traceability.md` up to date.
- [ ] No secrets in the repo (`.env.example` complete).
- [ ] "Reset demo data" button verified in production.
- [ ] Submission email draft in `docs/submission-email.md`.

---

## 10. Email templates (for the human)

### 10.1 Confirmation of receipt (send now)

```text
Hi,

Thank you for sending the case study. I confirm I received the assignment and understand the requirements:
a modern banking dashboard with account overview, transaction management (filtering, search, details),
interactive data visualizations and working functional features, built with modern frameworks.
I will reply to this email with the deployed link, the GitHub repository and a short write-up of the
technologies and AI tools used, within the 24-hour window and aiming for today.

Best regards,
Hernán Cardona
```

### 10.2 Submission (feature 008 fills it with real data)

```text
Subject: Case Study Submission — Banking Dashboard — Hernán Cardona

Hi,

Please find my submission below:

• Live app: <vercel-url>  (one-click demo login, seeded data; "Reset demo data" in the user menu)
• Source code: <github-url>

Technologies: <2–3 lines: Next.js App Router, TypeScript, Prisma + PostgreSQL (Neon), Tailwind + shadcn/ui,
Recharts, Zod, Vitest + Playwright, GitHub Actions, Vercel>.

AI tools & workflow: <3–5 lines: Claude Code orchestrating a spec-driven workflow with planner / implementer /
reviewer sub-agents and human approval gates; Playwright MCP for end-to-end visual validation; Context7 MCP for
up-to-date docs; every feature has a spec, plan, tasks and validation report in the repo (docs/, specs/)>.

Highlights: <3 bullets: e.g. atomic + idempotent money movement, URL-driven server-side filtering, a11y/Lighthouse scores>.

Thank you for your time — happy to walk through the code and decisions.

Best regards,
Hernán Cardona
```

---

## 11. Round 0 — what the agent must ask in G0 (max. 7, with a recommended option)

1. **Fictional brand name** (OQ-001). The agent proposes 3 original options and checks they don't match known banks or fintechs.
2. **Architecture** (OQ-002). Recommended: A (Next.js modular monolith).
3. **Package manager** (ASM-014). Recommended: `pnpm`.
4. **Shared demo workspace + reset** (ASM-012). Recommended: yes.
5. **Art. 9 permissions.** Do you authorize:
   - creating the public GitHub repo;
   - creating the Vercel project;
   - creating the Neon DB (free plan);
   - deploying?

   Recommended: yes, with confirmation at the moment of each action.
6. **Exact deadline time** (email receipt + 24 h), to record it in `MEMORY.md`.
7. **Include the `viewer` role (demo RBAC) as Could?** Recommended: yes, but only if there's time left after 007.

> Everything else in §3–§5 is considered **approved as `ASM`** unless the human changes it at 🚦 G-Foundational.
