/**
 * @loom/agents — Idea Check Agent V2
 *
 * Phase 1 of the AI Pipeline — UPGRADED.
 *
 * This agent analyzes the raw idea from the founder (and/or uploaded documents)
 * and runs an interactive conversation loop until both the agent and user
 * agree the idea is viable and ready for technical planning.
 *
 * New capabilities:
 * - RAG document ingestion (PDF, DOCX, PPTX, TXT, MD)
 * - Interactive human-in-the-loop chat loop
 * - Structured output with confidence scoring
 * - Approval gates before proceeding
 */

import { z } from "zod";
import { BaseAgent } from "../base-agent.js";
import {
  ANALYSIS_SYSTEM_PROMPT,
  TASK_PROMPT,
  TASK_PROMPT_WITH_DOCUMENTS,
  INTERACTIVE_SYSTEM_PROMPT,
} from "./prompts.js";
import { extractAndParseJson } from "../../llm/json-parser.js";
import { AgentError } from "@loom/shared/errors";
import { embedText } from "../../llm/index.js";
import { DocumentProcessor } from "../../rag/document-processor.js";
import { RagRetriever } from "../../rag/rag-retriever.js";
import { InteractiveLoop } from "../../orchestrator/interactive-loop.js";
import type { AgentInput, AgentResult } from "../types.js";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

// ─────────────────────────────────────────────
// Output Schema (V2 — Enhanced)
// ─────────────────────────────────────────────

const IdeaCheckSchema = z.object({
  isValid: z.boolean().describe("True if the idea is clear enough to proceed."),
  confidenceScore: z.number().min(0).max(100).optional().describe("Confidence score 0-100."),
  rejectionReason: z.string().nullish().describe("If isValid is false, explain why."),
  recommendations: z.array(z.string()).nullish().describe("Recommended changes if not viable."),
  coreProblem: z.string().nullish().describe("The primary problem this software solves."),
  targetAudience: z.string().nullish().describe("The primary target audience."),
  coreFeatures: z.array(z.string()).nullish().describe("List of 3-7 core features."),
  techStackHints: z.array(z.string()).nullish().describe("Technology requirements."),
  questions: z.array(z.string()).nullish().describe("Questions to ask the user for clarification."),
  projectScope: z.string().nullish().describe("Brief project scope description."),
  constraints: z.array(z.string()).nullish().describe("Any constraints or limitations."),
  priorityFeatures: z.array(z.string()).nullish().describe("High-priority features."),
});

type IdeaCheckResult = z.infer<typeof IdeaCheckSchema>;

// ─────────────────────────────────────────────
// Agent Implementation
// ─────────────────────────────────────────────

export class IdeaCheckAgent extends BaseAgent {
  constructor() {
    super({
      name: "IdeaCheckAgent",
      phase: "idea_check",
      description: "Validates and refines raw software ideas through interactive conversation and RAG document analysis.",
    });
  }

  protected async execute(input: AgentInput, llm: BaseChatModel): Promise<AgentResult> {
    const rawIdea = (input.payload.rawIdea as string) || "";
    const documentPaths = (input.payload.documents as string[]) || [];
    const isInteractive = input.interactive ?? true; // Default to interactive mode

    if (!rawIdea && documentPaths.length === 0) {
      throw new AgentError(
        "Missing input: Please provide either a raw idea text or upload project documents.",
        this.phase,
      );
    }

    this.log.info(
      { ideaLength: rawIdea.length, documentCount: documentPaths.length, interactive: isInteractive },
      "Starting Idea Check V2",
    );

    // ─── Step 1: Ingest Documents (if provided) ───
    let documentContext = "";
    if (documentPaths.length > 0) {
      documentContext = await this.ingestDocuments(input.projectId, documentPaths);
    }

    // ─── Step 2: Perform Initial Analysis ───
    const analysis = await this.performInitialAnalysis(
      rawIdea,
      documentContext,
      input.projectId,
      llm,
    );

    this.log.info(
      { isValid: analysis.isValid, confidence: analysis.confidenceScore },
      "Initial analysis complete",
    );

    // ─── Step 3: Interactive Loop (if enabled) ───
    if (isInteractive && input.waitForUserInput) {
      return this.runInteractiveMode(
        input,
        llm,
        analysis,
        rawIdea,
        documentContext,
      );
    }

    // ─── Step 3b: Non-Interactive Mode (legacy / automated) ───
    return this.runNonInteractiveMode(input, analysis);
  }

