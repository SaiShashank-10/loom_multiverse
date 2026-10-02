import fs from "node:fs/promises";
import { mkdirSync, appendFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import net from "node:net";
import { randomUUID } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { parseDocument } from "yaml";
import treeKill from "tree-kill";
import { projectFiles } from "./validation.js";
import type { ProjectTarget } from "./project-target.js";
const stopProcess = (child: ChildProcess): Promise<void> =>
  new Promise((resolve) => {
    if (child.pid) treeKill(child.pid, "SIGTERM", () => resolve());
    else resolve();
  });
const ownedMetros = new Map<string, ChildProcess>();

export type MobileFramework = "flutter" | "react-native";
export interface MobileCommand {
  file: string;
  args: string[];
  cwd: string;
  env?: NodeJS.ProcessEnv;
  input?: string;
  timeoutMs?: number;
}
export type MobileRun = (command: MobileCommand) => Promise<string>;
export interface MobilePreparation {
  root: string;
  framework: MobileFramework;
  env: NodeJS.ProcessEnv;
  sdk: string;
  adb: string;
  emulator: string;
  javaHome?: string;
  forwardedPorts?: number[];
}
export interface MobileRuntimeResult {
  success: boolean;
  isRunning: boolean;
  framework: MobileFramework;
  deviceId?: string;
  packageId?: string;
  processId?: string;
  metroPort?: number;
  metroPid?: number;
  screenshotPath?: string;
  evidenceError?: string;
  error?: string;
  checkedAt: string;
}
const exists = async (file: string) =>
  fs.access(file).then(
    () => true,
    () => false,
  );
const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const quotePS = (value: string) => `'${value.replace(/'/g, "''")}'`;

export function launch(command: MobileCommand, detached = false, logFd?: number): ChildProcess {
  const options = {
    cwd: command.cwd,
    env: command.env ?? process.env,
    windowsHide: true,
    detached,
    stdio: (logFd !== undefined
      ? ["ignore", logFd, logFd]
      : detached
        ? ["ignore", "ignore", "ignore"]
        : ["pipe", "pipe", "pipe"]) as import("node:child_process").StdioOptions,
  };
  if (process.platform === "win32" && !/\.exe$/i.test(command.file)) {
    const script = `& ${[command.file, ...command.args].map(quotePS).join(" ")}\nexit $LASTEXITCODE`;
    return spawn(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-EncodedCommand",
        Buffer.from(script, "utf16le").toString("base64"),
      ],
      options,
    );
  }
  return spawn(command.file, command.args, options);
}

export const runMobileCommand: MobileRun = async (command) =>
  new Promise((resolve, reject) => {
    const child = launch(command);
    let output = "";
    const logFile =
      command.timeoutMs && command.timeoutMs >= 30 * 60_000
        ? path.join(command.cwd, ".loom-mobile/native-build.log")
        : undefined;
    if (logFile) {
      mkdirSync(path.dirname(logFile), { recursive: true });
      appendFileSync(
        logFile,
        `\n${new Date().toISOString()} ${command.file} ${command.args.join(" ")}\n`,
      );
    }
    const collect = (data: Buffer) => {
      output = (output + data.toString()).slice(-150_000);
      if (logFile) appendFileSync(logFile, data);
    };
    child.stdout?.on("data", collect);
    child.stderr?.on("data", collect);
    const timer = setTimeout(
      () => {
        stopProcess(child);
        reject(new Error(`Timed out: ${command.file} ${command.args.join(" ")}\n${output}`));
      },
      command.timeoutMs ?? 15 * 60_000,
    );
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      code === 0
        ? resolve(output)
        : reject(new Error(`${command.file} ${command.args.join(" ")} exited ${code}\n${output}`));
    });
    child.stdin?.end(command.input);
  });

export async function mobileProjectRoot(
  workspace: string,
  framework: MobileFramework,
): Promise<string> {
  const files = await projectFiles(workspace);
  const candidates: string[] = [];
  for (const file of files) {
    if (
      framework === "flutter" &&
      file.endsWith("pubspec.yaml") &&
      parseDocument(await fs.readFile(path.join(workspace, file), "utf8")).getIn([
        "dependencies",
        "flutter",
        "sdk",
      ]) === "flutter"
    )
      candidates.push(path.dirname(path.join(workspace, file)));
    if (framework === "react-native" && path.basename(file) === "package.json") {
      const pkg = JSON.parse(await fs.readFile(path.join(workspace, file), "utf8"));
      if (pkg.dependencies?.["react-native"])
        candidates.push(path.dirname(path.join(workspace, file)));
    }
  }
  if (candidates.length !== 1)
    throw new Error(
      `Expected one ${framework} client root, found ${candidates.length}; keep separate backends outside the mobile client.`,
    );
  return candidates[0]!;
}

