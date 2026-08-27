# Loom Multiverse — Implementation Plan

> An end-to-end, multi-agent software generation platform that takes a founder's idea and produces a deployed product through a 6-phase AI pipeline, coordinated over MCP with persistent vector + relational memory.

---

## User Review Required

> [!IMPORTANT]
> **Technology Stack Decisions** — The following choices are based on research and your requirements. Please confirm or override:
> - **Primary Language:** TypeScript (Node.js) for the backend + agents, with Python micro-services where ML-specific tooling demands it (e.g., embedding generation)
> - **Agent Orchestration:** LangGraph.js (graph-based, production-grade state machines) over CrewAI (Python-only, less granular control)
> - **Database:** PostgreSQL with `pgvector` extension (unified relational + vector store in one ACID-compliant system) — avoids running a separate Qdrant service
> - **Sandboxing:** E2B (Firecracker microVMs) for secure AI-generated code execution
> - **Deployment Target:** Vercel (frontend), Render/Railway (backend API), with GitHub Actions automating everything
> - **Monorepo Tool:** Turborepo for managing packages in a single repo

> [!WARNING]
> **Linear + OpenCode + GitHub Actions Integration** — This is a 3-way integration that requires:
> 1. A Linear workspace with API key (free tier works for teams ≤ 250 issues/month)
> 2. OpenCode GitHub App installed on the repo
> 3. GitHub repository secrets configured for all services
>
> You will need to create accounts/API keys for: **Linear**, **OpenCode**, **E2B**, **OpenAI/Anthropic** (for LLM calls), **Stripe**, **Resend**, **PostHog**, and your hosting platform.

---

## Open Questions

> [!IMPORTANT]
> 1. **LLM Provider:** Which LLM(s) should power the agents? Options: OpenAI (GPT-4.1), Anthropic (Claude), Google (Gemini), or a mix? This affects cost and capability.
> 2. **Self-Hosting vs. Cloud:** Should the platform itself be self-hostable (Docker Compose) or purely cloud-deployed SaaS?
> 3. **Founder Dashboard:** Do you want a web-based dashboard where founders interact with the system, or is a CLI/API-first approach sufficient for v1?
> 4. **Founder Feed Sources:** What news/data sources should power the real-time feed? (e.g., TechCrunch API, Hacker News, ProductHunt, Twitter/X, Crunchbase)
> 5. **Team Size:** Is this a solo project or will others contribute? This affects branching strategy and PR review rigor.

---

## Proposed Architecture

```mermaid
graph TB
    subgraph "Founder Interface"
        FD["Founder Dashboard<br/>(Next.js)"]
        CLI["CLI Client"]
    end

    subgraph "API Gateway"
        API["REST/WebSocket API<br/>(Hono on Node.js)"]
    end

    subgraph "Orchestration Layer"
        ORCH["Orchestrator Agent<br/>(LangGraph.js)"]
        MCP_HUB["MCP Server Hub"]
    end

    subgraph "6-Phase Agent Pipeline"
        A1["Phase 1: Idea Check Agent"]
        A2["Phase 2: Planning Agent"]
        A3["Phase 3: Design Agent"]
        A4["Phase 4: Build Agent"]
        A5["Phase 5: Testing Agent"]
        A6["Phase 6: Launch Agent"]
    end

    subgraph "Specialized Sub-Agents"
        QA1["Persona: Hacker"]
        QA2["Persona: Confused User"]
        QA3["Persona: Power User"]
    end

    subgraph "Memory & State"
        PG["PostgreSQL + pgvector"]
        REDIS["Redis (Pub/Sub + Cache)"]
    end

    subgraph "External Services (MCP Servers)"
        STRIPE["Stripe MCP"]
        RESEND["Resend MCP"]
        POSTHOG["PostHog MCP"]
        E2B["E2B Sandbox"]
        FEED["Founder Feed Aggregator"]
    end

    subgraph "DevOps"
        GHA["GitHub Actions CI/CD"]
        LINEAR["Linear Project Tracking"]
        OC["OpenCode PR Reviews"]
    end

    FD --> API
    CLI --> API
    API --> ORCH
    ORCH --> MCP_HUB
    MCP_HUB --> A1 & A2 & A3 & A4 & A5 & A6
    A5 --> QA1 & QA2 & QA3
    ORCH --> PG & REDIS
    A1 & A2 & A3 & A4 & A5 & A6 --> PG
    MCP_HUB --> STRIPE & RESEND & POSTHOG & E2B & FEED
    GHA --> LINEAR
    GHA --> OC
```

