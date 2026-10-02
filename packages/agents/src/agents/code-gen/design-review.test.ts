import { it, expect, vi } from "vitest";
import { reviewDesignSource, reviewFeedbackProblem } from "./design-review.js";

it('rechecks Tailwind-only demands against plain CSS without accepting a failed review', async () => {
  const issue = 'The hover:scale-102 hover:shadow-lg classes are not present in the source code.';
  expect(reviewFeedbackProblem({ passed: false, issues: [issue] }, false, true)).toContain('plain CSS');
  expect(reviewFeedbackProblem({ passed: false, issues: ['The .btn:hover selector has no transform; add scale(1.02) to match the reference.'] }, false, true)).toBeUndefined();
  const source = 'export default function Button() { return <button className="btn">Save</button>; }';
  const evidence = { design: 'Button hover scale 1.02 and shadow', styling: { utilityCss: false, classes: ['btn'], rules: '.btn:hover { transform: scale(1.02); box-shadow: 0 10px 15px #0003; }' } };
  const invoke = vi.fn().mockResolvedValueOnce({ content: JSON.stringify({ passed: false, issues: [issue] }) }).mockResolvedValueOnce({ content: '{"passed":true,"issues":[]}' });
  expect(await reviewDesignSource({ invoke } as any, { path: 'Button.tsx', description: 'Shared button' }, source, '', 'frontend', evidence)).toBe(source);
  expect(invoke.mock.calls[1]![0].at(-1).content).toContain('plain CSS');
  invoke.mockReset().mockResolvedValue({ content: JSON.stringify({ passed: false, issues: [issue] }) });
  await expect(reviewDesignSource({ invoke } as any, { path: 'Button.tsx', description: 'Shared button' }, source, '', 'frontend', evidence)).rejects.toThrow('no UI was accepted');
});
it("rejects contradictory and browser-only native review demands without auto-approving source", async () => {
  expect(
    reviewFeedbackProblem({ passed: false, issues: ["The title is already correct"] }, true),
  ).toBeTruthy();
  expect(
    reviewFeedbackProblem(
      { passed: false, issues: ["The source lacks Tailwind CSS classes"] },
      true,
    ),
  ).toBeTruthy();
  expect(
    reviewFeedbackProblem({ passed: false, issues: ["The Total Waste chart is missing"] }, true),
  ).toBeUndefined();
  const invoke = vi
    .fn()
    .mockResolvedValueOnce({
      content: JSON.stringify({ passed: false, issues: ["The source lacks Tailwind CSS classes"] }),
    })
    .mockResolvedValueOnce({ content: JSON.stringify({ passed: true, issues: [] }) });
  const source =
    "import 'package:flutter/material.dart'; class Screen extends StatelessWidget { const Screen({super.key}); Widget build(BuildContext context) => const Text('Scan'); }";
  expect(
    await reviewDesignSource(
      { invoke } as any,
      { path: "lib/screens/scan.dart", description: "Scan screen" },
      source,
      "Flutter",
      "Flutter UI",
      { design: "Scan title" },
    ),
  ).toBe(source);
  expect(invoke).toHaveBeenCalledTimes(2);
  expect(invoke.mock.calls[1]![0].at(-1).content).toContain("not native requirements");
});
it("does not ask a visual reviewer to judge state or browser bootstrap modules", async () => {
  const invoke = vi.fn();
  for (const path of [
    "src/store/index.ts",
    "src/main.tsx",
    "client/src/index.jsx",
    "lib/services/auth.dart",
    "lib/main.dart",
    "mobile/lib/main_dev.dart",
    "android/app/src/main/kotlin/com/example/app/MainActivity.kt",
  ]) {
    const source = "export const value = 1;";
    expect(
      await reviewDesignSource(
        { invoke } as any,
        { path, description: "Application infrastructure" },
        source,
        "",
        "Integration",
        { design: "Full dashboard screens" },
      ),
    ).toBe(source);
  }
  expect(invoke).not.toHaveBeenCalled();
});

