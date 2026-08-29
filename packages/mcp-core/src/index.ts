/**
 * @loom/mcp-core — Model Context Protocol SDK
 *
 * This package provides the foundation for building and consuming
 * MCP servers in the Loom Multiverse platform.
 *
 * - **Server**: Use `createMcpServer()` to build tool-providing servers
 * - **Client**: Use `McpClient` to connect to and invoke tools on servers
 * - **Transport**: Supports stdio (local) and SSE (remote) connections
 * - **Types**: Shared type definitions for tools, results, and configs
 */

// Server
export { createMcpServer, textResult, jsonResult, errorResult } from "./server.js";

// Client
export { McpClient } from "./client.js";

// Transport
export { createClientTransport, createServerTransport, isValidTransport } from "./transport.js";

// Types
export type {
  ToolDefinition,
  ToolContent,
  ToolContentType,
  ToolResult,
  ToolHandler,
  ToolRegistration,
  McpServerConfig,
  McpClientConfig,
  TransportType,
  ConnectionState,
  McpClientEvent,
} from "./types.js";
