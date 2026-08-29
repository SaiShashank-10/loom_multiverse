/**
 * @loom/agents — Orchestrator Graph
 *
 * The LangGraph state machine definition for the entire pipeline.
 * Routes the project through the 6 core phases.
 */

import { StateGraph, END } from "@langchain/langgraph";
import { OrchestratorState, type OrchestratorStateType } from "./state.js";
import { agentRegistry } from "../agents/agent-registry.js";
import { createLogger } from "@loom/shared/logger";

const log = createLogger("orchestrator:graph");

/**
 * Creates a generic node function for a specific phase.
 * It looks up the agent from the registry, runs it, and updates the state.
 */
function createPhaseNode(phase: string) {
  return async (state: OrchestratorStateType): Promise<Partial<OrchestratorStateType>> => {
    log.info({ projectId: state.projectId, phase }, "Executing graph node");
    
    try {
      const agent = agentRegistry.get(phase);
      
      const result = await agent.run({
        projectId: state.projectId,
        phase,
        payload: state.context,
      });

      if (!result.success) {
        log.warn({ phase, error: result.error }, "Phase failed");
        return {
          error: result.error ?? `Phase ${phase} failed without a specific error message.`,
        };
      }

      // Merge agent's output data into the global context
      return {
        currentPhase: phase,
        context: result.data ?? {},
      };
      
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.error({ phase, error: message }, "Uncaught error in phase node");
      return { error: message };
    }
  };
}

/**
 * Node: Idea Check Phase
 * Validates the founder's raw idea.
 */
const ideaCheckNode = createPhaseNode("idea_check");

/**
 * Node: Planning Phase
 * Generates the technical implementation plan.
 */
const planningNode = createPhaseNode("planning");

/**
 * Routing logic after Idea Check.
 * If there's an error (idea rejected), we stop. Otherwise, proceed to planning.
 */
function routeAfterIdeaCheck(state: OrchestratorStateType): string {
  if (state.error) return END;
  return "planning";
}

/**
 * Routing logic after Planning.
 * For Phase B, we end here. (Phase C will add Design and Build).
 */
function routeAfterPlanning(state: OrchestratorStateType): string {
  if (state.error) return END;
  // TODO (Phase C): return "design"
  return END;
}

// ─────────────────────────────────────────────
// Graph Definition
// ─────────────────────────────────────────────

const workflow = new StateGraph(OrchestratorState)
  // Add Nodes
  .addNode("idea_check", ideaCheckNode)
  .addNode("planning", planningNode)
  
  // Add Edges
  .addEdge("__start__", "idea_check")
  .addConditionalEdges("idea_check", routeAfterIdeaCheck)
  .addConditionalEdges("planning", routeAfterPlanning);

/**
 * The compiled LangGraph instance ready for execution.
 */
export const orchestratorGraph = workflow;
