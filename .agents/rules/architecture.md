# Architecture Rules

## Package Dependency Direction
Dependencies MUST flow downward. Never create circular imports.

```
apps/api          → packages/agents, packages/mcp-servers, packages/founder-feed
apps/dashboard    → (standalone, consumes API via HTTP)
packages/agents   → packages/mcp-core, packages/database, packages/shared
packages/mcp-servers → packages/mcp-core, packages/shared
packages/founder-feed → packages/database, packages/shared
packages/database → packages/shared
packages/mcp-core → packages/shared
packages/shared   → (no internal dependencies)
```

## Rules
1. **No circular imports** — If A imports B, B must not import A
2. **No cross-app imports** — `apps/api` must NOT import from `apps/dashboard`
3. **Shared types only in `@loom/shared`** — Don't define types locally if they're used cross-package
4. **Database access only through `@loom/database`** — Never use raw SQL in other packages
5. **Config access only through `@loom/shared/config`** — Never read `process.env` directly
6. **Logging only through `@loom/shared/logger`** — Never use `console.log` in production code
7. **Error handling through custom errors** — Always use `@loom/shared/errors` classes

## MCP Architecture
- MCP Servers are stateless — they don't hold conversation state
- MCP Clients (in agents) manage the connection lifecycle
- One MCP server per external service
- Tools should be granular (one action per tool, not mega-tools)

## Agent Architecture
- Each agent is single-responsibility (one phase)
- Agents communicate ONLY through the shared memory store and orchestrator state
- Agents must NOT call each other directly
- The Orchestrator is the ONLY entity that routes between agents
