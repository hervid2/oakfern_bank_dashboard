# Approved MCP servers — Oakfern

> Canonical source (GENESIS G4.6). The Coordinator installs this into `.mcp.json` (Claude Code
> project scope) during G4.7. **No secrets in this file and none in `.mcp.json`:** credentials are
> only ever referenced as `${ENV_VAR}` or held in a CLI profile outside the repository.

## 1. Approved set

| Server | Purpose | Used by | Transport | Permissions / limits |
|---|---|---|---|---|
| **Playwright MCP** | Drive a real browser for e2e validation: navigate the deployed/preview app, assert UI, capture screenshots, read console errors and network failures. Covers NFR-003 (a11y spot checks), NFR-004 (viewports) and the evidence requirement of Art. 5. | `reviewer` (focus `e2e`, and `combined` on features 000/001/006/007/008) | stdio, local `npx` | Browser only — no filesystem and no database access. Runs `--headless` and `--isolated` (no persistent profile). Artefacts go to `.playwright-mcp/` (git-ignored). Reviewers never start their own dev server: the Coordinator passes them a URL (local `pnpm start` or the Vercel preview). |
| **Context7** | Fetch current, version-correct documentation for Next.js 16, React 19, Prisma 7, Tailwind v4, shadcn/ui and Recharts **before** writing code or pinning a version (Art. 14, RSK-06 "API hallucination"). | `planner` (plans, ADRs), `implementer` (every task touching an unfamiliar API) | HTTP (remote) | Read-only documentation lookups. No repository or database access. Requires a Context7 API key supplied as `${CONTEXT7_API_KEY}`; never written into the repo. |
| **Neon MCP** | Inspect the managed Postgres for the **one** authorised project (`sweet-feather-13830390`, org `org-winter-river-10341535`): list branches, check that a migration landed, read the live schema, confirm seed row counts and the observed database size (ASM-022). | `implementer` (feature 000 DB bring-up, migrations), `reviewer` (verifying a migration actually applied) | HTTP (remote), **project-scoped** | **Project-scoped by URL** (`?projectId=…`) so no other Neon project is reachable. Treat as read-mostly: schema/branch inspection yes; destructive operations (dropping a branch, deleting a project, truncating production data) are Art. 9 actions and need the human's confirmation. Credentials live in the **Neon CLI profile** (`neon init`, authorised by the human on 2026-11-09) — never in the repo. |

Rejected for now (SP-7, one line each): a **GitHub MCP** (the human resolved OQ-007 to create PRs through the web UI, so an extra server earns nothing) and a **Figma/design MCP** (there is no design file; identity is decided in `docs/ux/ui-brief.md`).

## 2. `.mcp.json` to install (project scope)

Verified against the current Claude Code MCP documentation and each server's own docs on 2026-11-09 (sources in §4).

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest", "--headless", "--isolated"]
    },
    "context7": {
      "type": "http",
      "url": "https://mcp.context7.com/mcp",
      "headers": {
        "Authorization": "Bearer ${CONTEXT7_API_KEY}"
      }
    },
    "neon": {
      "type": "http",
      "url": "https://mcp.neon.tech/mcp?projectId=sweet-feather-13830390"
    }
  }
}
```

Notes the Coordinator must respect when installing:

| # | Note |
|---|---|
| N-1 | A remote server **must** carry `"type": "http"`. A `url` without `type` is parsed as stdio and errors out. |
| N-2 | `${VAR}` expansion is supported in `env` and `headers`. `CONTEXT7_API_KEY` must exist in the shell environment (or in the human's user-scope Claude config) **before** the session starts; it is not committed and does not go in `.env.example` as a value. |
| N-3 | If no Context7 API key is available, remove the `context7` entry rather than committing a placeholder, and fall back to `WebSearch`/`WebFetch` for Art. 14 verification. Context7 also supports OAuth on the HTTP transport, which the human can complete interactively with `/mcp`. |
| N-4 | `neon init` (already authorised) may write its own MCP entry. If it does, reconcile to a single `neon` entry and keep the `?projectId=` scope. Authentication is the Neon CLI profile / OAuth — if the server asks for a token, stop and ask the human; do not paste one into the repo. |
| N-5 | Project-scoped `.mcp.json` requires the human to approve the servers in a trust dialog on first load, and a Claude Code restart may be needed. |
| N-6 | Versions: the documented invocation for Playwright MCP is the `@latest` tag (`npx @playwright/mcp@latest`); a specific MCP version was **not** pinned because these are tooling, not shipped dependencies, and they sit outside ADR-0002's pin policy. |

## 3. Regenerating the adapters

`.harness/` is the source of truth. See `AGENTS.md` → "Tool adapters". `.mcp.json` is written by the
Coordinator from §2 of this file; if §2 changes, `.mcp.json` is rewritten, never edited in isolation.

## 4. Sources (Art. 14, verified 2026-11-09)

- Claude Code MCP configuration and `.mcp.json` schema: <https://code.claude.com/docs/en/mcp>
- Playwright MCP (package, `mcpServers` snippet, `--headless` / `--isolated`): <https://www.npmjs.com/package/@playwright/mcp> · <https://playwright.dev/docs/getting-started-mcp> · <https://playwright.dev/mcp/configuration/options>
- Context7 clients and API-key requirement: <https://context7.com/docs/resources/all-clients> · <https://www.npmjs.com/package/@upstash/context7-mcp>
- Neon MCP server, HTTP endpoint and `projectId` scoping: <https://neon.com/docs/ai/neon-mcp-server> · <https://neon.com/docs/reference/cli-init>

**Not fully verified — flagged, not guessed:** the exact tool list each server exposes at these
versions, and whether the Neon MCP endpoint honours `?projectId=` as a hard authorisation boundary
rather than a convenience default. Treat the Neon scope as a convention the agents must also respect
by discipline, and confirm the first time the server is actually used.
