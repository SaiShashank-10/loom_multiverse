import { it, expect } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { auditSources, assertSourceAudit, quarantineInvalidOrphans } from "./source-audit.js";

it("finds nested and unlisted corrupt files, missing manifest entries, and excludes its own reports", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "loom-audit-test-"));
  try {
    await fs.mkdir(path.join(root, "src", "nested"), { recursive: true });
    await fs.writeFile(
      path.join(root, "src/nested/app.css"),
      "It appears you've provided HTML snippets.",
    );
    await fs.writeFile(path.join(root, "src/app.js"), "export const ready = true;");
    await fs.writeFile(path.join(root, "src/app.jsx"), "export const ready = true;");
    await fs.writeFile(path.join(root, "source-audit.json"), "old invalid report");
    await fs.writeFile(path.join(root, "validation-report.json"), "old invalid report");
    const manifest = [{ path: "missing.py" }];
    const report = await auditSources(root, manifest);
    expect(report.counts).toEqual({ total: 4, invalid: 2, valid: 2 });
    expect(report.entries.find((entry) => entry.path.endsWith("app.css"))?.status).toBe("invalid");
    expect(report.warnings).toHaveLength(1);
    await expect(assertSourceAudit(root, manifest)).rejects.toThrow("2 files");
    expect(
      JSON.parse(await fs.readFile(path.join(root, "source-audit.json"), "utf8")).success,
    ).toBe(false);
  } finally {
    if (!path.basename(root).startsWith("loom-audit-test-")) throw new Error("bad fixture");
    await fs.rm(root, { recursive: true, force: true });
  }
});

it("backs up invalid orphaned generated files while preserving valid unlisted work", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "loom-audit-test-"));
  try {
    await fs.mkdir(path.join(root, "src"), { recursive: true });
    await fs.writeFile(path.join(root, "src/orphan.dart"), "A beautiful application experience.");
    await fs.writeFile(path.join(root, "src/custom.js"), "export const custom = true;");
    expect(await quarantineInvalidOrphans(root, [{ path: "src/main.js" }])).toEqual([
      "src/orphan.dart",
    ]);
    await expect(fs.access(path.join(root, "src/orphan.dart"))).rejects.toThrow();
    await expect(fs.access(path.join(root, "src/custom.js"))).resolves.toBeUndefined();
    const backups = await fs.readdir(path.join(root, ".loom-backups"));
    await expect(
      fs.access(path.join(root, ".loom-backups", backups[0]!, "orphaned/src/orphan.dart")),
    ).resolves.toBeUndefined();
  } finally {
    if (!path.basename(root).startsWith("loom-audit-test-")) throw new Error("bad fixture");
    await fs.rm(root, { recursive: true, force: true });
  }
});

it("treats package-manager lockfiles as generated artifacts rather than source", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "loom-audit-test-"));
  try {
    await fs.writeFile(
      path.join(root, "package-lock.json"),
      JSON.stringify({
        name: "app",
        packages: { "node_modules/example": { description: "placeholder package metadata" } },
      }),
    );
    const report = await auditSources(root);
    expect(report.success).toBe(true);
    expect(report.entries[0]?.status).toBe("asset");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
