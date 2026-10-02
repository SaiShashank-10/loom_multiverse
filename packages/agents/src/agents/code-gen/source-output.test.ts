const fallback = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("../../llm/index.js", () => ({ createTier2LLM: fallback.create }));
import { it, expect, vi } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {
  validateSource,
  validateFilePurpose,
  generateSource,
  saveGeneratedSource,
  repairDeclaredTestScript,
} from "./source-output.js";
it("rejects Flutter test shells whose assertions only exist in comments", () => {
  expect(() => validateSource("test/home_test.dart", `import 'package:flutter_test/flutter_test.dart';
void main() { TestWidgetsFlutterBinding.ensureInitialized(); }
// testWidgets('home', (tester) async { expect(find.text('Home'), findsOneWidget); });
`)).toThrow("registered test/testWidgets");
  expect(() => validateSource("test/home_test.dart", `import 'package:flutter_test/flutter_test.dart';
void main() { testWidgets('home', (tester) async { await tester.pumpWidget(const Home()); expect(find.text('Home'), findsOneWidget); }); }
`)).not.toThrow();
});
it("repairs missing or stub test commands only with an unambiguous declared runner", () => {
  const repaired = JSON.parse(
    repairDeclaredTestScript(
      JSON.stringify({
        name: "app",
        devDependencies: { vitest: "^3.0.0" },
        scripts: { test: 'echo "no test specified"' },
      }),
    ),
  );
  expect(repaired.scripts.test).toBe("vitest run");
  expect(() =>
    validateFilePurpose("package.json", JSON.stringify(repaired), "src/App.test.tsx"),
  ).not.toThrow();
  for (const pkg of [
    { name: "app" },
    { name: "app", devDependencies: { jest: "1", vitest: "1" } },
    { scripts: { test: "node --test" } },
  ]) {
    const source = JSON.stringify(pkg);
    expect(repairDeclaredTestScript(source)).toBe(source);
  }
});
const explanation =
  "The provided information appears to be a collection of HTML code snippets and associated metadata.";
it("rejects Flutter test dependencies under an ignored pubspec key", () => {
  const source =
    'name: app\nenvironment:\n  sdk: ">=3.0.0 <4.0.0"\ndependencies:\n  flutter:\n    sdk: flutter\ntest_dependencies:\n  flutter_test:\n    sdk: flutter\n';
  expect(() => validateSource("pubspec.yaml", source)).toThrow("dev_dependencies");
  expect(() =>
    validateSource("pubspec.yaml", source.replace("test_dependencies", "dev_dependencies")),
  ).not.toThrow();
});
it.each(["package.json", "ml/train.py", "src/services/projectService.js"])(
  "rejects saved prose in %s",
  (file) => expect(() => validateSource(file, explanation)).toThrow(),
);
it("parses JSON and JavaScript instead of accepting nonempty text", () => {
  expect(() => validateSource("package.json", '{"name":"app"}')).not.toThrow();
  expect(() => validateSource("index.js", "export const add = (a,b) => a+b;")).not.toThrow();
  expect(() => validateSource("index.js", "export function broken( {")).toThrow();
  expect(() => validateSource("package.json", "{broken}")).toThrow();
});
it("retries prose and then returns validated actual source", async () => {
  const invoke = vi
    .fn()
    .mockResolvedValueOnce({ content: JSON.stringify({ content: explanation }) })
    .mockResolvedValueOnce({
      content: '{"name":"app","scripts":{"start":"node index.js"}}',
    });
  const result = await generateSource(
    { invoke } as any,
    { path: "package.json", description: "Node package" },
    "React Node portfolio",
  );
  expect(JSON.parse(result).name).toBe("app");
  expect(invoke).toHaveBeenCalledTimes(2);
  expect(invoke.mock.calls[1]![0][1].content).toContain("Previous attempt was rejected");
});
it("invalid output never overwrites an existing file; valid repair preserves backup", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "loom-source-test-"));
  try {
    const file = path.join(root, "package.json");
    await fs.writeFile(file, explanation);
    await expect(
      saveGeneratedSource(root, "package.json", explanation, explanation),
    ).rejects.toThrow();
    expect(await fs.readFile(file, "utf8")).toBe(explanation);
    await saveGeneratedSource(root, "package.json", '{"name":"fixed"}', explanation);
    expect(JSON.parse(await fs.readFile(file, "utf8")).name).toBe("fixed");
    const dirs = await fs.readdir(path.join(root, ".loom-backups"));
    expect(
      await fs.readFile(path.join(root, ".loom-backups", dirs[0]!, "package.json"), "utf8"),
    ).toBe(explanation);
  } finally {
    if (!path.basename(root).startsWith("loom-source-test-")) throw new Error("bad fixture");
    await fs.rm(root, { recursive: true, force: true });
  }
});
it("accepts genuine documentation", () =>
  expect(() => validateSource("README.md", explanation)).not.toThrow());

