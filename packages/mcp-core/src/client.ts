/**
 * @loom/mcp-core — MCP Client
 *
 * Used by agents to discover and invoke tools on MCP servers.
 * Features:
 * - Connection management with auto-reconnection
 * - Tool discovery and invocation
 * - Request timeout handling
 * - Error wrapping into MCPError
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { createLogger } from "@loom/shared/logger";
import { MCPError } from "@loom/shared/errors";
import { createClientTransport } from "./transport.js";
import type {
  McpClientConfig,
  ConnectionState,
  ToolResult,
  ToolContent,
} from "./types.js";

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 3;

/**
 * MCP Client for connecting to and invoking tools on MCP servers.
 *
 * Agents use this client to:
 * 1. Connect to an MCP server (stdio or SSE)
 * 2. Discover available tools via `listTools()`
 * 3. Invoke tools via `callTool(name, args)`
 *
 * @example
 * ```typescript
 * const client = new McpClient({
 *   serverName: "github",
 *   transport: "stdio",
 *   command: "node",
 *   args: ["dist/github-server.js"],
 * });
 *
 * await client.connect();
 * const tools = await client.listTools();
 * const result = await client.callTool("create_issue", { title: "Bug fix" });
 * await client.disconnect();
 * ```
 */
export class McpClient {
  private client: Client;
  private config: Required<McpClientConfig>;
  private log;
  private _state: ConnectionState = "disconnected";

  constructor(config: McpClientConfig) {
    this.config = {
      serverName: config.serverName,
      transport: config.transport,
      serverUrl: config.serverUrl ?? "",
      command: config.command ?? "",
      args: config.args ?? [],
      timeoutMs: config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      maxRetries: config.maxRetries ?? DEFAULT_MAX_RETRIES,
    };

    this.log = createLogger(`mcp-client:${config.serverName}`);

    this.client = new Client({
      name: `loom-agent-${config.serverName}`,
      version: "1.0.0",
    });
  }

  /** Current connection state */
  get state(): ConnectionState {
    return this._state;
  }

  /** Whether the client is currently connected */
  get isConnected(): boolean {
    return this._state === "connected";
  }

  /**
   * Connect to the MCP server.
   * Retries up to `maxRetries` times on failure.
   */
  async connect(): Promise<void> {
    if (this._state === "connected") {
      this.log.warn("Already connected, skipping");
      return;
    }

    this._state = "connecting";
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        this.log.info(
          { attempt, maxRetries: this.config.maxRetries },
          "Connecting to MCP server",
        );

        const transport = createClientTransport(this.config);
        await this.client.connect(transport);

        this._state = "connected";
        this.log.info("Connected to MCP server");
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.log.warn(
          { attempt, error: lastError.message },
          "Connection attempt failed",
        );

        if (attempt < this.config.maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    this._state = "error";
    throw new MCPError(
      `Failed to connect to MCP server '${this.config.serverName}' after ${this.config.maxRetries} attempts: ${lastError?.message}`,
      this.config.serverName,
    );
  }

  /**
   * Disconnect from the MCP server.
   */
  async disconnect(): Promise<void> {
    if (this._state !== "connected") {
      return;
    }

    try {
      await this.client.close();
      this._state = "disconnected";
      this.log.info("Disconnected from MCP server");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.log.warn({ error: message }, "Error during disconnect");
      this._state = "disconnected";
    }
  }

  /**
   * List all tools available on the connected MCP server.
   *
   * @returns Array of tool definitions with name, description, and input schema
   */
  async listTools(): Promise<
    Array<{ name: string; description: string; inputSchema: unknown }>
  > {
    this.ensureConnected();

    try {
      const result = await this.withTimeout(this.client.listTools());

      return (result.tools ?? []).map((tool) => ({
        name: tool.name,
        description: tool.description ?? "",
        inputSchema: tool.inputSchema,
      }));
    } catch (error) {
      throw this.wrapError("listTools", error);
    }
  }

  /**
   * Invoke a tool on the connected MCP server.
   *
   * @param toolName - Name of the tool to invoke
   * @param args - Input arguments (will be validated by the server's Zod schema)
   * @returns The tool's result
   */
  async callTool(
    toolName: string,
    args: Record<string, unknown> = {},
  ): Promise<ToolResult> {
    this.ensureConnected();

    const startTime = Date.now();
    this.log.debug({ tool: toolName, args }, "Calling tool");

    try {
      const result = await this.withTimeout(
        this.client.callTool({ name: toolName, arguments: args }),
      );

      const duration = Date.now() - startTime;
      this.log.info({ tool: toolName, duration }, "Tool call completed");

      return {
        content: (result.content ?? []) as ToolContent[],
        isError: result.isError as boolean | undefined,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.log.error(
        { tool: toolName, duration, error: String(error) },
        "Tool call failed",
      );
      throw this.wrapError(`callTool:${toolName}`, error);
    }
  }

  /**
   * Call a tool and parse the first text content as JSON.
   * Convenience method for tools that return JSON responses.
   *
   * @param toolName - Name of the tool to invoke
   * @param args - Input arguments
   * @returns Parsed JSON response
   */
  async callToolJson<T = unknown>(
    toolName: string,
    args: Record<string, unknown> = {},
  ): Promise<T> {
    const result = await this.callTool(toolName, args);

    if (result.isError) {
      const errorText =
        result.content.find((c) => c.type === "text")?.text ?? "Unknown error";
      throw new MCPError(
        `Tool '${toolName}' returned error: ${errorText}`,
        this.config.serverName,
        { tool: toolName },
      );
    }

    const textContent = result.content.find((c) => c.type === "text");
    if (!textContent?.text) {
      throw new MCPError(
        `Tool '${toolName}' returned no text content`,
        this.config.serverName,
        { tool: toolName },
      );
    }

    try {
      return JSON.parse(textContent.text) as T;
    } catch {
      throw new MCPError(
        `Tool '${toolName}' returned invalid JSON: ${textContent.text.substring(0, 200)}`,
        this.config.serverName,
        { tool: toolName },
      );
    }
  }

  // ─────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────

  private ensureConnected(): void {
    if (this._state !== "connected") {
      throw new MCPError(
        `MCP client is not connected to '${this.config.serverName}' (state: ${this._state})`,
        this.config.serverName,
      );
    }
  }

  private async withTimeout<T>(promise: Promise<T>): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new MCPError(
                `Request to '${this.config.serverName}' timed out after ${this.config.timeoutMs}ms`,
                this.config.serverName,
              ),
            ),
          this.config.timeoutMs,
        ),
      ),
    ]);
  }

  private wrapError(operation: string, error: unknown): MCPError {
    if (error instanceof MCPError) {
      return error;
    }

    const message = error instanceof Error ? error.message : String(error);
    return new MCPError(
      `MCP ${operation} failed on '${this.config.serverName}': ${message}`,
      this.config.serverName,
      { operation },
    );
  }
}
