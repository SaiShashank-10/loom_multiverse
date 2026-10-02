import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { safePath } from "./validation.js";
const execute = promisify(execFile);
const Config = z.object({
  dataset: z.string().min(1).nullable(),
  seed: z.number().int(),
  epochs: z.number().int().positive().max(10000),
  batchSize: z.number().int().positive(),
  device: z.enum(["cpu", "cuda", "auto"]),
  mode: z.enum(["new", "resume", "finetune"]),
  pretrainedCheckpoint: z.string().nullable(),
  resumeCheckpoint: z.string().nullable(),
  outputDir: z.string(),
  maxRuntimeMinutes: z.number().int().min(1).max(1440),
  runId: z.string().optional(),
  datasetFingerprint: z.string().optional(),
});
const Metrics = z.object({
  runId: z.string(),
  dataset: z.string(),
  examples: z.number().int().positive(),
  metrics: z.record(z.number().finite()).refine((x) => Object.keys(x).length > 0),
  checkpoint: z.string().min(1),
  predictions: z.string().min(1),
  datasetFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  splitFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
});
const Verification = z.object({
  runId: z.string(),
  checkpointSha256: z.string().regex(/^[a-f0-9]{64}$/),
  predictionsSha256: z.string().regex(/^[a-f0-9]{64}$/),
  datasetFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  splitFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  examples: z.number().int().positive(),
  reloadParityMaxAbsError: z.number().finite().nonnegative(),
  parametersChanged: z.literal(true),
  heldOutOnly: z.literal(true),
  metricsRecomputed: z.literal(true),
});
export type MLFailureKind = "code" | "data" | "resource" | "environment";
export interface MLRunResult {
  status: "completed" | "blocked" | "failed";
  error?: string;
  metrics?: unknown;
  runId?: string;
  failureKind?: MLFailureKind;
}

const defaultConfig = {
  dataset: null,
  seed: 42,
  epochs: 10,
  batchSize: 32,
  device: "auto",
  mode: "new",
  pretrainedCheckpoint: null,
  resumeCheckpoint: null,
  outputDir: "artifacts/ml",
  maxRuntimeMinutes: 120,
} as const;

async function sha256File(file: string): Promise<string> {
  return createHash("sha256")
    .update(await fs.readFile(file))
    .digest("hex");
}

async function fingerprintPath(target: string): Promise<string> {
  const hash = createHash("sha256");
  const stat = await fs.stat(target);
  if (stat.isFile()) return sha256File(target);
  if (!stat.isDirectory()) throw new Error(`Unsupported dataset path: ${target}`);
  const walk = async (directory: string) => {
    for (const entry of (await fs.readdir(directory, { withFileTypes: true })).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      if (entry.isSymbolicLink())
        throw new Error("Dataset directories may not contain symbolic links");
      const full = path.join(directory, entry.name);
      const relative = path.relative(target, full).replace(/\\/g, "/");
      hash.update(relative);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile()) hash.update(await fs.readFile(full));
    }
  };
  await walk(target);
  return hash.digest("hex");
}

function isInside(parent: string, child: string): boolean {
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  return !!relative && !relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative);
}

