# Non-functional requirements

> ISO/IEC 25010 checklist: functional suitability · performance efficiency · compatibility ·
> interaction capability (usability, accessibility) · reliability · security · maintainability ·
> flexibility (portability) · safety.
> Rule: if it can't be measured, it isn't a requirement; it's a wish.
>
> Source: brief §8 / KICKOFF §3.8. Owner column names the reviewer focus that signs it off at
> 🚦 G-Merge: **A** = compliance, **B** = e2e/UX, **C** = quality-security (GENESIS §C.3).

| ID | Category | Requirement | Metric / threshold | Verification method | Priority | Owner | Verified in |
|---|---|---|---|---|---|---|---|
| NFR-001 | Performance efficiency | The deployed Home must load fast on a mid-range mobile profile. | Lighthouse Performance >= 85 (mobile preset); LCP < 2.5 s | Lighthouse run against the production URL **on a warmed deployment**: Neon compute autosuspends after 5 minutes of inactivity, so at least one request must have been served within the preceding 5 minutes before measuring, and the report must state that it was warmed (ADR-0006, RSK-04). Score and the warm/cold note are pasted into `specs/007-*/validation-*.md`. A cold-start measurement is recorded separately as an honest README figure, not as the NFR-001 result. | Must | B | 007 |
| NFR-002 | Performance efficiency | The filtered, paginated transactions query must stay fast at seeded volume. | Server-side p95 < 300 ms with 2,000 rows in the table | Integration test measuring the repository/service call over a seeded database, plus `EXPLAIN`-verified indexes on `(businessId, postedAt)`, `(businessId, status)`, `(businessId, category)` | Must | C | 003 |
| NFR-003 | Interaction capability (accessibility) | WCAG 2.2 AA basics hold on every implemented screen. | Lighthouse Accessibility >= 95; `axe` reports 0 serious and 0 critical violations on UI-02, UI-03 and UI-05; every flow completable by keyboard; focus always visible; text contrast >= 4.5:1 | `@axe-core/playwright` in CI plus a manual keyboard pass by the e2e reviewer | Must | B | 003, 005, 007 |
| NFR-004 | Compatibility (responsive) | No horizontal scroll and no truncated data at the supported widths. | At 375, 768, 1280 and 1440 px: `document.documentElement.scrollWidth <= window.innerWidth`; below 768 px the transactions table renders as a card list | Playwright viewport test with screenshots attached to the validation report | Must | B | 003, 007 |
| NFR-005 | Security | The application is secure by default (Art. 8). | 0 secrets in the repository; every server input validated with Zod; session cookie `httpOnly` + `Secure` + `SameSite=Lax`; authorization enforced in every Server Action and Route Handler (never only in the UI); every data access filtered by the session's `businessId` (anti-IDOR); security headers set (CSP, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`); CSV export neutralises leading `=`, `+`, `-`, `@` | Reviewer C checklist plus integration tests: one anti-IDOR test per protected resource, one unauthenticated-call test per Server Action, one CSV formula-injection test; `git grep` for secret patterns | Must | C | 001, 003, 005 |
| NFR-006 | Reliability | Money movements never corrupt balances. | Every money mutation is atomic (single DB transaction) and idempotent; the BR-002 balance invariant holds after any sequence of operations, including 2 concurrent requests spending the same available balance | Integration tests: atomicity (forced failure on the second leg), idempotency (replayed key), concurrency (two parallel calls), plus an invariant assertion helper run after each test | Must | C | 005 |
| NFR-007 | Maintainability | The codebase stays typed, linted and tested where the risk is. | TypeScript `strict` with 0 type errors; ESLint 0 errors; no `any` in `src/server/domain`; line coverage >= 80 % in `src/server/domain` | CI job: `pnpm typecheck`, `pnpm lint`, `pnpm test --coverage` with the threshold configured so it fails the build | Must | C | 000 onward |
| NFR-008 | Compatibility (browsers) | The app works on current desktop browsers. | Last 2 versions of Chrome, Edge, Firefox and Safari | Playwright projects `chromium` + `webkit` in CI. **Degraded fallback (ASM-015):** chromium only if the timebox is at risk, recorded as an assumption | Should | B | 007 |
| NFR-009 | Observability / safety | Failures are diagnosable without leaking data. | One structured JSON log line per money mutation (actor id, business id, operation, amount in cents, result, idempotency key) with **no PII and no full account numbers**; `error.tsx` and `not-found.tsx` per route segment; `GET /api/health` reports app and database status | Reviewer C reads the log output of an integration run; e2e hits the health endpoint and a forced error page | Must | C | 000, 005, 007 |
| NFR-010 | Interaction capability (usability) | Every data view and money action behaves predictably. | Loading (content-shaped skeletons), empty (icon + message + action) and error (human message + retry) states present in every data view; explicit review and confirmation before any money movement; local interactions give feedback in < 100 ms; destructive actions behind a confirmation dialog | Reviewer B walkthrough with screenshots of each state; Playwright asserts the skeleton and empty states | Must | B | 002, 003, 005, 007 |
| NFR-011 | Functional suitability (consistency) | The same number never has two sources. | Totals appearing in more than one view (total cash, 30-day in/out, monthly aggregates) are produced by one domain service; 0 money or metric calculations in components; chart series and KPI values for the same period are equal | Reviewer A traces each displayed figure to its domain function; unit tests assert KPI/chart agreement for the same period; `git grep` finds no arithmetic on `amountCents` under `src/components` | Must | A | 002, 004 |

## Out-of-scope quality attributes

| Attribute | Decision |
|---|---|
| Scalability / load | N/A — single shared demo workspace, a handful of concurrent evaluators. NFR-002 is the only throughput-related requirement. |
| Availability / SLA | N/A — evaluation artifact on Vercel Hobby and Neon Free; cold starts are expected and documented (RSK-04). |
| Backup / disaster recovery | N/A — all data is regenerable by the deterministic seed (FR-036) and the reset action (FR-037). |
| Internationalisation | N/A — `en-US` only, USD only, `America/New_York` only (BR-009). |
| Regulatory compliance (PCI, SOC 2, GLBA) | N/A — no real money, no real customer data, 100 % fictional (brief §6). |
| Portability | Partially covered: the app runs on any Node 22 host with a PostgreSQL URL; no Vercel-only API is used in `src/server`. Not separately measured. |
