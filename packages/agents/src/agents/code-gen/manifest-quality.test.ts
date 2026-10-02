import { describe, expect, it } from "vitest";
import { manifestQualityIssues, completeBrowserEntrypoints, completeBehavioralTests } from "./manifest-quality.js";

it("repairs the missing behavioral test blocker while preserving feature architecture", () => {
  const plan = {files:[{path:"package.json",description:"React Vite application"},{path:"src/App.tsx",description:"Catalog, checkout and cart routes"}]};
  const repaired = completeBehavioralTests(completeBrowserEntrypoints(plan), "react");
  expect(manifestQualityIssues(repaired,"react")).toEqual([]);
  expect(repaired.files.find(f=>f.path==="src/App.tsx")).toEqual(plan.files[1]);
  expect(repaired.files.find(f=>f.path==="tests/app.behavior.test.tsx")?.description).toContain("primary required user flow");
  expect(completeBehavioralTests(repaired,"react")).toEqual(repaired);
  expect(plan.files).toHaveLength(2);
});
it("uses native Flutter and React Native tests instead of browser dependencies", () => {
  const flutter = completeBehavioralTests({files:[{path:"pubspec.yaml",description:"Flutter"},{path:"lib/main.dart",description:"App"}]},"flutter");
  expect(flutter.files.some(f=>f.path==="test/app_behavior_test.dart")).toBe(true);
  const rn = completeBehavioralTests({files:[{path:"package.json",description:"Expo app"},{path:"App.tsx",description:"Native app"}]},"react-native");
  expect(rn.files.find(f=>f.path.includes("test.tsx"))?.description).toContain("@testing-library/react-native");
  expect(rn.files.some(f=>f.description.includes("jsdom"))).toBe(false);
});