export function classifyMLFailure(error: string): MLFailureKind {
  if (/CUDA out of memory|out of memory|timed?\s*out|SIGKILL|resource exhausted/i.test(error))
    return "resource";
  if (
    /dataset|CSV|parquet|image.*(?:corrupt|invalid)|label|schema|no samples|empty data/i.test(error)
  )
    return "data";
  if (
    /not recognized as an internal|command not found|No module named|DLL load|driver|CUDA.*(?:unavailable|initialization)|permission denied/i.test(
      error,
    )
  )
    return "environment";
  return "code";
}
export async function ensureMLConfig(root: string, initial: Partial<z.input<typeof Config>> = {}) {
  const target = path.join(root, "ml-run.json");
  try {
    const current = JSON.parse(await fs.readFile(target, "utf8"));
    const migrated = {
      ...defaultConfig,
      ...current,
      mode:
        current.mode ??
        (current.pretrainedCheckpoint ? "finetune" : current.resumeCheckpoint ? "resume" : "new"),
    };
    Config.parse(migrated);
    if (JSON.stringify(current) !== JSON.stringify(migrated)) {
      await fs.writeFile(`${target}.tmp`, JSON.stringify(migrated, null, 2));
      await fs.rename(`${target}.tmp`, target);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    await fs.writeFile(target, JSON.stringify({ ...defaultConfig, ...initial }, null, 2), {
      flag: "wx",
    });
  }
}
export async function runMLPipeline(
  root: string,
  notify: (message: string) => void,
  run = async (python: string, args: string[], cwd: string, timeoutMs: number) => {
    await execute(python, args, {
      cwd,
      windowsHide: true,
      timeout: timeoutMs,
      maxBuffer: 8 * 1024 * 1024,
    });
  },
): Promise<MLRunResult> {
  await ensureMLConfig(root);
  let runId: string | undefined;
  try {
    const config = Config.parse(
      JSON.parse(await fs.readFile(path.join(root, "ml-run.json"), "utf8")),
    );
    const dataset = process.env.LOOM_ML_DATASET?.trim() || config.dataset;
    if (!dataset)
      return {
        status: "blocked",
        error:
          "Real training needs a dataset. Set dataset in ml-run.json (see ml/README.md for its schema), then resume this project. No training results were fabricated.",
      };
    config.dataset = path.resolve(root, dataset);
    try {
      await fs.access(config.dataset);
    } catch {
      return { status: "blocked", error: `Dataset does not exist: ${config.dataset}` };
    }
    if (config.mode === "finetune" && !config.pretrainedCheckpoint)
      return { status: "blocked", error: "Fine-tuning mode requires pretrainedCheckpoint" };
    if (config.mode !== "finetune" && config.pretrainedCheckpoint)
      return { status: "blocked", error: "pretrainedCheckpoint is only valid in finetune mode" };
    if (config.mode === "resume" && !config.resumeCheckpoint)
      return { status: "blocked", error: "Resume mode requires resumeCheckpoint" };
    if (config.mode !== "resume" && config.resumeCheckpoint)
      return { status: "blocked", error: "resumeCheckpoint is only valid in resume mode" };
    if (config.pretrainedCheckpoint) {
      config.pretrainedCheckpoint = path.resolve(root, config.pretrainedCheckpoint);
      try {
        await fs.access(config.pretrainedCheckpoint);
      } catch {
        return { status: "blocked", error: "Configured pretrained checkpoint is unavailable" };
      }
    }
    if (config.resumeCheckpoint) {
      config.resumeCheckpoint = path.resolve(root, config.resumeCheckpoint);
      try {
        await fs.access(config.resumeCheckpoint);
      } catch {
        return { status: "blocked", error: "Configured resume checkpoint is unavailable" };
      }
    }
    const artifactRoot = safePath(root, config.outputDir);
    runId = randomUUID();
    config.runId = runId;
    config.datasetFingerprint = await fingerprintPath(config.dataset);
    config.outputDir = path.join(artifactRoot, "runs", runId);
    await fs.mkdir(config.outputDir, { recursive: true });
    const executionConfig = path.join(config.outputDir, "run-config.json");
    await fs.writeFile(executionConfig, JSON.stringify(config, null, 2));
    const python = path.join(
      root,
      "ml",
      process.platform === "win32" ? ".venv/Scripts/python.exe" : ".venv/bin/python",
    );
    const stages = [
      "preprocess",
      config.mode === "finetune" ? "finetune" : "train",
      "evaluate",
      "verify",
    ];
    const timeoutMs = config.maxRuntimeMinutes * 60_000;
    for (const stage of stages) {
      notify(`ML ${stage}: executing on ${config.device}; run ${runId}`);
      await run(python, ["-m", `ml.${stage}`, "--config", executionConfig], root, timeoutMs);
    }
    const metrics = Metrics.parse(
      JSON.parse(await fs.readFile(path.join(config.outputDir, "metrics.json"), "utf8")),
    );
    if (metrics.runId !== runId || path.resolve(metrics.dataset) !== config.dataset)
      throw new Error("Metrics are stale or belong to a different dataset");
    if (metrics.datasetFingerprint !== config.datasetFingerprint)
      throw new Error("Metrics dataset fingerprint does not match the executed dataset");
    const checkpoint = path.resolve(metrics.checkpoint);
    const canonicalOutput = await fs.realpath(config.outputDir);
    const canonicalCheckpoint = await fs.realpath(checkpoint);
    if (!isInside(canonicalOutput, canonicalCheckpoint))
      throw new Error(
        `Checkpoint must be inside the configured artifact directory: ${checkpoint} is outside ${config.outputDir}`,
      );
    if (!(await fs.stat(checkpoint)).isFile() || !(await fs.stat(checkpoint)).size)
      throw new Error("No nonempty trained checkpoint was produced");
    const predictions = path.resolve(metrics.predictions);
    const canonicalPredictions = await fs.realpath(predictions);
    if (!isInside(canonicalOutput, canonicalPredictions))
      throw new Error(
        `Predictions must be inside the configured artifact directory: ${predictions} is outside ${config.outputDir}`,
      );
    if (!(await fs.stat(predictions)).isFile() || !(await fs.stat(predictions)).size)
      throw new Error("No nonempty held-out predictions were produced");
    const verification = Verification.parse(
      JSON.parse(await fs.readFile(path.join(config.outputDir, "verification.json"), "utf8")),
    );
    if (
      verification.runId !== runId ||
      verification.datasetFingerprint !== config.datasetFingerprint ||
      verification.splitFingerprint !== metrics.splitFingerprint ||
      verification.examples !== metrics.examples
    )
      throw new Error("Verification evidence does not match this run and held-out split");
    if (verification.checkpointSha256 !== (await sha256File(checkpoint)))
      throw new Error("Checkpoint hash does not match verification evidence");
    if (verification.predictionsSha256 !== (await sha256File(predictions)))
      throw new Error("Prediction hash does not match verification evidence");
    return { status: "completed", metrics: { ...metrics, verification }, runId };
  } catch (error) {
    const detail = error as { message?: string; stdout?: string; stderr?: string };
    return {
      status: "failed",
      runId,
      failureKind: classifyMLFailure(detail.message ?? String(error)),
      error:
        `${detail.message ?? String(error)}\n${detail.stdout ?? ""}\n${detail.stderr ?? ""}`.slice(
          -16000,
        ),
    };
  }
}
