# 🌀 Loom Multiverse

> **An AI Technical Co-Founder** — Multi-agent, end-to-end software generation platform that takes a founder's idea and produces a deployed product.

[![CI](https://github.com/your-org/loom-multiverse/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/loom-multiverse/actions/workflows/ci.yml)
[![Security](https://github.com/your-org/loom-multiverse/actions/workflows/security-scan.yml/badge.svg)](https://github.com/your-org/loom-multiverse/actions/workflows/security-scan.yml)

---

## What is Loom Multiverse?

Loom Multiverse compresses the idea-to-product timeline for non-technical founders. You provide an idea, abstract, or partially built codebase — the system handles everything from market validation to deployment through **6 specialized AI agents** coordinated by an Orchestrator.

### The 6-Phase Pipeline

| Phase | Agent | What It Does |
|-------|-------|-------------|
| 1️⃣ Idea Check | `IdeaCheckAgent` | Validates market viability, cross-references competitor launches |
| 2️⃣ Planning | `PlanningAgent` | Outlines architecture, tech stack, database schema |
| 3️⃣ Design | `DesignAgent` | Generates UI/UX specs, component structures, user flows |
| 4️⃣ Building | `BuildAgent` | Code generation in secure E2B sandboxes |
| 5️⃣ Testing | `TestingAgent` | Multi-persona QA swarm (Hacker, Confused User, Power User) |
| 6️⃣ Launch | `LaunchAgent` | Deploys to production, manages env vars and DNS |

### Key Differentiators

- 🧠 **Market-Aware Dynamic Pivoting** — Cross-references Founder Feed before building
- 🐛 **Multi-Persona QA Swarm** — Simulated user testing, not just unit tests
- 📝 **Self-Healing ADRs** — Warns when changes conflict with past architectural decisions
- 🔌 **Zero-Code MCP Integrations** — Checkbox-based Stripe, email, analytics hookup

---

## Quick Start

### Prerequisites

- Node.js 22+
- pnpm 10+
- Docker Desktop

### Setup

```bash
# Clone the repository
git clone https://github.com/your-org/loom-multiverse.git
cd loom-multiverse

# Copy environment variables
cp .env.example .env
# Edit .env with your API keys

# Start local services (PostgreSQL + Redis + pgAdmin)
pnpm docker:up

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run database migrations
pnpm db:push

# Start development server
pnpm dev
```

### Access Points

| Service | URL |
|---------|-----|
| API Server | http://localhost:3001 |
| Dashboard | http://localhost:3000 |
| pgAdmin | http://localhost:5050 |

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                 Founder Interface                │
│          (Dashboard / CLI / API)                 │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│            Orchestrator Agent                    │
│         (LangGraph State Machine)               │
├─────────────────────────────────────────────────┤
│  Phase 1  │  Phase 2  │  Phase 3  │  Phase 4   │
│  Idea     │  Plan     │  Design   │  Build     │
│  Check    │           │           │  (E2B)     │
├───────────┼───────────┼───────────┼────────────┤
│  Phase 5 (QA Swarm)   │  Phase 6: Launch       │
│  🔓 Hacker            │  → Deploy to Vercel    │
│  😕 Confused User     │  → Manage env vars     │
│  ⚡ Power User        │  → Deliver live URL    │
└───────────────────────┴────────────────────────┘
         │                        │
┌────────▼────────┐    ┌──────────▼──────────┐
│  Memory Store   │    │   MCP Servers       │
│  PostgreSQL +   │    │   Stripe, Resend,   │
│  pgvector       │    │   PostHog, E2B,     │
│  (ADRs, context)│    │   Vercel, GitHub,   │
└─────────────────┘    │   Linear            │
                       └─────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript (Node.js) |
| Monorepo | Turborepo + pnpm |
| Agent Framework | LangGraph.js |
| LLM | Anthropic Claude + OpenAI (embeddings) |
| API | Hono |
| Database | PostgreSQL + pgvector (Drizzle ORM) |
| Dashboard | Next.js |
| Sandboxing | E2B (Firecracker microVMs) |
| CI/CD | GitHub Actions |
| Tracking | Linear |
| Code Review | OpenCode AI |
| Containerization | Docker Compose |

---

## Project Structure

```
loom_multiverse/
├── .agents/              # AI assistant skills & rules
├── .github/              # GitHub Actions, templates, CODEOWNERS
├── apps/
│   ├── api/              # Hono REST/WebSocket API server
│   └── dashboard/        # Next.js founder dashboard
├── packages/
│   ├── shared/           # Logger, config, errors, types
│   ├── database/         # Drizzle schema, migrations, pgvector
│   ├── mcp-core/         # MCP server/client SDK
│   ├── agents/           # Orchestrator + 6 phase agents
│   ├── mcp-servers/      # Pre-built integrations
│   └── founder-feed/     # News aggregator
├── docs/                 # Architecture docs, ADRs, setup guides
├── scripts/              # Database init, utilities
├── docker-compose.yml    # Local dev stack
└── turbo.json            # Build pipeline config
```

---

## Development

```bash
# Run all tests
pnpm test

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Format code
pnpm format

# Database studio (GUI)
pnpm db:studio
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for branching strategy, commit conventions, and PR requirements.

## License

MIT
