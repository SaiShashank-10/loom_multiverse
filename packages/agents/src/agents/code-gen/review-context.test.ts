import { it, expect } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { currentDraftIssues, nativeReviewDependencies } from "./review-context.js";

it("does not replay rejected candidate feedback against newer source", () => {
  const draft = { source: "old source", issues: ["Missing cards"] };
  expect(currentDraftIssues("fixed source", draft)).toEqual([]);
  expect(currentDraftIssues("old source", draft)).toEqual(["Missing cards"]);
  expect(currentDraftIssues(undefined, draft)).toEqual(["Missing cards"]);
});

it("includes imported Flutter implementation and font registration with explicit omission", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "loom-review-"));
  try {
    await fs.mkdir(path.join(root, "lib/widgets"), { recursive: true });
    await fs.writeFile(path.join(root, "lib/widgets/shared.dart"), "class ReferenceImage { /* Image.asset */ }");
    await fs.writeFile(path.join(root, "lib/widgets/huge.dart"), "x".repeat(19000));
    await fs.writeFile(path.join(root, "pubspec.yaml"), "flutter:\n  fonts:\n    - family: HankenGrotesk\n");
    await fs.mkdir(path.join(root, ".loom-design"));
    await fs.mkdir(path.join(root, "assets"));
    await fs.writeFile(path.join(root, "assets/photo.png"), "image bytes");
    await fs.writeFile(path.join(root, ".loom-design/asset-manifest.json"), JSON.stringify([
      { asset: "assets/photo.png", url: "https://example.test/reference.png", sha256: createHash("sha256").update("image bytes").digest("hex") },
      { asset: "assets/photo.png", url: "https://example.test/wrong.png", sha256: "wrong" },
    ]));
    const context = await nativeReviewDependencies(root, "lib/screens/home.dart", "import '../widgets/shared.dart'; import '../widgets/huge.dart';");
    expect(context).toContain("class ReferenceImage");
    expect(context).toContain("family: HankenGrotesk");
    expect(context).toContain("implementation omitted");
    expect(context).toContain("assets/photo.png = https://example.test/reference.png");
    expect(context).not.toContain("wrong.png");
    await expect(nativeReviewDependencies(root, "lib/home.dart", "import '../../outside.dart';")).rejects.toThrow();
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});