---

## Proposed Changes

### 1. Repository Root & Monorepo Setup

This is a **Turborepo monorepo** with the following top-level structure:

#### [NEW] Root Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | Root workspace config with Turborepo scripts |
| `turbo.json` | Turborepo pipeline config (build, lint, test, typecheck) |
| `tsconfig.base.json` | Shared TypeScript base config |
| `.env.example` | Template for all required environment variables |
| `.gitignore` | Comprehensive gitignore for Node.js/TS monorepo |
| `docker-compose.yml` | Local dev: PostgreSQL + Redis + pgAdmin |
| `README.md` | Project overview, setup guide, architecture diagram |
| `CONTRIBUTING.md` | Branching strategy, PR conventions, Linear workflow |
| `LICENSE` | License file |

---

### 2. GitHub Actions (Advanced CI/CD)

> Enterprise-grade pipeline using **reusable workflows**, **composite actions**, **matrix strategies**, **environment gates**, and **deployment tracking to Linear**.

#### [NEW] `.github/actions/setup-node/action.yml`
Composite action for consistent Node.js + pnpm setup across all workflows.

#### [NEW] `.github/actions/linear-sync/action.yml`
Composite action that parses commit messages for Linear issue IDs (e.g., `LOOM-123`) and updates issue status via Linear GraphQL API.

#### [NEW] `.github/workflows/ci.yml`
**Triggered on:** Every push to any branch, every PR.
- Matrix strategy: `[node-20, node-22]` × `[ubuntu-latest]`
- Steps: install → typecheck → lint (ESLint+Prettier) → unit tests (Vitest) → integration tests → coverage report upload
- Uses composite `setup-node` action
- Caches `node_modules` and Turborepo remote cache
- Posts test results as PR comment via `github-script`

#### [NEW] `.github/workflows/opencode-review.yml`
**Triggered on:** `pull_request` (opened, synchronize).
- Runs OpenCode AI review on the PR diff
- Posts line-level code review comments
- Extracts Linear issue IDs from branch name and links PR to Linear

#### [NEW] `.github/workflows/deploy-staging.yml`
**Triggered on:** Push to `develop` branch.
- Reusable workflow pattern: calls `deploy.yml` with `environment: staging`
- Deploys API to Render/Railway staging
- Deploys dashboard to Vercel preview
- Runs smoke tests against staging URL
- Updates Linear issue status to "In Review"

#### [NEW] `.github/workflows/deploy-production.yml`
**Triggered on:** Push to `main` (after PR merge).
- Requires **environment protection rules** (manual approval gate in GitHub)
- Reusable workflow: calls `deploy.yml` with `environment: production`
- Runs full regression suite before deploy
- Creates GitHub Release with auto-generated changelog
- Syncs release to Linear via `linear/linear-release-action`
- Sends deployment notification (Slack/Discord webhook)

#### [NEW] `.github/workflows/deploy.yml`
**Reusable workflow** called by staging/production workflows.
- Inputs: `environment`, `api-url`, `dashboard-url`
- Secrets: `inherit`
- Steps: build → deploy API → deploy dashboard → health check → Linear status update

#### [NEW] `.github/workflows/security-scan.yml`
**Triggered on:** Weekly schedule + PR to `main`.
- `npm audit` with severity threshold
- CodeQL analysis for JavaScript/TypeScript
- Dependency review action (blocks PRs introducing vulnerable deps)
- SAST scanning via Semgrep
- Reports findings as PR annotations

