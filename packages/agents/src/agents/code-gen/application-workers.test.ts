import { it, expect, vi } from "vitest";
vi.mock("../../llm/index.js", () => ({ createTier2LLM: vi.fn() }));
import {
  ApplicationWorkerTeam,
  InterfaceIndex,
  orderSourceFiles,
  applicationRole,
} from "./application-workers.js";
it("reviews repaired UI without regenerating and overwriting it first", async () => {
  const source = "export default function Screen(){return <main>Repaired screen</main>}";
  const invoke = vi
    .fn()
    .mockResolvedValue({ content: JSON.stringify({ passed: true, issues: [] }) });
  const team = new ApplicationWorkerTeam(() => ({ invoke }) as any);
  expect(
    await team.generate({ path: "src/Screen.tsx", description: "Screen" }, "React", {
      currentFile: source,
      design: "Repaired screen",
    }),
  ).toBe(source);
  expect(invoke).toHaveBeenCalledTimes(1);
  expect(invoke.mock.calls[0]![0][0].content).toContain("design implementation reviewer");
});

it("retains matching API interfaces after a long project history", async () => {
  const index = new InterfaceIndex();
  index.add("src/api.js", "export function getProjects(userId) { return fetch('/api/projects'); }");
  for (let i = 0; i < 100; i++)
    index.add(`src/unrelated${i}.js`, `export const value${i} = '${"x".repeat(2000)}';`);
  const invoke = vi.fn().mockResolvedValue({
    content: JSON.stringify({ content: "export const Project = () => null;" }),
  });
  const team = new ApplicationWorkerTeam(() => ({ invoke }) as any);
  await team.generate(
    { path: "src/components/Project.jsx", description: "Display getProjects API response" },
    "Long design narrative. ".repeat(5000),
    {
      structure: "src/api.js\nsrc/components/Project.jsx",
      interfaces: index.forFile("src/components/Project.jsx", "getProjects API"),
    },
  );
  const prompt = invoke.mock.calls[0]![0][1].content;
  expect(prompt).toContain("getProjects(userId)");
  expect(prompt).toContain("src/api.js");
  expect(prompt).toContain("FINAL TASK: Implement src/components/Project.jsx");
  expect(prompt.length).toBeLessThan(15000);
  expect(invoke.mock.calls[0]![0][0].content).toContain("Frontend engineer");
});
it("orders config and shared interfaces before consumers, entry points and tests", () => {
  const files = [
    "src/App.js",
    "src/components/Contact.jsx",
    "src/utils/api.js",
    "package.json",
    "tests/app.test.js",
  ].map((path) => ({ path }));
  expect(orderSourceFiles(files).map((f) => f.path)).toEqual([
    "package.json",
    "src/utils/api.js",
    "src/components/Contact.jsx",
    "src/App.js",
    "tests/app.test.js",
  ]);
  expect(applicationRole("backend/routes/auth.ts")).toBe("backend");
  expect(applicationRole("lib/widgets/home.dart")).toBe("frontend");
});

it("shares stylesheet selectors beyond large declaration blocks and generates styles before screens", () => {
  const index = new InterfaceIndex();
  index.add(
    "src/index.css",
    `:root { --brand: #0059bb; } .header { ${"padding: 1px;".repeat(400)} } .job-grid { display: grid; } @media(max-width:600px) { .mobile-filter { display: block; } }`,
  );
  const evidence = index.forFile("src/components/JobSearch.jsx", "Job Search");
  expect(evidence).toContain(".job-grid");
  expect(evidence).toContain(".mobile-filter");
  expect(evidence).toContain("--brand: #0059bb");
  expect(
    orderSourceFiles([{ path: "src/JobSearch.jsx" }, { path: "src/index.css" }])[0]?.path,
  ).toBe("src/index.css");
  expect(applicationRole("lib/main.dart")).toBe("frontend");
});
