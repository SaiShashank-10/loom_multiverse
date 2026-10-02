import { describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { resolveMLPlan } from "./ml-plan.js";

describe("structured ML planning", () => {
  it("distinguishes API integration from real training and caches the decision", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "loom-ml-plan-"));
    try {
      const invoke = vi.fn().mockResolvedValue({
        content: JSON.stringify({
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
          rationale: "Hosted AI API only",
        }),
      });
      expect(
        (await resolveMLPlan(root, { invoke } as any, "Portfolio uses an OpenAI API"))
          .requiresTraining,
      ).toBe(false);
      expect(
        (await resolveMLPlan(root, { invoke } as any, "Portfolio uses an OpenAI API"))
          .requiresTraining,
      ).toBe(false);
      expect(invoke).toHaveBeenCalledOnce();
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("rejects contradictory training plans and retries", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "loom-ml-plan-"));
    try {
      const valid = {
        requiresTraining: true,
        task: "classification",
        modalities: ["image"],
        framework: "pytorch",
        modelFamily: "cnn",
        mode: "new",
        datasetSchema: "labeled image folders",
        splitStrategy: "stratified train/validation/test",
        metrics: ["accuracy"],
        acceptanceCriteria: ["reload parity"],
        compute: { device: "auto", maxRuntimeMinutes: 60, maxMemoryGB: 8 },
        rationale: "Client requested CNN training",
      };
      const invoke = vi
        .fn()
        .mockResolvedValueOnce({ content: JSON.stringify({ ...valid, modelFamily: "none" }) })
        .mockResolvedValueOnce({ content: JSON.stringify(valid) });
      expect((await resolveMLPlan(root, { invoke } as any, "Train a CNN")).modelFamily).toBe("cnn");
      expect(invoke.mock.calls[1]![0][1].content).toContain("Previous JSON was invalid");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("normalizes the local-model aliases and nested values from the failed pipeline run", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "loom-ml-plan-"));
    try {
      const invoke = vi.fn().mockResolvedValue({
        content: JSON.stringify({
          requiresTraining: true,
          task: "job matching",
          modalities: ["NLP", "tabular data"],
          framework: "scikit_learn",
          modelFamily: "sequence-to-sequence",
          mode: "inference",
          datasetSchema: {
            resumes: ["skills", "education"],
            jobs: ["requirements", "description"],
          },
          splitStrategy: { train: 0.7, validation: 0.15, test: 0.15 },
          metrics: [{ name: "NDCG@10", target: ">= 0.75" }],
          acceptanceCriteria: [{ metric: "NDCG@10", threshold: 0.75 }],
          compute: { device: "GPU", maxRuntimeMinutes: "90", maxMemoryGB: "8" },
          rationale: "Train a candidate-to-job matching model.",
        }),
      });

      const plan = await resolveMLPlan(root, { invoke } as any, "Train a job matching model");

      expect(plan).toMatchObject({
        requiresTraining: true,
        task: "ranking",
        modalities: ["text", "tabular"],
        framework: "scikit-learn",
        modelFamily: "transformer",
        mode: "new",
        compute: { device: "cuda", maxRuntimeMinutes: 90, maxMemoryGB: 8 },
      });
      expect(plan.datasetSchema).toContain("resumes");
      expect(plan.metrics[0]).toContain("NDCG@10");
      expect(plan.acceptanceCriteria[0]).toContain("threshold");
      expect(invoke).toHaveBeenCalledOnce();
      expect(invoke.mock.calls[0]![1].format).toMatchObject({ type: "object" });
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
