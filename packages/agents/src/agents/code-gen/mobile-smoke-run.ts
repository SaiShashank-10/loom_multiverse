import path from "node:path";
import { prepareMobileProject, runMobileApp } from "./mobile-runtime.js";
import { runCheck } from "./validation.js";
const framework = process.argv[2] === "react-native" ? "react-native" : "flutter";
const root = path.resolve(
  framework === "flutter" ? "runs/mobile-smoke/flutter" : "runs/mobile-smoke/loom-expo-smoke",
);
const preparation = await prepareMobileProject(
  root,
  {
    framework,
    platform: "mobile",
    deviceType: "MOBILE",
    evidence: "Isolated native execution smoke test",
  },
  console.log,
);
for (const command of framework === "flutter"
  ? ["flutter analyze", "flutter test"]
  : ["npx --no-install tsc --noEmit"])
  await runCheck({ cwd: root, stage: "validate", command }, preparation.env);
const result = await runMobileApp(preparation, console.log);
console.log(JSON.stringify(result, null, 2));
if (!result.success) process.exitCode = 1;
