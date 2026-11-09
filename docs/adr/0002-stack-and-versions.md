# ADR-0002 — Stack, UI libraries and pinned versions

- **Status:** **Accepted** — approved as written by the human (Technical Director) at 🚦 G-Foundational on 2026-11-09, with no changes requested.
- **Date:** 2026-11-09
- **Relates to:** ADR-0001 (application architecture), ADR-0006 (hosting)

## Context

KICKOFF §3.10 requires the stack to build on the human's CV stack (React, Next.js, Node, NestJS,
TypeScript, Prisma, PostgreSQL, Tailwind, Zod, React Hook Form, Zustand, Vitest, Playwright, Docker,
GitHub Actions, Vercel); new technology needs an Art. 10 justification. Art. 14 requires verifying
current stable versions and maintenance status **before** writing them down, because Next.js, Prisma
and shadcn/ui move fast and guessing a version number is a classic source of wasted sprint hours.

**Verification performed on 2026-11-09** against the npm registry `dist-tags` endpoint for each
package (`https://registry.npmjs.org/-/package/<name>/dist-tags`), cross-checked for shadcn/ui and
Tailwind v4 compatibility with Next.js 16 / React 19 on the shadcn documentation. Sources are listed
per row below.

## Options considered

The macro choice (Next.js full-stack vs separate API vs SPA) is ADR-0001. This ADR decides the
individual libraries. Per Art. 10, each new dependency states purpose, alternatives (including
"don't add it"), licence, maintenance and weight.

| Piece | Choice | In the CV? | Alternatives considered (and why rejected) |
|---|---|---|---|
| Framework | Next.js App Router + React + TypeScript `strict` | ✅ | Basis of ADR-0001 option A |
| Styling | Tailwind CSS v4 | ✅ | Hand-written CSS (slower, inconsistent); CSS-in-JS (runtime cost) |
| Components | **shadcn/ui** (Radix primitives) + `lucide-react` + `sonner` | 🆕 | Hand-built components (too slow for 24 h); MUI (generic, heavy, hard to make look original); Headless UI (fewer ready patterns). shadcn components are **copied into the repo**, so there is no black box and no runtime dependency lock-in |
| Charts | **Recharts** (through shadcn charts) | 🆕 | Tremor (less control over look, more opinionated); visx (powerful but slow to build); Chart.js (imperative, harder to theme with CSS variables) |
| ORM / DB | Prisma + PostgreSQL | ✅ | Drizzle (less familiar, no time to learn); raw SQL (loses type safety, more hours) |
| Managed DB | Neon Free | 🆕 hosting | Railway (no permanent free tier — rejected in ADR-0006); Supabase (more product than needed) |
| Validation / forms | Zod + React Hook Form | ✅ | Valibot (smaller but less familiar); native form validation (insufficient for money rules) |
| Session | **jose** (signed JWT in an httpOnly cookie) | ✅ JWT | Auth.js / NextAuth (overkill for one demo user, more configuration surface); a homemade signer (forbidden: never homemade cryptography, GENESIS G3 rule); `iron-session` (fine, but jose is lower level and edge-compatible) — see ADR-0004 |
| Dates | `Intl` + **date-fns** (+ `@date-fns/tz` if a tz helper is needed) | 🆕 minor | Luxon (heavier); Temporal (not uniformly available on Node 22 without a polyfill); hand-rolled time-zone maths (the exact bug class BR-009 exists to prevent) |
| Seed | **@faker-js/faker** (devDependency) | 🆕 | Hand-written fixtures (1,200+ rows by hand is not realistic); `casual` (unmaintained) |
| URL state | Native `useSearchParams` + a small local helper | — | `nuqs` (nice, but one more dependency for behaviour we can write in ~40 lines). **Decision: don't add it** |
| Client state | **None.** Zustand only if genuinely global client state appears | ✅ | Adding Zustand pre-emptively would violate Art. 10 ("don't add it" is a valid alternative) |
| Tests | Vitest + React Testing Library + Playwright + **@axe-core/playwright** | ✅ / 🆕 axe | Jest (slower with ESM/TS here); Cypress (heavier than Playwright for this); manual a11y only (not repeatable — axe automates NFR-003) |
| CI/CD | GitHub Actions + Vercel Git integration | ✅ | — |
| Local DB | Docker Compose PostgreSQL | ✅ | — |
| Package manager | **pnpm** via corepack | ✅ | npm (slower, larger `node_modules`); installing pnpm globally would be an Art. 9 action — corepack avoids it (ASM-014) |

## Decision

Adopt the stack above, pinned to these **verified** versions (exact pins, no `^`, so a transitive
release cannot change the build mid-sprint):

