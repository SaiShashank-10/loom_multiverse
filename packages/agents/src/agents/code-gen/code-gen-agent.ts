import { BaseAgent } from "../base-agent.js";
import { AgentError } from "@loom/shared/errors";
import { FILE_STRUCTURE_PROMPT, FILE_GENERATION_PROMPT } from "./prompts.js";
import { FileStructureSchema } from "./schema.js";
import { extractAndParseJson } from "../../llm/json-parser.js";
import { createTier1LLM } from "../../llm/index.js";
import type { AgentInput, AgentResult } from "../types.js";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import fs from "fs/promises";
import path from "path";


export class CodeGenAgent extends BaseAgent {
  constructor() {
    super({
      name: "Code Generation Agent",
      phase: "code_gen",
      description: "Generates project source code based on technical plans",
    });
  }

  protected async execute(input: AgentInput, llm: BaseChatModel): Promise<AgentResult> {
    const { technicalPlan } = input.payload;

    if (!technicalPlan) {
      throw new AgentError("Missing technicalPlan in payload", this.phase);
    }

    this.log.info("Generating project file structure...");

    // Step 1: Generate File Structure
    const contextStr = JSON.stringify(technicalPlan, null, 2);

    let structureResponse;
    try {
      const planningLlm = createTier1LLM({ maxTokens: 8192, format: "json" });
      const response = await planningLlm.invoke([
        new SystemMessage(FILE_STRUCTURE_PROMPT.replace("{context}", contextStr)),
        new HumanMessage("Generate the exhaustive file structure for this project in JSON format. Do not use tool calls.")
      ]);
      const content = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
      const parsedJson = extractAndParseJson(content);
      structureResponse = FileStructureSchema.parse(parsedJson);
    } catch (err) {
      throw new AgentError(`Failed to generate file structure: ${String(err)}`, this.phase);
    }

    if (!structureResponse || !structureResponse.files || structureResponse.files.length === 0) {
      throw new AgentError("LLM failed to produce a valid file structure array", this.phase);
    }

    this.log.info({ fileCount: structureResponse.files.length }, "File structure generated. Beginning file generation.");

    // Define workspace directory (local for now)
    // We will save to: loom_multiverse/runs/workspaces/<projectId>
    const workspaceRoot = path.join(process.cwd(), "runs", "workspaces", input.projectId);

    try {
      await fs.mkdir(workspaceRoot, { recursive: true });
    } catch (err) {
      throw new AgentError(`Failed to create workspace directory: ${String(err)}`, this.phase);
    }

    const structureSummary = structureResponse.files.map((f: any) => `- ${f.path}: ${f.description}`).join("\n");
    const generatedFiles: string[] = [];

    // Step 2: Iterate and generate each file
    for (const fileMeta of structureResponse.files) {
      this.log.info({ file: fileMeta.path }, "Generating file...");

      const prompt = FILE_GENERATION_PROMPT
        .replace("{filepath}", fileMeta.path)
        .replace("{description}", fileMeta.description)
        .replace("{context}", contextStr)
        .replace("{structure}", structureSummary);

      let codeContent = "";
      try {
        const response = await llm.invoke([
          new SystemMessage(prompt),
          new HumanMessage(`Write the full source code for ${fileMeta.path} now. Remember, NO markdown blocks.`)
        ]);
        codeContent = response?.content ? String(response.content) : "";

        // Clean up any stray markdown blocks the LLM might have output despite instructions
        if (codeContent.startsWith("```")) {
          const lines = codeContent.split("\n");
          if (lines[0]?.startsWith("```")) lines.shift();
          if (lines[lines.length - 1]?.startsWith("```")) lines.pop();
          codeContent = lines.join("\n");
        }
      } catch (err) {
        this.log.error({ file: fileMeta.path, error: String(err) }, "Failed to generate file content");
        continue; // Skip file and continue rather than crashing entire run
      }

      // Write to disk
      const fullPath = path.join(workspaceRoot, fileMeta.path);
      const fileDir = path.dirname(fullPath);

      try {
        await fs.mkdir(fileDir, { recursive: true });
        await fs.writeFile(fullPath, codeContent, "utf8");
        generatedFiles.push(fileMeta.path);
        this.log.debug({ file: fileMeta.path }, "Saved file to workspace");
      } catch (err) {
        this.log.error({ file: fileMeta.path, error: String(err) }, "Failed to write file to disk");
      }
    }

    this.log.info({ generatedCount: generatedFiles.length }, "Code generation phase complete");

    return {
      success: true,
      data: {
        generatedFiles,
        workspaceRoot
      },
    };
  }
}
new CodeGenAgent();