it("retries CUDA initialization failure on CPU without saving prose", async () => {
  const cpuInvoke = vi
    .fn()
    .mockResolvedValue({ content: JSON.stringify({ content: "export const ready = true;" }) });
  fallback.create.mockReturnValue({ invoke: cpuInvoke });
  const broken = vi
    .fn()
    .mockRejectedValue(new Error("CUDA error: shared object initialization failed"));
  const result = await generateSource(
    { invoke: broken } as any,
    { path: "index.js", description: "entry" },
    "app",
  );
  expect(result).toContain("export const ready");
  expect(fallback.create).toHaveBeenCalledWith(expect.objectContaining({ gpuLayers: 0 }));
});

it("rejects assigning to const even when JavaScript parses", () => {
  expect(() => validateSource("handler.js", "const status = 500; status = 200;")).toThrow(
    "constant",
  );
});

it.each([
  "Based on the provided HTML code snippets, it appears that you have a collection of pages.",
  "It appears you've provided a list of HTML code snippets.",
  "The provided JSON data represents a collection of screens.",
])("rejects actual legacy prose across source/config formats: %s", (text) => {
  for (const file of [
    "App.js",
    "App.dart",
    "app.css",
    "app.scss",
    "config.yaml",
    ".env.example",
    "pytest.ini",
    "train.py",
  ])
    expect(() => validateSource(file, text)).toThrow();
});
it.each([
  ["app.css", "body { color: red; }"],
  ["theme.scss", "$color: red; .page { color: $color; }"],
  ["config.yaml", "server:\n  port: 3000"],
  [".env.example", "# Local server\nPORT=3000\nAPI_KEY="],
  ["pytest.ini", "[pytest]\npythonpath = ..\naddopts =\n  -q"],
  ["identity.ts", "export const identity = <T>(value: T): T => value;"],
])("accepts actual implementation in %s", (file, content) =>
  expect(() => validateSource(file, content)).not.toThrow(),
);
it.each([
  ["app.css", "body { color: red;"],
  ["config.yaml", "a: 1\na: 2"],
  ["config.yaml", "Configuration goes in this document"],
  ["index.js", '"An explanation instead of code";'],
  [".env.example", "Application configuration belongs here"],
])("rejects malformed %s", (file, text) => expect(() => validateSource(file, text)).toThrow());
it("requires actual runnable scripts in generated application packages", () => {
  expect(() =>
    validateFilePurpose("package.json", '{"name":"app","scripts":{}}', "src/App.js"),
  ).toThrow("runnable");
  expect(() =>
    validateFilePurpose(
      "package.json",
      '{"name":"app","scripts":{"build":"echo done"}}',
      "src/App.js",
    ),
  ).toThrow();
});

it.each([
  ["lib/main.dart", "A modern mobile experience with beautiful transitions."],
  ["src/Main.java", "This module contains the main application logic and services."],
  ["src/main.rs", "Application source for the requested backend API."],
  ["config.json", '{"description":"Add real settings here later"}'],
  ["src/App.tsx", "export default function App(){ return null; }"],
])("rejects parser-valid prose or no-op implementation in %s", (file, content) => {
  expect(() => {
    validateSource(file, content);
    validateFilePurpose(file, content, "src/App.tsx");
  }).toThrow();
});

it.each([
  [
    "lib/main.dart",
    "import 'package:flutter/widgets.dart';\nvoid main() { runApp(const SizedBox()); }",
  ],
  [
    "src/Main.java",
    "package app; public final class Main { public static void main(String[] args) {} }",
  ],
  ["src/main.rs", 'fn main() { println!("ready"); }'],
  ["src/main.go", 'package main\nimport "fmt"\nfunc main(){ fmt.Println("ready") }'],
  ["Dockerfile", 'FROM node:22-alpine\nWORKDIR /app\nCMD ["node", "index.js"]'],
])("accepts recognizable implementation in %s", (file, content) =>
  expect(() => validateSource(file, content)).not.toThrow(),
);

it("rejects ML entrypoint stubs without training or CLI behavior", () => {
  expect(() => validateSource("ml/train.py", "def train():\n    return 1")).toThrow();
});

it("requires an actual --config option instead of accepting unrelated argparse usage", () => {
  const source = `import argparse
def finetune(model, data):
    model.fit(data)
if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--epochs", type=int)
    parser.parse_args()`;
  expect(() => validateSource("ml/finetune.py", source)).toThrow(
    "missing required --config command-line contract",
  );
});

it("rejects syntactically valid Python that references names it never imports or defines", () => {
  const source = `import argparse
def finetune(config):
    model = tf.keras.Model()
    model.fit(config)
if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True)
    args = parser.parse_args()
    finetune(args.config)`;
  expect(() => validateSource("ml/finetune.py", source)).toThrow("undefined Python names");
});

