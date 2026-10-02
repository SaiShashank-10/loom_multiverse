import { it, expect, vi } from "vitest";
vi.mock("../../llm/index.js", () => ({ createTier2LLM: vi.fn() }));
import { needsML, MLCodeWorker, mlFiles } from "./ml-workers.js";
it.each([
  "influence-aware graph neural collaborative modeling",
  "CNN image classification",
  "RNN forecasting",
  "fine tuning a transformer",
  "scikit-learn estimator",
])("detects ML workload %s", (idea) => expect(needsML(idea)).toBe(true));
it("keeps ordinary CRUD projects on ordinary codegen", () =>
  expect(needsML("Flutter budget CRUD with Firebase authentication")).toBe(false));
it("specialists receive real training contracts and shared interfaces", async () => {
  const invoke = vi.fn().mockResolvedValue({
    content: JSON.stringify({
      content:
        'import argparse\n\ndef train(model, features, labels):\n    model.fit(features, labels)\n    return model\n\nif __name__ == "__main__":\n    parser = argparse.ArgumentParser()\n    parser.add_argument("--config", required=True)\n    parser.parse_args()',
    }),
  });
  const worker = new MLCodeWorker("training", () => ({ invoke }) as any);
  await worker.generate(
    { path: "ml/train.py", description: "training" },
    "shared function signature",
  );
  const messages = invoke.mock.calls[0]![0];
  expect(messages[0].content).toContain("Training worker");
  expect(messages[1].content).toContain("shared function signature");
  expect(new Set(mlFiles.map((f) => f.role)).size).toBe(6);
});

it("does not train a model just because a portfolio mentions ML or TensorFlow.js", () => {
  expect(
    needsML(
      "Showcase knowledge of machine learning in a React portfolio; assistant integrated with TensorFlow.js or OpenAI GPT-3",
    ),
  ).toBe(false);
});
