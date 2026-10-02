import { it, expect, vi } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  loadDesignReference,
  screenEvidence,
  designEvidenceFor,
  designFile,
  assertDesignImplementation,
  recordDesignWrite,
} from "./design-reference.js";
import { generateSource } from "./source-output.js";

const html =
  '<html><head><style>.card { background: #123abc; padding: 24px; }</style></head><body><nav class="rail">Home</nav><main><h1>Job Search</h1><section class="results-grid"><h2>Skill match</h2></section></main></body></html>';

it("preserves exact approved image URLs instead of forcing workers to guess assets", () => {
  const evidence = screenEvidence({ id:'home', title:'Home', device:'MOBILE', sha256:'x',
    html:html.replace('</main>', '<img src="https://lh3.googleusercontent.com/reference-image?a=1&amp;b=2" data-alt="Navy blazer"/></main>') });
  expect(evidence).toContain('https://lh3.googleusercontent.com/reference-image?a=1&b=2');
  expect(evidence).toContain('Navy blazer');
});

it("matches Flutter home to its own reference instead of incidental outfit words", () => {
  const reference = { fingerprint: "test", screens: [
    { id: "try-on", title: "Style OS - Virtual Try-On & Outfit Diary", device: "MOBILE", html: html.replace("Job Search", "TRYON_MARKER"), sha256: "a" },
    { id: "home", title: "Style OS - Mobile Home", device: "MOBILE", html: html.replace("Job Search", "HOME_MARKER"), sha256: "b" },
  ] };
  const evidence = designEvidenceFor(reference, "lib/screens/mobile_home_screen.dart", "Home displaying outfit recommendations and diary shortcuts");
  expect(evidence).toContain("HOME_MARKER");
  expect(evidence).not.toContain("TRYON_MARKER");
  expect(designEvidenceFor(reference, "lib/main.dart", "App entry point")).toBe("");
});
const stitch = {
  status: "approved",
  projectId: "123",
  screens: [
    {
      id: "jobs",
      title: "Job Search",
      deviceType: "DESKTOP",
      htmlCode: { downloadUrl: "https://example.invalid/screen" },
    },
  ],
};
it("retains all controls and chart/table structure beyond the old sampled landmark budget", () => {
  const body = Array.from(
    { length: 55 },
    (_, i) =>
      `<section class="card"><h2>Section ${i}</h2><button>Action ${i}</button><table><tr><th>Department ${i}</th></tr></table><svg aria-label="Chart ${i}"><path d="M0 0 L5 5"/></svg></section>`,
  ).join("");
  const evidence = screenEvidence({
    id: "dense",
    title: "Dashboard",
    device: "DESKTOP",
    html: `<body>${body}</body>`,
    sha256: "test",
  });
  for (let i = 0; i < 55; i++) {
    expect(evidence).toContain(`Action ${i}`);
    expect(evidence).toContain(`Department ${i}`);
    expect(evidence).toContain(`Chart ${i}`);
  }
});

