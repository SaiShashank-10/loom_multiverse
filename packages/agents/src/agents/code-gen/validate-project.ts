import path from "node:path";
import fs from "node:fs/promises";
import { discoverChecks, runCheck } from "./validation.js";
import { assertSourceAudit } from "./source-audit.js";
import { assertNodePackageIntegrity } from "./package-integrity.js";

// Uses the same checks as self-healing without invoking an LLM or changing source.
async function main() {
  const directory = process.argv[2];
  if (!directory)
    throw new Error(
      "Usage: npx tsx packages/agents/src/agents/code-gen/validate-project.ts <project-directory>",
    );
  const root = path.resolve(directory);
  await assertSourceAudit(root);
  await assertNodePackageIntegrity(root);
  const checks = await discoverChecks(root);
  if (!checks.some((check) => check.stage === "validate"))
    throw new Error("No executable validation checks were discovered");
  const completed = [];
  let success = true;
  for (const stage of ["install", "validate"] as const) {
    for (const check of checks.filter((c) => c.stage === stage)) {
      console.log(`${path.relative(root, check.cwd) || "."}: ${check.command}`);
      try {
        await runCheck(check);
        completed.push({ ...check, success: true });
      } catch (error) {
        completed.push({ ...check, success: false, error: String(error) });
        console.error(String(error));
        success = false;
        break;
      }
    }
    if (!success) break;
  }
  await fs.writeFile(
    path.join(root, "validation-report.json"),
    JSON.stringify({ success, completed, timestamp: new Date().toISOString() }, null, 2),
  );
  process.exitCode = success ? 0 : 1;
}
main().catch((error) => {
  console.error(String(error));
  process.exitCode = 1;
});