it("rejects an identical quoted title comparison rather than modifying correct text", () => {
  expect(reviewFeedbackProblem({ passed: false, issues: [
    "The reference shows 'Virtual Try-On' but the source shows 'Virtual Try-On'.",
  ] }, true)).toContain("identical");
  expect(reviewFeedbackProblem({ passed: false, issues: [
    "The reference shows 'Virtual Try-On' but the source shows 'Dashboard'.",
  ] }, true)).toBeUndefined();
});

it("checkpoints source before a failed review without accepting the design", async () => {
  const checkpoint = vi.fn();
  const invoke = vi.fn(async () => { throw new Error("review unavailable"); });
  await expect(reviewDesignSource({ invoke } as any,
    { path: "lib/screens/home.dart", description: "Home" }, "class Home {}", "", "UI",
    { design: "Home reference", onSourceCheckpoint: checkpoint },
  )).rejects.toThrow("review unavailable");
  expect(checkpoint).toHaveBeenCalledWith("class Home {}");
});
it("repairs reviewer discrepancies before accepting generated UI source", async () => {
  const invoke = vi
    .fn()
    .mockResolvedValueOnce({
      content: JSON.stringify({
        passed: false,
        issues: ["Missing filter rail and reference card styles"],
      }),
    })
    .mockResolvedValueOnce({
      content: JSON.stringify({
        content:
          'export const Jobs = () => <main className="cards"><aside className="rail">Filters</aside></main>;',
      }),
    })
    .mockResolvedValueOnce({ content: JSON.stringify({ passed: true, issues: [] }) });
  const output = await reviewDesignSource(
    { invoke } as any,
    { path: "src/Jobs.jsx", description: "Jobs screen" },
    "export const Jobs = () => <main>Jobs</main>;",
    "React",
    "Frontend",
    { design: "Approved rail and card layout with blue surfaces" },
  );
  expect(output).toContain('className="rail"');
  expect(invoke.mock.calls[1]![0][1].content).toContain("Missing filter rail");
  expect(invoke.mock.calls[2]![0][0].content).toContain("not visual rendering");
});
it("fails rather than accepting UI rejected by the design reviewer", async () => {
  const rejected = vi.fn();
  const invoke = vi
    .fn()
    .mockImplementation(async (messages) =>
      String(messages[0].content).includes("design implementation reviewer")
        ? { content: JSON.stringify({ passed: false, issues: ["Unstyled UI"] }) }
        : { content: JSON.stringify({ content: "export const Jobs = () => <main>Jobs</main>;" }) },
    );
  await expect(
    reviewDesignSource(
      { invoke } as any,
      { path: "src/Jobs.jsx", description: "Jobs" },
      "export const Jobs = () => <main>Jobs</main>;",
      "React",
      "Frontend",
      { design: "Styled grid", onDesignRejection: rejected },
    ),
  ).rejects.toThrow("Stitch source review still fails");
  expect(rejected).toHaveBeenCalledTimes(3);
  expect(rejected).toHaveBeenLastCalledWith("export const Jobs = () => <main>Jobs</main>;\n", [
    "Unstyled UI",
  ]);
});

it("retries malformed review feedback while retaining the reference and never assumes approval", async () => {
  const source = 'export const Jobs = () => <main className="cards">Jobs</main>;';
  const invoke = vi
    .fn()
    .mockResolvedValueOnce({ content: "Looks good" })
    .mockResolvedValueOnce({ content: [{ type: "text", text: '{"passed":true,"issues":[]}' }] });
  expect(
    await reviewDesignSource(
      { invoke } as any,
      { path: "Jobs.jsx", description: "Jobs" },
      source,
      "React",
      "Frontend",
      { design: "Approved blue cards" },
    ),
  ).toBe(source);
  expect(invoke.mock.calls[1]![0][1].content).toContain("Approved blue cards");
  invoke.mockReset().mockResolvedValue({ content: "Looks good" });
  await expect(
    reviewDesignSource(
      { invoke } as any,
      { path: "Jobs.jsx", description: "Jobs" },
      source,
      "React",
      "Frontend",
      { design: "Approved blue cards" },
    ),
  ).rejects.toThrow("no UI was accepted");
  expect(invoke).toHaveBeenCalledTimes(2);
});