it("downloads actual exports once, verifies cached hashes and invalidates changed designs", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "loom-design-"));
  try {
    const download = vi.fn().mockResolvedValue(html);
    const first = await loadDesignReference(root, stitch, download);
    expect(first?.screens[0]?.html).toBe(html);
    await loadDesignReference(root, stitch, download);
    expect(download).toHaveBeenCalledTimes(1);
    const changed = structuredClone(stitch);
    changed.screens[0]!.htmlCode.downloadUrl += "?revision=2";
    download.mockResolvedValue(html.replace("#123abc", "#abcdef"));
    expect((await loadDesignReference(root, changed, download))?.fingerprint).not.toBe(
      first?.fingerprint,
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

it("refreshes expired artifacts and blocks generic fallback when exports cannot be fetched", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "loom-design-"));
  try {
    const download = vi.fn().mockRejectedValue(new Error("expired"));
    await expect(
      loadDesignReference(root, stitch, download, async () => {
        throw new Error("offline");
      }),
    ).rejects.toThrow("will not substitute a generic UI");
    const reference = await loadDesignReference(root, stitch, download, async () => ({
      htmlCode: html,
    }));
    expect(reference?.screens[0]?.html).toBe(html);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

it("keeps design tokens and late sections in initial generation and every repair prompt", async () => {
  const screen = {
    id: "jobs",
    title: "Job Search",
    device: "DESKTOP",
    html: html.replace(
      "</main>",
      `${"<!-- filler -->".repeat(1000)}<section><h2>Late requirements</h2></section></main>`,
    ),
    sha256: "test",
  };
  const evidence = designEvidenceFor(
    { fingerprint: "test", screens: [screen] },
    "src/JobSearch.jsx",
    "Job Search",
  );
  expect(screenEvidence(screen)).toContain("Late requirements");
  const invoke = vi
    .fn()
    .mockResolvedValueOnce({
      content: JSON.stringify({ content: "This is an explanation of the screen." }),
    })
    .mockResolvedValue({
      content: JSON.stringify({
        content:
          'export default function JobSearch() { return <main className="results-grid">Jobs</main>; }',
      }),
    });
  await generateSource(
    { invoke } as any,
    { path: "src/JobSearch.jsx", description: "Job Search" },
    "Planning history. ".repeat(2000),
    "Frontend engineer",
    { design: evidence },
  );
  expect(invoke).toHaveBeenCalledTimes(2);
  for (const [messages] of invoke.mock.calls) {
    expect(messages[1].content).toContain("#123abc");
    expect(messages[1].content).toContain("Late requirements");
    expect(messages[1].content).toContain("APPROVED STITCH VISUAL CONTRACT");
  }
});

it("requires screen coverage and styling while recording that visual comparison is separate", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "loom-design-"));
  try {
    const reference = (await loadDesignReference(root, stitch, async () => html))!;
    await fs.writeFile(path.join(root, "App.jsx"), "export default () => <main>Job Search</main>;");
    await expect(
      assertDesignImplementation(root, reference, [{ path: "App.jsx", description: "Root" }]),
    ).rejects.toThrow("no implementation mapping");
    await fs.writeFile(
      path.join(root, "App.jsx"),
      'export default () => <main className="results-grid">Job Search</main>;',
    );
    await expect(assertDesignImplementation(root, reference, [
      { path: "App.jsx", description: "Job Search screen" },
    ])).rejects.toThrow("missing or stale");
    await recordDesignWrite(root, reference, "App.jsx", await fs.readFile(path.join(root, "App.jsx"), "utf8"));
    await assertDesignImplementation(root, reference, [
      { path: "App.jsx", description: "Job Search screen" },
    ]);
    const report = JSON.parse(
      await fs.readFile(path.join(root, ".loom-design/implementation-report.json"), "utf8"),
    );
    expect(report.sourceChecksPassed).toBe(true);
    expect(report.visualComparison).toBe("not_performed");
    await fs.appendFile(path.join(root, "App.jsx"), "\n// source changed after approval");
    await expect(assertDesignImplementation(root, reference, [
      { path: "App.jsx", description: "Job Search screen" },
    ])).rejects.toThrow("missing or stale");
    expect(designFile("lib/widgets/home.dart")).toBe(true);
    expect(designFile("src/App.js")).toBe(true);
    expect(designFile("ml/train.py")).toBe(false);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

it("retains responsive controls when mobile token definitions exceed the excerpt budget", () => {
  const desktop = { id: "desktop", title: "Job Search", device: "DESKTOP", html, sha256: "a" };
  const mobile = {
    id: "mobile",
    title: "Mobile Job Search",
    device: "MOBILE",
    html: `<html><head><script>tailwind.config = { ${'brand: "blue",'.repeat(500)} };</script></head><body><main class="single-column"><h1>Job Search</h1><button class="mobile-filter">Filters</button></main></body></html>`,
    sha256: "b",
  };
  const result = designEvidenceFor(
    { fingerprint: "test", screens: [desktop, mobile] },
    "src/JobSearch.jsx",
    "Desktop Job Search",
  );
  expect(result).toContain("RESPONSIVE VARIANT:");
  expect(result).toContain("single-column");
  expect(result).toContain("mobile-filter");
});
