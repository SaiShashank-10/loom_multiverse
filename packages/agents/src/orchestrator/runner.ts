/**
 * @loom/agents — Orchestrator Runner V2
 *
 * Provides the public API for starting and resuming pipeline executions.
 *
 * V2 Changes:
 * - Supports interactive mode with human-in-the-loop callbacks
 * - Supports document uploads for RAG ingestion
 * - Sets global interactive callbacks for the graph nodes
 */

import { orchestratorGraph, setInteractiveCallbacks } from "./graph.js";
import { createLogger } from "@loom/shared/logger";
import { AgentError } from "@loom/shared/errors";
import type { OrchestratorStateType } from "./state.js";
import { MemorySaver } from "@langchain/langgraph";

const log = createLogger("orchestrator:runner");

// In-memory checkpointer (production: PostgreSQL)
const checkpointer = new MemorySaver();
const compiledGraph = orchestratorGraph.compile({ checkpointer });

export interface RunPipelineOptions {
  projectId: string;
  initialContext?: Record<string, unknown>;
  threadId?: string;
  onProgress?: (event: string, data: unknown) => void;
  /** File paths to ingest before starting the pipeline */
  documents?: string[];
  /** Whether to run in interactive mode (human-in-the-loop) */
  interactive?: boolean;
  /** Callback for sending messages to the user */
  onMessage?: (event: string, data: unknown) => void;
  /** Callback for receiving user input */
  waitForUserInput?: () => Promise<string>;
}

export class PipelineRunner {
  
  /**
   * Starts a new pipeline execution or resumes an existing one.
   * 
   * @param options Project ID, context, and interactive mode config
   * @returns The final state of the pipeline
   */
  static async run(options: RunPipelineOptions): Promise<OrchestratorStateType> {
    const threadId = options.threadId ?? `thread-${options.projectId}`;
    
    log.info({ 
      projectId: options.projectId, 
      threadId,
      interactive: options.interactive ?? false,
      documentCount: options.documents?.length ?? 0,
    }, "Starting pipeline execution V2");

    // Set interactive callbacks on the graph module
    setInteractiveCallbacks({
      onMessage: options.onMessage ?? options.onProgress,
      waitForUserInput: options.waitForUserInput,
      interactive: options.interactive ?? false,
    });

    try {
      const config = { configurable: { thread_id: threadId } };
      
      const initialState: Partial<OrchestratorStateType> = {
        projectId: options.projectId,
        context: options.initialContext ?? {},
        uploadedDocuments: options.documents ?? [],
      };

      // Stream mode for progress tracking
      if (options.onProgress || options.onMessage) {
        const progressFn = options.onMessage ?? options.onProgress!;
        progressFn("pipeline:started", { projectId: options.projectId });
        
        const stream = await compiledGraph.stream(initialState, config);
        
        let finalState: OrchestratorStateType | null = null;
        for await (const chunk of stream) {
          progressFn("pipeline:progress", chunk);
          finalState = Object.values(chunk)[0] as OrchestratorStateType;
        }
        
        progressFn("pipeline:completed", { finalPhase: finalState?.currentPhase });
        
        log.info({ 
          projectId: options.projectId, 
          finalPhase: finalState?.currentPhase,
          hasError: !!finalState?.error 
        }, "Pipeline execution completed");
        
        return finalState!;
      }

      // Direct invoke mode
      const finalState = await compiledGraph.invoke(initialState, config);
      
      log.info({ 
        projectId: options.projectId, 
        finalPhase: finalState.currentPhase,
        hasError: !!finalState.error 
      }, "Pipeline execution completed");
      
      return finalState;
      
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.error({ projectId: options.projectId, error: message }, "Pipeline execution failed catastrophically");
      
      throw new AgentError(
        `Pipeline execution failed: ${message}`,
        "orchestrator",
        undefined,
        { projectId: options.projectId }
      );
    }
  }
}