  // ─────────────────────────────────────────────
  // Document Ingestion
  // ─────────────────────────────────────────────

  private async ingestDocuments(
    projectId: string,
    documentPaths: string[],
  ): Promise<string> {
    const processor = new DocumentProcessor();
    const retriever = new RagRetriever();

    this.log.info({ count: documentPaths.length }, "Ingesting uploaded documents");

    for (const docPath of documentPaths) {
      try {
        const result = await processor.ingest(projectId, docPath);
        this.log.info(
          { fileName: result.fileName, chunks: result.totalChunks },
          "Document ingested successfully",
        );
      } catch (error) {
        this.log.error({ docPath, error: String(error) }, "Failed to ingest document");
      }
    }

    // Retrieve consolidated context from all uploaded documents
    const context = await retriever.retrieveFromDocuments(
      projectId,
      "project requirements features scope technical specification",
      10, // Get top 10 most relevant chunks
    );

    return context;
  }

  // ─────────────────────────────────────────────
  // Initial Analysis
  // ─────────────────────────────────────────────

  private async performInitialAnalysis(
    rawIdea: string,
    documentContext: string,
    _projectId: string,
    llm: BaseChatModel,
  ): Promise<IdeaCheckResult> {
    // Build the appropriate task prompt
    let taskPrompt: string;
    if (documentContext) {
      taskPrompt = TASK_PROMPT_WITH_DOCUMENTS
        .replace("{idea}", rawIdea || "No raw idea provided — analyze the documents only.")
        .replace("{documentContext}", documentContext);
    } else {
      taskPrompt = TASK_PROMPT.replace("{idea}", rawIdea);
    }

    const messages = [
      new SystemMessage(ANALYSIS_SYSTEM_PROMPT),
      new HumanMessage(taskPrompt),
    ];

    const response = await llm.invoke(messages);
    const content = typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

    // Clean thinking tags
    const cleanedContent = content.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

    // Parse the response
    const parsedJson = extractAndParseJson(cleanedContent);
    if (!parsedJson) {
      throw new AgentError(
        `Failed to extract valid JSON from LLM response. Raw: ${cleanedContent.substring(0, 500)}`,
        this.phase,
      );
    }

    return IdeaCheckSchema.parse(parsedJson);
  }

  // ─────────────────────────────────────────────
  // Interactive Mode
  // ─────────────────────────────────────────────

  private async runInteractiveMode(
    input: AgentInput,
    llm: BaseChatModel,
    analysis: IdeaCheckResult,
    _rawIdea: string,
    _documentContext: string,
  ): Promise<AgentResult> {
    // Format the initial analysis for presentation
    const analysisPresentation = this.formatAnalysisForUser(analysis);

    // Build the interactive system prompt with analysis results
    const interactiveSystemPrompt = INTERACTIVE_SYSTEM_PROMPT
      .replace("{analysisResults}", JSON.stringify(analysis, null, 2));

    // Run the interactive loop
    const loop = new InteractiveLoop();
    const loopResult = await loop.run({
      agentName: "Idea Check Agent",
      phase: "idea_check",
      projectId: input.projectId,
      systemPrompt: interactiveSystemPrompt,
      initialAgentMessage: analysisPresentation,
      onMessage: input.onMessage,
      waitForUserInput: input.waitForUserInput,
      llm,
      maxTurns: 20,
    });

    if (!loopResult.approved) {
      return {
        success: false,
        error: "Idea was not approved by the user after maximum conversation turns.",
        chatHistory: loopResult.chatHistory,
      };
    }

    // Extract and validate the final output
    let finalValidatedIdea: IdeaCheckResult;
    try {
      finalValidatedIdea = IdeaCheckSchema.parse(loopResult.finalOutput);
    } catch {
      // If the final output doesn't match schema, use the last known good analysis
      this.log.warn("Final loop output didn't match schema, using last analysis with user approval");
      finalValidatedIdea = { ...analysis, isValid: true };
    }

    // Store in vector memory
    await this.storeInVectorMemory(input.projectId, finalValidatedIdea);

    return {
      success: true,
      data: {
        validatedIdea: finalValidatedIdea,
      },
      chatHistory: loopResult.chatHistory,
    };
  }

