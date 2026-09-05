/**
 * @loom/agents — Orchestrator State
 *
 * Defines the state machine shape for LangGraph.
 * This state is passed sequentially between nodes (agents).
 */

import { Annotation } from "@langchain/langgraph";
import type { ChatMessage } from "../agents/types.js";

/**
 * The unified state object that travels through the pipeline.
 * Using LangGraph Annotation defines how updates to the state are merged.
 */
export const OrchestratorState = Annotation.Root({
  /** The unique ID of the project being generated */
  projectId: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  
  /** Current phase of the pipeline */
  currentPhase: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "idea_check",
  }),
  
  /** 
   * A shared key-value store for arbitrary data passing between agents.
   * Updates are merged (shallow merge) rather than overwritten.
   */
  context: Annotation<Record<string, unknown>>({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({}),
  }),
  
  /** Whether the pipeline encountered a fatal error */
  error: Annotation<string | null>({
    reducer: (x, y) => y !== undefined ? y : x,
    default: () => null,
  }),

  /**
   * Chat history for human-in-the-loop interactions, keyed by phase.
   * E.g., { "idea_check": [...messages], "planning": [...messages] }
   */
  chatHistory: Annotation<Record<string, ChatMessage[]>>({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({}),
  }),

  /**
   * List of uploaded document file paths (for RAG ingestion).
   */
  uploadedDocuments: Annotation<string[]>({
    reducer: (x, y) => [...(x || []), ...(y || [])],
    default: () => [],
  }),

  /**
   * User approval status per phase.
   * E.g., { "idea_check": true, "planning": false }
   */
  approvals: Annotation<Record<string, boolean>>({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({}),
  }),
});

/**
 * Type alias for the inferred state type.
 */
export type OrchestratorStateType = typeof OrchestratorState.State;

