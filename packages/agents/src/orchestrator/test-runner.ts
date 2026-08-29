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
  
  const rawIdea = "A multi-day road trip planner and expense splitter. It needs to map routes across multiple cities, integrate accommodation recommendations, store digital e-Pass documents offline, and allow a group of 8 people to seamlessly split bills via UPI integrations. It should be mobile-first with a dark mode, professional themed aesthetic.";

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
      `**Viable:** ${finalState.context?.validatedIdea?.isValid}`,
      `**Core Problem:** ${finalState.context?.validatedIdea?.coreProblem}`,
      `**Target Audience:** ${finalState.context?.validatedIdea?.targetAudience}`,
      ``,
      `### Core Features`,
      ...(finalState.context?.validatedIdea?.coreFeatures?.map((f: string) => `- ${f}`) || []),
      ``,
      `### Tech Stack Hints`,
      ...(finalState.context?.validatedIdea?.techStackHints?.map((h: string) => `- ${h}`) || []),
      ``,
      `## 3. Technical Architecture Plan (Planning Agent)`,
      `### Tech Stack`,
      `**Frontend:** ${finalState.context?.technicalPlan?.techStack?.frontend?.join(", ")}`,
      `**Backend:** ${finalState.context?.technicalPlan?.techStack?.backend?.join(", ")}`,
      `**Database:** ${finalState.context?.technicalPlan?.techStack?.database?.join(", ")}`,
      `**Infrastructure:** ${finalState.context?.technicalPlan?.techStack?.infrastructure?.join(", ")}`,
      ``,
      `### Database Schema`,
      ...(finalState.context?.technicalPlan?.databaseSchema?.map((t: any) => `\n**Table: \`${t.tableName}\`** - ${t.description}\n` + t.columns.map((c: any) => `- \`${c.name}\` (${c.type}): ${c.description}`).join('\n')) || []),
      ``,
      `### API Endpoints`,
      ...(finalState.context?.technicalPlan?.apiEndpoints?.map((a: any) => `- **${a.method}** \`${a.path}\`: ${a.description}`) || []),
      ``,
      `### Development Phases`,
      ...(finalState.context?.technicalPlan?.phases?.map((p: any, i: number) => `\n#### Phase ${i + 1}: ${p.phaseName}\n` + p.tasks.map((t: string) => `- [ ] ${t}`).join('\n')) || []),
      ``,
      `### Potential Challenges`,
      ...(finalState.context?.technicalPlan?.potentialChallenges?.map((c: string) => `- ${c}`) || []),
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