describe("manifest quality", () => {
  it("completes the reported React bootstrap omission without discarding features and is idempotent", () => {
    const original = {
      files: [
        { path: "package.json", description: "Dependency and script manifest" },
        { path: "src/App.tsx", description: "Main application" },
        { path: "src/components/Reports.tsx", description: "Approved reports screen" },
        { path: "src/App.test.tsx", description: "Behavioral tests" },
      ],
    };
    const fixed = completeBrowserEntrypoints(original);
    expect(manifestQualityIssues(fixed)).toEqual([]);
    expect(fixed.files.map((file) => file.path)).toEqual(
      expect.arrayContaining([
        "src/main.tsx",
        "index.html",
        "vite.config.ts",
        "src/components/Reports.tsx",
      ]),
    );
    expect(completeBrowserEntrypoints(fixed)).toEqual(fixed);
    expect(original.files).toHaveLength(4);
  });
  it("keeps browser repairs scoped to nested packages and preserves existing startup files", () => {
    const manifest = {
      files: [
        { path: "package.json", description: "Workspace" },
        { path: "apps/web/package.json", description: "React Vite" },
        { path: "apps/web/src/App.jsx", description: "UI" },
        { path: "apps/web/src/index.jsx", description: "Custom mount and providers" },
        { path: "apps/api/package.json", description: "API" },
        { path: "apps/api/src/index.ts", description: "Server" },
      ],
    };
    const fixed = completeBrowserEntrypoints(manifest);
    expect(fixed.files.find((file) => file.path === "apps/web/index.html")?.description).toContain(
      "/src/index.jsx",
    );
    expect(fixed.files.filter((file) => /main\./.test(file.path))).toHaveLength(0);
    expect(fixed.files.some((file) => file.path === "index.html")).toBe(false);
    expect(fixed.files.find((file) => file.path === "apps/web/src/index.jsx")?.description).toBe(
      "Custom mount and providers",
    );
  });
  it("does not insert browser bootstraps into native or framework-managed apps", () => {
    for (const framework of [
      "flutter",
      "react native",
      "react-native",
      "expo",
      "next.js",
      "remix",
    ]) {
      const manifest = {
        files: [
          { path: "package.json", description: "Application" },
          { path: "src/App.tsx", description: "App" },
        ],
      };
      expect(completeBrowserEntrypoints(manifest, framework)).toEqual(manifest);
    }
    const cra = {
      files: [
        { path: "package.json", description: "react-scripts" },
        { path: "src/App.jsx", description: "App" },
        { path: "public/index.html", description: "Template" },
      ],
    };
    expect(
      completeBrowserEntrypoints(cra).files.some((file) => /vite|^index.html$/.test(file.path)),
    ).toBe(false);
  });
  const mobileManifest = (files: Array<[string, string]>) => ({
    files: files.map(([path, description]) => ({ path, description })),
  });
  it("accepts bare React Native src/App with root registration and Expo root App with declared entry", () => {
    expect(
      manifestQualityIssues(
        mobileManifest([
          ["package.json", "React Native dependencies"],
          ["index.js", "Register native root component"],
          ["src/App.tsx", "Native navigation"],
          ["src/App.test.tsx", "Navigation behavior"],
        ]),
        "react native",
      ),
    ).toEqual([]);
    expect(
      manifestQualityIssues(
        mobileManifest([
          ["package.json", "Expo dependencies and standard Expo application entry"],
          ["App.tsx", "Native app"],
          ["App.test.tsx", "Navigation behavior"],
        ]),
        "react-native",
      ),
    ).toEqual([]);
    expect(
      manifestQualityIssues(
        mobileManifest([
          ["package.json", "Native dependencies"],
          ["app.json", "Expo application configuration"],
          ["App.tsx", "Native app"],
          ["App.test.tsx", "Navigation behavior"],
        ]),
        "react-native",
      ),
    ).toEqual([]);
  });
  it("accepts declared Expo Router entries and nested mobile packages without browser entrypoints", () => {
    expect(
      manifestQualityIssues(
        mobileManifest([
          ["package.json", "Workspace packages"],
          ["apps/mobile/package.json", "Expo Router entry and dependencies"],
          ["apps/mobile/app/_layout.tsx", "Native router layout"],
          ["apps/mobile/app/index.tsx", "Home route"],
          ["apps/mobile/app/index.test.tsx", "Home behavior"],
          ["apps/api/package.json", "Server dependencies"],
          ["apps/api/src/index.ts", "API entry"],
        ]),
        "react-native",
      ),
    ).toEqual([]);
  });
  it("rejects missing native registration and does not mistake a bare app name config for Expo", () => {
    const issues = manifestQualityIssues(
      mobileManifest([
        ["package.json", "React Native dependencies"],
        ["src/App.tsx", "Native app"],
        ["app.json", "Application registration name"],
        ["src/App.test.tsx", "Navigation behavior"],
      ]),
      "react-native",
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("registration entry");
    expect(issues[0]).not.toContain("src/main");
  });
  it("locks mobile client languages while preserving a separate JavaScript backend for Flutter", () => {
    const flutter = mobileManifest([
      ["pubspec.yaml", "Flutter dependencies"],
      ["lib/main.dart", "Flutter entry"],
      ["test/app_test.dart", "App behavior"],
      ["backend/package.json", "API dependencies"],
      ["backend/src/App.tsx", "Server-rendered admin"],
      ["backend/src/index.ts", "Server entry"],
    ]);
    expect(manifestQualityIssues(flutter, "flutter")).toEqual([]);
    expect(
      manifestQualityIssues(flutter, "react-native").some((issue) =>
        issue.includes("Flutter files"),
      ),
    ).toBe(true);
    flutter.files.push({ path: "src/screens/Login.tsx", description: "React Native login" });
    expect(
      manifestQualityIssues(flutter, "flutter").some((issue) => issue.includes("React frontend")),
    ).toBe(true);
  });
  it("rejects ambiguous module extensions and duplicate client roots", () => {
    const issues = manifestQualityIssues({
      files: [
        { path: "src/App.js", description: "React application" },
        { path: "src/App.jsx", description: "Another React application" },
        { path: "src/frontend/src/App.js", description: "Nested duplicate application" },
      ],
    });
    expect(issues.some((issue) => issue.includes("module variants"))).toBe(true);
    expect(issues.some((issue) => issue.includes("frontend layouts"))).toBe(true);
  });

  it("accepts a monorepo when package paths are distinct", () => {
    expect(
      manifestQualityIssues({
        files: [
          { path: "apps/web/package.json", description: "Web dependency and script manifest" },
          { path: "apps/api/package.json", description: "API dependency and script manifest" },
          { path: "apps/web/src/App.tsx", description: "Web application" },
          { path: "apps/web/src/main.tsx", description: "Web browser entrypoint" },
          { path: "apps/api/src/server.ts", description: "API entrypoint" },
          { path: "apps/web/src/App.test.tsx", description: "Behavioral application tests" },
        ],
      }),
    ).toEqual([]);
  });

  it("rejects source trees without manifests and binary assets the text generator cannot write", () => {
    const issues = manifestQualityIssues({
      files: [
        { path: "src/App.js", description: "Web application" },
        { path: "src/App.test.js", description: "Behavioral test" },
        { path: "src/assets/logo.png", description: "Logo" },
      ],
    });
    expect(issues.some((issue) => issue.includes("no package.json"))).toBe(true);
    expect(issues.some((issue) => issue.includes("binary assets"))).toBe(true);
  });

  it("rejects React and Vite layouts without executable browser entrypoints", () => {
    const issues = manifestQualityIssues({
      files: [
        { path: "package.json", description: "Vite React package manifest" },
        { path: "src/App.jsx", description: "React application" },
        { path: "src/App.test.jsx", description: "Behavioral test" },
      ],
    });
    expect(issues.some((issue) => issue.includes("src/main"))).toBe(true);
    expect(issues.some((issue) => issue.includes("index.html"))).toBe(true);
  });
});
