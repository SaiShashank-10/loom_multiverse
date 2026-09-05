/**
 * @loom/agents — Base Agent Types
 *
 * Core types used by all phase agents in the Loom Multiverse.
 */

import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

// ─────────────────────────────────────────────
// Chat / Interactive Types
// ─────────────────────────────────────────────

/** A single message in the agent-user conversation */
export interface ChatMessage {
  /** Who sent this message */
  role: "agent" | "user" | "system";
  /** The message content */
  content: string;
  /** ISO timestamp */
  timestamp: string;
  /** Optional structured data attached to the message */
  metadata?: Record<string, unknown>;
}

// ─────────────────────────────────────────────
// Agent Input / Output
// ─────────────────────────────────────────────

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
  /** Callback for sending messages to the user (WebSocket/CLI) */
  onMessage?: (event: string, data: unknown) => void;
  /** Callback for receiving user input (WebSocket/CLI) */
  waitForUserInput?: () => Promise<string>;
  /** Whether to run in interactive mode (with user approval loops) */
  interactive?: boolean;
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
  /** Chat history from interactive sessions */
  chatHistory?: ChatMessage[];
}

