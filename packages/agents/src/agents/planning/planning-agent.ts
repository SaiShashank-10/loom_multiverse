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
// Zod Schemas (V2 Industry-Grade)
// ─────────────────────────────────────────────

export const PlanningResultSchema = z.object({
  projectName: z.string().catch("Unnamed Project"),
  architecture: z.object({
    type: z.enum(["monolith", "microservices", "serverless", "jamstack"]).catch("monolith"),
    diagramMermaid: z.string().catch(""),
    services: z.array(z.object({
      name: z.string().catch("Unknown Service"),
      responsibility: z.string().catch(""),
      techStack: z.array(z.string()).catch([])
    })).catch([])
  }).catch({ type: "monolith", diagramMermaid: "", services: [] }),
  techStack: z.object({
    frontend: z.array(z.string()).catch([]),
    backend: z.array(z.string()).catch([]),
    database: z.array(z.string()).catch([]),
    infrastructure: z.array(z.string()).catch([])
  }).catch({ frontend: [], backend: [], database: [], infrastructure: [] }),
  databaseSchema: z.object({
    diagramMermaid: z.string().catch(""),
    tables: z.array(z.object({
      tableName: z.string().catch("Unknown Table"),
      columns: z.array(z.object({
        name: z.string().catch(""),
        type: z.string().catch(""),
        description: z.string().catch("")
      })).catch([]),
      description: z.string().catch("")
    })).catch([])
  }).catch({ diagramMermaid: "", tables: [] }),
  apiEndpoints: z.array(z.object({
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).catch("GET"),
    path: z.string().catch(""),
    description: z.string().catch(""),
    auth: z.boolean().catch(false)
  })).catch([]),
  nonFunctionalRequirements: z.array(z.object({
    category: z.string().catch(""),
    requirements: z.array(z.string()).catch([])
  })).catch([]),
  developmentPhases: z.array(z.object({
    phaseName: z.string().catch(""),
    tasks: z.array(z.string()).catch([])
  })).catch([]),
  potentialChallenges: z.array(z.string()).catch([])
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
      
      this.log.info({ content }, "Raw LLM output");
      
      // 4. Parse & Validate JSON and Mermaid blocks
      const parsedJson = extractAndParseJson(content) as any;
      
      // Extract Mermaid diagrams using regex
      const mermaidBlocks = [...content.matchAll(/```mermaid\s*([\s\S]*?)\s*```/g)];
      
      if (!parsedJson.architecture) parsedJson.architecture = {};
      parsedJson.architecture.diagramMermaid = mermaidBlocks[0] ? mermaidBlocks[0][1] : "";
      
      if (!parsedJson.databaseSchema) parsedJson.databaseSchema = {};
      parsedJson.databaseSchema.diagramMermaid = mermaidBlocks[1] ? mermaidBlocks[1][1] : "";

      const plan = PlanningResultSchema.parse(parsedJson);

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
