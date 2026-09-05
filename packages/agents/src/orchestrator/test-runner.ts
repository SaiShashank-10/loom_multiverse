/**
 * @loom/agents — Interactive Test Runner V2
 *
 * CLI-based interactive pipeline test runner.
 * Allows the user to chat with agents directly in the terminal.
 *
 * Usage:
 *   npx tsx --env-file=.env packages/agents/src/orchestrator/test-runner.ts
 *   npx tsx --env-file=.env packages/agents/src/orchestrator/test-runner.ts --document ./path/to/doc.pdf
 */

import { PipelineRunner } from "./runner.js";
import "../agents/index.js";
import { createLogger } from "@loom/shared/logger";
import readline from "readline";
import fs from "fs";
import path from "path";

// Force override for terminal environments
process.env.DATABASE_URL = "postgresql://loom:loom_secret@127.0.0.1:5435/loom_multiverse";

const log = createLogger("test-runner");

// ─────────────────────────────────────────────
// CLI Helpers
// ─────────────────────────────────────────────

function printBanner() {
  console.log("\n" + "═".repeat(70));
  console.log("  🌀 LOOM MULTIVERSE — Interactive Pipeline V2");
  console.log("═".repeat(70));
  console.log("  Type your project idea when prompted.");
  console.log("  Chat with agents to refine your idea.");
  console.log("  Type 'approve' when you're satisfied.");
  console.log("  Type 'quit' to exit at any time.");
  console.log("═".repeat(70) + "\n");
}

function printPhaseHeader(phase: string) {
  const phaseNames: Record<string, string> = {
    "document_ingestion": "📄 Document Ingestion",
    "idea_check": "💡 Idea Check Agent",
    "planning": "📐 Planning Agent",
    "code_gen": "💻 Code Generation Agent",
  };
  console.log("\n" + "─".repeat(70));
  console.log(`  ${phaseNames[phase] || phase}`);
  console.log("─".repeat(70));
}

/**
 * Creates a readline-based user input function.
 */
function createInputReader(): () => Promise<string> {
  return () => {
    return new Promise<string>((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      rl.question("\n💬 You: ", (answer: string) => {
        rl.close();
        
        if (answer.trim().toLowerCase() === "quit") {
          console.log("\n👋 Exiting pipeline. Goodbye!");
          process.exit(0);
        }
        
        resolve(answer.trim());
      });
    });
  };
}

/**
 * Asks the user for their project idea via CLI.
 */
