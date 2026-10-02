/** Launch saved code without invoking generation or changing design approval. */
import path from "node:path";
import fs from "node:fs/promises";
import { mobileProjectRoot, prepareMobileProject, runMobileApp } from "../agents/code-gen/mobile-runtime.js";
import { runCheck } from "../agents/code-gen/validation.js";

export async function runSavedMobile(projectId: string): Promise<void> {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(projectId)) throw new Error("Invalid saved project ID");
  const root = path.resolve("runs/workspaces", projectId);
  await fs.access(root);
  const matches = await Promise.allSettled([
    mobileProjectRoot(root, "flutter"), mobileProjectRoot(root, "react-native"),
  ]);
  const found = matches.flatMap((result, index) => result.status === "fulfilled" ? [index] : []);
  if (found.length !== 1) throw new Error("Saved project must contain exactly one Flutter or React Native app");
  const framework = found[0] === 0 ? "flutter" : "react-native";
  console.log(`Running saved ${framework} application. Design approval is unchanged; no AI generation is invoked.`);
  const preparation = await prepareMobileProject(root, {
    framework, platform: "mobile", deviceType: "MOBILE", evidence: "Detected from saved dependency manifest",
  }, console.log);
  if (framework === "flutter") {
    for (const command of ["flutter pub get", "flutter analyze", "flutter test"]) {
      if (command === "flutter test") {
        try { await fs.access(path.join(preparation.root, "test")); }
        catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") continue; throw error; }
      }
      console.log(command);
      await runCheck({ cwd: preparation.root, command, stage: "validate" }, preparation.env);
    }
  }
  const result = await runMobileApp(preparation, console.log);
  if (!result.success || !result.isRunning) throw new Error(`App did not start: ${JSON.stringify(result)}`);
  console.log(`App is running on ${result.deviceId}. Runtime evidence: ${path.join(preparation.root, ".loom-mobile")}`);
}
