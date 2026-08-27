---
name: mcp-server-dev
description: Guide for developing new MCP (Model Context Protocol) servers — templates, tool registration, testing patterns.
---

# MCP Server Development Guide

## Overview
MCP servers expose tools that agents can invoke. Each server wraps a third-party service (Stripe, Resend, etc.) and makes it available to the agent pipeline.

## Directory
All MCP servers live in `packages/mcp-servers/src/<service-name>/`

## Creating a New MCP Server

### 1. Create the server file
```typescript
// packages/mcp-servers/src/<service>/index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function create<Service>Server() {
  const server = new McpServer({
    name: "<service>",
    version: "1.0.0",
  });

  server.tool("tool_name", "Description", {
    param: z.string().describe("Parameter description"),
  }, async ({ param }) => {
    // Implementation
    return { content: [{ type: "text", text: "result" }] };
  });

  return server;
}
```

### 2. Register tools
Each tool needs:
- A unique name (snake_case)
- A description (used by agents for tool selection)
- A Zod input schema
- An async handler function

### 3. Export from barrel
Add your server to `packages/mcp-servers/src/index.ts`

### 4. Testing
Create unit tests in `packages/mcp-servers/src/<service>/__tests__/`
Mock the external API calls.

## Existing Servers
- `stripe/` — Products, subscriptions, checkout sessions
- `resend/` — Transactional emails, templates
- `posthog/` — Event tracking, feature flags
- `e2b/` — Sandbox creation, code execution
- `vercel/` — Deployment, env vars, domains
- `github/` — Repos, PRs, issues
- `linear/` — Issues, projects, cycles
