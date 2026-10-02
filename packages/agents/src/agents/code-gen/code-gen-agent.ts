import { startLocalServices } from "./local-services.js";
import { resolveProjectTarget } from "./project-target.js";
import { MobileWorkerTeam, isMobileClientFile, assertMobileStack } from "./mobile-workers.js";
import {
  prepareMobileProject,
  runMobileCommand,
  runMobileApp,
  type MobileRuntimeResult,
  type MobilePreparation,
} from "./mobile-runtime.js";
import { runMobileRepairLoop } from "./mobile-repair-loop.js";
import { reconcileTrainingFiles } from "./manifest-reconciliation.js";
import {
  validateSource,
  validateFilePurpose,
  generateSource,
  saveGeneratedSource,
} from "./source-output.js";
import {
  ApplicationWorkerTeam,
  InterfaceIndex,
  applicationRole,
  orderSourceFiles,
} from "./application-workers.js";
import { auditSources, assertSourceAudit, quarantineInvalidOrphans } from "./source-audit.js";
import { prepareManifest } from "./manifest.js";
import { manifestQualityIssues, completeBrowserEntrypoints, completeBehavioralTests } from "./manifest-quality.js";
import { generateArchitecture, summarizeDesigns } from "./architecture.js";
import { mlContract, mlFiles, MLWorkerTeam } from "./ml-workers.js";
import { MLPlanSchema, resolveMLPlan } from "./ml-plan.js";
import { ensureMLConfig, runMLPipeline } from "./ml-execution.js";
import { assertNodePackageIntegrity, repairNodePeerConflict } from "./package-integrity.js";
import {
  loadDesignReference,
  designEvidenceFor,
  designSummary,
  designFile,
  designHash,
  readDesignWrites,
  recordDesignWrite,
  assertDesignImplementation,
  type DesignReference,
} from "./design-reference.js";
/**
 * @loom/agents — Code Gen Agent V2
 *
 * Source generation after the separate Google Stitch design gate.
 *
 * Capabilities:
 * 1. Design Gate: Requires completed Stitch artifacts and interactive approval for UI projects.
 * 2. Code Gen: Writes complete, production-ready codebase based on Planning docs + Stitch design.
 * 3. Self-Healing Execution: Autonomously installs dependencies, runs build/dev commands, catches errors,
 *    feeds stack traces to LLM, and fixes the codebase until successful (up to max retries).
 * 4. Documentation: Outputs a beautiful README.md.
 */

import { BaseAgent } from "../base-agent.js";
import { AgentError } from "@loom/shared/errors";
import { README_PROMPT } from "./prompts.js";
import { FileStructureSchema } from "./schema.js";
import { extractAndParseJson } from "../../llm/json-parser.js";
import { retryInference } from "../../llm/ollama-health.js";
import { createTier2LLM } from "../../llm/index.js";
import { ensureOllamaReady } from "../../llm/ollama-health.js";
import { config } from "@loom/shared/config";
import type { AgentInput, AgentResult } from "../types.js";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { requireStitchResult } from "./stitch-state.js";
import fs from "fs/promises";
import path from "path";
import {
  runCheck,
  projectFiles,
  safePath,
  validateAndHeal,
  requiredFramework,
  assertRequiredStructure,
  assertRequiredWorkspace,
} from "./validation.js";
import { z } from "zod";
import { reviewDesignSource } from "./design-review.js";
import { currentDraftIssues, nativeReviewDependencies } from "./review-context.js";
import { validateStyleBindings } from "./style-contract.js";

export function repairManifestTarget(
  root: string,
  command: string,
  errorOutput: string,
  files: string[],
): string | undefined {
  const normalizedFiles = new Map(files.map((file) => [file.toLowerCase(), file]));
  if (/\b(?:flutter|dart) pub (?:get|upgrade)\b/i.test(command)) {
    const cwd = command.match(/\(cwd:\s*(.+)\)\s*$/)?.[1]?.trim();
    const relative = cwd ? path.relative(root, cwd).replace(/\\/g, "/") : "";
    const candidate = relative && relative !== "." ? `${relative}/pubspec.yaml` : "pubspec.yaml";
    return normalizedFiles.get(candidate.toLowerCase());
  }
  const mentioned = errorOutput.match(
    /(?:^|\n)([^\n:]*package\.json):\s*(?:imported packages|script tools|react major|@testing-library)/i,
  )?.[1];
  if (mentioned) return normalizedFiles.get(mentioned.replace(/\\/g, "/").toLowerCase());
  if (!/\b(?:npm|pnpm|yarn|bun)\s+install\b/i.test(command)) return undefined;
  const cwd = command.match(/\(cwd:\s*(.+)\)\s*$/)?.[1]?.trim();
  if (cwd) {
    const relative = path.relative(root, cwd).replace(/\\/g, "/");
    const candidate = relative && relative !== "." ? `${relative}/package.json` : "package.json";
    const actual = normalizedFiles.get(candidate.toLowerCase());
    if (actual) return actual;
  }
  return files.find((file) => path.posix.basename(file).toLowerCase() === "package.json");
}

export class CodeGenAgent extends BaseAgent {
  constructor() {
    super({
      name: "Code Generation Agent V2",
      phase: "code_gen",
      description:
        "Generates project source code from completed Stitch designs and validates/repairs it.",
    });
  }

