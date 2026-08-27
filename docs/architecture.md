# Architecture

Loom Multiverse uses a Turborepo monorepo with an API server built on Hono and an agent orchestrator built on LangGraph.js.

## Stack
- **Monorepo:** Turborepo, pnpm
- **Agents:** LangGraph.js, Langchain
- **Database:** PostgreSQL with pgvector
- **API:** Hono
- **Sandboxing:** E2B
