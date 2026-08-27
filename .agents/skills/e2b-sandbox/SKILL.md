---
name: e2b-sandbox
description: Guide for working with E2B sandboxes — creation, code execution, file I/O, and security considerations.
---

# E2B Sandbox Guide

## Overview
E2B provides Firecracker microVM sandboxes for securely executing AI-generated code. The Build Agent uses E2B to run code without exposing the main server.

## Usage Pattern
```typescript
import { Sandbox } from "@e2b/code-interpreter";

const sandbox = await Sandbox.create({ apiKey: E2B_API_KEY });

// Execute code
const result = await sandbox.runCode("print('Hello, World!')");

// File operations
await sandbox.files.write("/app/main.py", code);
const content = await sandbox.files.read("/app/output.txt");

// Terminal commands
const output = await sandbox.commands.run("npm install express");

// Cleanup
await sandbox.kill();
```

## Security
- Each sandbox runs in an isolated Firecracker microVM with its own kernel
- Sandboxes are ephemeral — destroyed after use
- Network access can be restricted
- Resource limits (CPU, memory) are configurable
- Never expose sandbox internals to external users

## MCP Server
The E2B MCP server is at `packages/mcp-servers/src/e2b/index.ts`
It exposes tools: `create_sandbox`, `run_code`, `write_file`, `read_file`, `run_command`, `kill_sandbox`

## Environment
Requires `E2B_API_KEY` environment variable.
Free tier: 100 sandbox hours/month.