/** Preserve the installed toolchain while avoiding broken Windows batch quoting
 * in native-assets hooks. Never redirect an existing alias to another SDK. */
export async function toolchainAlias(target: string, alias: string): Promise<string> {
  await fs.mkdir(path.dirname(alias), { recursive: true });
  if (await exists(alias)) {
    if ((await fs.realpath(alias)).toLowerCase() !== (await fs.realpath(target)).toLowerCase())
      throw new Error(`Toolchain alias ${alias} points to a different installation`);
  } else await fs.symlink(target, alias, process.platform === "win32" ? "junction" : "dir");
  return alias;
}

export async function ensureFlutterMaterialFonts(root: string): Promise<boolean> {
  const manifest = path.join(root, "pubspec.yaml");
  const original = await fs.readFile(manifest, "utf8");
  const document = parseDocument(original);
  if (document.errors.length) throw new Error(`Invalid Flutter pubspec: ${document.errors[0]!.message}`);
  if (document.getIn(["flutter", "uses-material-design"]) === true) return false;
  const files = (await projectFiles(root)).filter((file) => /^lib\/.*\.dart$/i.test(file));
  let materialIcons = false;
  for (const file of files) {
    if (/\bIcons\.[a-zA-Z_]/.test(await fs.readFile(path.join(root, file), "utf8"))) {
      materialIcons = true; break;
    }
  }
  if (!materialIcons) return false;
  document.setIn(["flutter", "uses-material-design"], true);
  const backup = path.join(root, ".loom-backups", `material-fonts-${randomUUID()}`, "pubspec.yaml");
  await fs.mkdir(path.dirname(backup), { recursive: true });
  await fs.writeFile(backup, original);
  await fs.writeFile(manifest, document.toString());
  return true;
}

