# Loom Multiverse — AI Agent Instructions

## Project Overview
Loom Multiverse is a multi-agent, end-to-end software generation platform. It takes a founder's idea and produces a deployed product through a 6-phase AI pipeline, coordinated over the Model Context Protocol (MCP) with persistent vector + relational memory.

## Architecture
- **Monorepo:** Turborepo + pnpm workspaces
- **Language:** TypeScript (Node.js)
- **Agent Framework:** LangGraph.js (graph-based state machines)
- **Database:** PostgreSQL with pgvector extension (Drizzle ORM)
- **API:** Hono framework
- **Sandboxing:** E2B (Firecracker microVMs)
- **CI/CD:** GitHub Actions (advanced — reusable workflows, composite actions, matrix strategies)
- **Tracking:** Linear (project management)
- **Code Review:** OpenCode AI

## Package Structure
- `packages/shared/` — Logger, config, errors, types, constants
- `packages/database/` — Drizzle schema, migrations, pgvector vector store
- `packages/mcp-core/` — MCP server/client SDK
- `packages/agents/` — Orchestrator + 6 phase agents + QA personas
- `packages/mcp-servers/` — Pre-built integrations (Stripe, Resend, PostHog, E2B, Vercel, GitHub, Linear)
- `packages/founder-feed/` — Web scraping news aggregator
- `apps/api/` — Hono REST/WebSocket API server
- `apps/dashboard/` — Next.js founder dashboard

## Key Conventions
1. **Always use `workspace:*`** for internal package references
2. **Conventional Commits** — `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`
3. **Branch naming** — `feature/LOOM-123-description`, `fix/LOOM-456-description`
4. **Type imports** — Always use `import type { ... }` for type-only imports
5. **Error handling** — Use custom error classes from `@loom/shared/errors`
6. **Logging** — Use `createLogger("module-name")` from `@loom/shared/logger`
7. **Config** — Access via `config` from `@loom/shared/config`, never raw `process.env`

## Skills
Check the `skills/` directory for detailed guides on:
- Building agents
- Creating MCP servers
- Working with the orchestrator
- Database schema changes
- GitHub Actions modifications
- Linear workflow
- E2B sandbox usage
- Founder Feed sources
## Test