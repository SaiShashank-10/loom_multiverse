import { it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { ensureMLConfig, runMLPipeline } from "./ml-execution.js";
let root: string;
beforeEach(async () => {
  vi.stubEnv("LOOM_ML_DATASET", "");
  root = await fs.mkdtemp(path.join(os.tmpdir(), "loom-ml-test-"));
});
afterEach(async () => {
  vi.unstubAllEnvs();
  if (!path.basename(root).startsWith("loom-ml-test-")) throw new Error("Unexpected fixture");
  await fs.rm(root, { recursive: true, force: true });
});
async function configure() {
  await ensureMLConfig(root);
  const target = path.join(root, "ml-run.json");
  const config = JSON.parse(await fs.readFile(target, "utf8"));
  config.dataset = "dataset.csv";
  await fs.writeFile(path.join(root, "dataset.csv"), "x,y\n1,2\n2,4\n3,6");
  await fs.writeFile(target, JSON.stringify(config));
  return config;
}
it("missing dataset blocks without any execution or fake metrics", async () => {
  const run = vi.fn();
  const result = await runMLPipeline(root, () => {}, run);
  expect(result.status).toBe("blocked");
  expect(run).not.toHaveBeenCalled();
});
it("migrates older run configuration without losing its dataset settings", async () => {
  await fs.writeFile(
    path.join(root, "ml-run.json"),
    JSON.stringify({
      dataset: "dataset.csv",
      seed: 7,
      epochs: 3,
      batchSize: 8,
      device: "cpu",
      pretrainedCheckpoint: null,
      outputDir: "artifacts/ml",
    }),
  );
  await ensureMLConfig(root);
  const config = JSON.parse(await fs.readFile(path.join(root, "ml-run.json"), "utf8"));
  expect(config).toMatchObject({
    dataset: "dataset.csv",
    seed: 7,
    mode: "new",
    resumeCheckpoint: null,
    maxRuntimeMinutes: 120,
  });
});
it("runs ordered modules and accepts only current-run metrics with checkpoint", async () => {
  await configure();
  const calls: string[] = [];
  const result = await runMLPipeline(
    root,
    () => {},
    async (_python, args) => {
      calls.push(args[1]!);
      const config = JSON.parse(await fs.readFile(args[3]!, "utf8"));
      if (args[1] === "ml.evaluate") {
        const checkpoint = path.join(config.outputDir, "model.bin");
        const predictions = path.join(config.outputDir, "predictions.jsonl");
        await fs.writeFile(checkpoint, "test checkpoint");
        await fs.writeFile(predictions, '{"actual":2,"predicted":2.1}\n');
        await fs.writeFile(
          path.join(config.outputDir, "metrics.json"),
          JSON.stringify({
            runId: config.runId,
            dataset: config.dataset,
            examples: 3,
            metrics: { mse: 0.5 },
            checkpoint,
            predictions,
            datasetFingerprint: config.datasetFingerprint,
            splitFingerprint: "a".repeat(64),
          }),
        );
      }
      if (args[1] === "ml.verify") {
        const checkpoint = path.join(config.outputDir, "model.bin");
        const predictions = path.join(config.outputDir, "predictions.jsonl");
        const hash = async (file: string) =>
          createHash("sha256")
            .update(await fs.readFile(file))
            .digest("hex");
        await fs.writeFile(
          path.join(config.outputDir, "verification.json"),
          JSON.stringify({
            runId: config.runId,
            checkpointSha256: await hash(checkpoint),
            predictionsSha256: await hash(predictions),
            datasetFingerprint: config.datasetFingerprint,
            splitFingerprint: "a".repeat(64),
            examples: 3,
            reloadParityMaxAbsError: 0,
            parametersChanged: true,
            heldOutOnly: true,
            metricsRecomputed: true,
          }),
        );
      }
    },
  );
  expect(calls).toEqual(["ml.preprocess", "ml.train", "ml.evaluate", "ml.verify"]);
  expect(result.status).toBe("completed");
});
it("does not accept stale fabricated completion files", async () => {
  await configure();
  const result = await runMLPipeline(
    root,
    () => {},
    async (_python, args) => {
      const config = JSON.parse(await fs.readFile(args[3]!, "utf8"));
      await fs.writeFile(
        path.join(config.outputDir, "metrics.json"),
        JSON.stringify({
          runId: "old",
          dataset: config.dataset,
          examples: 3,
          metrics: { accuracy: 1 },
          checkpoint: "missing",
          predictions: "missing",
          datasetFingerprint: config.datasetFingerprint,
          splitFingerprint: "b".repeat(64),
        }),
      );
    },
  );
  expect(result.status).toBe("failed");
  expect(result.error).toContain("stale");
});
it("training subprocess failures remain failures", async () => {
  await configure();
  const result = await runMLPipeline(
    root,
    () => {},
    async () => {
      throw new Error("CUDA out of memory");
    },
  );
  expect(result.status).toBe("failed");
  expect(result.error).toContain("CUDA out of memory");
});
it("fine tuning requires configured weights", async () => {
  const config = await configure();
  config.mode = "finetune";
  config.pretrainedCheckpoint = "missing.pt";
  await fs.writeFile(path.join(root, "ml-run.json"), JSON.stringify(config));
  const run = vi.fn();
  expect((await runMLPipeline(root, () => {}, run)).status).toBe("blocked");
  expect(run).not.toHaveBeenCalled();
});

it("keeps resume and fine-tune checkpoints separate", async () => {
  const config = await configure();
  config.mode = "resume";
  await fs.writeFile(path.join(root, "ml-run.json"), JSON.stringify(config));
  const run = vi.fn();
  const result = await runMLPipeline(root, () => {}, run);
  expect(result.status).toBe("blocked");
  expect(result.error).toContain("resumeCheckpoint");
  expect(run).not.toHaveBeenCalled();
});

it("classifies resource failures without pretending source code is broken", async () => {
  await configure();
  const result = await runMLPipeline(
    root,
    () => {},
    async () => {
      throw new Error("CUDA out of memory");
    },
  );
  expect(result.status).toBe("failed");
  expect(result.failureKind).toBe("resource");
});