it("repairs unambiguous standard ML imports before validating generated Python", async () => {
  const generated = `def finetune(config):
    model = CareerNavigationModel(config)
    model.compile(loss=custom_loss, optimizer=tf.keras.optimizers.Adam())
    model.fit(config)
if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True)
    args = parser.parse_args()
    finetune(args.config)`;
  const invoke = vi.fn().mockResolvedValue({
    content: JSON.stringify({ content: generated }),
  });

  const result = await generateSource(
    { invoke } as any,
    { path: "ml/finetune.py", description: "Fine-tuning entrypoint" },
    "TensorFlow transformer",
  );

  expect(result).toContain("import argparse");
  expect(result).toContain("import tensorflow as tf");
  expect(result).toContain("from ml.model import CareerNavigationModel");
  expect(result).toContain("from ml.model import custom_loss");
  expect(invoke).toHaveBeenCalledOnce();
});

it("self-heals an ML CLI omission using the rejected draft and a final mandatory contract", async () => {
  const rejected = `import argparse
def finetune(model, data):
    model.fit(data)
if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.parse_args()`;
  const corrected = `import argparse
class Model:
    def fit(self, data):
        return data
def finetune(config):
    model = Model()
    model.fit(config)
if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True)
    args = parser.parse_args()
    finetune(args.config)`;
  const invoke = vi
    .fn()
    .mockResolvedValueOnce({ content: JSON.stringify({ content: rejected }) })
    .mockResolvedValueOnce({ content: JSON.stringify({ content: corrected }) });

  const result = await generateSource(
    { invoke } as any,
    { path: "ml/finetune.py", description: "Real optional fine-tuning entrypoint" },
    "TensorFlow transformer fine-tuning",
  );

  expect(result).toContain('parser.add_argument("--config", required=True)');
  const retryPrompt = String(invoke.mock.calls[1]![0][1].content);
  expect(retryPrompt).toContain("REJECTED DRAFT SOURCE");
  expect(retryPrompt).toContain("TARGETED COMPLETE-FILE REPAIR");
  expect(retryPrompt).toContain("parser.parse_args()");
  expect(retryPrompt).toContain('parser.add_argument("--config", required=True)');
});

it("accepts project-specific checkpoint helpers only when verification evidence is complete", () => {
  const valid = `import argparse
import hashlib
import json
from ml.common import load_checkpoint
def verify(config):
    with open("metrics.json") as source:
        metrics = json.load(source)
    labels = metrics["labels"]
    predictions = metrics["predictions"]
    model = load_checkpoint(metrics["checkpoint"])
    reloaded = model.predict(metrics["inputs"])
    recomputed_metric = sum(int(a == b) for a, b in zip(labels, predictions)) / len(labels)
    reload_parity = max(abs(a - b) for a, b in zip(predictions, reloaded))
    with open(metrics["checkpoint"], "rb") as checkpoint_file:
        checkpoint_hash = hashlib.sha256(checkpoint_file.read()).hexdigest()
    predictions_path = metrics["predictionsPath"]
    with open(predictions_path, "rb") as predictions_file:
        predictions_hash = hashlib.sha256(predictions_file.read()).hexdigest()
    result = {"checkpointSha256": checkpoint_hash, "predictionsSha256": predictions_hash, "score": recomputed_metric, "metricsRecomputed": True, "reloadParityMaxAbsError": reload_parity}
    with open("verification.json", "w") as output:
        json.dump(result, output)
if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True)
    args = parser.parse_args()
    verify(args.config)`;
  expect(() => validateSource("ml/verify.py", valid)).not.toThrow();
  expect(() =>
    validateSource(
      "ml/verify.py",
      valid.replace(
        'with open("verification.json", "w") as output:',
        'with open("result.json", "w") as output:',
      ),
    ),
  ).toThrow("incomplete verification behavior");
});

it("rejects placeholder or hard-coded verification metrics", () => {
  expect(() =>
    validateSource(
      "ml/verify.py",
      `import argparse
def verify(config):
    # Placeholder for actual metric computation logic
    return {"accuracy": 0.95}
if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True)
    verify(parser.parse_args().config)`,
    ),
  ).toThrow("explanation or placeholder");
});

it("accepts commented native tool configuration while rejecting YAML prose", () => {
  expect(() =>
    validateSource(
      "analysis_options.yaml",
      "# This configures the analyzer.\ninclude: package:flutter_lints/flutter.yaml\nlinter:\n  rules: {}",
    ),
  ).not.toThrow();
  expect(() =>
    validateSource("analysis_options.yaml", "This file should configure the analyzer"),
  ).toThrow();
  expect(() =>
    validateSource(".metadata", "# Flutter project metadata\nversion:\n  channel: stable"),
  ).not.toThrow();
});
