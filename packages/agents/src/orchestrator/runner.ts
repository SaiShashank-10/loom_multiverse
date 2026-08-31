/**
 * @loom/agents — Orchestrator Runner
 *
 * Provides the public API for starting and resuming pipeline executions.
 */

import { orchestratorGraph } from "./graph.js";
import { createLogger } from "@loom/shared/logger";
import { AgentError } from "@loom/shared/errors";
import type { OrchestratorStateType } from "./state.js";
import { MemorySaver } from "@langchain/langgraph";

const log = createLogger("orchestrator:runner");

// We use an in-memory checkpointer for now. 
// In a full production system, we'd persist this to PostgreSQL so long-running
// agent tasks survive server restarts.
const checkpointer = new MemorySaver();

// Update the graph to use the checkpointer
const compiledGraph = orchestratorGraph.compile({ checkpointer });

export interface RunPipelineOptions {
  projectId: string;
  initialContext?: Record<string, unknown>;
  threadId?: string;
  onProgress?: (event: string, data: any) => void;
}

export class PipelineRunner {
  
  /**
   * Starts a new pipeline execution or resumes an existing one.
   * 
   * @param options Project ID and context
   * @returns The final state of the pipeline
   */
  static async run(options: RunPipelineOptions): Promise<OrchestratorStateType> {
    const threadId = options.threadId ?? `thread-${options.projectId}`;
    
    log.info({ projectId: options.projectId, threadId }, "Starting pipeline execution");

    try {
      const config = { configurable: { thread_id: threadId } };
      
      const initialState = {
        projectId: options.projectId,
        context: options.initialContext ?? {},
      };

      // If we have an onProgress callback, we use streamEvents
      if (options.onProgress) {
        options.onProgress("pipeline:started", { projectId: options.projectId });
        
        const stream = await compiledGraph.stream(initialState, config);
        
        let finalState: OrchestratorStateType | null = null;
        for await (const chunk of stream) {
          options.onProgress("pipeline:progress", chunk);
          finalState = Object.values(chunk)[0] as OrchestratorStateType;
        }
        
        options.onProgress("pipeline:completed", { finalPhase: finalState?.currentPhase });
        
        log.info({ 
          projectId: options.projectId, 
          finalPhase: finalState?.currentPhase,
          hasError: !!finalState?.error 
        }, "Pipeline execution completed");
        
        return finalState!;
      }

      // Otherwise just invoke normally
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
