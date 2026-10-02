import { it, expect, vi } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
const mocks = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("../../llm/index.js", () => ({ createTier2LLM: () => ({ invoke: mocks.invoke }) }));
vi.mock("../base-agent.js", () => ({
  BaseAgent: class {
    phase = "code_gen";
    log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    async run(input: any) {
      return (this as any).execute(input, input.llm);
    }
  },
}));
import { CodeGenAgent, repairManifestTarget } from "./code-gen-agent.js";
import { auditSources } from "./source-audit.js";
import { loadDesignReference, readDesignWrites, designHash } from "./design-reference.js";

it("routes Flutter dependency and SDK errors to the failing client pubspec", () => {
  const root = path.resolve("fixture");
  expect(repairManifestTarget(root, `flutter pub get (cwd: ${path.join(root, "mobile")})`,
    "The current Dart SDK version is 3.10.4; version solving failed",
    ["mobile/pubspec.yaml", "backend/package.json"])).toBe("mobile/pubspec.yaml");
  expect(repairManifestTarget(root, "flutter pub get", "version solving failed",
    ["pubspec.yaml"])).toBe("pubspec.yaml");
});

it("routes Node install failures only to the package manifest in the failing component", () => {
  const root = path.join("C:", "workspace");
  expect(
    repairManifestTarget(
      root,
      `npm install (cwd: ${path.join(root, "web")})`,
      "npm ERR! ERESOLVE",
      ["ml/requirements.txt", "web/package.json", "api/package.json"],
    ),
  ).toBe("web/package.json");
});

it("repairs a prose-filled resumed project, executes generated modules, and reuses valid source on the next run", async () => {
  const fixture = await fs.mkdtemp(path.join(os.tmpdir(), "loom-codegen-test-"));
  const root = path.join(fixture, "runs", "workspaces", "saved-project");
  const cwd = vi.spyOn(process, "cwd").mockReturnValue(fixture);
  try {
    await fs.mkdir(path.join(root, "docs"), { recursive: true });
    const files = [
      { path: "index.cjs", description: "Print total using add from math.cjs" },
      { path: "math.cjs", description: "Export add(a,b) returning the sum" },
      {
        path: "package.json",
        description: "Node CLI package with no external dependencies, start and test scripts",
      },
      { path: "test.cjs", description: "Behavioral test for arithmetic output" },
    ];
    await fs.writeFile(path.join(root, "codegen-manifest.json"), JSON.stringify({ files }));
    await fs.writeFile(path.join(root, "package.json"), '{"name":"app","scripts":{}}');
    await fs.writeFile(
      path.join(root, "math.cjs"),
      "Based on the provided HTML code snippets, here is an overview.",
    );
    await fs.writeFile(
      path.join(root, "index.cjs"),
      "The provided JSON data appears to describe some screens.",
    );
    mocks.invoke.mockImplementation(async (messages) => {
      const prompt = String(messages.at(-1).content);
      if (prompt.includes("Return all fields: requiresTraining"))
        return {
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
            rationale: "No training requested",
          }),
        };
      if (prompt.includes("FINAL TASK: Implement package.json"))
        return {
          content: JSON.stringify({
            name: "app",
            version: "1.0.0",
            scripts: { start: "node index.cjs", test: "node test.cjs" },
          }),
        };
      if (prompt.includes("FINAL TASK: Implement math.cjs"))
        return { content: JSON.stringify({ content: "exports.add = (a,b) => a+b;" }) };
      if (prompt.includes("FINAL TASK: Implement index.cjs")) {
        expect(prompt).toContain("exports.add");
        return {
          content: JSON.stringify({
            content:
              "const {add} = require('./math.cjs'); if (add(2,3) !== 5) throw new Error('wrong sum'); console.log(add(2,3));",
          }),
        };
      }
      if (prompt.includes("FINAL TASK: Implement test.cjs"))
        return {
          content: JSON.stringify({
            content:
              "const assert = require('node:assert/strict'); const {add} = require('./math.cjs'); assert.equal(add(2,3), 5);",
          }),
        };
      if (prompt.includes("Generate the complete README"))
        return { content: "# CLI\nRun npm test." };
      throw new Error("Unexpected model request");
    });
    const input = {
      projectId: "saved-project",
      payload: {
        rawIdea: "Node arithmetic CLI",
        technicalPlan: { hasFrontend: false },
        documentsPath: path.join(root, "docs"),
        stitch: { status: "not_applicable", screens: [] },
      },
      llm: { invoke: mocks.invoke },
    };
    const result = await new CodeGenAgent().run(input as any);
    expect(result.success).toBe(true);
    expect(
      execFileSync(process.execPath, [path.join(root, "index.cjs")], { encoding: "utf8" }).trim(),
    ).toBe("5");
    expect((await auditSources(root, files)).success).toBe(true);
    const generations = mocks.invoke.mock.calls.filter(([messages]) =>
      String(messages.at(-1).content).includes("FINAL TASK:"),
    ).length;
    expect(generations).toBe(4);
    expect((await new CodeGenAgent().run(input as any)).success).toBe(true);
    expect(
      mocks.invoke.mock.calls.filter(([messages]) =>
        String(messages.at(-1).content).includes("FINAL TASK:"),
      ).length,
    ).toBe(generations);
    expect((await fs.readdir(path.join(root, ".loom-backups"))).length).toBeGreaterThan(0);
  } finally {
    cwd.mockRestore();
    if (!path.basename(fixture).startsWith("loom-codegen-test-")) throw new Error("bad fixture");
    await fs.rm(fixture, { recursive: true, force: true });
  }
}, 60000);

