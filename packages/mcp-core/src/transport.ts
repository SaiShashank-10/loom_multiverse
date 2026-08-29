/**
 * @loom/mcp-core — Transport Layer
 *
 * Abstraction over MCP transport mechanisms.
 * Supports stdio (local process) and SSE (remote HTTP) transports.
 */

import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createLogger } from "@loom/shared/logger";
import type { McpClientConfig, TransportType } from "./types.js";

const log = createLogger("mcp-transport");

/**
 * Creates a client transport based on configuration.
 *
 * - **stdio**: Spawns a child process and communicates over stdin/stdout.
 *   Used for local MCP servers running as CLI processes.
 * - **sse**: Connects to a remote MCP server via Server-Sent Events.
 *   Used for remote/cloud MCP servers.
 *
 * @param config - Client connection configuration
 * @returns A transport instance ready for the MCP client
 */
export function createClientTransport(config: McpClientConfig) {
  log.debug({ serverName: config.serverName, transport: config.transport }, "Creating client transport");

  switch (config.transport) {
    case "stdio": {
      if (!config.command) {
        throw new Error(`stdio transport requires a 'command' in config for server '${config.serverName}'`);
      }
      return new StdioClientTransport({
        command: config.command,
        args: config.args ?? [],
      });
    }

    case "sse": {
      if (!config.serverUrl) {
        throw new Error(`SSE transport requires a 'serverUrl' in config for server '${config.serverName}'`);
      }
      return new SSEClientTransport(new URL(config.serverUrl));
    }

    default: {
      const exhaustive: never = config.transport;
      throw new Error(`Unknown transport type: ${exhaustive}`);
    }
  }
}

/**
 * Creates a server transport for stdio-based MCP servers.
 * This is the standard transport for locally-running MCP servers.
 *
 * @returns A StdioServerTransport instance
 */
export function createServerTransport() {
  log.debug("Creating stdio server transport");
  return new StdioServerTransport();
}

/**
 * Type guard to validate transport type strings.
 */
export function isValidTransport(value: string): value is TransportType {
  return value === "stdio" || value === "sse";
}