/** Uses installed SDKs; repairs this host's space-containing SDK path with a non-destructive junction. */
export async function prepareMobileProject(
  workspace: string,
  target: ProjectTarget,
  notify: (message: string) => void,
  run: MobileRun = runMobileCommand,
): Promise<MobilePreparation> {
  if (target.framework !== "flutter" && target.framework !== "react-native")
    throw new Error("Mobile generation requires Flutter or React Native");
  const root = await mobileProjectRoot(workspace, target.framework);
  if (target.framework === "flutter" && await ensureFlutterMaterialFonts(root))
    notify("Registered the Material icon font used by the generated Flutter widgets.");
  const env: NodeJS.ProcessEnv = { ...process.env, CI: "1", EXPO_NO_TELEMETRY: "1" };
  let flutterBin: string | undefined;
  if (target.framework === "flutter" && process.platform === "win32" && !/\s/.test(process.cwd())) {
    const version = JSON.parse(await run({ file: "flutter", args: ["--version", "--machine"], cwd: root, env }));
    if (typeof version.flutterRoot === "string" && /\s/.test(version.flutterRoot)) {
      env.FLUTTER_ROOT = await toolchainAlias(version.flutterRoot, path.resolve("runs/toolchains/flutter-sdk"));
      flutterBin = path.join(env.FLUTTER_ROOT, "bin");
      notify("Using the installed Flutter SDK through a space-free path for Windows native dependency builds.");
    }
    const cache = env.PUB_CACHE ?? path.join(env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData/Local"), "Pub/Cache");
    if (/\s/.test(cache) && await exists(cache))
      env.PUB_CACHE = await toolchainAlias(cache, path.resolve("runs/toolchains/pub-cache"));
  }
  let sdk =
    env.ANDROID_HOME ??
    env.ANDROID_SDK_ROOT ??
    (process.platform === "win32"
      ? path.join(os.homedir(), "AppData/Local/Android/Sdk")
      : path.join(
          os.homedir(),
          process.platform === "darwin" ? "Library/Android/sdk" : "Android/Sdk",
        ));
  if (!(await exists(sdk)))
    throw new Error(
      `Android SDK is missing at ${sdk}. An installed Android SDK is required for a native launch; a web preview will not be reported as a mobile app.`,
    );
  if (process.platform === "win32" && /\s/.test(sdk) && !/\s/.test(process.cwd())) {
    const alias = path.resolve("runs/toolchains/android-sdk");
    await fs.mkdir(path.dirname(alias), { recursive: true });
    if (await exists(alias)) {
      if ((await fs.realpath(alias)).toLowerCase() !== (await fs.realpath(sdk)).toLowerCase())
        throw new Error("Existing Android SDK junction points to a different SDK");
    } else await fs.symlink(sdk, alias, "junction");
    sdk = alias;
  }
  env.ANDROID_HOME = sdk;
  env.ANDROID_SDK_ROOT = sdk;
  let javaHome = env.JAVA_HOME;
  if (process.platform === "win32") {
    for (const candidate of [
      "C:/Program Files/Android/Android Studio/jbr",
      "C:/Program Files/Android/Android Studio1/jbr",
    ]) {
      if (await exists(path.join(candidate, "bin/java.exe"))) {
        javaHome = candidate;
        break;
      }
    }
  }
  if (javaHome) env.JAVA_HOME = javaHome;
  if (process.platform === "win32" && !/\s/.test(process.cwd())) {
    const javaTemp = path.resolve("runs/toolchains/java-tmp");
    await fs.mkdir(javaTemp, { recursive: true });
    env.JAVA_TOOL_OPTIONS =
      `${env.JAVA_TOOL_OPTIONS ?? ""} -Djdk.net.unixdomain.tmpdir=${javaTemp} -Djava.io.tmpdir=${javaTemp}`.trim();
  }
  const bin = (name: string) =>
    path.join(sdk, "platform-tools", name + (process.platform === "win32" ? ".exe" : ""));
  const adb = bin("adb");
  const emulator = path.join(
    sdk,
    "emulator",
    "emulator" + (process.platform === "win32" ? ".exe" : ""),
  );
  const inheritedPath = Object.entries(env).find(([key]) => key.toLowerCase() === "path")?.[1];
  for (const key of Object.keys(env)) if (key.toLowerCase() === "path") delete env[key];
  env.PATH = [
    flutterBin,
    javaHome && path.join(javaHome, "bin"),
    path.join(sdk, "platform-tools"),
    path.join(sdk, "emulator"),
    inheritedPath,
  ]
    .filter(Boolean)
    .join(path.delimiter);
  if (!(await exists(adb))) throw new Error(`Android platform-tools are missing from ${sdk}`);
  if (target.framework === "flutter" && !(await exists(path.join(root, "android/gradlew")))) {
    notify(
      "Creating Flutter Android platform files with the installed Flutter SDK; preserving generated Dart source.",
    );
    const document = parseDocument(await fs.readFile(path.join(root, "pubspec.yaml"), "utf8"));
    const name = String(document.get("name") ?? "loom_app");
    if (!/^[a-z][a-z0-9_]*$/.test(name))
      throw new Error(
        "Flutter pubspec name must be lowercase snake_case before native scaffolding",
      );
    const scaffold = await fs.mkdtemp(path.join(os.tmpdir(), "loom-flutter-platform-"));
    try {
      await run({
        file: "flutter",
        args: ["create", "--platforms=android", "--project-name", name, "--no-pub", scaffold],
        cwd: root,
        env,
      });
      await fs.cp(path.join(scaffold, "android"), path.join(root, "android"), {
        recursive: true,
        force: false,
        errorOnExist: false,
      });
      if (!(await exists(path.join(root, ".metadata"))))
        await fs.copyFile(path.join(scaffold, ".metadata"), path.join(root, ".metadata"));
    } finally {
      if (
        !path.basename(scaffold).startsWith("loom-flutter-platform-") ||
        path.dirname(scaffold) !== os.tmpdir()
      )
        throw new Error("Unsafe scaffold cleanup path");
      await fs.rm(scaffold, { recursive: true, force: true });
    }
  }
  return { root, framework: target.framework, env, sdk, adb, emulator, javaHome };
}

export function connectedAndroidDevices(output: string): string[] {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim().match(/^(\S+)\s+device(?:\s|$)/)?.[1])
    .filter((id): id is string => !!id);
}

