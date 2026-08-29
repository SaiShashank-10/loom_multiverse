/**
 * @loom/agents — Base Agent Types
 *
 * Core types used by all phase agents in the Loom Multiverse.
 */

import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

/**
 * Standard input payload provided to every agent when it runs.
 */
export interface AgentInput {
  /** Unique ID of the project being worked on */
  projectId: string;
  /** Phase name (e.g., "idea_check", "planning") */
  phase: string;
  /** The payload specific to this phase */
  payload: Record<string, unknown>;
  /** Optional override for the LLM to use */
  llm?: BaseChatModel;
}

/**
 * Standard configuration for an agent subclass.
 */
export interface AgentConfig {
  /** Name of the agent (e.g., "IdeaCheckAgent") */
  name: string;
  /** Description of what the agent does */
  description: string;
  /** Which phase this agent handles */
  phase: string;
}

/**
 * Result returned by an agent after processing.
 */
export interface AgentResult {
  /** Whether the agent succeeded */
  success: boolean;
  /** Optional error message if it failed */
  error?: string;
  /** The structured output data */
  data?: Record<string, unknown>;
}
