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

### Amendment 1 — versions resolved at install time (feature 000, 2026-11-09)

ADR-0002 deliberately left some versions unpinned and delegated them to the Implementer at install
time (see the "Unverified versions" row). Feature 000 executed that install, so the resolved values
are recorded here. **No pin in the table above was violated or substituted**; every one of them
resolved on the registry exactly as written.

| Package | Resolved pin | Why not the registry `latest` |
|---|---|---|
| `packageManager` / **pnpm** | **`11.28.9`** | `latest` is `12.18.0`, but pnpm 12 ships native binaries (`bin: {"pnpm":"pnpm"}`) and the installed **corepack 0.33.0** looks for `bin/pnpm.cjs`, failing with `Cannot find module …\pnpm
.18.0in\pnpm.cjs`. `11.28.9` is JS-based and its `engines.node` (`>=22.13`) matches our pinned Node `22.17.0`. ADR-0002 pinned no pnpm version, so this is a new decision, not a contradiction |
| **`typescript`** | **`5.9.3`** | `latest` is `7.0.2`, but `eslint-config-next@16.4.6` depends on `typescript-eslint ^8.56.0`, whose peer range is `typescript >=4.8.4 <6.1.0`. TypeScript 7 is unusable with the pinned Next ESLint config |
| **`@prisma/adapter-pg`** | **`7.10.1`** | New **mandatory** dependency: Prisma 7 requires a driver adapter for a direct database connection, so "don't add it" is not available. Art. 10 justification in `specs/000-walking-skeleton/plan.md` §7.3. It bundles `pg`, so no separate `pg` install |

**Build-tooling note (not a version pin):** pnpm 11 requires a `pnpm-workspace.yaml` to grant
install-script permission to Prisma's engines, and it renamed that key from pnpm 10's
`onlyBuiltDependencies` (a list) to **`allowBuilds`** (a map). Without it `pnpm install` exits
non-zero with `ERR_PNPM_IGNORED_BUILDS` and Prisma's engines are never placed. CI must honour it too.

`@axe-core/playwright`, `@date-fns/tz`, `lucide-react` and `sonner` remain unresolved: none is needed
by feature 000, and the axe scan moved to feature 003. **TD-008 stays open.**

### Amendment 2 — versions resolved at install time (feature 001, 2026-11-10)

Feature 001 installed the seed runner, the date/time helper and the whole shadcn flow, so the rest
of ADR-0002's "verify at install time" rows are now resolved. Every version below was read from the
npm registry at install time (Art. 14) and is pinned exactly, no `^`.

| Package | Resolved pin | Purpose and why this pin |
|---|---|---|
| **`tsx`** | **`4.23.15`** | Seed runner: `pnpm db:seed` is `tsx prisma/seed.ts`. This is **ASM-001-12's pre-authorised fallback, and it is the path that was actually executed** — the primary option (running the TypeScript seed directly under Node 22's type-stripping) failed, so the fallback was taken as the assumption allowed. Not a new decision, but recorded here because `tsx` is now a committed devDependency |
| **`lucide-react`** | **`1.70.0`** | The icon set ADR-0002 already chose; `1.70.0` is the registry `latest`. The 1.x line is the current stable one |
| **`radix-ui`** | **`1.8.1`** | ⚠️ **Correction to a plan assumption.** `plan.md` assumed the per-primitive packages (`@radix-ui/react-dialog`, `@radix-ui/react-slot`, …). The shadcn `4.23.0` `radix` base does not use them: it emits `import { Slot } from 'radix-ui'` against the **umbrella** `radix-ui` package. One dependency instead of a growing list, and no risk of two primitives drifting to incompatible versions |
| **`class-variance-authority`** | **`0.7.1`** | Variant API that every shadcn component's `cva(...)` call needs. Mandatory for the chosen component flow, so "don't add it" was not available |
| **`cn`** | **`0.5.2`** | shadcn's own `clsx` + `tailwind-merge` drop-in, emitted by the CLI as `import { cn } from 'cn'`. **This is why there is no `src/lib/utils.ts`**: the classic shadcn `cn` helper file is no longer generated, and inventing one to re-export the package would be dead code |
| **`tw-animate-css`** | **`1.4.0`** | Tailwind v4 replacement for `tailwindcss-animate`; shadcn's Tailwind v4 output imports it from `globals.css`. Already named in ADR-0002's risk table as part of the scaffold |
| **`next-themes`** | **`0.4.6`** | FR-005 light/dark with no flash on first paint (AC-001-14). The alternative — a hand-written `localStorage` + inline-script theme switcher — is the exact class of pre-hydration bug this package exists to avoid, on a 24 h budget |
| **`@date-fns/tz`** | **`1.5.0`** | BR-009: every daily/monthly aggregation is computed in `America/New_York`. ADR-0002 made this conditional on "if a tz helper is needed"; `src/server/domain/time.ts` needs one, and hand-rolled DST arithmetic is the bug class BR-009 exists to prevent |

**`shadcn` is not a runtime dependency.** The `4.23.0` CLI added itself to `dependencies` when it
ran, which contradicts ADR-0002's "CLI only; components are copied into the repo". It was removed
deliberately: it is invoked with `pnpm dlx shadcn@4.23.0` and shipping a scaffolding CLI in a
production bundle has no justification under Art. 10.

**TD-008 is now partly closed.** Resolved: `@date-fns/tz@1.5.0` and `lucide-react@1.70.0`. Still
open: **`@axe-core/playwright`**, deferred to feature 003 with the NFR-003 axe scan, and
**`sonner`**, which no screen in 001 needs — the first toast appears with money movement in
feature 005. Neither is guessed anywhere in the repository.

### Note — `recharts` is pinned but **not installed** (feature 002, 2026-11-10)

`recharts@3.10.1` is pinned in the Decision table above and `docs/ux/ui-brief.md` §5 names it as the
charting route ("Recharts via shadcn charts"). **Verified on 2026-11-10: it is absent from
`package.json`, and feature 002 does not add it.** Two reasons, both decided by the Technical
Director at 🚦 G-SpecPlan 002:

- Feature **004 `cash-insights` is CUT**, so no chart ships.
- The last chart-shaped requirement, **FR-012b** (cash sparkline), was **deferred** by cut ladder
  **L-4** the same day (`docs/requirements/functional.md` Amendment C-2). With nothing to render,
  Art. 10's "don't add it" option wins outright — and 001 measured how expensive an unanticipated
  shadcn dependency set is inside a timebox.

**The pin stands** as the verified-at-decision-time version for a future feature that needs a chart.
It is **not** a claim that the package is in the tree. Whoever first installs it re-verifies the
version against the npm registry at install time (Art. 14) and records the resolved version in that
feature's `plan.md`, exactly as TD-008 requires.

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
