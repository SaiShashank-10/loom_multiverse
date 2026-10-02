import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  assertMobileStack,
  isMobileClientFile,
  mobileRole,
  MobileWorkerTeam,
} from "./mobile-workers.js";
import { generateSource } from "./source-output.js";
import { reviewDesignSource } from "./design-review.js";

vi.mock("./source-output.js", async (importOriginal) => ({
  ...await importOriginal<typeof import("./source-output.js")>(), generateSource: vi.fn(),
}));
vi.mock("./design-review.js", () => ({ reviewDesignSource: vi.fn() }));
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(reviewDesignSource).mockImplementation(async (_llm, _file, source) => source);
});

describe("mobile source boundaries", () => {
  it("routes native UI, native tests and client API repositories without capturing separate backends/ML", () => {
    expect(isMobileClientFile("lib/screens/home.dart", "flutter")).toBe(true);
    expect(isMobileClientFile("src/api/client.ts", "react-native")).toBe(true);
    expect(isMobileClientFile("backend/src/routes.ts", "react-native")).toBe(false);
    expect(isMobileClientFile("apps/api/index.ts", "react-native")).toBe(false);
    expect(isMobileClientFile("ml/train.py", "flutter")).toBe(false);
    expect(mobileRole("test/login_test.dart")).toBe("testing");
    expect(mobileRole("lib/data/session_repository.dart")).toBe("data");
    expect(mobileRole("android/app/build.gradle")).toBe("platform");
    expect(mobileRole("src/navigation/Root.tsx")).toBe("ui");
  });
  it("rejects wrong frameworks and DOM code without rejecting user copy or Expo optional web support", () => {
    expect(() =>
      assertMobileStack("App.tsx", "export const App = () => <div>Hello</div>", "react-native"),
    ).toThrow("DOM");
    expect(() =>
      assertMobileStack("src/App.ts", "const web = require('react-dom/client');", "react-native"),
    ).toThrow("web runtime");
    expect(() => assertMobileStack("lib/main.dart", "import 'dart:html';", "flutter")).toThrow(
      "web/React",
    );
    expect(() => assertMobileStack("lib/main.dart", "", "react-native")).toThrow(
      "Flutter client file",
    );
    expect(() => assertMobileStack("App.jsx", "", "flutter")).toThrow("JSX");
    expect(() =>
      assertMobileStack(
        "App.tsx",
        `import { Text } from 'react-native'; export const App = () => <Text>Compare Flutter and React DOM</Text>;`,
        "react-native",
      ),
    ).not.toThrow();
    expect(() =>
      assertMobileStack(
        "package.json",
        JSON.stringify({
          dependencies: {
            expo: "*",
            "react-native": "*",
            "react-dom": "*",
            "react-native-web": "*",
          },
        }),
        "react-native",
      ),
    ).not.toThrow();
    expect(() =>
      assertMobileStack("backend/page.tsx", "export const Page = () => <div/>", "react-native"),
    ).not.toThrow();
  });
});

describe("mobile specialist generation", () => {
  it("preserves design and peer evidence and gives each specialist a persistent independent worker", async () => {
    const factory = vi.fn(() => ({ invoke: vi.fn() }) as any);
    const team = new MobileWorkerTeam("flutter", factory);
    vi.mocked(generateSource).mockResolvedValue("class Screen {}");
    const evidence = {
      design: "Approved mobile blue toolbar",
      interfaces: "SessionRepository.save()",
      constraints: "Use Riverpod; local SQLite",
    };
    for (const path of [
      "lib/screens/home.dart",
      "lib/screens/login.dart",
      "lib/data/session.dart",
      "pubspec.yaml",
      "test/login_test.dart",
    ]) {
      await team.generate(
        { path, description: "Implement approved module" },
        "Flutter Android application",
        evidence,
      );
    }
    expect(factory).toHaveBeenCalledTimes(4);
    const call = vi.mocked(generateSource).mock.calls[2]!;
    expect(call[3]).toContain("state and data engineer");
    expect(call[3]).toContain("Never fabricate credentials");
    expect(call[4]).toMatchObject({ design: evidence.design, interfaces: evidence.interfaces });
    expect(call[4]!.constraints).toContain(evidence.constraints);
    expect(call[4]!.constraints).toContain("LOCKED CLIENT STACK: Flutter");
    expect(vi.mocked(reviewDesignSource).mock.calls[0]![5].design).toBe(evidence.design);
  });
  it("repairs incorrect writer stack once and checks design-review output again", async () => {
    const native = "import { View } from 'react-native'; export const App = () => <View/>;";
    vi.mocked(generateSource)
      .mockResolvedValueOnce("export const App = () => <main/>;")
      .mockResolvedValueOnce(native);
    const team = new MobileWorkerTeam("react-native", () => ({}) as any);
    expect(
      await team.generate(
        { path: "App.tsx", description: "Home" },
        "Approved bare React Native runtime",
        { design: "Blue card", interfaces: "Card.tsx" },
      ),
    ).toBe(native);
    expect(vi.mocked(generateSource).mock.calls[1]![4]).toMatchObject({
      design: "Blue card",
      interfaces: "Card.tsx",
      currentFile: "export const App = () => <main/>;",
    });
    expect(vi.mocked(generateSource).mock.calls[1]![4]!.constraints).toContain(
      "Required correction",
    );
    vi.mocked(generateSource).mockResolvedValue(native);
    vi.mocked(reviewDesignSource).mockResolvedValue("export const App = () => <div/>;");
    await expect(team.generate({ path: "App.tsx", description: "Home" }, "", {})).rejects.toThrow(
      "client stack violation",
    );
  });
  it("does not invoke models for irreconcilable file paths or unrelated server work", async () => {
    const team = new MobileWorkerTeam("react-native", () => ({}) as any);
    await expect(
      team.generate({ path: "lib/home.dart", description: "Home" }, "", {}),
    ).rejects.toThrow("Flutter client file");
    await expect(
      team.generate({ path: "server/index.ts", description: "API" }, "", {}),
    ).rejects.toThrow("backend worker");
    expect(generateSource).not.toHaveBeenCalled();
  });
});
