/**
 * @loom/agents — Planning Agent V2
 *
 * Phase 2 of the AI Pipeline — UPGRADED.
 *
 * Generates comprehensive, industry-grade project documents:
 * - PRD (Product Requirements Document) — always
 * - BRD (Business Requirements Document) — conditional
 * - Technical Architecture Document — always
 * - System Design Document — always
 * - UI Design Document — if project has frontend
 *
 * All documents are written as .md files to the project workspace.
 * After generation, enters an interactive chat loop for refinement.
 * Proceeds to Google Stitch after planning approval.
 */

import { BaseAgent } from "../base-agent.js";
import {
  PRD_SYSTEM_PROMPT,
  PRD_TASK_PROMPT,
  BRD_SYSTEM_PROMPT,
  BRD_TASK_PROMPT,
  TECH_DOC_SYSTEM_PROMPT,
  TECH_DOC_TASK_PROMPT,
  SYSTEM_DESIGN_PROMPT,
  SYSTEM_DESIGN_TASK_PROMPT,
  UI_DESIGN_PROMPT,
  UI_DESIGN_TASK_PROMPT,
  INTERACTIVE_PLANNING_PROMPT,
  BRD_KEYWORDS,
  FRONTEND_KEYWORDS,
} from "./prompts.js";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { AgentError } from "@loom/shared/errors";
import { embedText } from "../../llm/index.js";
import { InteractiveLoop } from "../../orchestrator/interactive-loop.js";
import type { AgentInput, AgentResult } from "../types.js";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import fs from "fs/promises";
import path from "path";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface DocumentSpec {
  name: string;
  fileName: string;
  systemPrompt: string;
  taskPrompt: string;
  condition: "always" | "brd" | "frontend";
}

interface GeneratedDocument {
  name: string;
  fileName: string;
  filePath: string;
  contentLength: number;
}

// ─────────────────────────────────────────────
// Document Specifications
// ─────────────────────────────────────────────

const DOCUMENT_SPECS: DocumentSpec[] = [
  {
    name: "Product Requirements Document (PRD)",
    fileName: "PRD.md",
    systemPrompt: PRD_SYSTEM_PROMPT,
    taskPrompt: PRD_TASK_PROMPT,
    condition: "always",
  },
  {
    name: "Business Requirements Document (BRD)",
    fileName: "BRD.md",
    systemPrompt: BRD_SYSTEM_PROMPT,
    taskPrompt: BRD_TASK_PROMPT,
    condition: "brd",
  },
  {
    name: "Technical Architecture Document",
    fileName: "TECHNICAL_ARCHITECTURE.md",
    systemPrompt: TECH_DOC_SYSTEM_PROMPT,
    taskPrompt: TECH_DOC_TASK_PROMPT,
    condition: "always",
  },
  {
    name: "System Design Document",
    fileName: "SYSTEM_DESIGN.md",
    systemPrompt: SYSTEM_DESIGN_PROMPT,
    taskPrompt: SYSTEM_DESIGN_TASK_PROMPT,
    condition: "always",
  },
  {
    name: "UI Design Document",
    fileName: "UI_DESIGN.md",
    systemPrompt: UI_DESIGN_PROMPT,
    taskPrompt: UI_DESIGN_TASK_PROMPT,
    condition: "frontend",
  },
];

// ─────────────────────────────────────────────
// Agent Implementation
// ─────────────────────────────────────────────

export class PlanningAgent extends BaseAgent {
  constructor() {
    super({
      name: "PlanningAgent",
      description:
        "Generates industry-grade project documents (PRD, BRD, Technical Architecture, System Design, UI Design) and refines them interactively with the user.",
      phase: "planning",
    });
  }