  protected async execute(input: AgentInput, _llm: BaseChatModel): Promise<AgentResult> {
    const technicalPlan = input.payload.technicalPlan;
    const documentsPath = input.payload.documentsPath as string;

    if (!technicalPlan || !documentsPath) {
      throw new AgentError(
        "Missing technicalPlan or documentsPath from Planning phase.",
        this.phase,
      );
    }

    const projectRoot = path.join(process.cwd(), "runs", "workspaces", input.projectId);
    const workspaceRoot =
      input.payload.repairOnly && typeof input.payload.repairDirectory === "string"
        ? safePath(projectRoot, input.payload.repairDirectory)
        : projectRoot;

    // Code generation uses the dedicated code model rather than the smaller planning model.
    // Fail before architecture/file generation if that model is unavailable.
    if (!input.llm && config.LLM_PROVIDER === "ollama")
      await ensureOllamaReady(config.OLLAMA_BASE_URL, config.OLLAMA_CODE_MODEL, (message) =>
        input.onMessage?.("agent:message", { phase: "code_gen", message }),
      );
    const codeModel =
      input.llm ?? createTier2LLM({ maxTokens: 8192, contextWindow: 16384, temperature: 0.1 });

    try {
      await fs.mkdir(workspaceRoot, { recursive: true });
    } catch (err) {
      throw new AgentError(`Failed to create workspace directory: ${String(err)}`, this.phase);
    }

    // ─── Step 1: Read Planning Documents ───
    this.log.info({ documentsPath }, "Reading planning documents for context");
    const planningContext = await this.readPlanningDocs(documentsPath);
    const requirements = JSON.stringify(
      {
        rawIdea: input.payload.rawIdea,
        validatedIdea: input.payload.validatedIdea,
        approvedRequirements: input.payload.approvedRequirements,
        technicalPlan,
      },
      null,
      2,
    );
    // Planning documents establish a stack when the original idea is framework-agnostic.
    // Explicit approved requirements remain last so a user override wins chronological selection.
    const stackText = `${JSON.stringify(planningContext)}\n${String(
      input.payload.approvedRequirements ??
        input.payload.rawIdea ??
        JSON.stringify(input.payload.validatedIdea),
    )}`;
    const target = resolveProjectTarget(
      String(
        input.payload.approvedRequirements ??
          input.payload.rawIdea ??
          JSON.stringify(input.payload.validatedIdea) ??
          "",
      ),
      technicalPlan,
    );
    const mobileFramework =
      target.platform === "mobile" &&
      (target.framework === "flutter" || target.framework === "react-native")
        ? target.framework
        : undefined;
    let framework =
      mobileFramework === "react-native"
        ? "react native"
        : (mobileFramework ?? requiredFramework(stackText));
    if (target.framework === "web" && (framework === "flutter" || framework === "react native"))
      framework = "react";
    await fs.writeFile(
      path.join(workspaceRoot, "project-target.json"),
      JSON.stringify(target, null, 2),
    );

    const legacyRepair =
      input.payload.repairOnly === true &&
      input.payload.legacyRepair === true &&
      !input.payload.stitch;
    const stitch = legacyRepair
      ? undefined
      : requireStitchResult(input.payload, input.interactive === true);
    if (legacyRepair)
      input.onMessage?.("agent:message", {
        phase: "code_gen",
        message:
          "Repairing existing source without saved Stitch approval metadata. No new architecture or design generation will run; design fidelity is not verified.",
      });
    const approvedStitchContext = JSON.stringify(stitch?.screens ?? []);
    const stitchUrl = stitch?.url ?? null;
    input.onMessage?.("agent:message", {
      phase: "code_gen",
      message: "Loading approved Stitch HTML, tokens and responsive layouts...",
    });
    const designs = stitch ? await loadDesignReference(workspaceRoot, stitch) : undefined;
    const designWrites = designs ? await readDesignWrites(workspaceRoot) : {};

    // ─── Step 3: Phase 3.2 - Code Generation ───
    if (input.onMessage)
      input.onMessage("agent:message", {
        phase: "code_gen",
        message: input.payload.repairOnly
          ? "Repairing the saved project in place..."
          : `💻 Generating full project architecture...`,
      });
    this.log.info("Generating project file structure...");

    const mlPlanningContext = `${requirements}\n${JSON.stringify(planningContext)}`;
    const mlPlan =
      input.payload.repairOnly ||
      (mobileFramework &&
        !/\b(?:train(?:ing)?|fine[ -]?tun(?:e|ing))\b[\s\S]{0,80}\b(?:model|neural|cnn|rnn|dataset)\b/i.test(
          String(input.payload.approvedRequirements ?? input.payload.rawIdea ?? ""),
        ))
        ? MLPlanSchema.parse({
            requiresTraining: false,
            task: "none",
            modalities: [],
            framework: "none",
            modelFamily: "none",
            mode: "none",
            datasetSchema: "none",
            splitStrategy: "none",
            metrics: [],
            acceptanceCriteria: [],
            compute: { device: "auto", maxRuntimeMinutes: 120, maxMemoryGB: 8 },
            rationale: "Mobile application without an explicit model training requirement.",
          })
        : await resolveMLPlan(workspaceRoot, codeModel, mlPlanningContext, (message) =>
            input.onMessage?.("agent:message", { phase: "code_gen", message }),
          );
    const mlProject = mlPlan.requiresTraining;
    const mlTeam = mlProject ? new MLWorkerTeam(() => codeModel) : null;
    const flutterToolchain = mobileFramework === "flutter"
      ? await runMobileCommand({ file: "flutter", args: ["--version", "--machine"], cwd: workspaceRoot, timeoutMs: 60000 })
      : "";
    const combinedContext = `
      ${flutterToolchain ? `INSTALLED FLUTTER TOOLCHAIN (authoritative, not a suggested version): ${flutterToolchain}. environment.sdk must admit this installed Dart version. Use current widget APIs and official SDK platform scaffolds, not obsolete Gradle scripts or node_modules/flutter paths.` : ""}
      ${mlProject ? mlContract : ""}
      ${mobileFramework ? `LOCKED MOBILE CLIENT: ${mobileFramework}. Generate real native UI, working navigation, input validation and durable local persistence. Implement required APIs and behavioral tests. Android native build/install/launch will be verified. Use official platform scaffolds; never invent binary Gradle wrappers. Preserve the approved Expo or bare React Native runtime. Include finite typecheck/test commands. If a local backend is needed, generate loom.services.json at the workspace root with services:[{name,directory,file,args,healthUrl}]. Use a real local HTTP health route, declared server entry and finite startup; the runner starts services and reverses their ports to Android. Configure the mobile API host as localhost for this adb reverse setup. Implement real required local services and persistent data; do not simulate successful authentication or invent credentials.` : ""}
      --- VALIDATED ML PLAN ---
      ${JSON.stringify(mlPlan, null, 2)}
      --- AUTHORITATIVE USER REQUIREMENTS (override alternatives mentioned in documents) ---
      ${requirements}
      Preserve the requested stack through every file and repair. Stitch HTML is a visual reference only.
      --- UI DESIGN ---
      ${planningContext.uiDesign}
      --- ACTUAL APPROVED STITCH SCREEN STRUCTURE ---
      ${designs ? designSummary(designs) : "No UI required"}
      Include all approved screen layouts, shared styling, responsive variants, navigation and assets. Preserve the exported visual hierarchy in the approved framework.
      --- BRD ---
      ${planningContext.brd}
      --- PRD ---
      ${planningContext.prd}

      --- TECHNICAL ARCHITECTURE ---
      ${planningContext.techArch}

      --- SYSTEM DESIGN ---
      ${planningContext.systemDesign}
    `;

    const manifestPath = path.join(workspaceRoot, "codegen-manifest.json");
    let savedStructure: unknown;
    try {
      savedStructure = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    let structureResponse;
    if (savedStructure) {
      const saved = FileStructureSchema.parse(savedStructure);
      const parsed = input.payload.repairOnly
        ? saved
        : completeBehavioralTests(completeBrowserEntrypoints(saved, framework), framework);
      const issues = input.payload.repairOnly ? [] : manifestQualityIssues(parsed, framework);
      if (!issues.length) structureResponse = parsed;
      else {
        if (input.payload.repairOnly)
          throw new AgentError(
            `Repair requires a consistent saved manifest: ${issues.join("; ")}`,
            this.phase,
          );
        const backup = path.join(
          workspaceRoot,
          ".loom-backups",
          new Date().toISOString().replace(/[:.]/g, "-"),
          "codegen-manifest.json",
        );
        await fs.mkdir(path.dirname(backup), { recursive: true });
        await fs.copyFile(manifestPath, backup);
        input.onMessage?.("agent:message", {
          phase: "code_gen",
          message: `Saved architecture is inconsistent and will be regenerated: ${issues.join("; ")}`,
        });
      }
    }
    if (input.payload.repairOnly && !structureResponse)
      throw new AgentError(
        "Repair requires a saved codegen-manifest.json; resume generation first.",
        this.phase,
      );
    structureResponse ??= await this.generateFileStructure(
      combinedContext,
      approvedStitchContext,
      codeModel,
      (message) => input.onMessage?.("agent:message", { phase: "code_gen", message }),
      path.join(workspaceRoot, "architecture-progress.json"),
    );
    const reconciled = input.payload.repairOnly
      ? { manifest: structureResponse, removed: [] as Array<{ path: string; description: string }> }
      : reconcileTrainingFiles(structureResponse, mlProject, mlPlanningContext);
    // Legacy runs may have orphaned injected ML files outside their saved manifest.
    if (!mlProject && !input.payload.repairOnly) {
      const actualFiles = await projectFiles(workspaceRoot);
      for (const file of mlFiles) {
        if (
          actualFiles.includes(file.path) &&
          !reconciled.removed.some((old) => old.path === file.path)
        )
          reconciled.removed.push(file);
      }
    }
    structureResponse = reconciled.manifest;
    if (reconciled.removed.length) {
      input.onMessage?.("agent:message", {
        phase: "code_gen",
        message: `Removed ${reconciled.removed.length} stale training entries from this non-training project's manifest.`,
      });
      for (const file of reconciled.removed) {
        const target = safePath(workspaceRoot, file.path);
        let old: string;
        try {
          old = await fs.readFile(target, "utf8");
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
          throw error;
        }
        try {
          validateSource(file.path, old);
        } catch {
          const backup = path.join(workspaceRoot, ".loom-backups", `${Date.now()}`, file.path);
          await fs.mkdir(path.dirname(backup), { recursive: true });
          await fs.rename(target, backup);
        }
      }
    }
    for (let attempt = 0; !input.payload.repairOnly && attempt < 3; attempt++) {
      const previousPaths = new Set(structureResponse.files.map((file) => file.path));
      structureResponse = completeBehavioralTests(completeBrowserEntrypoints(structureResponse, framework), framework);
      const added = structureResponse.files.filter((file) => !previousPaths.has(file.path));
      if (added.length)
        input.onMessage?.("agent:message", {
          phase: "code_gen",
          message: `Completed missing startup and behavioral test responsibilities: ${added.map((file) => file.path).join(", ")}. Preserving the generated feature architecture.`,
        });
      structureResponse = prepareManifest(structureResponse, workspaceRoot);
      const paths = structureResponse.files.map((f) => f.path.replace(/\\/g, "/"));
      paths.forEach((f) => safePath(workspaceRoot, f));
      let valid = true;
      const qualityIssues = manifestQualityIssues(structureResponse, framework);
      try {
        assertRequiredStructure(framework, paths);
      } catch {
        valid = false;
      }
      if (valid && new Set(paths).size === paths.length && !qualityIssues.length) break;
      if (attempt === 2)
        throw new AgentError(
          `Generated structure violates the approved stack or is internally inconsistent: ${qualityIssues.join("; ")}`,
          this.phase,
        );
      structureResponse = await this.generateFileStructure(
        `${combinedContext}\nREJECTED STRUCTURE: ${JSON.stringify(paths)}. Problems: ${qualityIssues.join("; ")}. Correct duplicates and implement the required framework ${framework} with its native manifests and entry points.`,
        approvedStitchContext,
        codeModel,
        (message) => input.onMessage?.("agent:message", { phase: "code_gen", message }),
      );
    }

    if (mlProject) {
      // Generate shared ML interfaces first; all application workers consume the same contract.
      const otherFiles = structureResponse.files.filter(
        (file) => !mlFiles.some((ml) => ml.path === file.path),
      );
      structureResponse.files = [
        ...mlFiles.map(({ path, description }) => ({ path, description })),
        ...otherFiles,
      ];
      await ensureMLConfig(workspaceRoot, {
        device: mlPlan.compute.device,
        mode: mlPlan.mode === "none" ? "new" : mlPlan.mode,
        maxRuntimeMinutes: mlPlan.compute.maxRuntimeMinutes,
      });
    }
    await fs.writeFile(manifestPath, JSON.stringify(structureResponse, null, 2));
    const quarantined = input.payload.repairOnly
      ? []
      : await quarantineInvalidOrphans(workspaceRoot, structureResponse.files);
    if (quarantined.length)
      input.onMessage?.("agent:message", {
        phase: "code_gen",
        message: `Backed up ${quarantined.length} invalid files left by an older manifest before generation.`,
      });
    if (input.onMessage)
      input.onMessage("agent:message", {
        phase: "code_gen",
        message: input.payload.repairOnly
          ? `Inspecting ${structureResponse.files.length} saved files for repair...`
          : `💻 Writing ${structureResponse.files.length} files to workspace...`,
      });

    const structureSummary = structureResponse.files.map((f) => f.path).join("\n");
    const generatedFiles: string[] = input.payload.repairOnly
      ? structureResponse.files.map((file) => file.path)
      : [];
    const interfaces = new InterfaceIndex();
    const appTeam = new ApplicationWorkerTeam(() => codeModel);
    const mobileTeam = mobileFramework
      ? new MobileWorkerTeam(mobileFramework, () => codeModel)
      : undefined;
    const audit = await auditSources(workspaceRoot, structureResponse.files);
    await fs.writeFile(
      path.join(workspaceRoot, "source-audit.json"),
      JSON.stringify(audit, null, 2),
    );
    input.onMessage?.("agent:message", {
      phase: "code_gen",
      message: `Source audit: ${audit.counts.invalid}/${audit.counts.total} files need generation or repair. Report: source-audit.json`,
    });
    // Include valid files from the entire saved workspace, not just the most recently written tail.
    for (const entry of audit.entries.filter((entry) => entry.status === "valid"))
      interfaces.add(entry.path, await fs.readFile(safePath(workspaceRoot, entry.path), "utf8"));
    const ordered = input.payload.repairOnly
      ? designs ? [
          ...structureResponse.files.filter((file) => designFile(file.path)),
          ...audit.entries.filter((entry) => designFile(entry.path) &&
            !structureResponse.files.some((file) => file.path === entry.path))
            .map((entry) => ({ path: entry.path, description: `Existing UI module ${entry.path}; preserve its responsibility and approved design` })),
        ] : []
      : mlProject
        ? [
            ...structureResponse.files.filter((f) => f.path.startsWith("ml/")),
            ...orderSourceFiles(structureResponse.files.filter((f) => !f.path.startsWith("ml/"))),
          ]
        : orderSourceFiles(structureResponse.files);
    // Reviews return a small JSON verdict but need room for native dependencies.
    const reviewModel = input.llm ?? createTier2LLM({ maxTokens: 2048, contextWindow: 32768, temperature: 0 });
    const generationFailuresPath = path.join(
      workspaceRoot,
      ".loom-design",
      "generation-failures.json",
    );
    let generationFailures: Record<string, string> = {};
    try {
      const saved = JSON.parse(await fs.readFile(generationFailuresPath, "utf8"));
      if (saved && typeof saved === "object" && !Array.isArray(saved))
        generationFailures = Object.fromEntries(
          Object.entries(saved).filter(([, value]) => typeof value === "string"),
        ) as Record<string, string>;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT" && !(error instanceof SyntaxError))
        throw error;
    }
    const saveFailures = async () => {
      await fs.mkdir(path.dirname(generationFailuresPath), { recursive: true });
      await fs.writeFile(
        `${generationFailuresPath}.tmp`,
        JSON.stringify(generationFailures, null, 2),
      );
      await fs.rename(`${generationFailuresPath}.tmp`, generationFailuresPath);
    };
    const generateOne = async (
      fileMeta: (typeof ordered)[number],
      progress: string,
    ): Promise<void> => {
      const fullPath = safePath(workspaceRoot, fileMeta.path);
      const draftPath = path.join(
        workspaceRoot,
        ".loom-design",
        "rejected",
        `${designHash(fileMeta.path)}.json`,
      );
      let rejectedDraft: { source: string; issues: string[] } | undefined;
      if (designs && designFile(fileMeta.path)) {
        try {
          const saved = JSON.parse(await fs.readFile(draftPath, "utf8"));
          if (
            saved.design === designs.fingerprint &&
            saved.file === fileMeta.path &&
            typeof saved.source === "string" &&
            Array.isArray(saved.issues)
          )
            rejectedDraft = saved;
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT" && !(error instanceof SyntaxError))
            throw error;
        }
      }
      let existing = "";
      let existed = false;
      try {
        existing = await fs.readFile(fullPath, "utf8");
        existed = true;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
      // Existing code is never replaced by a candidate that has not passed review.
      // Failed candidates stay in .loom-design/rejected, including on resume.
      const canCheckpointSource = !existed;
      let reusable = false;
      if (existed) {
        try {
          validateSource(fileMeta.path, existing);
          if (mobileFramework) assertMobileStack(fileMeta.path, existing, mobileFramework);
          validateFilePurpose(fileMeta.path, existing, structureSummary);
          validateStyleBindings(fileMeta.path, existing, interfaces.stylingFor(fileMeta.path));
          reusable = true;
          if (designs && designFile(fileMeta.path)) {
            const previous = designWrites[fileMeta.path];
            reusable =
              previous?.design === designs.fingerprint && previous?.source === designHash(existing);
          }
        } catch {
          /* Invalid source becomes bounded repair context, never a peer interface. */
        }
      }
      const role =
        mlTeam && fileMeta.path.startsWith("ml/")
          ? `ML ${mlTeam.roleFor(fileMeta.path)}`
          : applicationRole(fileMeta.path);
      input.onMessage?.("agent:message", {
        phase: "code_gen",
        message: `${progress} ${reusable ? "Reusing validated" : `${role} worker generating`}: ${fileMeta.path}`,
      });
      const evidence = {
        reviewModel,
        reviewDependencies: await nativeReviewDependencies(workspaceRoot, fileMeta.path, existing),
        structure: structureSummary,
        interfaces: interfaces.forFile(fileMeta.path, fileMeta.description),
        constraints: `Required framework: ${framework ?? "use the approved technical plan"}. Model training required: ${mlProject}.\n${String(input.payload.approvedRequirements ?? input.payload.rawIdea ?? "").slice(0, 1000)}`,
        currentFile: !reusable
          ? (existed ? existing : rejectedDraft?.source)
          : undefined,
        onSourceCheckpoint: async (source: string) => {
          validateSource(fileMeta.path, source);
          if (mobileFramework) assertMobileStack(fileMeta.path, source, mobileFramework);
          validateFilePurpose(fileMeta.path, source, structureSummary);
          // Never replace already reviewed work with an unapproved candidate.
          // New files remain visible/buildable while their design gate is pending.
          if (canCheckpointSource && source !== existing) {
            await saveGeneratedSource(workspaceRoot, fileMeta.path, source, "");
            existing = source;
            existed = true;
          }
          await fs.mkdir(path.dirname(draftPath), { recursive: true });
          await fs.writeFile(draftPath, JSON.stringify({
            file: fileMeta.path, design: designs?.fingerprint, source,
            issues: ["Source checkpoint: design review is pending"],
          }, null, 2));
        },
        onDesignRejection: async (source: string, issues: string[]) => {
          await fs.mkdir(path.dirname(draftPath), { recursive: true });
          await fs.writeFile(
            draftPath,
            JSON.stringify(
              { file: fileMeta.path, design: designs?.fingerprint, source, issues },
              null,
              2,
            ),
          );
        },
        design: designEvidenceFor(designs, fileMeta.path, fileMeta.description),
        styling: interfaces.stylingFor(fileMeta.path),
      };
      const draftIssues = currentDraftIssues(existed ? existing : undefined, rejectedDraft);
      const fileContext = `${combinedContext}\nApproved design names: ${summarizeDesigns(approvedStitchContext)}\n${draftIssues.length ? `Prior reviewer observations about this exact candidate (verify against the reference before changing it): ${draftIssues.join("; ")}` : ""}`;
      const content = reusable
        ? existing
        : mlTeam && fileMeta.path.startsWith("ml/")
          ? await mlTeam.generate(fileMeta, fileContext, evidence)
          : mobileTeam && mobileFramework && isMobileClientFile(fileMeta.path, mobileFramework)
            ? await mobileTeam.generate(fileMeta, fileContext, evidence)
            : await appTeam.generate(fileMeta, fileContext, evidence);
      if (!reusable) await saveGeneratedSource(workspaceRoot, fileMeta.path, content, existing);
      if (designs && designFile(fileMeta.path)) await fs.rm(draftPath, { force: true });
      if (designs && designFile(fileMeta.path))
        await recordDesignWrite(workspaceRoot, designs, fileMeta.path, content);
      interfaces.add(fileMeta.path, content);
      generatedFiles.push(fileMeta.path);
      if (generationFailures[fileMeta.path]) {
        delete generationFailures[fileMeta.path];
        await saveFailures();
      }
    };

    const deferred: Array<{
      fileMeta: (typeof ordered)[number];
      index: number;
      firstError: string;
    }> = [];
    for (const [index, fileMeta] of ordered.entries()) {
      try {
        await generateOne(fileMeta, `[${index + 1}/${ordered.length}]`);
      } catch (error) {
        deferred.push({ fileMeta, index, firstError: String(error) });
        generationFailures[fileMeta.path] = String(error);
        await saveFailures();
        input.onMessage?.("agent:message", {
          phase: "code_gen",
          message: `Deferred ${fileMeta.path}: ${String(error).slice(0, 2000)}\nContinuing so its retry can use more completed interfaces. Full diagnostics saved in .loom-design/generation-failures.json.`,
        });
      }
    }
    const retryFailures: string[] = [];
    for (const [retryIndex, item] of deferred.entries()) {
      try {
        await generateOne(item.fileMeta, `[retry ${retryIndex + 1}/${deferred.length}]`);
      } catch (error) {
        generationFailures[item.fileMeta.path] = String(error);
        await saveFailures();
        input.onMessage?.("agent:message", {
          phase: "code_gen",
          message: `Retry failed for ${item.fileMeta.path}: ${String(error).slice(0, 2000)}`,
        });
        retryFailures.push(
          `${item.fileMeta.path}: ${String(error)} (initial failure: ${item.firstError})`,
        );
      }
    }
    if (retryFailures.length) {
      const failedAudit = await auditSources(workspaceRoot, structureResponse.files);
      await fs.writeFile(
        path.join(workspaceRoot, "source-audit.json"),
        JSON.stringify(failedAudit, null, 2),
      );
      throw new AgentError(
        `Unable to generate ${retryFailures.length} file(s) after a deferred retry:\n${retryFailures.join("\n").slice(0, 8000)}. All validated files are saved; resume this same project to retry only unresolved files.`,
        this.phase,
      );
    }

    // ─── Step 4: Phase 3.3 - Autonomous Self-Healing Execution ───
    if (input.onMessage)
      input.onMessage("agent:message", {
        phase: "code_gen",
        message: `🔧 Initiating autonomous build & self-healing sequence...`,
      });
    const notify = (message: string) =>
      input.onMessage?.("agent:message", { phase: "code_gen", message });
    let preparation: MobilePreparation | undefined;
    let runtime: MobileRuntimeResult | undefined;
    let validation: Awaited<ReturnType<CodeGenAgent["selfHealingExecute"]>> = {
      success: false,
      checks: [],
      attempts: 0,
    };
    const validateAndLaunch = async () => {
      try {
        if (mobileFramework)
          preparation = await prepareMobileProject(workspaceRoot, target, notify);
        validation = await this.selfHealingExecute(
          workspaceRoot,
          `Required framework: ${framework}.\n${combinedContext}`,
          codeModel,
          input.onMessage,
          framework,
          designs,
          preparation?.env,
        );
        if (mobileFramework && validation.success && preparation) {
          preparation.forwardedPorts = await startLocalServices(
            workspaceRoot,
            preparation.env,
            notify,
          );
          runtime = await runMobileApp(preparation, notify);
        } else runtime = undefined;
      } catch (error) {
        validation = { success: false, checks: [], attempts: 0, error: String(error) };
        runtime = undefined;
      }
      await fs.writeFile(
        path.join(workspaceRoot, "validation-report.json"),
        JSON.stringify(validation, null, 2),
      );
      return {
        success: validation.success && (!mobileFramework || runtime?.success === true),
        message:
          validation.error ??
          runtime?.error ??
          (runtime?.isRunning
            ? `Native app ${runtime.packageId} is running on ${runtime.deviceId}`
            : "Validation passed"),
      };
    };
    let outcome = await validateAndLaunch();
    const seenFailures = new Set<string>();
    for (let attempt = 0; mobileFramework && !outcome.success && attempt < 2; attempt++) {
      if (
        /SDK is missing|platform-tools are missing|No installed Android|Unable to establish loopback|unauthorized|emulator exited|emulator did not|command not found|not recognized|ENOTFOUND|fetch failed|licenses? not accepted/i.test(
          outcome.message,
        ) ||
        seenFailures.has(outcome.message)
      )
        break;
      seenFailures.add(outcome.message);
      try {
        if (
          !(await this.healError(
            workspaceRoot,
            "Native Android build and launch",
            outcome.message,
            codeModel,
            combinedContext,
            designs,
          ))
        )
          break;
        outcome = await validateAndLaunch();
      } catch (error) {
        notify(`Automatic native repair failed: ${String(error)}`);
        break;
      }
    }
    if (mobileFramework && !outcome.success && input.interactive && input.waitForUserInput) {
      outcome = await runMobileRepairLoop({
        waitForUserInput: input.waitForUserInput,
        onMessage: notify,
        initialResult: outcome,
        stopOnSuccess: true,
        retry: validateAndLaunch,
        repair: async (error) => {
          runtime = undefined;
          const changed = await this.healError(
            workspaceRoot,
            "User-reported mobile app error",
            error,
            codeModel,
            combinedContext,
            designs,
          );
          return {
            success: changed,
            message: changed
              ? "Applied source repair; revalidating and relaunching."
              : "No validated source repair was applied.",
          };
        },
        onHistory: async (history) => {
          await fs.mkdir(path.join(workspaceRoot, ".loom-mobile"), { recursive: true });
          await fs.writeFile(
            path.join(workspaceRoot, ".loom-mobile/repair-history.json"),
            JSON.stringify(history, null, 2),
          );
        },
      });
    }

    let mlExecution: Awaited<ReturnType<typeof runMLPipeline>> | undefined;
    if (mlProject && validation.success) {
      const notify = (message: string) =>
        input.onMessage?.("agent:message", { phase: "code_gen", message });
      mlExecution = await runMLPipeline(workspaceRoot, notify);
      // Training failures get one targeted code-repair pass; missing data is never fabricated.
      if (mlExecution.status === "failed" && mlExecution.failureKind === "code") {
        try {
          await this.healError(
            workspaceRoot,
            "ML pipeline execution",
            mlExecution.error ?? "Training failed",
            codeModel,
            combinedContext,
            designs,
          );
          const recheck = await this.selfHealingExecute(
            workspaceRoot,
            combinedContext,
            codeModel,
            input.onMessage,
            framework,
            designs,
          );
          if (recheck.success) mlExecution = await runMLPipeline(workspaceRoot, notify);
        } catch (error) {
          notify(`ML repair failed: ${String(error)}`);
        }
      }
      if (mlExecution.status === "failed" && mlExecution.failureKind !== "code")
        notify(
          `ML ${mlExecution.failureKind ?? "runtime"} failure was not sent to source repair because changing code would not correct the prerequisite or resource problem.`,
        );
      await fs.writeFile(
        path.join(workspaceRoot, "ml-execution-report.json"),
        JSON.stringify(mlExecution, null, 2),
      );
      if (mlExecution.status !== "completed")
        notify(mlExecution.error ?? "ML execution incomplete");
    }

    // ─── Step 5: Phase 3.4 - README Generation ───
    if (input.onMessage)
      input.onMessage("agent:message", {
        phase: "code_gen",
        message: input.payload.repairOnly
          ? "Saving validation and runtime results."
          : `📝 Writing comprehensive README.md...`,
      });
    if (!input.payload.repairOnly)
      await this.generateReadme(
        workspaceRoot,
        `${combinedContext}\nACTUAL NATIVE RUNTIME: ${JSON.stringify(runtime)}\nACTUAL VALIDATION: ${JSON.stringify(validation)}\nACTUAL ML EXECUTION: ${JSON.stringify(mlExecution)}`,
        codeModel,
      );

    generatedFiles.push("README.md");

    this.log.info(
      { generatedCount: generatedFiles.length, validated: validation.success },
      "Code generation phase complete",
    );

    return {
      success: outcome.success && (!mlProject || mlExecution?.status === "completed"),
      error:
        (!outcome.success ? outcome.message : undefined) ??
        validation.error ??
        (mlExecution?.status !== "completed" ? mlExecution?.error : undefined),
      data: {
        generatedFiles,
        workspaceRoot,
        isRunning: outcome.success && runtime?.isRunning === true,
        runtime,
        target,
        validation,
        mlExecution,
        stitchUrl,
      },
    };
  }

  // ─────────────────────────────────────────────
  // Phase 3.1: Stitch Interactive Loop
  // ─────────────────────────────────────────────

  // ─────────────────────────────────────────────
  // Phase 3.2: Code Generation Helpers
  // ─────────────────────────────────────────────

  private async readPlanningDocs(docsPath: string) {
    const readSafely = async (filename: string) => {
      try {
        return await fs.readFile(path.join(docsPath, filename), "utf8");
      } catch {
        return "";
      }
    };

    return {
      prd: await readSafely("PRD.md"),
      brd: await readSafely("BRD.md"),
      techArch: await readSafely("TECHNICAL_ARCHITECTURE.md"),
      systemDesign: await readSafely("SYSTEM_DESIGN.md"),
      uiDesign: await readSafely("UI_DESIGN.md"),
    };
  }

  private async generateFileStructure(
    context: string,
    stitchContext: string,
    llm: BaseChatModel,
    notify?: (message: string) => void,
    cachePath?: string,
  ) {
    return generateArchitecture(
      llm,
      context,
      summarizeDesigns(stitchContext),
      notify,
      600_000,
      cachePath,
    );
  }

  // ─────────────────────────────────────────────
  // Phase 3.3: Autonomous Self-Healing Execution
  // ─────────────────────────────────────────────

  private async selfHealingExecute(
    workspacePath: string,
    context: string,
    llm: BaseChatModel,
    onMessage?: AgentInput["onMessage"],
    framework?: string,
    designs?: DesignReference,
    env?: NodeJS.ProcessEnv,
  ) {
    return validateAndHeal(
      workspacePath,
      async (check, error) => {
        try {
          if (await repairNodePeerConflict(workspacePath, check, error)) return true;
          return await this.healError(
            workspacePath,
            `${check.command} (cwd: ${check.cwd})`,
            error,
            llm,
            context,
            designs,
          );
        } catch (error) {
          this.log.error({ error: String(error) }, "Repair failed");
          return false;
        }
      },
      (check) => runCheck(check, env),
      (message) => onMessage?.("agent:message", { phase: "code_gen", message }),
      async () => {
        await assertRequiredWorkspace(workspacePath, framework);
        await assertNodePackageIntegrity(workspacePath);
        const manifest = FileStructureSchema.parse(
          JSON.parse(await fs.readFile(path.join(workspacePath, "codegen-manifest.json"), "utf8")),
        );
        await assertSourceAudit(workspacePath, manifest.files);
        if (designs) {
          const known = new Set(manifest.files.map((file) => file.path));
          const added = (await projectFiles(workspacePath))
            .filter((file) => !known.has(file))
            .map((file) => ({ path: file, description: file }));
          await assertDesignImplementation(workspacePath, designs, [...manifest.files, ...added]);
        }
      },
      { nativeMobile: !!env && (framework === "flutter" || framework === "react native") },
    );
  }

  private async healError(
    root: string,
    command: string,
    errorOutput: string,
    llm: BaseChatModel,
    context: string,
    designs?: DesignReference,
  ): Promise<boolean> {
    const files = await projectFiles(root);
    const forcedManifest = repairManifestTarget(root, command, errorOutput, files);
    // Diagnose first; generate each repair through the same source contract as initial codegen.
    const selection = forcedManifest
      ? undefined
      : await retryInference(() =>
          llm.invoke(
            [
              new SystemMessage(
                "Diagnose the build failure. Return readFiles and edits. Read every existing file you plan to edit. Each edit has filePath and instruction. New files are allowed only if the failure requires them. Keep the approved framework and all real validation checks.",
              ),
              new HumanMessage(
                `Command: ${command}\nError: ${errorOutput.slice(-5000)}\nFiles: ${JSON.stringify(files)}\nReturn a minimal repair plan.`,
              ),
            ],
            {
              signal: AbortSignal.timeout(900000),
              format: {
                type: "object",
                required: ["readFiles", "edits"],
                additionalProperties: false,
                properties: {
                  readFiles: { type: "array", maxItems: 8, items: { type: "string" } },
                  edits: {
                    type: "array",
                    minItems: 1,
                    maxItems: 4,
                    items: {
                      type: "object",
                      required: ["filePath", "instruction"],
                      properties: { filePath: { type: "string" }, instruction: { type: "string" } },
                    },
                  },
                },
              },
            } as any,
          ),
        );
    const plan = forcedManifest
      ? {
          readFiles: [forcedManifest],
          edits: [
            {
              filePath: forcedManifest,
              instruction: `Correct this Node package manifest for the exact failure without force or legacy-peer-deps: ${errorOutput.slice(-3000)}`,
            },
          ],
        }
      : z
          .object({
            readFiles: z.array(z.string()).max(8),
            edits: z
              .array(z.object({ filePath: z.string(), instruction: z.string().min(1) }))
              .min(1)
              .max(4),
          })
          .parse(extractAndParseJson(String(selection!.content)));
    const contents: Record<string, string> = {};
    const interfaces = new InterfaceIndex();
    // A component-only repair still needs the real stylesheet runtime and class contract.
    for (const file of files.filter((file) => /\.css$|(?:^|\/)package\.json$/.test(file))) {
      const full = safePath(root, file);
      if ((await fs.stat(full)).size > 100_000) continue;
      const source = await fs.readFile(full, "utf8");
      try {
        validateSource(file, source);
        interfaces.add(file, source);
      } catch {
        /* Broken style/config files remain available for explicit repair reads. */
      }
    }
    for (const file of plan.readFiles) {
      if (!files.includes(file)) throw new Error(`Repair requested nonexistent file: ${file}`);
      const full = safePath(root, file);
      if ((await fs.stat(full)).size > 100_000)
        throw new Error(`Repair context file too large: ${file}`);
      contents[file] = await fs.readFile(full, "utf8");
      try {
        validateSource(file, contents[file]!);
        interfaces.add(file, contents[file]!);
      } catch {
        /* Never treat old prose as an API contract. */
      }
    }
    const fixes = [];
    const editedPaths = new Set<string>();
    for (const edit of plan.edits) {
      safePath(root, edit.filePath);
      if (editedPaths.has(edit.filePath.toLowerCase()))
        throw new Error(`Duplicate repair path: ${edit.filePath}`);
      editedPaths.add(edit.filePath.toLowerCase());
      if (files.includes(edit.filePath) && contents[edit.filePath] === undefined)
        throw new Error(`Cannot replace unread file ${edit.filePath}`);
      let correctedContent = await generateSource(
        llm,
        {
          path: edit.filePath,
          description: `Repair: ${edit.instruction}. Failing command: ${command}. Actual failure: ${errorOutput.slice(-2000)}. Preserve unrelated behavior and checks.`,
        },
        context,
        "Code repair engineer",
        {
          structure: files.join("\n"),
          interfaces: interfaces.forFile(edit.filePath, edit.instruction),
          currentFile: contents[edit.filePath] ?? "",
          design: designEvidenceFor(designs, edit.filePath, edit.instruction),
          styling: interfaces.stylingFor(edit.filePath),
        },
      );
      correctedContent = await reviewDesignSource(
        llm,
        { path: edit.filePath, description: edit.instruction },
        correctedContent,
        context,
        "Code repair engineer",
        {
          design: designEvidenceFor(designs, edit.filePath, edit.instruction),
          interfaces: interfaces.forFile(edit.filePath, edit.instruction),
          styling: interfaces.stylingFor(edit.filePath),
        },
      );
      const locked = context.match(/LOCKED MOBILE CLIENT: (flutter|react-native)/)?.[1];
      const repairFramework =
        locked === "react-native" ? "react native" : (locked ?? requiredFramework(context));
      if (repairFramework === "flutter" || repairFramework === "react native")
        assertMobileStack(
          edit.filePath,
          correctedContent,
          repairFramework === "flutter" ? "flutter" : "react-native",
        );
      fixes.push({ filePath: edit.filePath, correctedContent });
      interfaces.add(edit.filePath, correctedContent);
    }
    const staged = [];
    for (const fix of fixes) {
      const full = safePath(root, fix.filePath);
      if (files.includes(fix.filePath) && contents[fix.filePath] === undefined)
        throw new Error(`Cannot replace unread file ${fix.filePath}`);
      if (fix.filePath.endsWith("package.json")) {
        const next = JSON.parse(fix.correctedContent),
          old = JSON.parse(contents[fix.filePath] ?? "{}");
        for (const section of ["scripts", "dependencies", "devDependencies"]) {
          for (const key of Object.keys(old[section] ?? {}))
            if (!(key in (next[section] ?? {})))
              throw new Error(`Repair would discard ${section}.${key}`);
        }
      }
      // Validate the whole repair set before changing any source file.
      validateSource(fix.filePath, fix.correctedContent);
      validateFilePurpose(fix.filePath, fix.correctedContent, files.join("\n"));
      staged.push({ full, ...fix });
    }
    let changed = false;
    for (const fix of staged) {
      if (contents[fix.filePath] === fix.correctedContent) continue;
      await fs.mkdir(path.dirname(fix.full), { recursive: true });
      await saveGeneratedSource(
        root,
        fix.filePath,
        fix.correctedContent,
        contents[fix.filePath] ?? "",
      );
      if (designs && designFile(fix.filePath))
        await recordDesignWrite(root, designs, fix.filePath, fix.correctedContent);
      changed = true;
    }
    return changed;
  }

  // ─────────────────────────────────────────────
  // Phase 3.4: Documentation
  // ─────────────────────────────────────────────

  private async generateReadme(workspacePath: string, context: string, llm: BaseChatModel) {
    try {
      const response = await llm.invoke([
        new SystemMessage(README_PROMPT.replace("{context}", context)),
        new HumanMessage("Generate the complete README.md now. Return only raw markdown."),
      ]);
      let content = String(response.content);
      if (content.startsWith("```")) {
        const lines = content.split("\n");
        if (lines[0]?.startsWith("```")) lines.shift();
        if (lines[lines.length - 1]?.startsWith("```")) lines.pop();
        content = lines.join("\n");
      }
      await fs.writeFile(path.join(workspacePath, "README.md"), content.trim(), "utf8");
    } catch (err) {
      this.log.error({ err: String(err) }, "Failed to generate README");
    }
  }
}

// Auto-instantiate to register with the AgentRegistry
new CodeGenAgent();
