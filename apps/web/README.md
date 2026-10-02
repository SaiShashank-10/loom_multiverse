# LOOM studio

LOOM's local product studio connects to the existing orchestrator, project database, saved terminal workspaces, design artifacts and Founder Feed. It uses React, TypeScript, Vite and Framer Motion.

From the repository root, with Node 22+, pnpm 10+ and Docker Desktop running:

```powershell
pnpm install
docker compose up -d postgres redis
pnpm build:studio
pnpm --filter @loom/database db:migrate
pnpm dev:studio
```

Open http://127.0.0.1:5174. Keep the terminal running. Ctrl+C stops both development servers. For separate terminals, use `pnpm dev:api` and `pnpm dev:web` instead. The existing root `.env` supplies database and agent-provider settings; the frontend never receives those secrets.

Write an idea, choose Web, Flutter or React Native, and optionally attach a brief. Creating a project saves a draft; **Start building** begins the real agent pipeline. Reply in the conversation and approve each interactive phase when ready. A saved terminal project appears in **Projects**; opening it and selecting **Resume pipeline** uses its checkpoint. Only one pipeline runs at a time, to keep the orchestrator's interactive callbacks isolated.

**Designs** shows saved Stitch references and its project link. **Files** previews and downloads generated source. Generated client applications have their own run instructions; this studio's address runs LOOM itself. Agents still require the configured model/service to be available, and mobile builds require the appropriate Flutter or React Native tooling.

```powershell
pnpm --filter @loom/web test
pnpm --filter @loom/api test
pnpm test:auth
pnpm build:studio
```

Create your account on the initial setup screen. The first account becomes the workspace owner and receives the existing local projects. Subsequent accounts have separate project libraries. The personal dashboard shows your actual project activity; My account supports profile changes, password changes and logout. Sessions use HTTP-only cookies, and API routes and WebSocket subscriptions verify project ownership. Password changes revoke previous sessions.

The studio is bound to localhost and is intended for local use. Public hosting and email-based account recovery are not configured. `pnpm test:auth` creates and removes an isolated test database to verify authentication, session revocation and project isolation without changing your projects.