export async function ensureAndroidDevice(
  preparation: MobilePreparation,
  notify: (message: string) => void,
  run: MobileRun = runMobileCommand,
): Promise<string> {
  const { root: cwd, env, adb, emulator, sdk } = preparation;
  const current = connectedAndroidDevices(await run({ file: adb, args: ["devices"], cwd, env }));
  if (current[0]) {
    const deadline = Date.now() + 120_000;
    while (Date.now() < deadline) {
      if (
        (
          await run({
            file: adb,
            args: ["-s", current[0], "shell", "getprop", "sys.boot_completed"],
            cwd,
            env,
          })
        ).trim() === "1"
      )
        return current[0];
      await delay(2000);
    }
    throw new Error("Connected Android device did not finish booting");
  }
  if (!(await exists(emulator)))
    throw new Error("No Android device and Android emulator package is not installed");
  let avd = (await run({ file: emulator, args: ["-list-avds"], cwd, env }))
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => /^[\w.-]+$/.test(line));
  if (!avd) {
    const imageRoot = path.join(sdk, "system-images");
    const versions = (await fs.readdir(imageRoot).catch(() => []))
      .filter((name) => /^android-\d+$/.test(name))
      .sort((a, b) => Number(b.slice(8)) - Number(a.slice(8)));
    let image: string | undefined;
    for (const version of versions) {
      for (const flavor of await fs.readdir(path.join(imageRoot, version))) {
        const arch = process.arch === "arm64" ? "arm64-v8a" : "x86_64";
        if (await exists(path.join(imageRoot, version, flavor, arch, "package.xml"))) {
          image = `system-images;${version};${flavor};${arch}`;
          break;
        }
      }
      if (image) break;
    }
    if (!image) throw new Error("No installed Android system image for this host architecture");
    avd = "loom_mobile";
    notify(`Creating a local Android emulator from installed ${image}.`);
    await run({
      file: path.join(
        sdk,
        "cmdline-tools/latest/bin/avdmanager" + (process.platform === "win32" ? ".bat" : ""),
      ),
      args: ["create", "avd", "--name", avd, "--package", image],
      cwd,
      env,
      input: "no\n",
    });
  }
  notify(`Starting Android emulator ${avd}.`);
  const emulatorLog = path.join(cwd, ".loom-mobile/emulator.log");
  await fs.mkdir(path.dirname(emulatorLog), { recursive: true });
  const emulatorHandle = await fs.open(emulatorLog, "a");
  const child = launch(
    {
      file: emulator,
      args: [
        "-avd",
        avd,
        ...(env.LOOM_EMULATOR_HEADLESS === "1" ? ["-no-window"] : []),
        "-no-audio",
        "-no-boot-anim",
        // Automated runs must not depend on a stale or partially saved Quick Boot snapshot.
        // Cold boot preserves installed applications and user data.
        "-no-snapshot-load",
        "-no-snapshot-save",
        "-gpu",
        "swiftshader_indirect",
      ],
      cwd,
      env,
    },
    true,
    emulatorHandle.fd,
  );
  await emulatorHandle.close();
  child.on("error", () => {});
  child.stdout?.resume();
  child.stderr?.resume();
  child.unref();
  const deadline = Date.now() + 240_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null)
      throw new Error(
        `Android emulator exited ${child.exitCode}: ${(await fs.readFile(emulatorLog, "utf8")).slice(-6000)}`,
      );
    await delay(2500);
    const devices = connectedAndroidDevices(await run({ file: adb, args: ["devices"], cwd, env }));
    for (const id of devices)
      if (
        (
          await run({
            file: adb,
            args: ["-s", id, "shell", "getprop", "sys.boot_completed"],
            cwd,
            env,
          })
        ).trim() === "1"
      )
        return id;
  }
  throw new Error("Android emulator did not finish booting within four minutes");
}

