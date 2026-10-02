import { it, expect } from "vitest";
import { resolveProjectTarget } from "./project-target.js";
it("preserves explicit mobile framework choices over conflicting planning alternatives and backend stacks", () => {
  expect(
    resolveProjectTarget("Build a Flutter mobile application with a Node.js backend", {
      framework: "React Native",
    }),
  ).toMatchObject({ framework: "flutter", platform: "mobile", deviceType: "MOBILE" });
  expect(
    resolveProjectTarget("React Native mobile app, not Flutter", { framework: "Flutter" }),
  ).toMatchObject({ framework: "react-native", platform: "mobile" });
});
it("selects desktop Stitch designs for web requirements rather than blindly defaulting to mobile", () => {
  expect(
    resolveProjectTarget("Build a React web application", { platform: "mobile" }),
  ).toMatchObject({ framework: "web", platform: "web", deviceType: "DESKTOP" });
  expect(resolveProjectTarget("A Flutter web application")).toMatchObject({
    framework: "flutter",
    platform: "web",
  });
  expect(resolveProjectTarget("API service only", { hasFrontend: false })).toMatchObject({
    platform: "none",
  });
});

it("explicit platform requirements override an incompatible fallback frontend", () => {
  expect(resolveProjectTarget("Build a web application", { framework: "Flutter" })).toMatchObject({
    framework: "web",
    deviceType: "DESKTOP",
  });
  expect(
    resolveProjectTarget("Build a mobile application", { framework: "React web" }),
  ).toMatchObject({ framework: "flutter", deviceType: "MOBILE" });
});
