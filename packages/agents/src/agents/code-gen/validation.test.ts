import { describe, it, expect, afterEach } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  discoverChecks,
  safePath,
  validateAndHeal,
  requiredFramework,
  assertRequiredStructure,
} from "./validation.js";
const roots: string[] = [];
async function fixture(files: Record<string, string>) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "loom-validation-"));
  roots.push(root);
  for (const [name, text] of Object.entries(files)) {
    const full = path.join(root, name);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, text);
  }
  return root;
}
afterEach(async () => {
  for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true });
});
describe("project validation", () => {
  it("recovers the Firebase web interop dependency failure and revalidates without model repair", async () => {
    const root = await fixture({
      "pubspec.yaml": "dependencies:\n  flutter:\n    sdk: flutter",
      "web/index.html": "<html></html>",
    });
    const calls: string[] = [];
    let upgraded = false;
    let modelRepairs = 0;
    const result = await validateAndHeal(
      root,
      async () => {
        modelRepairs++;
        return false;
      },
      async (check) => {
        calls.push(check.command);
        if (check.command === "flutter pub upgrade firebase_core_web") upgraded = true;
        if (check.command === "flutter build web" && !upgraded)
          throw new Error(
            "firebase_core_web-3.11.0: The method 'isA' isn't defined for the type 'Object'.",
          );
      },
    );
    expect(result.success).toBe(true);
    expect(result.attempts).toBe(2);
    expect(modelRepairs).toBe(0);
    expect(calls.filter((command) => command === "flutter build web")).toHaveLength(2);
  });
  it("discovers nested Flutter and a JS backend without inventing webpack", async () => {
    const root = await fixture({
      "package.json": '{"devDependencies":{"webpack":"*"}}',
      "frontend/pubspec.yaml": "dependencies:\n  flutter:\n    sdk: flutter",
      "backend/package.json": '{"scripts":{"test":"node --test"}}',
    });
    const checks = await discoverChecks(root);
    expect(checks.some((c) => c.cwd.endsWith("frontend") && c.command === "flutter analyze")).toBe(
      true,
    );
    expect(checks.some((c) => c.cwd.endsWith("backend") && c.command === "npm run test")).toBe(
      true,
    );
    expect(checks.some((c) => c.command.includes("webpack") || c.command === "npm run build")).toBe(
      false,
    );
  });
  it("uses declared package manager for patch protocol", async () => {
    const root = await fixture({
      "package.json": JSON.stringify({
        packageManager: "yarn@4.0.0",
        dependencies: { a: "patch:a@npm:1#patch" },
        scripts: { build: "vite build" },
      }),
    });
    expect((await discoverChecks(root))[0]?.command).toBe("yarn install");
  });
  it("runs finite test commands that explicitly disable watch mode", async () => {
    const root = await fixture({
      "package.json": JSON.stringify({
        scripts: { test: "react-scripts test --watchAll=false" },
        dependencies: { "react-scripts": "5.0.1" },
      }),
    });
    expect((await discoverChecks(root)).some((check) => check.command === "npm run test")).toBe(
      true,
    );
  });
  it("rejects npm patch dependencies with an actionable diagnosis", async () => {
    const root = await fixture({
      "package.json": '{"dependencies":{"a":"patch:a"},"scripts":{"test":"node --test"}}',
    });
    await expect(discoverChecks(root)).rejects.toThrow("npm cannot install");
  });
  it("reinstalls after a compile repair and validates the changed code", async () => {
    const root = await fixture({ "package.json": '{"scripts":{"build":"tsc"}}' });
    const calls: string[] = [];
    let failed = false;
    const result = await validateAndHeal(
      root,
      async () => true,
      async (check) => {
        calls.push(check.command);
        if (check.command.endsWith("build") && !failed) {
          failed = true;
          throw new Error("missing module");
        }
      },
    );
    expect(result.success).toBe(true);
    expect(calls).toEqual(["npm install", "npm run build", "npm install", "npm run build"]);
  });
  it("stops repeated errors and never declares success", async () => {
    const root = await fixture({ "Cargo.toml": '[package]\nname="app"' });
    let repairs = 0;
    const result = await validateAndHeal(
      root,
      async () => {
        repairs++;
        return true;
      },
      async () => {
        throw new Error("compile failure");
      },
    );
    expect(result.success).toBe(false);
    expect(repairs).toBe(1);
  });
  it("does not heal missing host SDKs", async () => {
    const root = await fixture({ "go.mod": "module app" });
    let repairs = 0;
    const result = await validateAndHeal(
      root,
      async () => {
        repairs++;
        return true;
      },
      async () => {
        throw new Error("'go' is not recognized as an internal command");
      },
    );
    expect(result.success).toBe(false);
    expect(repairs).toBe(0);
  });
  it("supports explicit validation for unfamiliar stacks and fails closed otherwise", async () => {
    const root = await fixture({ "main.unknown": "source" });
    await expect(discoverChecks(root)).rejects.toThrow("loom.validation.json");
    await fs.writeFile(
      path.join(root, "loom.validation.json"),
      JSON.stringify({ projects: [{ directory: ".", validate: ["custom-compiler check"] }] }),
    );
    expect((await discoverChecks(root))[0]?.command).toBe("custom-compiler check");
  });
  it("rejects path escapes and protected files on Windows and POSIX", () => {
    for (const p of [
      "../outside",
      "C:\\outside",
      "/outside",
      "a/../../outside",
      ".env",
      "a/.git/config",
    ])
      expect(() => safePath(os.tmpdir(), p)).toThrow();
  });
  it("keeps Flutter mandatory and applies later user stack revisions", () => {
    const framework = requiredFramework("Build using Flutter");
    expect(() => assertRequiredStructure(framework, ["package.json", "App.tsx"])).toThrow();
    expect(() =>
      assertRequiredStructure(framework, ["frontend/pubspec.yaml", "frontend/lib/main.dart"]),
    ).not.toThrow();
    expect(requiredFramework("Build using Flutter\nSwitch to React Native")).toBe("react native");
    expect(requiredFramework("Use Flutter, not React Native")).toBe("flutter");
    expect(requiredFramework("Flutter frontend and FastAPI backend")).toBe("flutter");
  });
  it("locks common web, mobile and backend stacks to native project files", () => {
    expect(requiredFramework("React frontend and Express backend")).toBe("react");
    expect(() => assertRequiredStructure("react", ["package.json", "src/index.js"])).toThrow();
    expect(() =>
      assertRequiredStructure("react", ["package.json", "src/App.tsx", "src/App.test.tsx"]),
    ).not.toThrow();
    expect(() => assertRequiredStructure("rust", ["Cargo.toml", "src/main.rs"])).not.toThrow();
    expect(() => assertRequiredStructure("go", ["go.mod", "main.go"])).not.toThrow();
    expect(() => assertRequiredStructure("vue", ["package.json", "src/App.jsx"])).toThrow();
  });
});