  // ─────────────────────────────────────────────
  // Non-Interactive Mode (Legacy)
  // ─────────────────────────────────────────────

  private async runNonInteractiveMode(
    input: AgentInput,
    analysis: IdeaCheckResult,
  ): Promise<AgentResult> {
    if (!analysis.isValid) {
      this.log.warn({ reason: analysis.rejectionReason }, "Idea rejected (non-interactive)");
      return {
        success: false,
        error: analysis.rejectionReason ?? "The idea is too vague to proceed.",
      };
    }

    // Store in vector memory
    await this.storeInVectorMemory(input.projectId, analysis);

    return {
      success: true,
      data: {
        validatedIdea: analysis,
      },
    };
  }

  // ─────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────

  private async storeInVectorMemory(
    projectId: string,
    analysis: IdeaCheckResult,
  ): Promise<void> {
    const serializedData = JSON.stringify(analysis, null, 2);
    const embedding = await embedText(serializedData);

    await this.vectorStore.store({
      projectId,
      namespace: "idea_check_summary",
      content: serializedData,
      embedding,
      agentRole: this.name,
      phase: this.phase,
      metadata: { timestamp: new Date().toISOString() },
    });

    this.log.debug("Saved validated idea to vector store");
  }

  /**
   * Formats the initial analysis into a human-readable message for the user.
   */
  private formatAnalysisForUser(analysis: IdeaCheckResult): string {
    const parts: string[] = [];

    if (analysis.isValid) {
      parts.push(`I've analyzed your project idea and I believe it's viable! Here's my assessment:\n`);
      parts.push(`Confidence: ${analysis.confidenceScore ?? "N/A"}%\n`);
    } else {
      parts.push(`I've analyzed your project idea and I have some concerns that we should address first:\n`);
      if (analysis.rejectionReason) {
        parts.push(`Issue: ${analysis.rejectionReason}\n`);
      }
    }

    if (analysis.coreProblem) {
      parts.push(`Core Problem: ${analysis.coreProblem}\n`);
    }

    if (analysis.targetAudience) {
      parts.push(`Target Audience: ${analysis.targetAudience}\n`);
    }

    if (analysis.coreFeatures && analysis.coreFeatures.length > 0) {
      parts.push(`\nCore Features:`);
      analysis.coreFeatures.forEach((f, i) => parts.push(`  ${i + 1}. ${f}`));
      parts.push("");
    }

    if (analysis.techStackHints && analysis.techStackHints.length > 0) {
      parts.push(`\nRecommended Tech Stack:`);
      analysis.techStackHints.forEach((t) => parts.push(`  - ${t}`));
      parts.push("");
    }

    if (analysis.recommendations && analysis.recommendations.length > 0) {
      parts.push(`\nMy Recommendations:`);
      analysis.recommendations.forEach((r, i) => parts.push(`  ${i + 1}. ${r}`));
      parts.push("");
    }

    if (analysis.questions && analysis.questions.length > 0) {
      parts.push(`\nQuestions for you:`);
      analysis.questions.forEach((q, i) => parts.push(`  ${i + 1}. ${q}`));
      parts.push("");
    }

    parts.push(`\nPlease review the above and let me know:`);
    parts.push(`- Do you want to modify any features or aspects?`);
    parts.push(`- Do you have additional requirements to add?`);
    parts.push(`- Or if everything looks good, type "approve" to proceed to Technical Planning.`);

    return parts.join("\n");
  }
}

// Auto-instantiate to register with the AgentRegistry
new IdeaCheckAgent();