#### [NEW] `.github/workflows/database-migration.yml`
**Triggered on:** Changes to `packages/database/migrations/**`.
- Runs Drizzle ORM migration dry-run against staging DB
- Requires manual approval for production migration
- Creates backup snapshot before production migration

#### [NEW] `.github/CODEOWNERS`
Defines code ownership for automated review assignment.

#### [NEW] `.github/pull_request_template.md`
Structured PR template with Linear issue link, change type, testing checklist.

#### [NEW] `.github/ISSUE_TEMPLATE/bug_report.yml` & `feature_request.yml`
GitHub issue templates that auto-label and link to Linear.

---

### 3. Linear Integration

#### [NEW] `.github/workflows/linear-webhook.yml`
Webhook handler for Linear → GitHub sync:
- When Linear issue moves to "In Progress" → creates feature branch
- When Linear issue moves to "Done" → triggers deployment check

#### [NEW] `docs/linear-setup.md`
Step-by-step guide to configure:
- Linear workspace, team, and project setup
- Workflow states mapping: `Backlog → Todo → In Progress → In Review → Done → Deployed`
- GitHub integration activation in Linear settings
- API key generation and GitHub secret setup
- Label taxonomy: `phase:idea-check`, `phase:planning`, `phase:design`, `phase:building`, `phase:testing`, `phase:launch`, `bug`, `enhancement`, `agent:orchestrator`, etc.

---

### 4. Packages (Monorepo Workspace)

#### 4a. `packages/database/` — Shared Database Layer