| Package | Version to pin | Registry `latest` on 2026-11-09 | Notes |
|---|---|---|---|
| `next` | `16.4.6` | `16.4.6` | Current stable; `16.5.0-canary.*` and `16.0.0-beta.0` exist but are not stable |
| `react`, `react-dom` | `19.3.1` | `19.3.1` | Current stable |
| `tailwindcss` | `4.3.5` | `4.3.5` | v4 line; `v3-lts` is `3.4.19` — not used |
| `shadcn` (CLI) | `4.23.0` | `4.23.0` | CLI only; components are copied into `src/components/ui/`, so no runtime dependency |
| `recharts` | `3.10.1` | `3.10.1` | Current stable (3.x) |
| `zod` | `4.6.7` | `4.6.7` | Current stable (4.x) |
| `vitest` | `5.1.0` | `5.1.0` | Current stable (5.x) |
| `@playwright/test` | `1.65.0` | `1.65.0` | Current stable |
| `jose` | `6.2.17` | `6.2.17` | Current stable; single `latest` tag, actively published |
| `date-fns` | `4.4.0` | `4.4.0` | Current stable; `5.0.0-alpha.0` exists, not used |
| `@faker-js/faker` | `10.6.0` | `10.6.0` (`stable` tag agrees) | devDependency only |
| `prisma`, `@prisma/client` | **`7.10.1`** | `@prisma/client` → `7.10.1`; **`prisma` CLI `latest` → `8.0.0-rc.33`** | ⚠️ See the risk below: the CLI's `latest` tag points at a release candidate. Pin **7.10.1** for both packages so CLI and client versions match. |
| `@axe-core/playwright` | verify at install time | not verified | **Not verified** — see the risk below |
| `@date-fns/tz` | verify at install time, only if needed | not verified | **Not verified** — see the risk below |
| `lucide-react`, `sonner` | verify at install time | not verified | **Not verified** — installed as part of the shadcn flow |
| Node | `22.17.0` (the human's local version) | — | Pinned via `.nvmrc` / `engines` and matched in CI and on Vercel |

Rationale in one sentence (SP-7): pinning exact, registry-verified versions removes the single most
common AI-assisted failure mode on a deadline — a hallucinated or drifting version number breaking
the build at hour 20 — and the only non-obvious pin is Prisma, held at 7.10.1 because its CLI's
`latest` tag currently resolves to an 8.0.0 release candidate (the discarded alternative, following
`latest`, would put a pre-release ORM under the money logic).

## Consequences

**Positive**
- Reproducible installs; `pnpm-lock.yaml` committed; CI, local and Vercel all build the same tree.
- shadcn/ui components live in the repository, so the UI can be made original (brand constraint) without fighting a library's opinions.
- Every new dependency has a recorded Art. 10 justification, which is itself part of what CR-6 evaluates.
- "Don't add it" was chosen twice (URL state, client state), keeping the dependency surface small.

**Negative**
- Exact pins mean no automatic patch updates during the sprint; acceptable over 24 h.
- Tailwind v4 and Next.js 16 are both recent major lines; the human has less mileage on v4 syntax (`@theme`) than on v3.
- Four packages are listed as "verify at install time" rather than pinned, so the Implementer must verify them before writing them into `package.json`.

**Risks**
| Risk | Detail | Mitigation |
|---|---|---|
| Prisma `latest` is a release candidate | The `prisma` CLI `dist-tags` show `latest: 8.0.0-rc.33` while `@prisma/client` shows `latest: 7.10.1` and `prev: 7.10.1`. Installing with `latest` would mix a pre-release CLI with a stable client | Pin both to `7.10.1` explicitly. Recorded as RSK-09 in the brief. Re-check before feature 000 installs |
| Unverified versions | `@axe-core/playwright`, `@date-fns/tz`, `lucide-react`, `sonner` were **not** version-verified in this pass (Art. 14 honesty) | The Implementer verifies each against the registry at install time and records the resolved version in the feature's `plan.md`; no version number is guessed |
| Tailwind v4 / Next 16 / React 19 interplay | Three recent major lines together | shadcn's current CLI scaffolds exactly this combination (Next.js 16, React 19, Tailwind v4, `tw-animate-css`), which is the configuration being adopted |
| Font licence | **Geist** is the decided typeface (OQ-005, approved at 🚦 G-Foundational 2026-11-09); it is free (OFL-class), ships with Next.js and is self-hosted via `next/font`, so it adds no dependency | Confirm the licence file ships or is referenced; no external font CDN call |

**What would make us reconsider**
- Prisma 8.0 reaching GA before feature 001 writes the schema (then: evaluate upgrading before any migration exists, never after).
- A blocking bug in Tailwind v4 or Next.js 16 during feature 000 (then: fall back to Tailwind `3.4.19` / Next `15.5.x`, recorded as an amendment).

## Sources

All checked on 2026-11-09:
- npm registry dist-tags: `https://registry.npmjs.org/-/package/<pkg>/dist-tags` for `next`, `react`, `prisma`, `@prisma/client`, `tailwindcss`, `shadcn`, `recharts`, `zod`, `vitest`, `@playwright/test`, `jose`, `date-fns`, `@faker-js/faker`.
- shadcn/ui on Tailwind v4 and React 19: https://ui.shadcn.com/docs/tailwind-v4 · https://ui.shadcn.com/docs/react-19
- Hosting facts and their sources: `docs/adr/0006-deployment-and-database-hosting.md`
