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

import { terminalInput } from "./terminal-input.js";
import { loadRepairResume, loadProjectResume } from "./resume-project.js";
import { PipelineRunner } from "./runner.js";
import "../agents/index.js";
import { createLogger } from "@loom/shared/logger";
import readline from "readline";
import fs from "fs";
import path from "path";

// Force override for terminal environments
// DATABASE_URL is supplied by --env-file; never override user configuration.

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
  console.log("  Mobile repair: /paste then /end for multiline errors; /retry or /done.");
  console.log("═".repeat(70) + "\n");
}

function printPhaseHeader(phase: string) {
  const phaseNames: Record<string, string> = {
    document_ingestion: "📄 Document Ingestion",
    idea_check: "💡 Idea Check Agent",
    planning: "📐 Planning Agent",
    stitch: "🎨 Google Stitch Design & Approval",
    code_gen: "💻 Code Generation Agent",
  };
  console.log("\n" + "─".repeat(70));
  console.log(`  ${phaseNames[phase] || phase}`);
  console.log("─".repeat(70));
}

/**
 * Creates a readline-based user input function.
 */
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

function parseArgs(): { documents: string[]; resume?: string; repair?: string } {
  const args = process.argv.slice(2);
  const documents: string[] = [];
  let resume: string | undefined;
  let repair: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--repair") {
      repair = args[++i];
      if (!repair || repair.startsWith("--"))
        throw new Error("Supply a saved project ID after --repair");
      continue;
    }
    if (args[i] === "--resume") {
      resume = args[++i];
      if (!resume || resume.startsWith("--"))
        throw new Error("Supply the saved project ID after --resume");
      continue;
    }
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

  if (resume && documents.length) throw new Error("Resume uses saved documents; omit --document");
  if (repair && (resume || documents.length))
    throw new Error("Use --repair alone with the saved project ID");
  return { documents, resume, repair };
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

async function run() {
  const launchArgs = process.argv.slice(2);
  if (launchArgs.includes("--run")) {
    if (launchArgs.length !== 2 || launchArgs[0] !== "--run" || !launchArgs[1])
      throw new Error("Usage: --run <saved-project-id> (without --repair or --resume)");
    const { runSavedMobile } = await import("./run-mobile.js");
    await runSavedMobile(launchArgs[1]);
    return;
  }
  printBanner();

  const { documents, resume, repair } = parseArgs();
  const projectId = repair ?? resume ?? crypto.randomUUID();
  const restored = repair
    ? await loadRepairResume(repair)
    : resume
      ? await loadProjectResume(resume)
      : undefined;
  if (restored)
    console.log(`Resuming ${projectId} at ${restored.resumePhase ?? "stitch"} using saved work.`);

  if (documents.length > 0) {
    console.log(`📎 Documents to process: ${documents.length}`);
    documents.forEach((d) => console.log(`   - ${path.basename(d)}`));
  }

  // Ask the user for their idea
  const rawIdea = restored?.rawIdea ?? (await askForIdea());

  if (!restored && !rawIdea && documents.length === 0) {
    console.log("❌ No idea provided and no documents uploaded. Exiting.");
    process.exit(1);
  }

  log.info(
    { projectId, rawIdea: rawIdea.substring(0, 100), documents: documents.length },
    "Starting Interactive Pipeline",
  );

  try {
    let displayedPhase: string | undefined;
    const terminal = terminalInput(process.stdin, process.stdout);
    const finalState = await PipelineRunner.run({
      projectId,
      initialContext: {
        rawIdea,
        documents,
        ...restored,
      },
      documents: restored?.resumeDocuments ?? documents,
      interactive: true,
      waitForUserInput: async () => {
        const answer = await terminal.read();
        if (displayedPhase !== "code_gen" && (!answer || answer.toLowerCase() === "quit")) {
          terminal.close();
          process.exit(0);
        }
        return answer;
      },
      onMessage: (event, data) => {
        const d = data as any;

        switch (event) {
          case "pipeline:started":
            console.log("\n🚀 Pipeline started!");
            break;
          case "pipeline:progress":
            // Progress reports completed nodes; show headings when their messages start.
            break;
          case "agent:message":
            if (d?.phase && d.phase !== displayedPhase) {
              displayedPhase = d.phase;
              printPhaseHeader(d.phase);
            }
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
    }).finally(() => terminal.close());

    if (finalState.error) process.exitCode = 1;
    log.info({ projectId }, "Pipeline Finished");

    // Save output to markdown file
    const md = generateOutputMarkdown(projectId, rawIdea, finalState);
    const outDir = path.resolve(process.cwd(), "runs");
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir);
    }

    const filePath = path.join(
      outDir,
      `pipeline-output-${projectId}${repair ? `-repair-${Date.now()}` : resume ? `-resume-${Date.now()}` : ""}.md`,
    );
    fs.writeFileSync(filePath, md, "utf-8");
    console.log(`\n📄 Output saved to: ${filePath}`);
  } catch (error) {
    process.exitCode = 1;
    log.error({ error }, "Pipeline Failed");
    console.error("\n❌ Pipeline failed:", error);
  }

  process.exit(process.exitCode ?? 0);
}

