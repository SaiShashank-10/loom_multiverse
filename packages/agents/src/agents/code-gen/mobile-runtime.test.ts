import { it, expect } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {
  connectedAndroidDevices,
  apkIdentity,
  assertMobileHealth,
  mobileProjectRoot,
  toolchainAlias,
  ensureFlutterMaterialFonts,
} from "./mobile-runtime.js";
it("registers material icons only when Dart code uses them and preserves asset declarations", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "loom-material-test-"));
  try {
    await fs.mkdir(path.join(root, "lib"));
    await fs.writeFile(path.join(root, "pubspec.yaml"), 'name: app\nflutter:\n  assets: [assets/stitch/]\n');
    await fs.writeFile(path.join(root, "lib/main.dart"), 'void main() {}');
    expect(await ensureFlutterMaterialFonts(root)).toBe(false);
    await fs.writeFile(path.join(root, "lib/main.dart"), 'final icon = Icons.home;');
    expect(await ensureFlutterMaterialFonts(root)).toBe(true);
    expect(await fs.readFile(path.join(root, "pubspec.yaml"), "utf8")).toContain("assets/stitch/");
    expect(await ensureFlutterMaterialFonts(root)).toBe(false);
    expect((await fs.readdir(path.join(root, ".loom-backups"))).length).toBe(1);
  } finally { await fs.rm(root, { recursive:true, force:true }); }
});
it("reuses a toolchain alias but refuses to redirect another installation", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "loom-toolchain-test-"));
  try {
    const target = path.join(root, "SDK with spaces");
    const other = path.join(root, "other");
    const alias = path.join(root, "alias");
    await fs.mkdir(target); await fs.mkdir(other);
    await toolchainAlias(target, alias);
    expect(await toolchainAlias(target, alias)).toBe(alias);
    await expect(toolchainAlias(other, alias)).rejects.toThrow("different installation");
    expect(await fs.realpath(alias)).toBe(await fs.realpath(target));
    await fs.unlink(alias);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
it("selects authorized Android devices, not offline or unauthorized targets", () => {
  expect(
    connectedAndroidDevices(
      "List of devices attached\nemulator-5554 device\nabc unauthorized\ndef offline\n",
    ),
  ).toEqual(["emulator-5554"]);
});
it("requires an APK with a launchable native activity", () => {
  expect(
    apkIdentity(
      "package: name='com.loom.app'\nlaunchable-activity: name='com.loom.app.MainActivity'",
    ),
  ).toEqual({ packageId: "com.loom.app", activity: "com.loom.app.MainActivity" });
  expect(() => apkIdentity("package: name='com.loom.app'")).toThrow("launchable");
});
it("rejects wrong resumed apps, dead processes and Flutter/React Native runtime errors", () => {
  expect(() =>
    assertMobileHealth("123", "mResumedActivity com.loom.app/.MainActivity", "ok", "com.loom.app"),
  ).not.toThrow();
  expect(() =>
    assertMobileHealth("123", "mResumedActivity com.loom.app2/.MainActivity", "ok", "com.loom.app"),
  ).toThrow("resumed");
  expect(() => assertMobileHealth("", "com.loom.app/.MainActivity", "", "com.loom.app")).toThrow(
    "not running",
  );
  for (const error of [
    "Unhandled Exception",
    "[ERROR:flutter/runtime/dart_vm_initializer.cc]",
    "Unable to resolve module",
    "FATAL EXCEPTION",
  ])
    expect(() =>
      assertMobileHealth("123", "com.loom.app/.MainActivity", error, "com.loom.app"),
    ).toThrow("runtime failure");
});
it("finds the actual native client separately from its backend and rejects ambiguity", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "loom-mobile-test-"));
  try {
    await fs.mkdir(path.join(root, "client"));
    await fs.mkdir(path.join(root, "backend"));
    await fs.writeFile(
      path.join(root, "client/pubspec.yaml"),
      'dependencies: {flutter: {sdk: "flutter"}}',
    );
    await fs.writeFile(
      path.join(root, "backend/package.json"),
      '{"dependencies":{"express":"5.0.0"}}',
    );
    expect(await mobileProjectRoot(root, "flutter")).toBe(path.join(root, "client"));
    await expect(mobileProjectRoot(root, "react-native")).rejects.toThrow("found 0");
    await fs.writeFile(
      path.join(root, "client/package.json"),
      '{"dependencies":{"react-native":"0.81.0"}}',
    );
    expect(await mobileProjectRoot(root, "react-native")).toBe(path.join(root, "client"));
    await fs.writeFile(
      path.join(root, "package.json"),
      '{"dependencies":{"react-native":"0.81.0"}}',
    );
    await expect(mobileProjectRoot(root, "react-native")).rejects.toThrow("found 2");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
