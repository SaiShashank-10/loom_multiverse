---
name: agent-dev
description: Guide for developing new phase agents — base class extension, memory access, tool usage, and LLM interaction patterns.
---

# Agent Development Guide

## Overview
Each phase agent extends a base class and implements the `execute()` method. Agents access memory (pgvector), invoke MCP tools, and call LLMs.

## Base Agent Pattern
```typescript
// packages/agents/src/agents/base-agent.ts
export abstract class BaseAgent {
  protected logger;
  protected memory: VectorStore;
  protected llm: ChatAnthropic;

  abstract execute(input: PhaseInput): Promise<PhaseResult>;

  protected async remember(content: string, namespace: string): Promise<void>;
  protected async recall(query: string, namespace: string): Promise<Memory[]>;
  protected async writeADR(adr: ADRInput): Promise<void>;
  protected async useTool(serverName: string, toolName: string, args: unknown): Promise<unknown>;
}
```

## Creating a New Agent
1. Create file in `packages/agents/src/agents/<phase>.ts`
2. Extend `BaseAgent`
3. Implement `execute()` with proper input/output types
4. Register the agent in the orchestrator graph

## Memory Patterns
- **Store context**: `this.remember("Schema uses PostgreSQL with UUID PKs", "architecture")`
- **Recall context**: `this.recall("What database does this project use?", "architecture")`
- **Write ADR**: `this.writeADR({ title: "Chose PostgreSQL", decision: "...", rationale: "..." })`

## LLM Interaction
- Use structured output with Zod schemas for deterministic parsing
- Temperature: 0.1-0.3 for code generation, 0.5-0.7 for creative tasks
- Always include relevant memory in the system prompt

## Testing
- Mock the LLM calls with deterministic responses
- Test memory read/write operations
- Test MCP tool invocations
