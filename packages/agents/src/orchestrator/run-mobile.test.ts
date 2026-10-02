import { beforeEach, expect, it, vi } from "vitest";
vi.mock("node:fs/promises", () => ({ default: { access: vi.fn(async () => {}) } }));
vi.mock("../agents/code-gen/mobile-runtime.js", () => ({
  mobileProjectRoot: vi.fn(async (_: string, framework: string) => {
    if (framework !== "flutter") throw new Error("Not React Native");
    return "/saved/app";
  }),
  prepareMobileProject: vi.fn(async () => ({ root: "/saved/app", framework: "flutter", env: {} })),
  runMobileApp: vi.fn(async () => ({ success: true, isRunning: true, deviceId: "test-device" })),
}));
vi.mock("../agents/code-gen/validation.js", () => ({ runCheck: vi.fn(async () => {}) }));
import { runSavedMobile } from "./run-mobile.js";
import { runMobileApp, prepareMobileProject } from "../agents/code-gen/mobile-runtime.js";
import { runCheck } from "../agents/code-gen/validation.js";
beforeEach(() => { vi.clearAllMocks(); });
it("validates existing Flutter source before launching without generation", async () => {
  await runSavedMobile("saved-project");
  expect(vi.mocked(runCheck).mock.calls.map(([command]) => command.command)).toEqual([
    "flutter pub get", "flutter analyze", "flutter test",
  ]);
  expect(runMobileApp).toHaveBeenCalledOnce();
});
it("does not launch after failed validation", async () => {
  vi.mocked(runCheck).mockRejectedValueOnce(new Error("Dart compile error"));
  await expect(runSavedMobile("saved-project")).rejects.toThrow("Dart compile error");
  expect(runMobileApp).not.toHaveBeenCalled();
});
it("rejects traversal before inspecting or preparing another directory", async () => {
  await expect(runSavedMobile("../outside")).rejects.toThrow("Invalid saved project ID");
  expect(prepareMobileProject).not.toHaveBeenCalled();
});