it("validates Expo Android bundles even when typecheck exists and avoids standalone native Gradle subprojects", async () => {
  const root = await fixture({
    "package.json": JSON.stringify({
      name: "native",
      dependencies: { expo: "57.0.24", "react-native": "0.86.3" },
      scripts: { typecheck: "tsc --noEmit" },
    }),
    "android/build.gradle": "plugins {}",
    "android/app/build.gradle": "plugins {}",
  });
  const checks = await discoverChecks(root);
  expect(
    checks.some((check) => check.command === "npx --no-install expo export --platform android"),
  ).toBe(true);
  expect(checks.some((check) => /gradle/.test(check.command))).toBe(false);
  expect(() => safePath(root, ".loom-mobile/runtime.json")).toThrow("Protected");
});

it("validates the requested mobile target without making optional Flutter web compilation a prerequisite", async () => {
  const root = await fixture({
    "pubspec.yaml": "dependencies: {flutter: {sdk: flutter}}",
    "lib/main.dart": "void main() {}",
    "test/app_test.dart": "void main() {}",
    "web/index.html": "<html></html>",
  });
  expect((await discoverChecks(root, { nativeMobile: true })).map((c) => c.command)).toEqual([
    "flutter pub get",
    "flutter analyze",
    "flutter test",
  ]);
  expect((await discoverChecks(root)).some((c) => c.command === "flutter build web")).toBe(true);
});
