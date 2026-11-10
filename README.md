# Oakfern

A modern banking dashboard for US startups and SMBs — accounts, transactions, cash insights, money
movement and cards. Built as a technical case study for the Post Oak Group hiring team.

> **Stub.** This is a placeholder created by feature `000-walking-skeleton`. The real README —
> setup, architecture tour, decisions, trade-offs and honest limitations — is FR-043 and arrives
> with feature 008.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind CSS 4 · Prisma 7 + PostgreSQL 18 ·
Zod · Vitest · Playwright. Exact versions are pinned in `package.json` and justified in
`docs/adr/0002-stack-and-versions.md`.

## Getting started

```bash
corepack enable pnpm     # pnpm comes from the packageManager field
pnpm install
cp .env.example .env.local   # then fill in DATABASE_URL
```

Commands are listed in `AGENTS.md` under "Project commands".

## Where to read next

| I need… | I read… |
|---|---|
| Agent operating rules, stack pins, conventions | `AGENTS.md` |
| Current status | `MEMORY.md` |
| Decisions and why | `docs/adr/` |
| What the system does | `docs/requirements/` |
| Specs, plans and tasks per feature | `specs/NNN-*/` |
