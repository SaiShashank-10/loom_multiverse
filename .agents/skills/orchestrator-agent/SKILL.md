---
name: orchestrator-agent
description: Guide for understanding and modifying the Orchestrator Agent — the central LangGraph state machine that coordinates all 6 phase agents.
---

# Orchestrator Agent Development Guide

## Overview
The Orchestrator is a LangGraph.js state machine that routes execution through the 6-phase pipeline. It manages project state, agent coordination, and dynamic pivoting.

## Architecture
```
Orchestrator (LangGraph)
├── State: ProjectState (typed, persistent)
├── Nodes:
│   ├── idea_check → Phase 1 Agent
│   ├── planning → Phase 2 Agent
│   ├── design → Phase 3 Agent
│   ├── build → Phase 4 Agent
│   ├── test → Phase 5 Agent
│   └── launch → Phase 6 Agent
├── Conditional Edges:
│   ├── should_pivot? → Idea Check (if Founder Feed detected conflict)
│   ├── needs_redesign? → Design (if QA found UX issues)
│   └── needs_rebuild? → Build (if QA found logic bugs)
└── Memory: VectorStore + Relational DB
```

## Key Files
- `packages/agents/src/orchestrator/index.ts` — Entry point
- `packages/agents/src/orchestrator/graph.ts` — LangGraph graph definition
- `packages/agents/src/orchestrator/state.ts` — Typed state schema

## State Schema
The state flows through the graph and is persisted between invocations:
```typescript
interface ProjectState {
  projectId: string;
  currentPhase: PhaseType;
  phaseResults: Record<PhaseType, PhaseResult>;
  founderPrompt: string;
  feedAlerts: FeedItem[];
  adrs: ADRRecord[];
  integrations: string[];
  error?: string;
}
```

## Adding a New Phase or Routing Condition
1. Define the condition function in `graph.ts`
2. Add the conditional edge using `graph.addConditionalEdges()`
3. Update the state type in `state.ts`
4. Write tests for the new routing path

## CTO Pushback Feature
The orchestrator checks the Founder Feed before proceeding from `idea_check` to `planning`. If a competitor launched something similar, it pauses and asks the founder.