  protected async execute(input: AgentInput, llm: BaseChatModel): Promise<AgentResult> {
    const ideaContext = input.payload?.validatedIdea as Record<string, any>;

    if (!ideaContext) {
      throw new AgentError(
        "No validated idea found in payload. Please run Idea Check first.",
        this.phase,
      );
    }

    // Raw user requirements are authoritative, including details omitted by idea extraction.
    ideaContext.originalUserRequirements =
      input.payload.approvedRequirements ?? input.payload.rawIdea ?? "";
    const isInteractive = input.interactive ?? true;

    this.log.info(
      {
        projectId: input.projectId,
        interactive: isInteractive,
        features: (ideaContext.coreFeatures || []).length,
      },
      "Starting Planning Agent V2",
    );

    // ─── Step 1: Setup workspace docs directory ───
    const workspacePath = path.resolve("runs", "workspaces", input.projectId);
    const docsPath = path.join(workspacePath, "docs");
    await fs.mkdir(docsPath, { recursive: true });

    this.log.info({ docsPath }, "Workspace docs directory ready");

    // ─── Step 2: Determine which documents to generate ───
    const needsBRD = this.requiresBRD(ideaContext);
    const hasFrontend = this.hasFrontend(ideaContext);

    const docsToGenerate = DOCUMENT_SPECS.filter((spec) => {
      if (spec.condition === "always") return true;
      if (spec.condition === "brd") return needsBRD;
      if (spec.condition === "frontend") return hasFrontend;
      return false;
    });

    this.log.info(
      {
        totalDocs: docsToGenerate.length,
        needsBRD,
        hasFrontend,
        documents: docsToGenerate.map((d) => d.fileName),
      },
      "Documents to generate",
    );

    // ─── Step 3: Generate each document sequentially ───
    const generatedDocs: GeneratedDocument[] = [];

    for (const spec of docsToGenerate) {
      // Notify user of progress
      if (input.onMessage) {
        input.onMessage("agent:message", {
          phase: "planning",
          message: `📝 Generating ${spec.name}...`,
        });
      }

      this.log.info({ document: spec.name }, "Generating document");

      try {
        const filePath = path.join(docsPath, spec.fileName);
        let content = "";
        if (input.payload.resumeProject) {
          try {
            content = await fs.readFile(filePath, "utf8");
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
          }
        }
        if (!content.trim()) content = await this.generateDocument(spec, ideaContext, llm);
        await fs.writeFile(filePath, content, "utf-8");

        generatedDocs.push({
          name: spec.name,
          fileName: spec.fileName,
          filePath,
          contentLength: content.length,
        });

        this.log.info(
          { document: spec.fileName, chars: content.length },
          "Document generated and saved",
        );
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        this.log.error({ document: spec.name, error: msg }, "Failed to generate document");

        throw new AgentError(`Planning document ${spec.fileName} failed: ${msg}`, this.phase);
      }
    }

    // ─── Step 4: Interactive chat loop (if enabled) ───
    if (isInteractive && input.waitForUserInput) {
      return this.runInteractiveMode(input, llm, ideaContext, generatedDocs, docsPath);
    }

    // ─── Step 4b: Non-interactive mode ───
    await this.storeFinalPlan(input.projectId, generatedDocs, docsPath);

    return {
      success: true,
      data: {
        technicalPlan: { hasFrontend, documentsGenerated: generatedDocs.map((d) => d.fileName) },
        documentsPath: docsPath,
        generatedDocuments: generatedDocs.map((d) => d.fileName),
      },
    };
  }

  // ─────────────────────────────────────────────
  // Document Generation
  // ─────────────────────────────────────────────

  private async generateDocument(
    spec: DocumentSpec,
    ideaContext: Record<string, any>,
    llm: BaseChatModel,
  ): Promise<string> {
    // Build the task prompt with context variables
    const taskPrompt = this.fillTemplateVariables(spec.taskPrompt, ideaContext);

    const messages = [
      new SystemMessage(
        `${spec.systemPrompt}\nPreserve the user requirements and exact requested stack. Do not substitute an alternative. Full approved idea: ${JSON.stringify(ideaContext)}`,
      ),
      new HumanMessage(taskPrompt),
    ];

    const response = await llm.invoke(messages);
    const content =
      typeof response.content === "string" ? response.content : JSON.stringify(response.content);

    // Clean up: remove thinking tags and any wrapping code blocks
    let cleaned = content.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

    // Remove wrapping ```markdown ... ``` if the model added them
    cleaned = cleaned.replace(/^```(?:markdown)?\s*\n?/i, "");
    cleaned = cleaned.replace(/\n?```\s*$/i, "");

    return cleaned.trim();
  }

  // ─────────────────────────────────────────────
  // Interactive Mode
  // ─────────────────────────────────────────────