| File | Purpose |
|------|---------|
| `package.json` | Package config |
| `drizzle.config.ts` | Drizzle ORM configuration |
| `src/schema/index.ts` | Barrel export |
| `src/schema/projects.ts` | Projects table (founder's projects) |
| `src/schema/phases.ts` | Phase execution records |
| `src/schema/agents.ts` | Agent configurations and state |
| `src/schema/adrs.ts` | Architecture Decision Records |
| `src/schema/memory.ts` | Vector embeddings table (pgvector) |
| `src/schema/feed.ts` | Founder Feed articles and scores |
| `src/schema/integrations.ts` | MCP integration configs per project |
| `src/client.ts` | Drizzle client factory |
| `src/vector.ts` | pgvector similarity search utilities |
| `migrations/` | SQL migration files |

#### 4b. `packages/mcp-core/` — MCP Server/Client SDK

| File | Purpose |
|------|---------|
| `src/server.ts` | Base MCP server class (tool registration, capability negotiation) |
| `src/client.ts` | MCP client for agents to consume tools |
| `src/types.ts` | MCP protocol types (tools, resources, prompts) |
| `src/transport/stdio.ts` | Stdio transport implementation |
| `src/transport/sse.ts` | Server-Sent Events transport |
| `src/middleware/auth.ts` | OAuth 2.1 middleware for MCP auth |
| `src/middleware/logging.ts` | Structured logging middleware |

#### 4c. `packages/agents/` — Agent Definitions & Orchestrator

| File | Purpose |
|------|---------|
| `src/orchestrator/index.ts` | **Main Orchestrator** — LangGraph state machine, phase routing |
| `src/orchestrator/graph.ts` | LangGraph graph definition (nodes, edges, conditions) |
| `src/orchestrator/state.ts` | Typed state schema for the orchestration graph |
| `src/agents/idea-check.ts` | Phase 1 — Idea validation, market cross-reference |
| `src/agents/planning.ts` | Phase 2 — Architecture, tech stack, schema generation |
| `src/agents/design.ts` | Phase 3 — UI/UX specs, component structures |
| `src/agents/build.ts` | Phase 4 — Code generation via E2B sandbox |
| `src/agents/testing.ts` | Phase 5 — QA swarm coordinator |
| `src/agents/launch.ts` | Phase 6 — Deployment automation |
| `src/agents/base-agent.ts` | Abstract base class (LLM calls, memory access, MCP tool usage) |
| `src/personas/hacker.ts` | QA Persona: security-focused tester |
| `src/personas/confused-user.ts` | QA Persona: non-technical user simulation |
| `src/personas/power-user.ts` | QA Persona: advanced user edge cases |
| `src/memory/index.ts` | Memory manager (read/write embeddings + relational data) |
| `src/memory/adr-manager.ts` | Architecture Decision Record CRUD |
| `src/memory/embeddings.ts` | Embedding generation (OpenAI/local model) |
| `src/tools/` | Agent-specific tools (file ops, search, code analysis) |

#### 4d. `packages/mcp-servers/` — Pre-built MCP Integration Servers

| File | Purpose |
|------|---------|
| `src/stripe/index.ts` | Stripe MCP Server — products, subscriptions, checkout |
| `src/resend/index.ts` | Resend MCP Server — transactional emails, templates |
| `src/posthog/index.ts` | PostHog MCP Server — event tracking, feature flags |
| `src/e2b/index.ts` | E2B MCP Server — sandbox creation, code execution |
| `src/vercel/index.ts` | Vercel MCP Server — deployment, env vars, domains |
| `src/github/index.ts` | GitHub MCP Server — repos, PRs, issues |
| `src/linear/index.ts` | Linear MCP Server — issues, projects, cycles |

#### 4e. `packages/founder-feed/` — Real-time Market Intelligence

| File | Purpose |
|------|---------|
| `src/aggregator.ts` | Multi-source news aggregator (RSS, APIs) |
| `src/sources/hackernews.ts` | Hacker News API integration |
| `src/sources/producthunt.ts` | ProductHunt API integration |
| `src/sources/techcrunch.ts` | TechCrunch RSS feed parser |
| `src/sources/crunchbase.ts` | Crunchbase API (funding, competitors) |
| `src/scorer.ts` | Relevance scoring engine (domain-aware ranking) |
| `src/scheduler.ts` | Cron-based feed refresh scheduler |
| `src/types.ts` | Feed item types and interfaces |

#### 4f. `packages/shared/` — Shared Utilities

| File | Purpose |
|------|---------|
| `src/logger.ts` | Structured logger (Pino) with correlation IDs |
| `src/config.ts` | Environment config with Zod validation |
| `src/errors.ts` | Custom error classes and error handling |
| `src/types.ts` | Shared TypeScript types across packages |
| `src/constants.ts` | System-wide constants |

---

### 5. Applications

#### 5a. `apps/api/` — Backend API Server

| File | Purpose |
|------|---------|
| `src/index.ts` | Hono server entrypoint, middleware stack |
| `src/routes/projects.ts` | CRUD for founder projects |
| `src/routes/phases.ts` | Phase execution triggers and status |
| `src/routes/agents.ts` | Agent status and configuration |
| `src/routes/feed.ts` | Founder Feed endpoints |
| `src/routes/integrations.ts` | MCP integration management |
| `src/routes/webhooks.ts` | Webhook handlers (Linear, GitHub, Stripe) |
| `src/middleware/auth.ts` | JWT/session authentication |
| `src/middleware/rate-limit.ts` | Rate limiting |
| `src/ws/index.ts` | WebSocket server for real-time agent updates |
| `Dockerfile` | Production Docker image |

#### 5b. `apps/dashboard/` — Founder Dashboard (Next.js)

| File | Purpose |
|------|---------|
| `src/app/layout.tsx` | Root layout with theme provider |
| `src/app/page.tsx` | Landing/onboarding page |
| `src/app/dashboard/page.tsx` | Main dashboard — project overview |
| `src/app/dashboard/[projectId]/page.tsx` | Project detail — 6-phase pipeline view |
| `src/app/dashboard/[projectId]/feed/page.tsx` | Founder Feed for this project |
| `src/app/dashboard/[projectId]/adrs/page.tsx` | Architecture Decision Records viewer |
| `src/app/dashboard/[projectId]/agents/page.tsx` | Live agent activity monitor |
| `src/components/` | Reusable UI components |
| `src/hooks/` | Custom React hooks (WebSocket, API) |
| `src/lib/` | API client, utilities |

---

### 6. Configuration & Environment

#### [NEW] `.env.example`
```
# LLM Provider
LLM_PROVIDER=openai
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/loom_multiverse
REDIS_URL=redis://localhost:6379

# E2B Sandbox
E2B_API_KEY=

# Integrations
STRIPE_SECRET_KEY=
RESEND_API_KEY=
POSTHOG_API_KEY=
POSTHOG_HOST=

# Linear
LINEAR_API_KEY=
LINEAR_TEAM_ID=
LINEAR_WEBHOOK_SECRET=

# OpenCode
OPENCODE_API_KEY=

# GitHub
GITHUB_TOKEN=
GITHUB_WEBHOOK_SECRET=

# Deployment
VERCEL_TOKEN=
RENDER_API_KEY=

# Auth
JWT_SECRET=
SESSION_SECRET=
```

---

### 7. Documentation

#### [NEW] `docs/architecture.md`
Full system architecture document with diagrams.

#### [NEW] `docs/agents.md`
Detailed documentation of each agent's responsibilities, inputs, outputs, and tools.

#### [NEW] `docs/mcp-servers.md`
Documentation for each MCP server: available tools, authentication, usage examples.

#### [NEW] `docs/adr/0001-use-langgraph-for-orchestration.md`
First ADR: Why LangGraph over CrewAI.

#### [NEW] `docs/adr/0002-pgvector-over-dedicated-vector-db.md`
Second ADR: Why pgvector over Qdrant.

#### [NEW] `docs/adr/0003-e2b-sandbox-for-code-execution.md`
Third ADR: Why E2B for sandboxed code execution.

#### [NEW] `docs/github-actions.md`
Guide to the CI/CD pipeline, environment gates, and deployment flow.

#### [NEW] `docs/linear-setup.md`
Guide to setting up Linear workspace with the project.

#### [NEW] `docs/opencode-setup.md`
Guide to installing and configuring OpenCode for automated PR reviews.

---

### 8. Skills & Agents Files (`.agents/` directory)

These are the **Antigravity customization files** that help AI assistants understand and work with this codebase.

#### [NEW] `.agents/AGENTS.md`
Root agent instructions for the Loom Multiverse repository.

#### [NEW] `.agents/skills/orchestrator-agent/SKILL.md`
Skill file documenting how the Orchestrator Agent works — its state machine, phase transitions, and decision logic.

#### [NEW] `.agents/skills/mcp-server-dev/SKILL.md`
Skill for developing new MCP servers — template, registration, testing patterns.

#### [NEW] `.agents/skills/agent-dev/SKILL.md`
Skill for developing new phase agents — base class extension, memory patterns, tool registration.

#### [NEW] `.agents/skills/e2b-sandbox/SKILL.md`
Skill for working with E2B sandboxes — creation, code execution, file I/O.

#### [NEW] `.agents/skills/linear-workflow/SKILL.md`
Skill documenting the Linear workflow — issue states, label taxonomy, automation rules.

#### [NEW] `.agents/skills/github-actions/SKILL.md`
Skill for the CI/CD pipeline — how to add/modify workflows, reusable patterns, secret management.

#### [NEW] `.agents/skills/database-schema/SKILL.md`
Skill for database schema changes — migration workflow, pgvector usage, schema conventions.

#### [NEW] `.agents/skills/founder-feed/SKILL.md`
Skill for adding new feed sources — aggregator interface, scoring algorithm, scheduler.

#### [NEW] `.agents/rules/code-style.md`
Code style rules: ESLint config, Prettier config, naming conventions, import ordering.

#### [NEW] `.agents/rules/git-conventions.md`
Git conventions: branch naming (`feature/LOOM-123-description`), commit message format (Conventional Commits), PR requirements.

#### [NEW] `.agents/rules/architecture.md`
Architectural rules: package boundaries, dependency direction, no circular imports.

---

## Complete Directory Tree

```
loom_multiverse/
├── .agents/
│   ├── AGENTS.md
│   ├── skills/
│   │   ├── orchestrator-agent/SKILL.md
│   │   ├── mcp-server-dev/SKILL.md
│   │   ├── agent-dev/SKILL.md
│   │   ├── e2b-sandbox/SKILL.md
│   │   ├── linear-workflow/SKILL.md
│   │   ├── github-actions/SKILL.md
│   │   ├── database-schema/SKILL.md
│   │   └── founder-feed/SKILL.md
│   └── rules/
│       ├── code-style.md
│       ├── git-conventions.md
│       └── architecture.md
├── .github/
│   ├── actions/
│   │   ├── setup-node/action.yml
│   │   └── linear-sync/action.yml
│   ├── workflows/
│   │   ├── ci.yml
│   │   ├── opencode-review.yml
│   │   ├── deploy-staging.yml
│   │   ├── deploy-production.yml
│   │   ├── deploy.yml                    # reusable
│   │   ├── security-scan.yml
│   │   ├── database-migration.yml
│   │   └── linear-webhook.yml
│   ├── CODEOWNERS
│   ├── pull_request_template.md
│   └── ISSUE_TEMPLATE/
│       ├── bug_report.yml
│       └── feature_request.yml
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── routes/
│   │   │   ├── middleware/
│   │   │   └── ws/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── dashboard/
│       ├── src/
│       │   ├── app/
│       │   ├── components/
│       │   ├── hooks/
│       │   └── lib/
│       ├── package.json
│       ├── next.config.ts
│       └── tsconfig.json
├── packages/
│   ├── database/
│   │   ├── src/
│   │   │   ├── schema/
│   │   │   ├── client.ts
│   │   │   └── vector.ts
│   │   ├── migrations/
│   │   ├── drizzle.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── mcp-core/
│   │   ├── src/
│   │   │   ├── server.ts
│   │   │   ├── client.ts
│   │   │   ├── types.ts
│   │   │   ├── transport/
│   │   │   └── middleware/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── agents/
│   │   ├── src/
│   │   │   ├── orchestrator/
│   │   │   ├── agents/
│   │   │   ├── personas/
│   │   │   ├── memory/
│   │   │   └── tools/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── mcp-servers/
│   │   ├── src/
│   │   │   ├── stripe/
│   │   │   ├── resend/
│   │   │   ├── posthog/
│   │   │   ├── e2b/
│   │   │   ├── vercel/
│   │   │   ├── github/
│   │   │   └── linear/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── founder-feed/
│   │   ├── src/
│   │   │   ├── aggregator.ts
│   │   │   ├── sources/
│   │   │   ├── scorer.ts
│   │   │   ├── scheduler.ts
│   │   │   └── types.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── shared/
│       ├── src/
│       │   ├── logger.ts
│       │   ├── config.ts
│       │   ├── errors.ts
│       │   ├── types.ts
│       │   └── constants.ts
│       ├── package.json
│       └── tsconfig.json
├── docs/
│   ├── architecture.md
│   ├── agents.md
│   ├── mcp-servers.md
│   ├── github-actions.md
│   ├── linear-setup.md
│   ├── opencode-setup.md
│   └── adr/
│       ├── 0001-use-langgraph-for-orchestration.md
│       ├── 0002-pgvector-over-dedicated-vector-db.md
│       └── 0003-e2b-sandbox-for-code-execution.md
├── docker-compose.yml
├── turbo.json
├── tsconfig.base.json
├── package.json
├── pnpm-workspace.yaml
├── .env.example
├── .eslintrc.cjs
├── .prettierrc
├── .gitignore
├── CONTRIBUTING.md
├── LICENSE
└── README.md
```

---

## Prerequisites & External Accounts Required

| Service | Purpose | Free Tier? | Setup Priority |
|---------|---------|------------|----------------|
| **GitHub** | Repository, Actions CI/CD, PR reviews | Yes | 🔴 Day 1 |
| **Linear** | Project tracking, issue management | Yes (≤250 issues) | 🔴 Day 1 |
| **OpenCode** | AI-powered PR code reviews | Yes (open-source) | 🟡 Day 2 |
| **PostgreSQL** | Relational + vector database | Free (local/Neon) | 🔴 Day 1 |
| **Redis** | Pub/Sub, caching, job queues | Free (local/Upstash) | 🟡 Day 2 |
| **E2B** | Secure code execution sandbox | Free tier (100 hrs/mo) | 🟡 Week 2 |
| **OpenAI / Anthropic** | LLM provider for agents | Pay-as-you-go | 🔴 Day 1 |
| **Vercel** | Dashboard deployment | Free (hobby) | 🟡 Week 3 |
| **Render / Railway** | API deployment | Free tier | 🟡 Week 3 |
| **Stripe** | Billing MCP integration | Free (test mode) | 🟢 Week 4+ |
| **Resend** | Email MCP integration | Free (100 emails/day) | 🟢 Week 4+ |
| **PostHog** | Analytics MCP integration | Free (1M events/mo) | 🟢 Week 4+ |
| **Node.js 22+** | Runtime | Yes | 🔴 Day 1 |
| **pnpm 9+** | Package manager | Yes | 🔴 Day 1 |
| **Docker Desktop** | Local PostgreSQL + Redis | Yes | 🔴 Day 1 |

---

## Execution Order (Phased Approach)

### Phase A — Foundation (Week 1-2)
1. Initialize monorepo (Turborepo + pnpm workspaces)
2. Set up `packages/shared/` (logger, config, types)
3. Set up `packages/database/` (schema, migrations, pgvector)
4. Docker Compose for local dev (PostgreSQL + Redis)
5. GitHub repo creation + branch protection rules
6. All GitHub Actions workflows
7. Linear workspace setup + GitHub integration
8. OpenCode installation + PR review workflow
9. `.agents/` skills and rules files
10. Initial documentation (`docs/`)

### Phase B — Core Engine (Week 3-5)
1. `packages/mcp-core/` — MCP server/client SDK
2. `packages/agents/` — Base agent, memory manager, orchestrator
3. Phase 1 Agent: Idea Check
4. Phase 2 Agent: Planning
5. `packages/founder-feed/` — Aggregator + first 2 sources
6. `apps/api/` — Hono API server with core routes

### Phase C — Generation Pipeline (Week 6-8)
1. Phase 3 Agent: Design
2. Phase 4 Agent: Build (with E2B integration)
3. Phase 5 Agent: Testing (QA swarm personas)
4. Phase 6 Agent: Launch
5. `packages/mcp-servers/` — E2B, Vercel, GitHub servers

### Phase D — Integrations & Dashboard (Week 9-12)
1. `packages/mcp-servers/` — Stripe, Resend, PostHog
2. `apps/dashboard/` — Next.js founder dashboard
3. End-to-end pipeline testing
4. Production deployment setup
5. Remaining Founder Feed sources

---

## Verification Plan

### Automated Tests
```bash
# Run full test suite
pnpm turbo run test

# Run specific package tests
pnpm turbo run test --filter=@loom/agents

# Type checking
pnpm turbo run typecheck

# Linting
pnpm turbo run lint
```

### CI Pipeline Verification
- Push to feature branch → CI workflow triggers → all checks pass
- Open PR → OpenCode review posts comments → Linear issue auto-links
- Merge to `develop` → staging deployment → smoke tests pass
- Merge to `main` → production deployment (with approval gate) → Linear release sync

### Integration Tests
- Agent pipeline: input idea → all 6 phases execute → output generated code
- Memory: agents write and retrieve from pgvector correctly
- MCP: agents connect to MCP servers and invoke tools
- Feed: aggregator fetches and scores news items

### Manual Verification
- Founder dashboard shows real-time agent progress via WebSocket
- Linear board reflects accurate project state
- E2B sandbox executes generated code without exposing host