it("repair plans read actual source and stage all corrections before writing", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "loom-repair-test-"));
  try {
    const old = "module.exports = (a,b) => a-b;";
    await fs.writeFile(path.join(root, "math.cjs"), old);
    const invoke = vi
      .fn()
      .mockResolvedValueOnce({
        content: JSON.stringify({
          readFiles: ["math.cjs"],
          edits: [{ filePath: "math.cjs", instruction: "Addition must return sum" }],
        }),
      })
      .mockResolvedValueOnce({
        content: JSON.stringify({ content: "Based on the provided HTML, this is a math module." }),
      })
      .mockResolvedValueOnce({
        content: JSON.stringify({ content: "module.exports = (a,b) => a+b;" }),
      });
    expect(
      await (new CodeGenAgent() as any).healError(
        root,
        "node test.cjs",
        "expected 5, received -1",
        { invoke },
        "Node math CLI",
      ),
    ).toBe(true);
    expect(invoke.mock.calls[1]![0][1].content).toContain(old);
    expect(invoke.mock.calls[2]![0][1].content).toContain("Previous attempt was rejected");
    expect(
      execFileSync(
        process.execPath,
        [
          "-e",
          "process.stdout.write(String(require(process.argv[1])(2,3)))",
          path.join(root, "math.cjs"),
        ],
        { encoding: "utf8" },
      ),
    ).toBe("5");
    const rejecting = vi
      .fn()
      .mockResolvedValueOnce({
        content: JSON.stringify({
          readFiles: ["math.cjs"],
          edits: [
            { filePath: "math.cjs", instruction: "Improve sum" },
            { filePath: "bad.cjs", instruction: "New helper" },
          ],
        }),
      })
      .mockResolvedValueOnce({
        content: JSON.stringify({ content: "module.exports = (a,b) => Number(a)+Number(b);" }),
      })
      .mockResolvedValue({
        content: JSON.stringify({ content: "This file provides an explanation instead of code." }),
      });
    await expect(
      (new CodeGenAgent() as any).healError(
        root,
        "node test.cjs",
        "failure",
        { invoke: rejecting },
        "Node CLI",
      ),
    ).rejects.toThrow("3 invalid generations");
    expect(await fs.readFile(path.join(root, "math.cjs"), "utf8")).toBe(
      "module.exports = (a,b) => a+b;\n",
    );
  } finally {
    if (!path.basename(root).startsWith("loom-repair-test-")) throw new Error("bad fixture");
    await fs.rm(root, { recursive: true, force: true });
  }
});

it("self-healing retains approved design evidence and records only reviewer-approved UI", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'loom-design-repair-test-'));
  try {
    await fs.writeFile(path.join(root, 'App.jsx'), 'export default () => <main className="cards">Old</main>;');
    const reference = await loadDesignReference(root, { status: 'approved', projectId: 'fixture', screens: [{ id: 'jobs', title: 'Job Search', htmlCode: '<html><head><style>.cards { color: #0059bb; display: grid; }</style></head><body><main class="cards"><h1>Job Search</h1></main></body></html>' }] });
    const invoke = vi.fn()
      .mockResolvedValueOnce({ content: JSON.stringify({ readFiles: ['App.jsx'], edits: [{ filePath: 'App.jsx', instruction: 'Fix Job Search label while retaining design' }] }) })
      .mockResolvedValueOnce({ content: JSON.stringify({ content: 'export default () => <main>Job Search</main>;' }) })
      .mockResolvedValueOnce({ content: JSON.stringify({ passed: false, issues: ['Restore the cards styling hook'] }) })
      .mockResolvedValueOnce({ content: JSON.stringify({ content: 'export default () => <main className="cards">Job Search</main>;' }) })
      .mockResolvedValueOnce({ content: JSON.stringify({ passed: true, issues: [] }) });
    await (new CodeGenAgent() as any).healError(root, 'npm test', 'Job Search missing', { invoke }, 'React Job Search', reference);
    const source = await fs.readFile(path.join(root, 'App.jsx'), 'utf8');
    expect(source).toContain('className="cards"');
    for (const [messages] of invoke.mock.calls.slice(1)) expect(messages.at(-1).content).toContain('#0059bb');
    expect((await readDesignWrites(root))['App.jsx']).toEqual({ design: reference!.fingerprint, source: designHash(source) });
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