async function askForIdea(): Promise<string> {
  return new Promise<string>((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log("\n🎯 What would you like to build?");
    console.log("   (Describe your project idea in as much detail as possible)\n");

    rl.question("💡 Your idea: ", (answer: string) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// ─────────────────────────────────────────────
// Parse CLI Arguments
// ─────────────────────────────────────────────

function parseArgs(): { documents: string[] } {
  const args = process.argv.slice(2);
  const documents: string[] = [];
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--document" || args[i] === "-d") {
      const docPath = args[i + 1];
      if (docPath && fs.existsSync(docPath)) {
        documents.push(path.resolve(docPath));
        i++; // skip next arg
      } else {
        console.error(`⚠️  Document not found: ${docPath}`);
      }
    }
  }
  
  return { documents };
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

async function run() {
  printBanner();

  const { documents } = parseArgs();
  const projectId = crypto.randomUUID();

  if (documents.length > 0) {
    console.log(`📎 Documents to process: ${documents.length}`);
    documents.forEach(d => console.log(`   - ${path.basename(d)}`));
  }

  // Ask the user for their idea
  const rawIdea = await askForIdea();

  if (!rawIdea && documents.length === 0) {
    console.log("❌ No idea provided and no documents uploaded. Exiting.");
    process.exit(1);
  }

  log.info({ projectId, rawIdea: rawIdea.substring(0, 100), documents: documents.length }, "Starting Interactive Pipeline");

  try {
    const finalState = await PipelineRunner.run({
      projectId,
      initialContext: {
        rawIdea,
        documents,
      },
      documents,
      interactive: true,
      waitForUserInput: createInputReader(),
      onMessage: (event, data) => {
        const d = data as any;
        
        switch (event) {
          case "pipeline:started":
            console.log("\n🚀 Pipeline started!");
            break;
          case "pipeline:progress":
            // Show phase transitions
            if (d?.currentPhase) {
              printPhaseHeader(d.currentPhase);
            }
            break;
          case "agent:message":
            console.log(`\n🤖 [Agent]: ${d?.message}`);
            break;
          case "phase:approved":
            console.log(`\n✅ Phase "${d?.phase}" approved! (${d?.turns} turns)`);
            break;
          case "pipeline:completed":
            console.log("\n" + "═".repeat(70));
            console.log("  🎉 Pipeline Completed Successfully!");
            console.log("═".repeat(70));
            break;
          case "pipeline:error":
            console.error(`\n❌ Pipeline Error: ${d?.error}`);
            break;
        }
      },
    });

    log.info({ projectId }, "Pipeline Finished");

    // Save output to markdown file
    const md = generateOutputMarkdown(projectId, rawIdea, finalState);
    const outDir = path.resolve(process.cwd(), "runs");
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir);
    }

    const filePath = path.join(outDir, `pipeline-output-${projectId}.md`);
    fs.writeFileSync(filePath, md, "utf-8");
    console.log(`\n📄 Output saved to: ${filePath}`);

  } catch (error) {
    log.error({ error }, "Pipeline Failed");
    console.error("\n❌ Pipeline failed:", error);
  }

  process.exit(0);
}

// ─────────────────────────────────────────────
// Output Markdown Generator
// ─────────────────────────────────────────────

function generateOutputMarkdown(
  projectId: string,
  rawIdea: string,
  finalState: any,
): string {
  const lines = [
    `# Pipeline Run: ${projectId}`,
    `**Phase Reached:** ${finalState.currentPhase}`,
    `**Date:** ${new Date().toISOString()}`,
    ``,
    `## 1. Raw Idea`,
    `> ${rawIdea || "N/A"}`,
    ``,
    `## 2. Validated Idea (Idea Check Agent V2)`,
    `**Viable:** ${(finalState.context?.validatedIdea as any)?.isValid}`,
    `**Confidence:** ${(finalState.context?.validatedIdea as any)?.confidenceScore ?? "N/A"}%`,
    `**Core Problem:** ${(finalState.context?.validatedIdea as any)?.coreProblem}`,
    `**Target Audience:** ${(finalState.context?.validatedIdea as any)?.targetAudience}`,
    ``,
    `### Core Features`,
    ...((finalState.context?.validatedIdea as any)?.coreFeatures?.map((f: string) => `- ${f}`) || []),
    ``,
    `### Tech Stack Hints`,
    ...((finalState.context?.validatedIdea as any)?.techStackHints?.map((h: string) => `- ${h}`) || []),
    ``,
  ];

  // Add planning section if it exists
  if (finalState.context?.technicalPlan) {
    lines.push(
      `## 3. Technical Architecture Plan (Planning Agent)`,
      `### Tech Stack`,
      `**Frontend:** ${(finalState.context?.technicalPlan as any)?.techStack?.frontend?.join(", ")}`,
      `**Backend:** ${(finalState.context?.technicalPlan as any)?.techStack?.backend?.join(", ")}`,
      `**Database:** ${(finalState.context?.technicalPlan as any)?.techStack?.database?.join(", ")}`,
      `**Infrastructure:** ${(finalState.context?.technicalPlan as any)?.techStack?.infrastructure?.join(", ")}`,
      ``,
    );
  }

  // Add chat history if available
  if (finalState.chatHistory) {
    for (const [phase, messages] of Object.entries(finalState.chatHistory)) {
      lines.push(`## Chat History: ${phase}`);
      for (const msg of (messages as any[])) {
        const role = msg.role === "agent" ? "🤖 Agent" : "👤 User";
        lines.push(`**${role}** (${msg.timestamp}):`);
        lines.push(`> ${msg.content}`);
        lines.push(``);
      }
    }
  }

  lines.push(`---`);
  lines.push(`*Error:* ${finalState.error || "None"}`);

  return lines.join("\n");
}

run();
