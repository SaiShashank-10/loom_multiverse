/**
 * @loom/agents — Orchestrator Graph V2
 *
 * The LangGraph state machine definition for the entire pipeline.
 * Routes the project through the 6 core phases.
 *
 * V2 Changes:
 * - Added document_ingestion node for RAG processing
 * - Agents now receive interactive mode callbacks from state
 * - Approval gates are handled within each agent's InteractiveLoop
 */

import { StateGraph, END } from "@langchain/langgraph";
import { OrchestratorState, type OrchestratorStateType } from "./state.js";
import { agentRegistry } from "../agents/agent-registry.js";
import { DocumentProcessor } from "../rag/document-processor.js";
import { createLogger } from "@loom/shared/logger";

const log = createLogger("orchestrator:graph");

// ─────────────────────────────────────────────
// Interactive Mode Callbacks (set by Runner)
// ─────────────────────────────────────────────

// These are set by the PipelineRunner before graph execution.
// They allow agents to communicate with the user.
let _onMessage: ((event: string, data: unknown) => void) | undefined;
let _waitForUserInput: (() => Promise<string>) | undefined;
let _interactive = false;

export function setInteractiveCallbacks(callbacks: {
  onMessage?: (event: string, data: unknown) => void;
  waitForUserInput?: () => Promise<string>;
  interactive?: boolean;
}) {
  _onMessage = callbacks.onMessage;
  _waitForUserInput = callbacks.waitForUserInput;
  _interactive = callbacks.interactive ?? false;
}

// ─────────────────────────────────────────────
// Node: Document Ingestion
// ─────────────────────────────────────────────

async function documentIngestionNode(
  state: OrchestratorStateType,
): Promise<Partial<OrchestratorStateType>> {
  const documents = state.uploadedDocuments || [];
  
  if (documents.length === 0) {
    log.info("No documents to ingest, skipping to idea_check");
    return { currentPhase: "document_ingestion" };
  }

  log.info({ documentCount: documents.length }, "Ingesting uploaded documents");

  const processor = new DocumentProcessor();
  for (const docPath of documents) {
    try {
      const result = await processor.ingest(state.projectId, docPath);
      log.info({ fileName: result.fileName, chunks: result.totalChunks }, "Document ingested");
    } catch (error) {
      log.error({ docPath, error: String(error) }, "Failed to ingest document");
    }
  }

  return { currentPhase: "document_ingestion" };
}

// ─────────────────────────────────────────────
// Generic Phase Node Creator (V2)
// ─────────────────────────────────────────────

/**
 * Creates a generic node function for a specific phase.
 * V2: Now passes interactive mode callbacks to agents.
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
        onMessage: _onMessage,
        waitForUserInput: _waitForUserInput,
        interactive: _interactive,
      });

      if (!result.success) {
        log.warn({ phase, error: result.error }, "Phase failed");
        return {
          error: result.error ?? `Phase ${phase} failed without a specific error message.`,
        };
      }

      // Merge agent's output data and chat history into state
      const updates: Partial<OrchestratorStateType> = {
        currentPhase: phase,
        context: result.data ?? {},
      };

      // Store chat history if present
      if (result.chatHistory && result.chatHistory.length > 0) {
        updates.chatHistory = { [phase]: result.chatHistory };
      }

      // Mark phase as approved (if we got here without error, it's approved)
      updates.approvals = { [phase]: true };

      return updates;
      
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.error({ phase, error: message }, "Uncaught error in phase node");
      return { error: message };
    }
  };
}

// ─────────────────────────────────────────────
// Phase Nodes
// ─────────────────────────────────────────────

const ideaCheckNode = createPhaseNode("idea_check");
const planningNode = createPhaseNode("planning");
const codeGenNode = createPhaseNode("code_gen");

// ─────────────────────────────────────────────
// Routing Logic
// ─────────────────────────────────────────────

function routeAfterDocIngestion(state: OrchestratorStateType): string {
  if (state.error) return END;
  return "idea_check";
}

function routeAfterIdeaCheck(state: OrchestratorStateType): string {
  if (state.error) return END;
  return "planning";
}

function routeAfterPlanning(state: OrchestratorStateType): string {
  if (state.error) return END;
  return "code_gen";
}

function routeAfterCodeGen(state: OrchestratorStateType): string {
  if (state.error) return END;
  return END;
}

// ─────────────────────────────────────────────
// Graph Definition
// ─────────────────────────────────────────────

const workflow = new StateGraph(OrchestratorState)
  // Add Nodes
  .addNode("document_ingestion", documentIngestionNode)
  .addNode("idea_check", ideaCheckNode)
  .addNode("planning", planningNode)
  .addNode("code_gen", codeGenNode)
  
  // Add Edges
  .addEdge("__start__", "document_ingestion")
  .addConditionalEdges("document_ingestion", routeAfterDocIngestion)
  .addConditionalEdges("idea_check", routeAfterIdeaCheck)
  .addConditionalEdges("planning", routeAfterPlanning)
  .addConditionalEdges("code_gen", routeAfterCodeGen);

/**
 * The compiled LangGraph instance ready for execution.
 */
export const orchestratorGraph = workflow;