/** Verify the recorded process token before stopping a Metro server from an earlier CLI run. */
export async function stopManagedProcess(
  cwd: string,
  recordName: string,
  env: NodeJS.ProcessEnv,
  run: MobileRun = runMobileCommand,
) {
  if (!/^[a-zA-Z0-9_-]+(?:\.process)?\.json$/.test(recordName))
    throw new Error("Invalid process record name");
  let saved: { pid?: number; token?: string };
  try {
    saved = JSON.parse(await fs.readFile(path.join(cwd, ".loom-mobile", recordName), "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
  if (
    !Number.isInteger(saved.pid) ||
    saved.pid! < 1 ||
    !/^loom-mobile-[a-f0-9-]{36}$/.test(saved.token ?? "")
  )
    return;
  let command = "";
  try {
    command =
      process.platform === "win32"
        ? await run({
            file: "powershell.exe",
            args: [
              "-NoProfile",
              "-NonInteractive",
              "-Command",
              `(Get-CimInstance Win32_Process -Filter "ProcessId = ${saved.pid}").CommandLine`,
            ],
            cwd,
            env,
            timeoutMs: 10000,
          })
        : process.platform === "linux"
          ? (await fs.readFile(`/proc/${saved.pid}/cmdline`, "utf8")).replace(/\0/g, " ")
          : await run({
              file: "ps",
              args: ["-p", String(saved.pid), "-o", "command="],
              cwd,
              env,
              timeoutMs: 10000,
            });
  } catch {
    return;
  }
  if (command.includes(`--title=${saved.token}`) || command.trim() === saved.token) {
    await new Promise<void>((resolve) => treeKill(saved.pid!, "SIGTERM", () => resolve()));
  }
}

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const port = (server.address() as net.AddressInfo).port;
      server.close(() => resolve(port));
    });
  });
}

export function apkIdentity(output: string): { packageId: string; activity: string } {
  const packageId = output.match(/package: name='([\w.]+)'/)?.[1];
  const activity = output.match(/launchable-activity: name='([\w.$]+)'/)?.[1];
  if (!packageId || !activity)
    throw new Error("Built APK has no package identifier or launchable activity");
  return { packageId, activity };
}

