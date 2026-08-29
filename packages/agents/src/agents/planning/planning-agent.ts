/**
 * @loom/agents — Planning Agent
 * 
 * Phase 2 of the AI Pipeline.
 * Takes the validated idea context from the vector memory and generates
 * a detailed technical architecture and implementation plan.
 */

import { z } from "zod";
import { BaseAgent } from "../base-agent.js";
import { SYSTEM_PROMPT, TASK_PROMPT } from "./prompts.js";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { AgentError } from "@loom/shared/errors";
import { extractAndParseJson } from "../../llm/json-parser.js";
import { embedText, createTier1LLM } from "../../llm/index.js";
import type { AgentInput, AgentResult } from "../types.js";

// ─────────────────────────────────────────────
// Zod Schemas
// ─────────────────────────────────────────────

const ColumnSchema = z.object({
  name: z.string(),
  type: z.string(),
  description: z.string().optional().default("")
});

const TableSchema = z.object({
  tableName: z.string(),
  columns: z.array(ColumnSchema).default([]),
  description: z.string().optional().default("")
});

const ApiEndpointSchema = z.union([
  z.object({
    method: z.string().default("GET"),
    path: z.string().default(""),
    description: z.string().optional().default("")
  }),
  z.string().transform(str => ({ method: "GET", path: str, description: "" }))
]);

const PhaseSchema = z.union([
  z.object({
    phaseName: z.string().optional(),
    name: z.string().optional(),
    title: z.string().optional(),
    tasks: z.array(z.string()).default([])
  }).transform(val => ({
    phaseName: val.phaseName || val.name || val.title || "Unnamed Phase",
    tasks: val.tasks
  })),
  z.string().transform(str => ({
    phaseName: str,
    tasks: []
  }))
]);

export const PlanningSchema = z.object({
  techStack: z.object({
    frontend: z.array(z.string()).default([]),
    backend: z.array(z.string()).default([]),
    database: z.array(z.string()).default([]),
    infrastructure: z.array(z.string()).default([])
  }).default({ frontend: [], backend: [], database: [], infrastructure: [] }),
  databaseSchema: z.array(TableSchema).default([]),
  apiEndpoints: z.array(ApiEndpointSchema).default([]),
  phases: z.array(PhaseSchema).default([]),
  potentialChallenges: z.array(z.string()).default([])
});

// ─────────────────────────────────────────────
// Agent Implementation
// ─────────────────────────────────────────────

export class PlanningAgent extends BaseAgent {
  constructor() {
    super({
      name: "PlanningAgent",
      description: "Generates the technical implementation plan from a validated idea.",
      phase: "planning"
    });
  }

  protected async execute(input: AgentInput, _llm: any): Promise<AgentResult> {
    try {
      this.log.info("Retrieving idea context from orchestrator payload...");
      
      const ideaContext = input.payload?.validatedIdea as Record<string, any>;
      
      if (!ideaContext) {
        throw new AgentError("No idea context found in payload. Please run Idea Check first.", "CONTEXT_MISSING", "planning_agent");
      }

      this.log.info({ ideaContext }, "Retrieved context. Generating architecture plan...");

      // 2. Format Prompt
      const formattedTaskPrompt = TASK_PROMPT
        .replace("{coreProblem}", ideaContext.coreProblem || "Unknown")
        .replace("{targetAudience}", ideaContext.targetAudience || "Unknown")
        .replace("{coreFeatures}", (ideaContext.coreFeatures || []).map((f: string) => `- ${f}`).join("\n"))
        .replace("{techStackHints}", (ideaContext.techStackHints || []).map((t: string) => `- ${t}`).join("\n"));

      const messages = [
        new SystemMessage(SYSTEM_PROMPT),
        new HumanMessage(formattedTaskPrompt),
      ];

      // 3. Invoke LLM (force JSON format and higher token limit)
      const planningLlm = createTier1LLM({ maxTokens: 8192, format: "json" });
      const response = await planningLlm.invoke(messages);
      const content = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
      
      // 4. Parse & Validate
      const parsedJson = extractAndParseJson(content);
      const plan = PlanningSchema.parse(parsedJson);

      this.log.info("Technical Architecture Plan generated successfully.");

      // 5. Store the final plan in vector memory for the next agents
      const planString = JSON.stringify(plan, null, 2);
      const planEmbedding = await embedText(planString);
      
      await this.vectorStore.store({
        projectId: input.projectId,
        namespace: "technical_plan",
        content: planString,
        embedding: planEmbedding,
        agentRole: this.name,
        phase: this.phase,
        metadata: { timestamp: new Date().toISOString() },
      });

      return {
        success: true,
        data: {
          technicalPlan: plan
        }
      };

    } catch (error: any) {
      this.log.error({ error: error.message }, "Planning phase failed");
      throw new AgentError(`Failed to generate plan: ${error.message}`, "PLANNING_FAILURE", "planning_agent", error);
    }
  }
}

// Auto-instantiate to register with the AgentRegistry
new PlanningAgent();
