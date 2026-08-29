/**
 * @loom/agents — Idea Check Agent
 *
 * This agent analyzes the raw idea from the founder and ensures it's
 * viable for software generation. It extracts core structured data
 * and stores the initial context in the vector store.
 */

import { z } from "zod";
import { BaseAgent } from "../base-agent.js";
import { SYSTEM_PROMPT, TASK_PROMPT } from "./prompts.js";
import { extractAndParseJson } from "../../llm/json-parser.js";
import { AgentError } from "@loom/shared/errors";
import { embedText } from "../../llm/index.js";
import type { AgentInput, AgentResult } from "../types.js";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

// ─────────────────────────────────────────────
// Output Schema
// ─────────────────────────────────────────────

const IdeaCheckSchema = z.object({
  isValid: z.boolean().describe("True if the idea is clear enough to proceed, false if it's too vague."),
  rejectionReason: z.string().nullish().describe("If isValid is false, explain why and what the user should provide."),
  coreProblem: z.string().nullish().describe("The primary problem this software solves."),
  targetAudience: z.string().nullish().describe("The primary target audience or user base."),
  coreFeatures: z.array(z.string()).nullish().describe("List of 3-5 core actionable features."),
  techStackHints: z.array(z.string()).nullish().describe("Potential technology requirements (e.g., 'WebSockets', 'Stripe', 'PostGIS')."),
});



// ─────────────────────────────────────────────
// Agent Implementation
// ─────────────────────────────────────────────

export class IdeaCheckAgent extends BaseAgent {
  constructor() {
    super({
      name: "IdeaCheckAgent",
      phase: "idea_check",
      description: "Validates raw software ideas and extracts core features.",
    });
  }

  protected async execute(input: AgentInput, llm: BaseChatModel): Promise<AgentResult> {
    const rawIdea = input.payload.rawIdea as string;

    if (!rawIdea || typeof rawIdea !== "string") {
      throw new AgentError(
        "Missing or invalid 'rawIdea' in input payload",
        this.phase,
      );
    }

    this.log.info({ ideaLength: rawIdea.length }, "Analyzing raw idea");

    try {
      // 1. Ask the LLM to analyze the idea (using standard invoke to handle text padding)
      const messages = [
        new SystemMessage(SYSTEM_PROMPT),
        new HumanMessage(TASK_PROMPT.replace("{idea}", rawIdea)),
      ];

      // 1. Invoke LLM
      const response = await llm.invoke(messages);
      const content = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
      
      // Advanced Resilient Parsing: Extract JSON using shared robust utility
      const parsedJson = extractAndParseJson(content);

      if (!parsedJson) {
        throw new Error(`Failed to extract valid JSON from LLM response. Raw output: ${content}`);
      }

      // Validate with Zod
      const analysis = IdeaCheckSchema.parse(parsedJson);

      // 2. Handle rejection
      if (!analysis.isValid) {
        this.log.warn({ reason: analysis.rejectionReason }, "Idea rejected");
        return {
          success: false,
          error: analysis.rejectionReason ?? "The idea is too vague to proceed. Please provide more details.",
        };
      }

      // 3. Store the extracted information in the Vector Store for future context
      const serializedData = JSON.stringify(analysis, null, 2);
      const embedding = await embedText(serializedData);
      
      await this.vectorStore.store({
        projectId: input.projectId,
        namespace: "idea_check_summary",
        content: serializedData,
        embedding,
        agentRole: this.name,
        phase: this.phase,
        metadata: { timestamp: new Date().toISOString() },
      });
      this.log.debug("Saved idea analysis to vector store");

      // 4. Return the structured data to be merged into Orchestrator State
      return {
        success: true,
        data: {
          validatedIdea: analysis,
        },
      };

    } catch (error) {
      console.error("FULL ERROR:", error);
      const message = error instanceof Error ? error.message : String(error);
      this.log.error({ error: message }, "LLM parsing failed");
      throw new AgentError(`Failed to analyze idea: ${message}`, this.phase);
    }
  }
}

// Auto-instantiate to register with the AgentRegistry
new IdeaCheckAgent();
