# ADR-0006 — Deployment topology and managed-database host

- **Status:** **Accepted** — decided by the human (Technical Director) on 2026-11-09, resolving OQ-003.
- **Date:** 2026-11-09
- **Relates to:** [ADR-0001](0001-architecture.md) (application architecture, Option A — unchanged by this decision)

## Context

| Force | Detail |
|---|---|
| Hard deadline | 2026-11-10 18:00 ET. Deployment risk must be front-loaded: feature 000 deploys a walking skeleton and every merge deploys (RSK-02). |
| Cost constraint | KICKOFF §3.10 and brief TC-2 fix a **USD 0** cost. Incurring any cost is an Art. 9 action requiring explicit human approval. |
| Accounts available | The human created **Vercel** and **Railway** accounts, and initially stated a preference for Railway hosting the database "and the backend". |
| Conflict to resolve | ADR-0001 Option A is a modular monolith: it has **no separately deployable backend**. "Railway for the backend" therefore had to resolve either to "Railway as the managed Postgres host only" or to an escalation to Option B (a separate NestJS API), which would have superseded ADR-0001. |
| Longevity | The evaluator may open the link days or weeks after submission, so the demo must keep working without the human paying for it. |
| NFR-001 | Lighthouse Performance >= 85 and LCP < 2.5 s on the deployed Home. Serverless Postgres autosuspend makes the *first* request after idling slow. |

## Options considered

| Option | Pros | Cons | Fit with NFRs and constraints |
|---|---|---|---|
| **(a) Vercel (frontend + server layer) + Railway Postgres** | Uses the account the human just created; Railway's Postgres UI is pleasant; one app deployment | **Railway has no permanent free tier.** A new account gets a one-time **USD 5 credit valid 30 days**; afterwards the account falls back to a Free plan carrying only about **USD 1/month of usage credit**, which a 24/7 Postgres instance will exceed (**Hobby is USD 5/month**). The demo would likely go offline ~30 days after submission unless the human keeps paying | ❌ Breaks TC-2 (USD 0) and creates a post-submission availability risk (RSK-10) |
| **(b) Vercel (frontend + server layer) + Neon Postgres** | **Permanently free** plan (not time-limited); native Vercel integration; database branching per preview; one app deployment, one set of environment variables; smallest failure surface before the deadline | Compute **autosuspends after 5 min of inactivity**, so the first request pays a cold start; **no overage billing** means writes fail once the 1 GB storage cap is hit rather than costing money silently | ✅ **Chosen.** Meets TC-2 exactly; lowest deadline risk; cold start mitigated by NFR-010 skeletons |
| **(c) Vercel frontend + Railway NestJS API + Railway Postgres** | Demonstrates NestJS from the human's CV; physical separation of frontend and backend | Supersedes ADR-0001 Option A; **two deployments**, CORS, cross-domain session cookies, **+4–6 h** of work, far more to break at the last minute; plus the same Railway cost problem as (a) | ❌ Rejected on deadline risk (RSK-11) and cost. Kept as a README "next step" |

### Verified facts — Neon Free plan (chosen)

| Fact | Value |
|---|---|
| Plan longevity | Permanent free plan, **not** time-limited |
| Storage | 1 GB per project, with a 20 GB account-wide cap |
| Compute | 100 CU-hours per project per month (about 400 h at 0.25 CU) |
| Autosuspend | Compute suspends after **5 minutes** of inactivity |
| Branching | 10 branches per project |
| Network | 5 GB public network transfer per project per month |
| Overage | **No overage billing** — writes fail once the storage cap is reached; the account is never charged by surprise |

Sources: https://neon.com/faqs/free-plan-limits-and-quotas · https://neon.com/blog/how-to-make-the-most-of-neons-free-plan

### Verified facts — Railway (rejected)

| Fact | Value |
|---|---|
| Free tier | **No permanent free tier.** A new account receives a one-time **USD 5 credit valid for 30 days** |
| After the trial credit | The account falls back to a Free plan carrying only about **USD 1/month of usage credit** |
| A 24/7 Postgres instance | Exceeds that USD 1/month allowance; the practical paid tier is **Hobby at USD 5/month** |
| Consequence | The deployed demo would likely stop working for the evaluator **~30 days after submission** unless the human keeps a paid plan |

Sources: https://www.saaspricepulse.com/tools/railway · https://costbench.com/software/developer-tools/railway/free-plan/

### Capacity check against the seed (so no NFR carries a false risk)

The seed defined in KICKOFF §3.6 — 1 business, 1 user, 4 accounts, 5 cards, ~60 counterparties and
1,200–1,800 transactions over 12 months — is on the order of a few **megabytes** including indexes.
That is comfortably inside Neon Free's 1 GB per-project storage limit, with room for repeated demo
resets and preview branches. **Conclusion: storage capacity is not a risk for this project**, and no
NFR needs a capacity clause.

## Decision

1. **Topology:** a **single Vercel Hobby deployment** serving the frontend and the `src/server`
   layer together. **No separate backend service.** ADR-0001 Option A stands unchanged.
2. **Managed database:** **Neon** (Free plan) for Preview and Production.
3. **Local development:** Docker Compose PostgreSQL, as in KICKOFF §3.10 and §4.2.
4. **Railway:** considered and **rejected** as the database host, on cost and post-submission
   availability (see the figures above). The human's Railway account is not used by this project.
5. **Option B (separate NestJS API on Railway):** considered and **rejected again** on deadline
   risk (+4–6 h, CORS, cross-domain session cookies, two deployments). It remains documented as a
   README "next step", which ADR-0001's layering keeps cheap to reach (ASM-020).
6. **Cost:** the USD 0 constraint of KICKOFF §3.10 is **upheld**. No Art. 9 cost approval is needed.

Rationale in one sentence (SP-7): Neon is the only candidate that keeps the demo alive for free
after submission while adding zero deployment surface before the deadline — the discarded
alternative, Railway, would have put the evaluator's link on a 30-day clock tied to the human's
wallet.

## Consequences

**Positive**
- TC-2 (USD 0) holds with no Art. 9 cost decision, and the link keeps working for the evaluator indefinitely.
- One deployment, one environment-variable set: the smallest surface that can break at 18:00 on deadline day (RSK-02).
- Neon database branching maps naturally onto Vercel per-PR previews, so each PR can get isolated data.
- Feature 000 is unblocked: the walking skeleton can deploy with a real managed database immediately.

**Negative**
- Compute autosuspends after 5 minutes, so the evaluator's first request pays a cold start (RSK-04). Mitigated by NFR-010 content-shaped skeletons on every data view and an explicit note in the README.
- No overage billing means the failure mode at the storage cap is **write errors**, not a bill. Acceptable, and far away: the seed is a few MB against a 1 GB limit.
- NestJS is still not demonstrated in running code (ASM-013), mitigated exactly as in ADR-0001.

**Risks**
- **RSK-04 (live):** Neon cold start after 5 min idle degrades the first page load and could pull the NFR-001 Lighthouse score below 85 if measured cold. **Mitigation and verification rule:** the NFR-001 Lighthouse run is performed on a **warmed deployment** (at least one prior request within the preceding 5 minutes), and `docs/requirements/non-functional.md` states this in the verification method; the README documents the cold start honestly.
- 100 CU-hours/month is ample for one evaluator but would not survive sustained traffic. Out of scope for an evaluation artifact.

**What would make us reconsider**
- The human deciding to pay for hosting, which reopens Railway and option (c).
- A requirement for a non-HTTP consumer or an independently scalable API, which would revive ADR-0001 option B.
- Neon changing its free-plan terms before submission.
