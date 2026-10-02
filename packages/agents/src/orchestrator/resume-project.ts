import { projectFiles, safePath } from "../agents/code-gen/validation.js";
import { FileStructureSchema } from "../agents/code-gen/schema.js";
import { readCheckpoint, phases } from "./checkpoint.js";
import fs from "node:fs/promises";
import path from "node:path";

/** Restore approved planning artifacts across terminal sessions. */
export async function loadDesignResume(projectId: string, cwd = process.cwd()) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId))
    throw new Error("--resume requires a valid saved project UUID");
  const documentsPath = path.join(cwd, "runs", "workspaces", projectId, "docs");
  const names = ["PRD.md", "TECHNICAL_ARCHITECTURE.md", "SYSTEM_DESIGN.md", "UI_DESIGN.md"];
  const docs = await Promise.all(
    names.map(async (name) => {
      const content = await fs.readFile(path.join(documentsPath, name), "utf8");
      if (!content.trim()) throw new Error(`Cannot resume: ${name} is empty`);
      return `--- ${name} ---\n${content}`;
    }),
  );
  const saved = JSON.parse(
    await fs.readFile(path.join(documentsPath, "STITCH_PROJECT.json"), "utf8"),
  );
  if (typeof saved.projectId !== "string" || !/^\d+$/.test(saved.projectId))
    throw new Error("Cannot resume: STITCH_PROJECT.json has no valid Stitch project ID");
  return {
    resumeStitch: true,
    stitchProjectId: saved.projectId,
    documentsPath,
    technicalPlan: { hasFrontend: true, documentsGenerated: names },
    approvedRequirements: docs.join("\n\n"),
    rawIdea: "Continue the saved project using its approved planning documents.",
  };
}

/** Resume the active phase, or the next phase after a completed checkpoint. */
export async function loadProjectResume(
  projectId: string,
  cwd = process.cwd(),
): Promise<Record<string, any>> {
  const saved = readCheckpoint(projectId, cwd);
  if (!saved) return loadDesignResume(projectId, cwd); // Legacy runs saved only design artifacts.
  const index = phases.indexOf(saved.phase);
  if (saved.status === "completed" && saved.phase === "code_gen")
    throw new Error(
      `Project ${projectId} is already complete. Its files are in runs/workspaces/${projectId}; no generation was restarted.`,
    );
  const phase = saved.status === "completed" ? phases[index + 1] : saved.phase;
  return {
    ...saved.context,
    resumePhase: phase,
    resumeProject: true,
    resumeStitch: false,
    resumeHistory: saved.chatHistory,
    resumeDocuments: saved.documents,
  };
}

/** Reopen an existing generated workspace without creating a new architecture. */
export async function loadRepairResume(
  projectId: string,
  cwd = process.cwd(),
): Promise<Record<string, any>> {
  const saved = readCheckpoint(projectId, cwd);
  const workspace = path.join(cwd, "runs/workspaces", projectId);
  if (!(await fs.stat(workspace).catch(() => undefined))?.isDirectory())
    throw new Error(`Cannot repair: saved workspace does not exist at ${workspace}`);
  let scope: { directory?: string; requirements?: string } = {};
  try {
    scope = JSON.parse(await fs.readFile(path.join(workspace, "loom.repair.json"), "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  if (scope.directory !== undefined && typeof scope.directory !== "string")
    throw new Error("Invalid repair directory");
  const directory = scope.directory && scope.directory !== "." ? scope.directory : undefined;
  const root = directory ? safePath(workspace, directory) : workspace;
  const files = await projectFiles(root);
  const targets = files.filter((file) =>
    /(?:^|\/)(?:pubspec.yaml|package.json|pyproject.toml|requirements.txt|Cargo.toml|go.mod|pom.xml)$/.test(
      file,
    ),
  );
  const source = files.filter((file) =>
    /\.(?:dart|[cm]?[jt]sx?|py|rs|go|java|kt|swift|vue|svelte)$/.test(file),
  );
  if (!targets.length || !source.length)
    throw new Error(
      "Cannot repair: no existing application source and build manifest found. Use --resume to continue generation.",
    );
  const manifestPath = path.join(root, "codegen-manifest.json");
  try {
    FileStructureSchema.parse(JSON.parse(await fs.readFile(manifestPath, "utf8")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    const repairFiles = files.filter(
      (file) =>
        !/(?:^|\/)(?:loom.repair.json|package-lock.json|pnpm-lock.yaml|yarn.lock|pubspec.lock)$|\.(?:png|jpe?g|gif|webp|ico|woff2?|ttf|pdf|mp[34]|zip|jar|keystore|jks|iml)$/i.test(
          file,
        ),
    );
    const manifest = FileStructureSchema.parse({
      files: repairFiles.map((file) => ({
        path: file,
        description: `Existing project file: ${file}. Preserve its implementation and repair only diagnosed defects.`,
      })),
    });
    // Exclusive creation preserves another process's saved manifest.
    await fs
      .writeFile(manifestPath, JSON.stringify(manifest, null, 2), { flag: "wx" })
      .catch((error) => {
        if (error.code !== "EEXIST") throw error;
      });
  }
  const documentsPath = path.join(workspace, "docs");
  const planText = await fs
    .readFile(path.join(documentsPath, "TECHNICAL_ARCHITECTURE.md"), "utf8")
    .catch(() => "");
  const observed = targets.some((file) => file.endsWith("pubspec.yaml"))
    ? "Flutter"
    : (
          await Promise.all(
            targets
              .filter((file) => file.endsWith("package.json"))
              .map(async (file) => fs.readFile(path.join(root, file), "utf8")),
          )
        ).some((text) => text.includes('"react-native"'))
      ? "React Native"
      : "";
  const context: Record<string, any> = saved
    ? { ...saved.context, resumeHistory: saved.chatHistory, resumeDocuments: saved.documents }
    : {
        documentsPath,
        technicalPlan: { hasFrontend: !!observed, framework: observed || undefined },
        rawIdea: `Repair the existing ${observed} application in place.`,
        approvedRequirements: `Preserve the existing ${observed} application and its configured services.\n${planText}`,
        resumeHistory: {},
        resumeDocuments: [],
      };
  return {
    ...context,
    ...(scope.requirements ? { approvedRequirements: scope.requirements } : {}),
    ...(observed
      ? {
          technicalPlan: {
            ...((context.technicalPlan as object) ?? {}),
            framework: observed,
            hasFrontend: true,
          },
        }
      : {}),
    documentsPath: context.documentsPath ?? documentsPath,
    resumeProject: true,
    resumePhase: "code_gen",
    resumeStitch: false,
    repairOnly: true,
    repairDirectory: directory,
    legacyRepair: !context.stitch,
  };
}