export function assertMobileHealth(
  pid: string,
  activity: string,
  logs: string,
  packageId: string,
): void {
  if (!/^\d+(?:\s+\d+)*$/.test(pid.trim()))
    throw new Error(`Native app ${packageId} is not running after launch`);
  if (!activity.split(/\s+/).some((token) => token.startsWith(packageId + "/")))
    throw new Error(`Native app ${packageId} is not the resumed activity`);
  const failure =
    /FATAL EXCEPTION|Unhandled Exception|\[ERROR:flutter\/runtime\/|Unable to load script|Unable to resolve module|Invariant Violation|ReferenceError:|TypeError:|SyntaxError:|JavascriptException|TransformError|Render Error/;
  if (failure.test(logs)) {
    const causes = logs
      .split(/\r?\n/)
      .filter((line) => failure.test(line))
      .slice(0, 15)
      .join("\n");
    throw new Error(
      `Native app reported a runtime failure:\n${causes.slice(0, 3000)}\nRecent context:\n${logs.slice(-3000)}`,
    );
  }
}

/** Compile/install/open the native app and verify its process and runtime logs on a real Android target. */
export async function runMobileApp(
  preparation: MobilePreparation,
  notify: (message: string) => void,
  run: MobileRun = runMobileCommand,
): Promise<MobileRuntimeResult> {
  const { root: cwd, framework, env, adb, sdk } = preparation;
  const result: MobileRuntimeResult = {
    success: false,
    isRunning: false,
    framework,
    checkedAt: new Date().toISOString(),
  };
  let metro: ChildProcess | undefined;
  try {
    const previousMetro = ownedMetros.get(cwd);
    if (previousMetro) {
      await stopProcess(previousMetro);
      ownedMetros.delete(cwd);
    }
    await stopManagedProcess(cwd, "metro.json", env, run);
    const deviceId = await ensureAndroidDevice(preparation, notify, run);
    result.deviceId = deviceId;
    for (const port of preparation.forwardedPorts ?? [])
      await run({
        file: adb,
        args: ["-s", deviceId, "reverse", `tcp:${port}`, `tcp:${port}`],
        cwd,
        env,
      });
    let apk: string;
    if (framework === "flutter") {
      notify(`Building Flutter debug APK for ${deviceId}.`);
      await run({
        file: "flutter",
        args: ["build", "apk", "--debug"],
        cwd,
        env,
        timeoutMs: 30 * 60_000,
      });
      apk = path.join(cwd, "build/app/outputs/flutter-apk/app-debug.apk");
    } else {
      const pkg = JSON.parse(await fs.readFile(path.join(cwd, "package.json"), "utf8"));
      const expo = !!pkg.dependencies?.expo;
      if (!expo && !(await exists(path.join(cwd, "android/gradlew")))) {
        const nativePackage = JSON.parse(
          await fs.readFile(path.join(cwd, "node_modules/react-native/package.json"), "utf8"),
        );
        const cli = path.join(cwd, "node_modules/@react-native-community/cli/build/bin.js");
        if (!(await exists(cli)))
          throw new Error(
            "Bare React Native requires a compatible @react-native-community/cli dependency to scaffold the Android host",
          );
        const app = JSON.parse(await fs.readFile(path.join(cwd, "app.json"), "utf8"));
        if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(app.name ?? ""))
          throw new Error(
            "Bare React Native app.json needs a native-safe name matching AppRegistry",
          );
        const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "loom-rn-platform-"));
        try {
          notify(`Creating official Android host for React Native ${nativePackage.version}.`);
          await run({
            file: process.execPath,
            args: [
              cli,
              "init",
              app.name,
              "--version",
              nativePackage.version,
              "--directory",
              path.join(temporary, "app"),
              "--skip-install",
              "--skip-git-init",
              "true",
              "--install-pods",
              "false",
            ],
            cwd,
            env,
          });
          await fs.cp(path.join(temporary, "app/android"), path.join(cwd, "android"), {
            recursive: true,
            force: false,
            errorOnExist: false,
          });
        } finally {
          if (
            path.dirname(temporary) !== os.tmpdir() ||
            !path.basename(temporary).startsWith("loom-rn-platform-")
          )
            throw new Error("Unsafe native scaffold cleanup");
          await fs.rm(temporary, { recursive: true, force: true });
        }
      }
      const port = await freePort();
      result.metroPort = port;
      notify(`Starting ${expo ? "Expo" : "React Native"} Metro on local port ${port}.`);
      const logPath = path.join(cwd, ".loom-mobile", "metro.log");
      await fs.mkdir(path.dirname(logPath), { recursive: true });
      const handle = await fs.open(logPath, "a");
      const metroToken = `loom-mobile-${randomUUID()}`;
      metro = launch(
        {
          file: process.execPath,
          args: [
            `--title=${metroToken}`,
            "--dns-result-order=ipv4first",
            path.join(cwd, "node_modules", expo ? "expo/bin/cli" : "react-native/cli.js"),
            "start",
            ...(expo ? ["--localhost"] : ["--host", "127.0.0.1"]),
            "--port",
            String(port),
          ],
          cwd,
          env,
        },
        true,
        handle.fd,
      );
      metro.on("error", () => {});
      await handle.close();
      result.metroPid = metro.pid;
      await fs.writeFile(
        path.join(cwd, ".loom-mobile/metro.json"),
        JSON.stringify({ pid: metro.pid, token: metroToken }),
      );
      ownedMetros.set(cwd, metro);
      const deadline = Date.now() + 120_000;
      let ready = false;
      while (Date.now() < deadline && metro.exitCode === null) {
        try {
          const response = await fetch(`http://localhost:${port}/status`, {
            signal: AbortSignal.timeout(2000),
          });
          if (response.ok && (await response.text()).includes("packager-status:running")) {
            ready = true;
            break;
          }
        } catch {}
        await delay(1500);
      }
      if (!ready)
        throw new Error(
          `Metro did not become ready (exit ${metro.exitCode}). ${(await fs.readFile(logPath, "utf8")).slice(-8000)}`,
        );
      await run({
        file: adb,
        args: ["-s", deviceId, "reverse", `tcp:${port}`, `tcp:${port}`],
        cwd,
        env,
      });
      const gradle = path.join(
        cwd,
        "android",
        process.platform === "win32" ? "gradlew.bat" : "gradlew",
      );
      if (expo && !(await exists(gradle))) {
        notify("Creating the Expo native Android host.");
        await run({
          file: process.execPath,
          args: [
            path.join(cwd, "node_modules/expo/bin/cli"),
            "prebuild",
            "--platform",
            "android",
            "--no-install",
          ],
          cwd,
          env,
          timeoutMs: 15 * 60_000,
        });
      }
      if (!(await exists(gradle)))
        throw new Error("Native Android Gradle wrapper is missing after scaffolding");
      const abi = (
        await run({
          file: adb,
          args: ["-s", deviceId, "shell", "getprop", "ro.product.cpu.abi"],
          cwd,
          env,
        })
      ).trim();
      if (!["x86_64", "x86", "arm64-v8a", "armeabi-v7a"].includes(abi))
        throw new Error(`Unsupported Android device ABI: ${abi}`);
      notify(`Compiling native ${expo ? "Expo" : "React Native"} Android app for ${abi}.`);
      await run({
        file: gradle,
        args: [
          "assembleDebug",
          "--no-daemon",
          `-PreactNativeDevServerPort=${port}`,
          "-PreactNativeDevServerIp=127.0.0.1",
          `-PreactNativeArchitectures=${abi}`,
        ],
        cwd: path.join(cwd, "android"),
        env,
        timeoutMs: 30 * 60_000,
      });
      apk = path.join(cwd, "android/app/build/outputs/apk/debug/app-debug.apk");
    }
    if (!(await exists(apk))) throw new Error(`Build finished without expected APK: ${apk}`);
    const versions = (await fs.readdir(path.join(sdk, "build-tools"))).sort((a, b) =>
      b.localeCompare(a, undefined, { numeric: true }),
    );
    const aapt = path.join(
      sdk,
      "build-tools",
      versions[0] ?? "",
      process.platform === "win32" ? "aapt.exe" : "aapt",
    );
    const { packageId, activity } = apkIdentity(
      await run({ file: aapt, args: ["dump", "badging", apk], cwd, env }),
    );
    result.packageId = packageId;
    notify(`Installing and launching ${packageId} on ${deviceId}.`);
    await run({ file: adb, args: ["-s", deviceId, "install", "-r", apk], cwd, env });
    await run({
      file: adb,
      args: ["-s", deviceId, "shell", "am", "force-stop", packageId],
      cwd,
      env,
    });
    await run({
      file: adb,
      args: ["-s", deviceId, "shell", "am", "start", "-W", "-n", `${packageId}/${activity}`],
      cwd,
      env,
    });
    await delay(7000);
    const pid = (
      await run({ file: adb, args: ["-s", deviceId, "shell", "pidof", packageId], cwd, env })
    ).trim();
    const activities = await run({
      file: adb,
      args: ["-s", deviceId, "shell", "dumpsys", "activity", "activities"],
      cwd,
      env,
    });
    const resumed = activities
      .split(/\r?\n/)
      .filter((line) => /mResumedActivity|topResumedActivity/.test(line))
      .join("\n");
    const logs = await run({
      file: adb,
      args: ["-s", deviceId, "logcat", `--pid=${pid.split(/\s/)[0]}`, "-d", "-t", "200"],
      cwd,
      env,
    });
    assertMobileHealth(pid, resumed, logs, packageId);
    Object.assign(result, {
      success: true,
      isRunning: true,
      processId: pid,
      checkedAt: new Date().toISOString(),
    });
    try {
      const screenshotPath = path.join(cwd, ".loom-mobile/screenshot.png");
      await fs.mkdir(path.dirname(screenshotPath), { recursive: true });
      const remote = `/sdcard/loom-${packageId}.png`;
      await run({
        file: adb,
        args: ["-s", deviceId, "shell", "screencap", "-p", remote],
        cwd,
        env,
      });
      await run({ file: adb, args: ["-s", deviceId, "pull", remote, screenshotPath], cwd, env });
      await run({ file: adb, args: ["-s", deviceId, "shell", "rm", remote], cwd, env });
      result.screenshotPath = screenshotPath;
    } catch (error) {
      result.evidenceError = String(error);
    }
    if (metro) metro.unref();
    notify(`Native ${framework} app is running: ${packageId} on ${deviceId}.`);
  } catch (error) {
    result.error = String(error);
    notify(result.error);
    if (metro) {
      await stopProcess(metro);
      ownedMetros.delete(cwd);
    }
  }
  await fs.mkdir(path.join(cwd, ".loom-mobile"), { recursive: true });
  await fs.writeFile(path.join(cwd, ".loom-mobile/runtime.json"), JSON.stringify(result, null, 2));
  return result;
}