  private async runInteractiveMode(
    input: AgentInput,
    llm: BaseChatModel,
    ideaContext: Record<string, any>,
    generatedDocs: GeneratedDocument[],
    docsPath: string,
  ): Promise<AgentResult> {
    // Build the summary of generated documents for the user
    const docSummary = this.formatDocumentSummary(generatedDocs);

    // Build the interactive system prompt
    const projectContext = this.formatProjectContext(ideaContext);
    const interactivePrompt = INTERACTIVE_PLANNING_PROMPT.replace(
      "{documentSummary}",
      docSummary,
    ).replace("{projectContext}", projectContext);

    // Initial message to the user
    const initialMessage = this.formatInitialMessage(generatedDocs, docsPath);

    // Run the interactive loop
    const loop = new InteractiveLoop();
    const loopResult = await loop.run({
      initialHistory: input.resumeChatHistory,
      agentName: "Planning Agent",
      phase: "planning",
      projectId: input.projectId,
      systemPrompt: interactivePrompt,
      initialAgentMessage: initialMessage,
      onMessage: input.onMessage,
      waitForUserInput: input.waitForUserInput,
      llm,
      maxTurns: 30,
      onCustomAction: async (message, history) => {
        if (!/\b(change|use|switch|replace|add|remove|update|modify|fix|make)\b/i.test(message))
          return null;
        const feedback = history
          .filter((m) => m.role === "user")
          .map((m) => m.content)
          .join("\n");
        for (const doc of generatedDocs) {
          const current = await fs.readFile(doc.filePath, "utf8");
          const response = await llm.invoke([
            new SystemMessage(
              "Revise the supplied planning document to apply the user's requested changes. Preserve all other requirements. Return the complete raw markdown document only.",
            ),
            new HumanMessage(
              `Original user requirements: ${input.payload.rawIdea}\nApproved idea: ${JSON.stringify(ideaContext)}\nUser revisions in order (latest overrides conflicts): ${feedback}\nDocument ${doc.fileName}:\n${current}`,
            ),
          ]);
          const revised = String(response.content)
            .replace(/^```(?:markdown)?\s*\n?/, "")
            .replace(/\n?```\s*$/, "")
            .trim();
          if (!revised) throw new AgentError(`Empty revision for ${doc.fileName}`, this.phase);
          await fs.writeFile(doc.filePath, revised, "utf8");
          doc.contentLength = revised.length;
        }
        return "Updated the planning documents on disk with your requested changes. Review them, then type approve.";
      },
    });

    if (!loopResult.approved) {
      return {
        success: false,
        error: "Planning documents were not approved by the user after maximum conversation turns.",
        chatHistory: loopResult.chatHistory,
      };
    }

    // Store final plan in vector memory
    await this.storeFinalPlan(input.projectId, generatedDocs, docsPath);

    return {
      success: true,
      data: {
        approvedRequirements: `${input.payload.approvedRequirements ?? input.payload.rawIdea ?? ""}\nUser-approved planning revisions (latest takes precedence):\n${loopResult.chatHistory
          .filter((m) => m.role === "user")
          .map((m) => m.content)
          .join("\n")}`,
        technicalPlan: {
          hasFrontend: this.hasFrontend(ideaContext),
          documentsGenerated: generatedDocs.map((d) => d.fileName),
        },
        documentsPath: docsPath,
        generatedDocuments: generatedDocs.map((d) => d.fileName),
      },
      chatHistory: loopResult.chatHistory,
    };
  }

  // ─────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────

  /**
   * Fill template variables in a prompt string.
   */
  private fillTemplateVariables(template: string, ctx: Record<string, any>): string {
    return template
      .replace("{coreProblem}", ctx.coreProblem || "Not specified")
      .replace("{targetAudience}", ctx.targetAudience || "Not specified")
      .replace("{projectScope}", ctx.projectScope || ctx.coreProblem || "Not specified")
      .replace("{projectName}", ctx.projectName || "Unnamed Project")
      .replace("{coreFeatures}", (ctx.coreFeatures || []).map((f: string) => `- ${f}`).join("\n"))
      .replace(
        "{techStackHints}",
        (ctx.techStackHints || []).map((t: string) => `- ${t}`).join("\n"),
      )
      .replace(
        "{constraints}",
        (ctx.constraints || []).map((c: string) => `- ${c}`).join("\n") || "None specified",
      )
      .replace(
        "{businessFeatures}",
        (ctx.coreFeatures || [])
          .filter((f: string) => BRD_KEYWORDS.some((kw) => f.toLowerCase().includes(kw)))
          .map((f: string) => `- ${f}`)
          .join("\n") || "General business functionality",
      )
      .replace(
        "{designHints}",
        ctx.designHints || "No specific design preferences — use modern, premium design.",
      );
  }

