/**
 * @loom/agents — Base Agent
 *
 * Abstract base class for all Loom Multiverse phase agents.
 * Provides standard capabilities:
 * - Structured logging
 * - LLM tier selection
 * - Vector memory access (pgvector)
 * - MCP tool execution
 */

import { createLogger } from "@loom/shared/logger";
import { AgentError } from "@loom/shared/errors";
import { McpClient } from "@loom/mcp-core";
import { createDatabaseClient, VectorStore } from "@loom/database";
import { config } from "@loom/shared/config";
import { createTier1LLM } from "../llm/index.js";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { AgentInput, AgentConfig, AgentResult } from "./types.js";
import type { IAgent } from "./agent-registry.js";
import { agentRegistry } from "./agent-registry.js";
import type { Logger } from "pino";

// Shared connection pool for all agents
const db = createDatabaseClient(config.DATABASE_URL);

export abstract class BaseAgent implements IAgent {
  public readonly name: string;
  public readonly phase: string;
  protected readonly description: string;
  protected log: Logger;
  protected vectorStore: VectorStore;

  constructor(config: AgentConfig) {
    this.name = config.name;
    this.phase = config.phase;
    this.description = config.description;
    
    // Each agent gets a dedicated logger namespace (e.g. agent:idea-check)
    this.log = createLogger(`agent:${this.phase}`);
    
    // Initialize standard pgvector store interface
    this.vectorStore = new VectorStore(db);

    // Auto-register with the singleton registry
    agentRegistry.register(this);
  }

  /**
   * The core execution method that every agent must implement.
   * This is where the specific phase logic lives.
   */
  protected abstract execute(input: AgentInput, llm: BaseChatModel): Promise<AgentResult>;

  /**
   * Public entry point for running the agent.
   * Handles setup, standard LLM provisioning, and error wrapping.
   */
  public async run(input: AgentInput): Promise<AgentResult> {
    this.log.info({ projectId: input.projectId }, `Starting phase: ${this.phase}`);
    const startTime = Date.now();

    try {
      // Use provided LLM (for testing) or default to Tier 1 (due to VRAM constraint)
      const llm = input.llm ?? createTier1LLM();
      
      // Execute the concrete agent's logic
      const result = await this.execute(input, llm);
      
      const duration = Date.now() - startTime;
      this.log.info({ duration, success: result.success }, `Finished phase: ${this.phase}`);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : String(error);
      
      this.log.error({ duration, error: message }, `Failed phase: ${this.phase}`);
      
      if (error instanceof AgentError) {
        throw error;
      }
      
      throw new AgentError(
        `Agent ${this.name} failed during phase ${this.phase}: ${message}`,
        this.phase,
        undefined,
        { originalError: message }
      );
    }
  }

  /**
   * Utility: Connect to an MCP server, list its tools, and return the client.
   * Agents use this when they need to call tools like `execute_code` or `github_pr`.
   */
  protected async connectMcp(serverName: string, command: string, args: string[] = []): Promise<McpClient> {
    this.log.debug({ serverName }, "Connecting to MCP server");
    
    const client = new McpClient({
      serverName,
      transport: "stdio",
      command,
      args,
    });

    await client.connect();
    return client;
  }
}
