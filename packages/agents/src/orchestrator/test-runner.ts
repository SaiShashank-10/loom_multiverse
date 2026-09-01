import { PipelineRunner } from "./runner.js";
import "../agents/index.js";
import { createLogger } from "@loom/shared/logger";

// Force override for terminal environments that have the old URL cached
process.env.DATABASE_URL = "postgresql://loom:loom_secret@127.0.0.1:5435/loom_multiverse";

const log = createLogger("test-runner");

import fs from "fs";
import path from "path";

async function run() {
  const projectId = crypto.randomUUID();

  const rawIdea = "Build a modern, production-ready B2B SaaS web dashboard called Tech Accessory Dropshipper Hub.The platform is designed for Indian tech accessory dropshippers who need to find reliable suppliers, compare pricing, analyze shipping logistics, and maximize profit margins.The application should feel like a premium modern SaaS product, with a clean, professional, data-driven interface similar to Stripe, Linear, Vercel, or modern analytics platforms.";

  log.info({ projectId, rawIdea }, "Starting Idea Check Pipeline Test");

  try {
    const finalState = await PipelineRunner.run({
      projectId,
      initialContext: {
        rawIdea
      }
    });

    log.info({ projectId }, "Pipeline Finished Successfully");

    // Generate readable markdown
    const md = [
      `# Pipeline Run: ${projectId}`,
      `**Phase Reached:** ${finalState.currentPhase}`,
      ``,
      `## 1. Raw Idea`,
      `> ${finalState.context?.rawIdea || "N/A"}`,
      ``,
      `## 2. Validated Idea (Idea Check Agent)`,
      `**Viable:** ${(finalState.context?.validatedIdea as any)?.isValid}`,
      `**Core Problem:** ${(finalState.context?.validatedIdea as any)?.coreProblem}`,
      `**Target Audience:** ${(finalState.context?.validatedIdea as any)?.targetAudience}`,
      ``,
      `### Core Features`,
      ...((finalState.context?.validatedIdea as any)?.coreFeatures?.map((f: string) => `- ${f}`) || []),
      ``,
      `### Tech Stack Hints`,
      ...((finalState.context?.validatedIdea as any)?.techStackHints?.map((h: string) => `- ${h}`) || []),
      ``,
      `## 3. Technical Architecture Plan (Planning Agent)`,
      `### Tech Stack`,
      `**Frontend:** ${(finalState.context?.technicalPlan as any)?.techStack?.frontend?.join(", ")}`,
      `**Backend:** ${(finalState.context?.technicalPlan as any)?.techStack?.backend?.join(", ")}`,
      `**Database:** ${(finalState.context?.technicalPlan as any)?.techStack?.database?.join(", ")}`,
      `**Infrastructure:** ${(finalState.context?.technicalPlan as any)?.techStack?.infrastructure?.join(", ")}`,
      ``,
      `### Architecture Diagram`,
      `\`\`\`mermaid`,
      (finalState.context?.technicalPlan as any)?.architecture?.diagramMermaid || "N/A",
      `\`\`\``,
      ``,
      `### Core Services`,
      ...((finalState.context?.technicalPlan as any)?.architecture?.services?.map((s: any) => `- **${s.name}** [${s.techStack?.join(", ")}]: ${s.responsibility}`) || []),
      ``,
      `### Database Schema`,
      `\`\`\`mermaid`,
      (finalState.context?.technicalPlan as any)?.databaseSchema?.diagramMermaid || "N/A",
      `\`\`\``,
      ...((finalState.context?.technicalPlan as any)?.databaseSchema?.tables?.map((t: any) => `\n**Table: \`${t.tableName}\`** - ${t.description}\n` + t.columns?.map((c: any) => `- \`${c.name}\` (${c.type}): ${c.description}`).join('\n')) || []),
      ``,
      `### API Endpoints`,
      ...((finalState.context?.technicalPlan as any)?.apiEndpoints?.map((a: any) => `- **${a.method}** \`${a.path}\`: ${a.description}`) || []),
      ``,
      `### Development Phases`,
      ...((finalState.context?.technicalPlan as any)?.developmentPhases?.map((p: any, i: number) => `\n#### Phase ${i + 1}: ${p.phaseName}\n` + p.tasks?.map((t: string) => `- [ ] ${t}`).join('\n')) || []),
      ``,
      `### Potential Challenges`,
      ...((finalState.context?.technicalPlan as any)?.potentialChallenges?.map((c: string) => `- ${c}`) || []),
      ``,
      `---`,
      `*Error:* ${finalState.error || "None"}`
    ].join('\n');

    const outDir = path.resolve(process.cwd(), "runs");
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir);
    }

    const filePath = path.join(outDir, `pipeline-output-${projectId}.md`);
    fs.writeFileSync(filePath, md, "utf-8");
    log.info(`✅ Output saved to: ${filePath}`);

  } catch (error) {
    log.error({ error }, "Pipeline Failed");
  }
}

run();