  /**
   * Check if the project needs a BRD (has business/revenue components).
   */
  private requiresBRD(ideaContext: Record<string, any>): boolean {
    const textToCheck = [
      ideaContext.coreProblem || "",
      ...(ideaContext.coreFeatures || []),
      ideaContext.projectScope || "",
      ideaContext.originalUserRequirements || "",
    ]
      .join(" ")
      .toLowerCase();

    return BRD_KEYWORDS.some((kw) => textToCheck.includes(kw));
  }

  /**
   * Check if the project has a frontend component.
   */
  private hasFrontend(ideaContext: Record<string, any>): boolean {
    const textToCheck = [
      ideaContext.coreProblem || "",
      ...(ideaContext.coreFeatures || []),
      ...(ideaContext.techStackHints || []),
      ideaContext.projectScope || "",
      ideaContext.originalUserRequirements || "",
    ]
      .join(" ")
      .toLowerCase();

    return FRONTEND_KEYWORDS.some((kw) => textToCheck.includes(kw));
  }

  /**
   * Format the document summary for the interactive prompt.
   */
  private formatDocumentSummary(docs: GeneratedDocument[]): string {
    return docs
      .map(
        (d) =>
          `- **${d.name}** (${d.fileName}) — ${d.contentLength > 0 ? `${Math.round(d.contentLength / 1000)}K chars` : "Generation failed"}`,
      )
      .join("\n");
  }

  /**
   * Format the project context for the interactive prompt.
   */
  private formatProjectContext(ctx: Record<string, any>): string {
    const parts = [
      `Core Problem: ${ctx.coreProblem || "N/A"}`,
      `Target Audience: ${ctx.targetAudience || "N/A"}`,
      `Features: ${(ctx.coreFeatures || []).join(", ")}`,
      `Tech Hints: ${(ctx.techStackHints || []).join(", ")}`,
    ];
    return parts.join("\n");
  }

  /**
   * Format the initial message shown to the user after document generation.
   */
  private formatInitialMessage(docs: GeneratedDocument[], docsPath: string): string {
    const parts: string[] = [];

    parts.push(`I've generated ${docs.length} comprehensive project documents for you!\n`);
    parts.push(`📁 Documents saved to: ${docsPath}\n`);

    for (const doc of docs) {
      if (doc.contentLength > 0) {
        parts.push(
          `  ✅ ${doc.name} (${doc.fileName}) — ${Math.round(doc.contentLength / 1000)}K characters`,
        );
      } else {
        parts.push(`  ⚠️ ${doc.name} (${doc.fileName}) — needs refinement`);
      }
    }

    parts.push(`\nYou can now:`);
    parts.push(`  - Open the docs/ folder to review each document`);
    parts.push(`  - Ask me to change anything (e.g., "Change the database to MongoDB")`);
    parts.push(`  - Request additions (e.g., "Add a payment flow feature")`);
    parts.push(`  - Ask questions about any design decisions I made`);
    parts.push(
      `\nWhen you're satisfied with all documents, type "approve" to proceed to Google Stitch design review.`,
    );

    return parts.join("\n");
  }

  /**
   * Store the final consolidated plan in vector memory for Code Gen.
   */
  private async storeFinalPlan(
    projectId: string,
    docs: GeneratedDocument[],
    docsPath: string,
  ): Promise<void> {
    for (const doc of docs) {
      try {
        const content = await fs.readFile(doc.filePath, "utf-8");
        // Limit to 4000 characters to safely fit within nomic-embed-text 2048 token context
        const safeContent = content.substring(0, 4000);
        const embedding = await embedText(`=== ${doc.name} ===\n${safeContent}`);

        await this.vectorStore.store({
          projectId,
          namespace: "technical_plan",
          content: `=== ${doc.name} ===\n${safeContent}`,
          embedding,
          agentRole: this.name,
          phase: this.phase,
          metadata: {
            timestamp: new Date().toISOString(),
            documentsPath: docsPath,
            documentName: doc.fileName,
          },
        });
      } catch (error) {
        this.log.warn(
          { fileName: doc.fileName, error: String(error) },
          "Could not store document in vector memory",
        );
      }
    }

    this.log.info(
      { projectId, docCount: docs.length },
      "Final plan stored in vector memory (individually chunked)",
    );
  }
}

// Auto-instantiate to register with the AgentRegistry
new PlanningAgent();
