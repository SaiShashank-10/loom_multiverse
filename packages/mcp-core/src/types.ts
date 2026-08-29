/**
 * @loom/mcp-core — Shared MCP types
 *
 * Type definitions for the Model Context Protocol SDK.
 * Used by both MCP servers (tool providers) and MCP clients (agents).
 */

import type { z } from "zod";

// ─────────────────────────────────────────────
// Tool Definitions
// ─────────────────────────────────────────────

/** A tool exposed by an MCP server */
export interface ToolDefinition {
  /** Unique tool name (snake_case) */
  name: string;
  /** Human-readable description used by agents for tool selection */
  description: string;
  /** Zod schema defining the tool's input parameters */
  inputSchema: z.ZodType;
  /** The MCP server that hosts this tool */
  serverName: string;
}

/** Content types returned by MCP tools */
export type ToolContentType = "text" | "image" | "resource";

/** A single content item in a tool result */
export interface ToolContent {
  type: ToolContentType;
  text?: string;
  data?: string;
  mimeType?: string;
}

/** Result returned by an MCP tool invocation */
export interface ToolResult {
  content: ToolContent[];
  isError?: boolean;
}

// ─────────────────────────────────────────────
// Server Configuration
// ─────────────────────────────────────────────

/** Transport type for MCP server connections */
export type TransportType = "stdio" | "sse";

/** Configuration for an MCP server */
export interface McpServerConfig {
  /** Server name (must match the server's self-reported name) */
  name: string;
  /** Server version */
  version: string;
  /** Transport configuration */
  transport: TransportType;
}

/** Configuration for connecting to an MCP server as a client */
export interface McpClientConfig {
  /** Server name to connect to */
  serverName: string;
  /** Transport type */
  transport: TransportType;
  /** For SSE transport: the server URL */
  serverUrl?: string;
  /** For stdio transport: the command to spawn the server */
  command?: string;
  /** For stdio transport: arguments for the command */
  args?: string[];
  /** Request timeout in milliseconds */
  timeoutMs?: number;
  /** Maximum retry attempts for failed connections */
  maxRetries?: number;
}

// ─────────────────────────────────────────────
// Tool Handler Types
// ─────────────────────────────────────────────

/**
 * Handler function for an MCP tool.
 * Receives validated input and returns a ToolResult.
 */
export type ToolHandler<T = unknown> = (
  input: T,
) => Promise<ToolResult> | ToolResult;

/** Registration entry for a tool on an MCP server */
export interface ToolRegistration<T = unknown> {
  name: string;
  description: string;
  inputSchema: z.ZodType<T>;
  handler: ToolHandler<T>;
}

// ─────────────────────────────────────────────
// Connection State
// ─────────────────────────────────────────────

/** Connection state for an MCP client */
export type ConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

/** Event emitted by the MCP client */
export interface McpClientEvent {
  type: "connected" | "disconnected" | "error" | "tool_call" | "tool_result";
  serverName: string;
  timestamp: Date;
  data?: unknown;
  error?: Error;
}