// ─────────────────────────────────────────────
// Output Markdown Generator
// ─────────────────────────────────────────────

function generateOutputMarkdown(projectId: string, rawIdea: string, finalState: any): string {
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
    ...((finalState.context?.validatedIdea as any)?.coreFeatures?.map((f: string) => `- ${f}`) ||
      []),
    ``,
    `### Tech Stack Hints`,
    ...((finalState.context?.validatedIdea as any)?.techStackHints?.map((h: string) => `- ${h}`) ||
      []),
    ``,
  ];

  // Add planning section if it exists
  if (finalState.context?.technicalPlan) {
    const plan = finalState.context.technicalPlan as any;
    lines.push(
      `## 3. Planning Agent V2 — Generated Documents`,
      `**Documents Path:** ${finalState.context?.documentsPath || "N/A"}`,
      ``,
    );

    if (plan.documentsGenerated) {
      lines.push(`### Generated Documents`);
      for (const doc of plan.documentsGenerated as string[]) {
        lines.push(`- ✅ ${doc}`);
      }
      lines.push(``);
    }

    // Legacy support for old-style tech stack output
    if (plan.techStack) {
      lines.push(
        `### Tech Stack`,
        `**Frontend:** ${plan.techStack?.frontend?.join(", ") || "N/A"}`,
        `**Backend:** ${plan.techStack?.backend?.join(", ") || "N/A"}`,
        `**Database:** ${plan.techStack?.database?.join(", ") || "N/A"}`,
        `**Infrastructure:** ${plan.techStack?.infrastructure?.join(", ") || "N/A"}`,
        ``,
      );
    }
  }

  // Add Code Gen section if it exists
  if (finalState.context?.workspaceRoot) {
    lines.push(
      `## 4. Code Gen Agent V2 — Implementation`,
      `**Workspace Path:** ${finalState.context.workspaceRoot}`,
    );

    if (finalState.context.stitchUrl) {
      lines.push(`**Stitch UI URL:** ${finalState.context.stitchUrl}`);
    }

    if (finalState.context.isRunning !== undefined) {
      lines.push(
        `**Validation:** ${finalState.context.validation?.success ? "Passed" : "Failed or not run"}. **App running:** ${finalState.context.isRunning ? "Yes" : "No"}`,
      );
    }

    if (finalState.context.generatedFiles) {
      lines.push(
        ``,
        `### Generated Files (${(finalState.context.generatedFiles as string[]).length})`,
      );
      const files = finalState.context.generatedFiles as string[];
      for (const file of files.slice(0, 15)) {
        lines.push(`- 📄 ${file}`);
      }
      if (files.length > 15) {
        lines.push(`- *... and ${files.length - 15} more files*`);
      }
    }
    lines.push(``);
  }

  // Add chat history if available
  if (finalState.chatHistory) {
    for (const [phase, messages] of Object.entries(finalState.chatHistory)) {
      lines.push(`## Chat History: ${phase}`);
      for (const msg of messages as any[]) {
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

run().catch((error) => {
  console.error(String(error));
  process.exitCode = 1;
});
