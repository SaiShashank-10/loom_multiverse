/**
 * @loom/mcp-core — MCP Server Builder
 *
 * Wraps the official @modelcontextprotocol/sdk with Loom-specific conventions:
 * - Type-safe tool registration with Zod schemas
 * - Structured error handling via MCPError
 * - Built-in health check tool on every server
 * - Structured logging via Pino
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createLogger } from "@loom/shared/logger";
import { MCPError } from "@loom/shared/errors";
import { createServerTransport } from "./transport.js";
import type { ToolRegistration, ToolResult } from "./types.js";

/**
 * Creates a Loom MCP Server with standard conventions.
 *
 * Every server automatically gets:
 * - A `health_check` tool for connectivity testing
 * - Structured logging under `mcp-server:<name>`
 * - Error wrapping into MCPError
 *
 * @param name - Server name (e.g., "stripe", "github")
 * @param version - Server version (semver)
 * @returns An object with the server, tool registration helpers, and start method
 *
 * @example
 * ```typescript
 * const { server, registerTool, start } = createMcpServer("stripe", "1.0.0");
 *
 * registerTool({
 *   name: "create_checkout",
 *   description: "Create a Stripe checkout session",
 *   inputSchema: z.object({ priceId: z.string() }),
 *   handler: async ({ priceId }) => {
 *     const session = await stripe.checkout.sessions.create({ ... });
 *     return { content: [{ type: "text", text: JSON.stringify(session) }] };
 *   },
 * });
 *
 * await start();
 * ```
 */
export function createMcpServer(name: string, version: string) {
  const log = createLogger(`mcp-server:${name}`);

  const server = new McpServer({
    name,
    version,
  });

  /** Track registered tools for introspection */
  const registeredTools: Map<string, { description: string }> = new Map();

  // ─────────────────────────────────────────
  // Auto-register health check tool
  // ─────────────────────────────────────────
  server.tool(
    "health_check",
    `Check if the ${name} MCP server is healthy and responsive`,
    {},
    async () => {
      log.debug("Health check called");
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              server: name,
              version,
              status: "healthy",
              tools: Array.from(registeredTools.keys()),
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    },
  );

  registeredTools.set("health_check", {
    description: `Check if the ${name} MCP server is healthy`,
  });

  /**
   * Register a tool on this MCP server.
   *
   * Tools are the primary way agents interact with external services.
   * Each tool has a Zod schema for input validation and a handler function.
   *
   * @param registration - Tool name, description, schema, and handler
   */
  function registerTool<T>(registration: ToolRegistration<T>): void {
    const { name: toolName, description, inputSchema, handler } = registration;

    log.info({ tool: toolName }, "Registering tool");

    // Convert Zod schema to JSON Schema shape for MCP SDK
    const shape =
      inputSchema instanceof z.ZodObject
        ? (inputSchema as z.ZodObject<z.ZodRawShape>).shape
        : {};

    server.tool(toolName, description, shape, async (input) => {
      const startTime = Date.now();

      try {
        // Validate input through Zod
        const validated = inputSchema.parse(input) as T;

        log.debug({ tool: toolName, input: validated }, "Tool invoked");

        // Execute handler and convert our ToolResult to SDK format
        const result = await handler(validated);

        const duration = Date.now() - startTime;
        log.info({ tool: toolName, duration }, "Tool completed");

        // Map our ToolContent to the SDK's expected format
        return {
          content: result.content.map((c) => {
            if (c.type === "text") {
              return { type: "text" as const, text: c.text ?? "" };
            }
            if (c.type === "image") {
              return {
                type: "image" as const,
                data: c.data ?? "",
                mimeType: c.mimeType ?? "image/png",
              };
            }
            // resource fallback → text
            return { type: "text" as const, text: c.text ?? "" };
          }),
          isError: result.isError,
        };
      } catch (error) {
        const duration = Date.now() - startTime;
        const message =
          error instanceof Error ? error.message : "Unknown error";

        log.error({ tool: toolName, error: message, duration }, "Tool failed");

        // Wrap in MCPError for consistent error handling
        if (!(error instanceof MCPError)) {
          throw new MCPError(
            `Tool '${toolName}' failed: ${message}`,
            name,
            { tool: toolName, originalError: message },
          );
        }

        throw error;
      }
    });

    registeredTools.set(toolName, { description });
  }

  /**
   * Start the MCP server using stdio transport.
   * This is the standard way to run an MCP server as a local process.
   */
  async function start(): Promise<void> {
    const transport = createServerTransport();

    log.info(
      { server: name, version, tools: registeredTools.size },
      "Starting MCP server",
    );

    await server.connect(transport);

    log.info("MCP server connected and ready");
  }

  /**
   * Get a list of all registered tool names.
   */
  function getRegisteredTools(): string[] {
    return Array.from(registeredTools.keys());
  }

  return {
    /** The underlying McpServer instance */
    server,
    /** Register a new tool on this server */
    registerTool,
    /** Start the server with stdio transport */
    start,
    /** List all registered tool names */
    getRegisteredTools,
  };
}

// ─────────────────────────────────────────
// Helper: Create a successful text result
// ─────────────────────────────────────────

/**
 * Creates a standard text-based tool result.
 * Convenience helper for tool handlers.
 *
 * @param text - The text content to return
 * @returns A properly formatted ToolResult
 */
export function textResult(text: string): ToolResult {
  return {
    content: [{ type: "text", text }],
  };
}

/**
 * Creates a JSON tool result by serializing an object.
 *
 * @param data - The object to serialize
 * @returns A properly formatted ToolResult with JSON text
 */
export function jsonResult(data: unknown): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

/**
 * Creates an error tool result.
 *
 * @param message - Error message
 * @returns A ToolResult marked as an error
 */
export function errorResult(message: string): ToolResult {
  return {
    content: [{ type: "text", text: `Error: ${message}` }],
    isError: true,
  };
}
