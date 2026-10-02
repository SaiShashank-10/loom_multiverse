# Pipeline Run: ffbc27e3-ed75-4b1b-a65d-1272c9de2104
**Phase Reached:** code_gen
**Date:** 2026-09-20T14:54:58.048Z

## 1. Raw Idea
> Repair the existing Flutter application in place.

## 2. Validated Idea (Idea Check Agent V2)
**Viable:** undefined
**Confidence:** N/A%
**Core Problem:** undefined
**Target Audience:** undefined

### Core Features

### Tech Stack Hints

## 3. Planning Agent V2 — Generated Documents
**Documents Path:** C:\Shashank\loom_multiverse\runs\workspaces\ffbc27e3-ed75-4b1b-a65d-1272c9de2104\docs

## 4. Code Gen Agent V2 — Implementation
**Workspace Path:** C:\Shashank\loom_multiverse\runs\workspaces\ffbc27e3-ed75-4b1b-a65d-1272c9de2104\frontend
**Validation:** Passed. **App running:** No

### Generated Files (45)
- 📄 .flutter-plugins-dependencies
- 📄 .gitignore
- 📄 .metadata
- 📄 FIREBASE_SETUP.md
- 📄 README.md
- 📄 analysis_options.yaml
- 📄 android/.gitignore
- 📄 android/app/build.gradle.kts
- 📄 android/app/google-services.json
- 📄 android/app/src/debug/AndroidManifest.xml
- 📄 android/app/src/main/AndroidManifest.xml
- 📄 android/app/src/main/java/io/flutter/plugins/GeneratedPluginRegistrant.java
- 📄 android/app/src/main/kotlin/com/example/expense_master/MainActivity.kt
- 📄 android/app/src/main/res/drawable-v21/launch_background.xml
- 📄 android/app/src/main/res/drawable/launch_background.xml
- *... and 30 more files*

## Chat History: code_gen
**🤖 Agent** (2026-09-20T10:52:53.085Z):
> Repairing existing source without saved Stitch approval metadata. No new architecture or design generation will run; design fidelity is not verified.

**🤖 Agent** (2026-09-20T10:52:53.086Z):
> Loading approved Stitch HTML, tokens and responsive layouts...

**🤖 Agent** (2026-09-20T10:52:53.088Z):
> Repairing the saved project in place...

**🤖 Agent** (2026-09-20T10:52:53.092Z):
> 💻 Writing 44 files to workspace...

**🤖 Agent** (2026-09-20T10:52:53.389Z):
> Source audit: 0/58 files need generation or repair. Report: source-audit.json

**🤖 Agent** (2026-09-20T10:52:53.402Z):
> 🔧 Initiating autonomous build & self-healing sequence...

**🤖 Agent** (2026-09-20T10:52:53.449Z):
> [1/5] .: flutter pub get

**🤖 Agent** (2026-09-20T10:52:57.887Z):
> [1/5] .: flutter analyze

**🤖 Agent** (2026-09-20T10:53:32.479Z):
> [1/5] .: flutter test

**🤖 Agent** (2026-09-20T10:53:36.642Z):
> [1/5] .: flutter build web

**🤖 Agent** (2026-09-20T10:54:04.611Z):
> ld_system.dart:895:9)
<asynchronous suspension>
#4      Future.wait.<anonymous closure> (dart:async/future.dart:546:21)
<asynchronous suspension>
#5      _BuildInstance.invokeTarget (package:flutter_tools/src/build_system/build_system.dart:833:32)
<asynchronous suspension>
#6      Future.wait.<anonymous closure> (dart:async/future.dart:546:21)
<asynchronous suspension>
#7      _BuildInstance.invokeTarget (package:flutter_tools/src/build_system/build_system.dart:833:32)
<asynchronous suspension>
#8      FlutterBuildSystem.build (package:flutter_tools/src/build_system/build_system.dart:653:16)
<asynchronous suspension>
#9      WebBuilder.buildWeb (package:flutter_tools/src/web/compile.dart:94:34)
<asynchronous suspension>
#10     BuildWebCommand.runCommand (package:flutter_tools/src/commands/build_web.dart:296:5)
<asynchronous suspension>
#11     FlutterCommand.run.<anonymous closure> (package:flutter_tools/src/runner/flutter_command.dart:1559:27)
<asynchronous suspension>
#12     AppContext.run.<anonymous closure> (package:flutter_tools/src/base/context.dart:154:19)
<asynchronous suspension>
#13     CommandRunner.runCommand (package:args/command_runner.dart:212:13)
<asynchronous suspension>
#14     FlutterCommandRunner.runCommand.<anonymous closure> (package:flutter_tools/src/runner/flutter_command_runner.dart:487:9)
<asynchronous suspension>
#15     AppContext.run.<anonymous closure> (package:flutter_tools/src/base/context.dart:154:19)
<asynchronous suspension>
#16     FlutterCommandRunner.runCommand (package:flutter_tools/src/runner/flutter_command_runner.dart:422:5)
<asynchronous suspension>
#17     run.<anonymous closure>.<anonymous closure> (package:flutter_tools/runner.dart:104:11)
<asynchronous suspension>
#18     AppContext.run.<anonymous closure> (package:flutter_tools/src/base/context.dart:154:19)
<asynchronous suspension>
#19     main (package:flutter_tools/executable.dart:103:3)
<asynchronous suspension>

Error: Failed to compile application for the Web.


**🤖 Agent** (2026-09-20T10:54:59.810Z):
> Repairing existing source without saved Stitch approval metadata. No new architecture or design generation will run; design fidelity is not verified.

**🤖 Agent** (2026-09-20T10:54:59.812Z):
> Loading approved Stitch HTML, tokens and responsive layouts...

**🤖 Agent** (2026-09-20T10:54:59.813Z):
> Repairing the saved project in place...

**🤖 Agent** (2026-09-20T10:54:59.818Z):
> 💻 Writing 44 files to workspace...

**🤖 Agent** (2026-09-20T10:54:59.874Z):
> Source audit: 0/58 files need generation or repair. Report: source-audit.json

**🤖 Agent** (2026-09-20T10:54:59.890Z):
> 🔧 Initiating autonomous build & self-healing sequence...

**🤖 Agent** (2026-09-20T10:54:59.939Z):
> [1/5] .: flutter pub get

**🤖 Agent** (2026-09-20T10:55:02.019Z):
> [1/5] .: flutter analyze

**🤖 Agent** (2026-09-20T10:55:08.237Z):
> [1/5] .: flutter test

**🤖 Agent** (2026-09-20T10:55:12.419Z):
> [1/5] .: flutter build web

**🤖 Agent** (2026-09-20T10:55:36.452Z):
> ld_system.dart:895:9)
<asynchronous suspension>
#4      Future.wait.<anonymous closure> (dart:async/future.dart:546:21)
<asynchronous suspension>
#5      _BuildInstance.invokeTarget (package:flutter_tools/src/build_system/build_system.dart:833:32)
<asynchronous suspension>
#6      Future.wait.<anonymous closure> (dart:async/future.dart:546:21)
<asynchronous suspension>
#7      _BuildInstance.invokeTarget (package:flutter_tools/src/build_system/build_system.dart:833:32)
<asynchronous suspension>
#8      FlutterBuildSystem.build (package:flutter_tools/src/build_system/build_system.dart:653:16)
<asynchronous suspension>
#9      WebBuilder.buildWeb (package:flutter_tools/src/web/compile.dart:94:34)
<asynchronous suspension>
#10     BuildWebCommand.runCommand (package:flutter_tools/src/commands/build_web.dart:296:5)
<asynchronous suspension>
#11     FlutterCommand.run.<anonymous closure> (package:flutter_tools/src/runner/flutter_command.dart:1559:27)
<asynchronous suspension>
#12     AppContext.run.<anonymous closure> (package:flutter_tools/src/base/context.dart:154:19)
<asynchronous suspension>
#13     CommandRunner.runCommand (package:args/command_runner.dart:212:13)
<asynchronous suspension>
#14     FlutterCommandRunner.runCommand.<anonymous closure> (package:flutter_tools/src/runner/flutter_command_runner.dart:487:9)
<asynchronous suspension>
#15     AppContext.run.<anonymous closure> (package:flutter_tools/src/base/context.dart:154:19)
<asynchronous suspension>
#16     FlutterCommandRunner.runCommand (package:flutter_tools/src/runner/flutter_command_runner.dart:422:5)
<asynchronous suspension>
#17     run.<anonymous closure>.<anonymous closure> (package:flutter_tools/runner.dart:104:11)
<asynchronous suspension>
#18     AppContext.run.<anonymous closure> (package:flutter_tools/src/base/context.dart:154:19)
<asynchronous suspension>
#19     main (package:flutter_tools/executable.dart:103:3)
<asynchronous suspension>

Error: Failed to compile application for the Web.


**🤖 Agent** (2026-09-20T10:57:53.965Z):
> Repairing existing source without saved Stitch approval metadata. No new architecture or design generation will run; design fidelity is not verified.

**🤖 Agent** (2026-09-20T10:57:53.968Z):
> Loading approved Stitch HTML, tokens and responsive layouts...

**🤖 Agent** (2026-09-20T10:57:53.969Z):
> Repairing the saved project in place...

**🤖 Agent** (2026-09-20T10:57:53.974Z):
> 💻 Writing 44 files to workspace...

**🤖 Agent** (2026-09-20T10:57:54.023Z):
> Source audit: 0/58 files need generation or repair. Report: source-audit.json

**🤖 Agent** (2026-09-20T10:57:54.041Z):
> 🔧 Initiating autonomous build & self-healing sequence...

**🤖 Agent** (2026-09-20T10:57:54.089Z):
> [1/5] .: flutter pub get

**🤖 Agent** (2026-09-20T10:57:55.911Z):
> [1/5] .: flutter analyze

**🤖 Agent** (2026-09-20T10:58:01.349Z):
> [1/5] .: flutter test

**🤖 Agent** (2026-09-20T10:58:08.140Z):
> [1/5] .: flutter build web

**🤖 Agent** (2026-09-20T10:58:32.366Z):
> ld_system.dart:895:9)
<asynchronous suspension>
#4      Future.wait.<anonymous closure> (dart:async/future.dart:546:21)
<asynchronous suspension>
#5      _BuildInstance.invokeTarget (package:flutter_tools/src/build_system/build_system.dart:833:32)
<asynchronous suspension>
#6      Future.wait.<anonymous closure> (dart:async/future.dart:546:21)
<asynchronous suspension>
#7      _BuildInstance.invokeTarget (package:flutter_tools/src/build_system/build_system.dart:833:32)
<asynchronous suspension>
#8      FlutterBuildSystem.build (package:flutter_tools/src/build_system/build_system.dart:653:16)
<asynchronous suspension>
#9      WebBuilder.buildWeb (package:flutter_tools/src/web/compile.dart:94:34)
<asynchronous suspension>
#10     BuildWebCommand.runCommand (package:flutter_tools/src/commands/build_web.dart:296:5)
<asynchronous suspension>
#11     FlutterCommand.run.<anonymous closure> (package:flutter_tools/src/runner/flutter_command.dart:1559:27)
<asynchronous suspension>
#12     AppContext.run.<anonymous closure> (package:flutter_tools/src/base/context.dart:154:19)
<asynchronous suspension>
#13     CommandRunner.runCommand (package:args/command_runner.dart:212:13)
<asynchronous suspension>
#14     FlutterCommandRunner.runCommand.<anonymous closure> (package:flutter_tools/src/runner/flutter_command_runner.dart:487:9)
<asynchronous suspension>
#15     AppContext.run.<anonymous closure> (package:flutter_tools/src/base/context.dart:154:19)
<asynchronous suspension>
#16     FlutterCommandRunner.runCommand (package:flutter_tools/src/runner/flutter_command_runner.dart:422:5)
<asynchronous suspension>
#17     run.<anonymous closure>.<anonymous closure> (package:flutter_tools/runner.dart:104:11)
<asynchronous suspension>
#18     AppContext.run.<anonymous closure> (package:flutter_tools/src/base/context.dart:154:19)
<asynchronous suspension>
#19     main (package:flutter_tools/executable.dart:103:3)
<asynchronous suspension>

Error: Failed to compile application for the Web.


**🤖 Agent** (2026-09-20T11:16:49.312Z):
> Repairing existing source without saved Stitch approval metadata. No new architecture or design generation will run; design fidelity is not verified.

**🤖 Agent** (2026-09-20T11:16:49.314Z):
> Loading approved Stitch HTML, tokens and responsive layouts...

**🤖 Agent** (2026-09-20T11:16:49.316Z):
> Repairing the saved project in place...

**🤖 Agent** (2026-09-20T11:16:49.319Z):
> Inspecting 44 saved files for repair...

**🤖 Agent** (2026-09-20T11:16:49.376Z):
> Source audit: 0/58 files need generation or repair. Report: source-audit.json

**🤖 Agent** (2026-09-20T11:16:49.392Z):
> 🔧 Initiating autonomous build & self-healing sequence...

**🤖 Agent** (2026-09-20T11:16:49.439Z):
> [1/5] .: flutter pub get

**🤖 Agent** (2026-09-20T11:16:52.659Z):
> [1/5] .: flutter analyze

**🤖 Agent** (2026-09-20T11:17:03.373Z):
> [1/5] .: flutter test

**🤖 Agent** (2026-09-20T11:17:09.750Z):
> Starting Android emulator loom_mobile.

**🤖 Agent** (2026-09-20T11:17:40.209Z):
> Error: Android emulator exited 1: :8000:14ec:a001:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 8000:14ec:a001:0:8000:14ec:a001:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 80c:14ec:a001:0:8000:14ec:a001:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 80c:14ec:a001:0:8000:14ec:a001:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 80c:14ec:a001:0:8000:14ec:a001:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 2812:14ec:a001:0:8000:14ec:a001:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 2812:14ec:a001:0:8000:14ec:a001:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 2812:14ec:a001:0:8000:14ec:a001:0
[0;39m[0;39mINFO         | Ignore IPv6 address: e81f:14ec:a001:0:8000:14ec:a001:0
[0;39m[0;39mINFO         | Ignore IPv6 address: e81f:14ec:a001:0:8000:14ec:a001:0
[0;39m[0;39mINFO         | Ignore IPv6 address: e81f:14ec:a001:0:8000:14ec:a001:0
[0;39m[0;39mINFO         | Ignore IPv6 address: d025:14ec:a001:0:8000:14ec:a001:0
[0;39m[0;39mINFO         | Ignore IPv6 address: d025:14ec:a001:0:8000:14ec:a001:0
[0;39m[0;39mINFO         | Ignore IPv6 address: d025:14ec:a001:0:8000:14ec:a001:0
[0;39m[0;39mINFO         | Guest GLES Driver: Auto (ext controls)
[0;39mlibrary_mode swiftshader_indirect gpu mode swiftshader_indirect
[0;39mINFO         | Checking system compatibility:
[0;39m[0;39mINFO         |   Checking: hasCompatibleHypervisor
[0;39m[0;39mINFO         |      Ok: Hypervisor compatibility to run avd: `loom_mobile` are met
[0;39m[0;39mINFO         |   Checking: hasSufficientSystem
[0;39m[0;39mINFO         |      Ok: System requirements to run avd: `loom_mobile` are met
[0;39m[0;39mINFO         |   Checking: hasSufficientHwGpu
[0;39m[0;39mINFO         |      Ok: Hardware GPU compatibility checks are not required
[0;39m[0;39mINFO         |   Checking: hasSufficientDiskSpace
[0;39m[0;39mINFO         |      Ok: Disk space requirements to run avd: `loom_mobile` are met
[0;39m[0;39mINFO         | Storing crashdata in: C:\Users\SAISHA~1\AppData\Local\Temp\\AndroidEmulator\emu-crash-35.6.11.db, detection is enabled for process: 13520
[0;39m[0;39mINFO         | Initializing hardware OpenGLES emulation support
[0;39m[0;39mINFO         | Sending adb public key [QAAAAAkzCP/HtE7w0iBtQEfmLsE5Bl0zy3j5WSxMMLPaRxbAFXZV5Ddd11YgrdnRxBX/77GrVQMy28d0tNKHw9qHXowGs95gOc7zaqZ8wcNrVaiG2/jms2vDJy7ggh8wP0itBkLq259T7v2LvQj6Jjks6BUt0DNY4zcahJFNcwxeru3Ls6xHRibPQ9ni8S7iWPQySBd7e9CDMfpsg/Q0qbEdcfbFWjJg7b9UKn0lWcK0RclSfIf6UAVQm8xAHTSg2eXthK/xGhOdMKXIiE9RnKOBfxRpa3zs6+iGdtrLSvB6sTojXqyjPU25mqMV0FtybwLaUrb29Cf1I+TdZUgF/dbzgRFs2SCtHgvQOLgk8i/9LWuN/+54pGaQ9jPLWu0ckRnump3if3cPTRYFpndifWtcgirfQG8usAjCzMakrmOgPtNT5pDtUXWPGyKVRXuvgAIObUNfPc8NWFVLyvlLj7qUoFJ6aqK68/dmJRl1RHnTye0pQvZei948mG7JXxauVkpMOVySeek7cR2fL+KPD24nXgI1wc+TsguCv+Fl/gmR9a6iw/pn+o2YtYcppJArhYgnFUbfQVxC41shF2y0ooSpAd9X+o9dKSPNnisjujX6Y3y7+DX+9MhgmPKLphPLGkfndJgtv0lxdeXuQGxxWla0YjWtXhO563ANRPFDKIR1i3FyTQkUGwEAAQA= @unknown]
[0;39mWHPX on Windows 10.0.26200 detected.
Windows Hypervisor Platform accelerator is operational
[0;39mINFO         | Monitoring duration of emulator setup.
[0;39m[33mWARNING      | The emulator now requires a signed jwt token for gRPC access! Use the -grpc flag if you really want an open unprotected grpc port
[0;39m[0;39mINFO         | Using security allow list from: C:\Shashank\loom_multiverse\runs\toolchains\android-sdk\emulator\lib\emulator_access.json
[0;39m[33mWARNING      | *** Basic token auth should only be used by android-studio ***
[0;39m[0;39mINFO         | The active JSON Web Key Sets can be found here: C:\Users\SAI SHASHANK\AppData\Local\Temp\avd\running\13520\jwks\2e0f7284-b495-40dc-88de-a31e7f6cf7dc\active.jwk
[0;39m[0;39mINFO         | Scanning C:\Users\SAI SHASHANK\AppData\Local\Temp\avd\running\13520\jwks\2e0f7284-b495-40dc-88de-a31e7f6cf7dc for jwk keys.
[0;39m[0;39mINFO         | Started GRPC server at 127.0.0.1:8554, security: Local, auth: +token
[0;39m[0;39mINFO         | Advertising in: C:\Users\SAI SHASHANK\AppData\Local\Temp\avd\running\pid_13520.ini
[0;39mI0920 16:47:11.076601   30792 FrameBuffer.cpp:2805] Setting display: 0 configuration to: 320x640, dpi: 160x160 
I0920 16:47:11.076846   30792 FrameBuffer.cpp:2818] setDisplayActiveConfig 0
[0;39mINFO         | Loading snapshot 'default_boot'...
[0;39m[0;39mINFO         | OpenGL Vendor=[Google (Google Inc.)]
[0;39m[0;39mINFO         | OpenGL Renderer=[Android Emulator OpenGL ES Translator (Google SwiftShader)]
[0;39m[0;39mINFO         | OpenGL Version=[OpenGL ES 3.0 (OpenGL ES 3.0 SwiftShader 4.0.0.1)]
[0;39m[33mWARNING      | Client not connected yet. Ignoring message!
[0;39m[33mWARNING      | Client not connected yet. Ignoring message!
[0;39m[33mWARNING      | Client not connected yet. Ignoring message!
[0;39m[33mWARNING      | Unknown XR viewport mode requested: 0, ignored.

[0;39m[33mWARNING      | Client not connected yet. Ignoring message!
[0;39m[33mWARNING      | Client not connected yet. Ignoring message!
[0;39m[33mWARNING      | Client not connected yet. Ignoring message!
[0;39m[33mWARNING      | Client not connected yet. Ignoring message!
[0;39m[33mWARNING      | Client not connected yet. Ignoring message!
[0;39m[0;39mINFO         | Successfully loaded snapshot 'default_boot'
[0;39m[0;39mINFO         | OpenGL Vendor=[Google (Google Inc.)]
[0;39m[0;39mINFO         | OpenGL Renderer=[Android Emulator OpenGL ES Translator (Google SwiftShader)]
[0;39m[0;39mINFO         | OpenGL Version=[OpenGL ES 3.0 (OpenGL ES 3.0 SwiftShader 4.0.0.1)]
[0;39m[0;39mINFO         | Activated packet streamer for uwb emulation
[0;39m[0;39mINFO         | Activated packet streamer for bluetooth emulation
[0;39m[0;39mINFO         | Wait for emulator (pid 13520) 20 seconds to shutdown gracefully before kill;you can set environment variable ANDROID_EMULATOR_WAIT_TIME_BEFORE_KILL(in seconds) to change the default value (20 seconds)

[0;39m

**🤖 Agent** (2026-09-20T11:17:40.215Z):
> Local checks have not passed: Error: Android emulator exited 1: :8000:14ec:a001:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 8000:14ec:a001:0:8000:14ec:a001:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 80c:14ec:a001:0:8000:14ec:a001:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 80c:14ec:a001:0:8000:14ec:a001:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 80c:14ec:a001:0:8000:14ec:a001:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 2812:14ec:a001:0:8000:14ec:a001:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 2812:14ec:a001:0:8000:14ec:a001:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 2812:14ec:a001:0:8000:14ec:a001:0
[0;39m[0;39mINFO         | Ignore IPv6 address: e81f:14ec:a001:0:8000:14ec:a001:0
[0;39m[0;39mINFO         | Ignore IPv6 address: e81f:14ec:a001:0:8000:14ec:a001:0
[0;39m[0;39mINFO         | Ignore IPv6 address: e81f:14ec:a001:0:8000:14ec:a001:0
[0;39m[0;39mINFO         | Ignore IPv6 address: d025:14ec:a001:0:8000:14ec:a001:0
[0;39m[0;39mINFO         | Ignore IPv6 address: d025:14ec:a001:0:8000:14ec:a001:0
[0;39m[0;39mINFO         | Ignore IPv6 address: d025:14ec:a001:0:8000:14ec:a001:0
[0;39m[0;39mINFO         | Guest GLES Driver: Auto (ext controls)
[0;39mlibrary_mode swiftshader_indirect gpu mode swiftshader_indirect
[0;39mINFO         | Checking system compatibility:
[0;39m[0;39mINFO         |   Checking: hasCompatibleHypervisor
[0;39m[0;39mINFO         |      Ok: Hypervisor compatibility to run avd: `loom_mobile` are met
[0;39m[0;39mINFO         |   Checking: hasSufficientSystem
[0;39m[0;39mINFO         |      Ok: System requirements to run avd: `loom_mobile` are met
[0;39m[0;39mINFO         |   Checking: hasSufficientHwGpu
[0;39m[0;39mINFO         |      Ok: Hardware GPU compatibility checks are not required
[0;39m[0;39mINFO         |   Checking: hasSufficientDiskSpace
[0;39m[0;39mINFO         |      Ok: Disk space requirements to run avd: `loom_mobile` are met
[0;39m[0;39mINFO         | Storing crashdata in: C:\Users\SAISHA~1\AppData\Local\Temp\\AndroidEmulator\emu-crash-35.6.11.db, detection is enabled for process: 13520
[0;39m[0;39mINFO         | Initializing hardware OpenGLES emulation support
[0;39m[0;39mINFO         | Sending adb public key [QAAAAAkzCP/HtE7w0iBtQEfmLsE5Bl0zy3j5WSxMMLPaRxbAFXZV5Ddd11YgrdnRxBX/77GrVQMy28d0tNKHw9qHXowGs95gOc7zaqZ8wcNrVaiG2/jms2vDJy7ggh8wP0itBkLq259T7v2LvQj6Jjks6BUt0DNY4zcahJFNcwxeru3Ls6xHRibPQ9ni8S7iWPQySBd7e9CDMfpsg/Q0qbEdcfbFWjJg7b9UKn0lWcK0RclSfIf6UAVQm8xAHTSg2eXthK/xGhOdMKXIiE9RnKOBfxRpa3zs6+iGdtrLSvB6sTojXqyjPU25mqMV0FtybwLaUrb29Cf1I+TdZUgF/dbzgRFs2SCtHgvQOLgk8i/9LWuN/+54pGaQ9jPLWu0ckRnump3if3cPTRYFpndifWtcgirfQG8usAjCzMakrmOgPtNT5pDtUXWPGyKVRXuvgAIObUNfPc8NWFVLyvlLj7qUoFJ6aqK68/dmJRl1RHnTye0pQvZei948mG7JXxauVkpMOVySeek7cR2fL+KPD24nXgI1wc+TsguCv+Fl/gmR9a6iw/pn+o2YtYcppJArhYgnFUbfQVxC41shF2y0ooSpAd9X+o9dKSPNnisjujX6Y3y7+DX+9MhgmPKLphPLGkfndJgtv0lxdeXuQGxxWla0YjWtXhO563ANRPFDKIR1i3FyTQkUGwEAAQA= @unknown]
[0;39mWHPX on Windows 10.0.26200 detected.
Windows Hypervisor Platform accelerator is operational
[0;39mINFO         | Monitoring duration of emulator setup.
[0;39m[33mWARNING      | The emulator now requires a signed jwt token for gRPC access! Use the -grpc flag if you really want an open unprotected grpc port
[0;39m[0;39mINFO         | Using security allow list from: C:\Shashank\loom_multiverse\runs\toolchains\android-sdk\emulator\lib\emulator_access.json
[0;39m[33mWARNING      | *** Basic token auth should only be used by android-studio ***
[0;39m[0;39mINFO         | The active JSON Web Key Sets can be found here: C:\Users\SAI SHASHANK\AppData\Local\Temp\avd\running\13520\jwks\2e0f7284-b495-40dc-88de-a31e7f6cf7dc\active.jwk
[0;39m[0;39mINFO         | Scanning C:\Users\SAI SHASHANK\AppData\Local\Temp\avd\running\13520\jwks\2e0f7284-b495-40dc-88de-a31e7f6cf7dc for jwk keys.
[0;39m[0;39mINFO         | Started GRPC server at 127.0.0.1:8554, security: Local, auth: +token
[0;39m[0;39mINFO         | Advertising in: C:\Users\SAI SHASHANK\AppData\Local\Temp\avd\running\pid_13520.ini
[0;39mI0920 16:47:11.076601   30792 FrameBuffer.cpp:2805] Setting display: 0 configuration to: 320x640, dpi: 160x160 
I0920 16:47:11.076846   30792 FrameBuffer.cpp:2818] setDisplayActiveConfig 0
[0;39mINFO         | Loading snapshot 'default_boot'...
[0;39m[0;39mINFO         | OpenGL Vendor=[Google (Google Inc.)]
[0;39m[0;39mINFO         | OpenGL Renderer=[Android Emulator OpenGL ES Translator (Google SwiftShader)]
[0;39m[0;39mINFO         | OpenGL Version=[OpenGL ES 3.0 (OpenGL ES 3.0 SwiftShader 4.0.0.1)]
[0;39m[33mWARNING      | Client not connected yet. Ignoring message!
[0;39m[33mWARNING      | Client not connected yet. Ignoring message!
[0;39m[33mWARNING      | Client not connected yet. Ignoring message!
[0;39m[33mWARNING      | Unknown XR viewport mode requested: 0, ignored.

[0;39m[33mWARNING      | Client not connected yet. Ignoring message!
[0;39m[33mWARNING      | Client not connected yet. Ignoring message!
[0;39m[33mWARNING      | Client not connected yet. Ignoring message!
[0;39m[33mWARNING      | Client not connected yet. Ignoring message!
[0;39m[33mWARNING      | Client not connected yet. Ignoring message!
[0;39m[0;39mINFO         | Successfully loaded snapshot 'default_boot'
[0;39m[0;39mINFO         | OpenGL Vendor=[Google (Google Inc.)]
[0;39m[0;39mINFO         | OpenGL Renderer=[Android Emulator OpenGL ES Translator (Google SwiftShader)]
[0;39m[0;39mINFO         | OpenGL Version=[OpenGL ES 3.0 (OpenGL ES 3.0 SwiftShader 4.0.0.1)]
[0;39m[0;39mINFO         | Activated packet streamer for uwb emulation
[0;39m[0;39mINFO         | Activated packet streamer for bluetooth emulation
[0;39m[0;39mINFO         | Wait for emulator (pid 13520) 20 seconds to shutdown gracefully before kill;you can set environment variable ANDROID_EMULATOR_WAIT_TIME_BEFORE_KILL(in seconds) to change the default value (20 seconds)

[0;39m
Paste an app error to repair it, use /retry to rerun local checks, or /done (quit) to close this session.

**🤖 Agent** (2026-09-20T14:52:36.557Z):
> Repairing existing source without saved Stitch approval metadata. No new architecture or design generation will run; design fidelity is not verified.

**🤖 Agent** (2026-09-20T14:52:36.560Z):
> Loading approved Stitch HTML, tokens and responsive layouts...

**🤖 Agent** (2026-09-20T14:52:36.563Z):
> Repairing the saved project in place...

**🤖 Agent** (2026-09-20T14:52:36.569Z):
> Inspecting 44 saved files for repair...

**🤖 Agent** (2026-09-20T14:52:36.829Z):
> Source audit: 0/58 files need generation or repair. Report: source-audit.json

**🤖 Agent** (2026-09-20T14:52:36.863Z):
> 🔧 Initiating autonomous build & self-healing sequence...

**🤖 Agent** (2026-09-20T14:52:36.968Z):
> [1/5] .: flutter pub get

**🤖 Agent** (2026-09-20T14:52:40.069Z):
> [1/5] .: flutter analyze

**🤖 Agent** (2026-09-20T14:53:21.763Z):
> [1/5] .: flutter test

**🤖 Agent** (2026-09-20T14:53:26.655Z):
> Starting Android emulator loom_mobile.

**🤖 Agent** (2026-09-20T14:53:47.425Z):
> Error: Android emulator exited 0: unning\8788\jwks\f306ea08-23e0-4ea7-9eb9-a11cddaf9c72\active.jwk
[0;39m[0;39mINFO         | Scanning C:\Users\SAI SHASHANK\AppData\Local\Temp\avd\running\8788\jwks\f306ea08-23e0-4ea7-9eb9-a11cddaf9c72 for jwk keys.
[0;39m[0;39mINFO         | Started GRPC server at 127.0.0.1:8554, security: Local, auth: +token
[0;39m[0;39mINFO         | Advertising in: C:\Users\SAI SHASHANK\AppData\Local\Temp\avd\running\pid_8788.ini
[0;39mI0920 20:23:28.314429   18340 FrameBuffer.cpp:2805] Setting display: 0 configuration to: 320x640, dpi: 160x160 
I0920 20:23:28.314664   18340 FrameBuffer.cpp:2818] setDisplayActiveConfig 0
[0;39mINFO         | Loading snapshot 'default_boot'...
[0;39m[0;39mINFO         | OpenGL Vendor=[Google (Google Inc.)]
[0;39m[0;39mINFO         | OpenGL Renderer=[Android Emulator OpenGL ES Translator (Google SwiftShader)]
[0;39m[0;39mINFO         | OpenGL Version=[OpenGL ES 3.0 (OpenGL ES 3.0 SwiftShader 4.0.0.1)]
[0;39m[33mWARNING      | Device 'cache' does not have the requested snapshot 'default_boot'

[0;39m[33mWARNING      | Failed to load snapshot 'default_boot'
[0;39mUSER_INFO    | The emulator is performing a cold boot without a saved state because there's no snapshot and you have configured it not to save on exit.
[0;39mINFO         | Activated packet streamer for uwb emulation
[0;39m[0;39mINFO         | Activated packet streamer for bluetooth emulation
[0;39m[0;39mINFO         | IPv4 server found: 192.168.0.1
[0;39m[0;39mINFO         | Ignore IPv6 address: 4050:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 4050:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 4050:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: c85b:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: c85b:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: c85b:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: e861:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: e861:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: e861:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: a86f:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: a86f:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: a86f:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 9075:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 9075:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 9075:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | IPv4 server found: 192.168.0.1
[0;39m[0;39mINFO         | Ignore IPv6 address: 4050:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 4050:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 4050:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: c85b:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: c85b:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: c85b:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: e861:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: e861:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: e861:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: a86f:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: a86f:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: a86f:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 9075:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 9075:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 9075:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | IPv4 server found: 192.168.0.1
[0;39m[0;39mINFO         | Ignore IPv6 address: 2020:b9f2:7102:0:2020:b9f2:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 2020:b9f2:7102:0:2020:b9f2:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 2020:b9f2:7102:0:2020:b9f2:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: a82b:b9f2:7102:0:2020:b9f2:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: a82b:b9f2:7102:0:2020:b9f2:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: a82b:b9f2:7102:0:2020:b9f2:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: c831:b9f2:7102:0:2020:b9f2:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: c831:b9f2:7102:0:2020:b9f2:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: c831:b9f2:7102:0:2020:b9f2:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 883f:b9f2:7102:0:2020:b9f2:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 883f:b9f2:7102:0:2020:b9f2:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 883f:b9f2:7102:0:2020:b9f2:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 7045:b9f2:7102:0:2020:b9f2:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 7045:b9f2:7102:0:2020:b9f2:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 7045:b9f2:7102:0:2020:b9f2:7102:0
[0;39m[0;39mINFO         | Wait for emulator (pid 8788) 20 seconds to shutdown gracefully before kill;you can set environment variable ANDROID_EMULATOR_WAIT_TIME_BEFORE_KILL(in seconds) to change the default value (20 seconds)

[0;39m[0;39mINFO         | Saving with gfxstream=1
[0;39m[0;39mINFO         | OpenGL Vendor=[Google (Google Inc.)]
[0;39m[0;39mINFO         | OpenGL Renderer=[Android Emulator OpenGL ES Translator (Google SwiftShader)]
[0;39m[0;39mINFO         | OpenGL Version=[OpenGL ES 3.0 (OpenGL ES 3.0 SwiftShader 4.0.0.1)]
[0;39m

**🤖 Agent** (2026-09-20T14:53:47.432Z):
> Local checks have not passed: Error: Android emulator exited 0: unning\8788\jwks\f306ea08-23e0-4ea7-9eb9-a11cddaf9c72\active.jwk
[0;39m[0;39mINFO         | Scanning C:\Users\SAI SHASHANK\AppData\Local\Temp\avd\running\8788\jwks\f306ea08-23e0-4ea7-9eb9-a11cddaf9c72 for jwk keys.
[0;39m[0;39mINFO         | Started GRPC server at 127.0.0.1:8554, security: Local, auth: +token
[0;39m[0;39mINFO         | Advertising in: C:\Users\SAI SHASHANK\AppData\Local\Temp\avd\running\pid_8788.ini
[0;39mI0920 20:23:28.314429   18340 FrameBuffer.cpp:2805] Setting display: 0 configuration to: 320x640, dpi: 160x160 
I0920 20:23:28.314664   18340 FrameBuffer.cpp:2818] setDisplayActiveConfig 0
[0;39mINFO         | Loading snapshot 'default_boot'...
[0;39m[0;39mINFO         | OpenGL Vendor=[Google (Google Inc.)]
[0;39m[0;39mINFO         | OpenGL Renderer=[Android Emulator OpenGL ES Translator (Google SwiftShader)]
[0;39m[0;39mINFO         | OpenGL Version=[OpenGL ES 3.0 (OpenGL ES 3.0 SwiftShader 4.0.0.1)]
[0;39m[33mWARNING      | Device 'cache' does not have the requested snapshot 'default_boot'

[0;39m[33mWARNING      | Failed to load snapshot 'default_boot'
[0;39mUSER_INFO    | The emulator is performing a cold boot without a saved state because there's no snapshot and you have configured it not to save on exit.
[0;39mINFO         | Activated packet streamer for uwb emulation
[0;39m[0;39mINFO         | Activated packet streamer for bluetooth emulation
[0;39m[0;39mINFO         | IPv4 server found: 192.168.0.1
[0;39m[0;39mINFO         | Ignore IPv6 address: 4050:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 4050:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 4050:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: c85b:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: c85b:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: c85b:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: e861:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: e861:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: e861:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: a86f:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: a86f:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: a86f:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 9075:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 9075:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 9075:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | IPv4 server found: 192.168.0.1
[0;39m[0;39mINFO         | Ignore IPv6 address: 4050:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 4050:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 4050:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: c85b:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: c85b:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: c85b:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: e861:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: e861:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: e861:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: a86f:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: a86f:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: a86f:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 9075:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 9075:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 9075:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | IPv4 server found: 192.168.0.1
[0;39m[0;39mINFO         | Ignore IPv6 address: 2020:b9f2:7102:0:2020:b9f2:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 2020:b9f2:7102:0:2020:b9f2:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 2020:b9f2:7102:0:2020:b9f2:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: a82b:b9f2:7102:0:2020:b9f2:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: a82b:b9f2:7102:0:2020:b9f2:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: a82b:b9f2:7102:0:2020:b9f2:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: c831:b9f2:7102:0:2020:b9f2:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: c831:b9f2:7102:0:2020:b9f2:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: c831:b9f2:7102:0:2020:b9f2:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 883f:b9f2:7102:0:2020:b9f2:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 883f:b9f2:7102:0:2020:b9f2:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 883f:b9f2:7102:0:2020:b9f2:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 7045:b9f2:7102:0:2020:b9f2:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 7045:b9f2:7102:0:2020:b9f2:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 7045:b9f2:7102:0:2020:b9f2:7102:0
[0;39m[0;39mINFO         | Wait for emulator (pid 8788) 20 seconds to shutdown gracefully before kill;you can set environment variable ANDROID_EMULATOR_WAIT_TIME_BEFORE_KILL(in seconds) to change the default value (20 seconds)

[0;39m[0;39mINFO         | Saving with gfxstream=1
[0;39m[0;39mINFO         | OpenGL Vendor=[Google (Google Inc.)]
[0;39m[0;39mINFO         | OpenGL Renderer=[Android Emulator OpenGL ES Translator (Google SwiftShader)]
[0;39m[0;39mINFO         | OpenGL Version=[OpenGL ES 3.0 (OpenGL ES 3.0 SwiftShader 4.0.0.1)]
[0;39m
Paste an app error to repair it, use /retry to rerun local checks, or /done (quit) to close this session.

**👤 User** (2026-09-20T14:53:47.434Z):
> 

**🤖 Agent** (2026-09-20T14:53:47.441Z):
> Repair session closed with an unresolved issue: Error: Android emulator exited 0: unning\8788\jwks\f306ea08-23e0-4ea7-9eb9-a11cddaf9c72\active.jwk
[0;39m[0;39mINFO         | Scanning C:\Users\SAI SHASHANK\AppData\Local\Temp\avd\running\8788\jwks\f306ea08-23e0-4ea7-9eb9-a11cddaf9c72 for jwk keys.
[0;39m[0;39mINFO         | Started GRPC server at 127.0.0.1:8554, security: Local, auth: +token
[0;39m[0;39mINFO         | Advertising in: C:\Users\SAI SHASHANK\AppData\Local\Temp\avd\running\pid_8788.ini
[0;39mI0920 20:23:28.314429   18340 FrameBuffer.cpp:2805] Setting display: 0 configuration to: 320x640, dpi: 160x160 
I0920 20:23:28.314664   18340 FrameBuffer.cpp:2818] setDisplayActiveConfig 0
[0;39mINFO         | Loading snapshot 'default_boot'...
[0;39m[0;39mINFO         | OpenGL Vendor=[Google (Google Inc.)]
[0;39m[0;39mINFO         | OpenGL Renderer=[Android Emulator OpenGL ES Translator (Google SwiftShader)]
[0;39m[0;39mINFO         | OpenGL Version=[OpenGL ES 3.0 (OpenGL ES 3.0 SwiftShader 4.0.0.1)]
[0;39m[33mWARNING      | Device 'cache' does not have the requested snapshot 'default_boot'

[0;39m[33mWARNING      | Failed to load snapshot 'default_boot'
[0;39mUSER_INFO    | The emulator is performing a cold boot without a saved state because there's no snapshot and you have configured it not to save on exit.
[0;39mINFO         | Activated packet streamer for uwb emulation
[0;39m[0;39mINFO         | Activated packet streamer for bluetooth emulation
[0;39m[0;39mINFO         | IPv4 server found: 192.168.0.1
[0;39m[0;39mINFO         | Ignore IPv6 address: 4050:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 4050:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 4050:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: c85b:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: c85b:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: c85b:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: e861:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: e861:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: e861:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: a86f:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: a86f:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: a86f:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 9075:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 9075:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 9075:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | IPv4 server found: 192.168.0.1
[0;39m[0;39mINFO         | Ignore IPv6 address: 4050:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 4050:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 4050:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: c85b:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: c85b:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: c85b:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: e861:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: e861:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: e861:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: a86f:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: a86f:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: a86f:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 9075:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 9075:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 9075:54ed:7102:0:4050:54ed:7102:0
[0;39m[0;39mINFO         | IPv4 server found: 192.168.0.1
[0;39m[0;39mINFO         | Ignore IPv6 address: 2020:b9f2:7102:0:2020:b9f2:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 2020:b9f2:7102:0:2020:b9f2:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 2020:b9f2:7102:0:2020:b9f2:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: a82b:b9f2:7102:0:2020:b9f2:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: a82b:b9f2:7102:0:2020:b9f2:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: a82b:b9f2:7102:0:2020:b9f2:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: c831:b9f2:7102:0:2020:b9f2:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: c831:b9f2:7102:0:2020:b9f2:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: c831:b9f2:7102:0:2020:b9f2:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 883f:b9f2:7102:0:2020:b9f2:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 883f:b9f2:7102:0:2020:b9f2:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 883f:b9f2:7102:0:2020:b9f2:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 7045:b9f2:7102:0:2020:b9f2:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 7045:b9f2:7102:0:2020:b9f2:7102:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 7045:b9f2:7102:0:2020:b9f2:7102:0
[0;39m[0;39mINFO         | Wait for emulator (pid 8788) 20 seconds to shutdown gracefully before kill;you can set environment variable ANDROID_EMULATOR_WAIT_TIME_BEFORE_KILL(in seconds) to change the default value (20 seconds)

[0;39m[0;39mINFO         | Saving with gfxstream=1
[0;39m[0;39mINFO         | OpenGL Vendor=[Google (Google Inc.)]
[0;39m[0;39mINFO         | OpenGL Renderer=[Android Emulator OpenGL ES Translator (Google SwiftShader)]
[0;39m[0;39mINFO         | OpenGL Version=[OpenGL ES 3.0 (OpenGL ES 3.0 SwiftShader 4.0.0.1)]
[0;39m

**🤖 Agent** (2026-09-20T14:53:47.443Z):
> Saving validation and runtime results.

---
*Error:* Error: Android emulator exited 0: t-properties.cpp:764]   androidboot.serialno=EMULATOR35X6X11X0
I0920 20:24:51.595907   24348 userspace-boot-properties.cpp:764]   androidboot.vbmeta.digest=c3fec574c004d42a1ba9007bad5d0e4e9018afeb9ec9c0424f1a6b4f033003fb
I0920 20:24:51.595910   24348 userspace-boot-properties.cpp:764]   androidboot.vbmeta.hash_alg=sha256
I0920 20:24:51.595913   24348 userspace-boot-properties.cpp:764]   androidboot.vbmeta.size=6720
I0920 20:24:51.595917   24348 userspace-boot-properties.cpp:764]   androidboot.veritymode=enforcing
[33mWARNING      | Please update the emulator to one that supports the feature(s): VulkanVirtualQueue
[0;39m[0;39mINFO         | Increasing RAM size to 2048MB
[0;39m[0;39mINFO         | IPv4 server found: 192.168.0.1
[0;39m[0;39mINFO         | Ignore IPv6 address: b0ea:3ea3:9302:0:b0ea:3ea3:9302:0
[0;39m[0;39mINFO         | Ignore IPv6 address: b0ea:3ea3:9302:0:b0ea:3ea3:9302:0
[0;39m[0;39mINFO         | Ignore IPv6 address: b0ea:3ea3:9302:0:b0ea:3ea3:9302:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 38f6:3ea3:9302:0:b0ea:3ea3:9302:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 38f6:3ea3:9302:0:b0ea:3ea3:9302:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 38f6:3ea3:9302:0:b0ea:3ea3:9302:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 58fc:3ea3:9302:0:b0ea:3ea3:9302:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 58fc:3ea3:9302:0:b0ea:3ea3:9302:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 58fc:3ea3:9302:0:b0ea:3ea3:9302:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 180a:3fa3:9302:0:b0ea:3ea3:9302:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 180a:3fa3:9302:0:b0ea:3ea3:9302:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 180a:3fa3:9302:0:b0ea:3ea3:9302:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 10:3fa3:9302:0:b0ea:3ea3:9302:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 10:3fa3:9302:0:b0ea:3ea3:9302:0
[0;39m[0;39mINFO         | Ignore IPv6 address: 10:3fa3:9302:0:b0ea:3ea3:9302:0
[0;39m[0;39mINFO         | Guest GLES Driver: Auto (ext controls)
[0;39mlibrary_mode swiftshader_indirect gpu mode swiftshader_indirect
[0;39mINFO         | Checking system compatibility:
[0;39m[0;39mINFO         |   Checking: hasCompatibleHypervisor
[0;39m[0;39mINFO         |      Ok: Hypervisor compatibility to run avd: `loom_mobile` are met
[0;39m[0;39mINFO         |   Checking: hasSufficientSystem
[0;39m[0;39mINFO         |      Ok: System requirements to run avd: `loom_mobile` are met
[0;39m[0;39mINFO         |   Checking: hasSufficientHwGpu
[0;39m[0;39mINFO         |      Ok: Hardware GPU compatibility checks are not required
[0;39m[0;39mINFO         |   Checking: hasSufficientDiskSpace
[0;39m[0;39mINFO         |      Ok: Disk space requirements to run avd: `loom_mobile` are met
[0;39m[0;39mINFO         | Storing crashdata in: C:\Users\SAISHA~1\AppData\Local\Temp\\AndroidEmulator\emu-crash-35.6.11.db, detection is enabled for process: 29492
[0;39m[0;39mINFO         | Initializing hardware OpenGLES emulation support
[0;39m[0;39mINFO         | Sending adb public key [QAAAAAkzCP/HtE7w0iBtQEfmLsE5Bl0zy3j5WSxMMLPaRxbAFXZV5Ddd11YgrdnRxBX/77GrVQMy28d0tNKHw9qHXowGs95gOc7zaqZ8wcNrVaiG2/jms2vDJy7ggh8wP0itBkLq259T7v2LvQj6Jjks6BUt0DNY4zcahJFNcwxeru3Ls6xHRibPQ9ni8S7iWPQySBd7e9CDMfpsg/Q0qbEdcfbFWjJg7b9UKn0lWcK0RclSfIf6UAVQm8xAHTSg2eXthK/xGhOdMKXIiE9RnKOBfxRpa3zs6+iGdtrLSvB6sTojXqyjPU25mqMV0FtybwLaUrb29Cf1I+TdZUgF/dbzgRFs2SCtHgvQOLgk8i/9LWuN/+54pGaQ9jPLWu0ckRnump3if3cPTRYFpndifWtcgirfQG8usAjCzMakrmOgPtNT5pDtUXWPGyKVRXuvgAIObUNfPc8NWFVLyvlLj7qUoFJ6aqK68/dmJRl1RHnTye0pQvZei948mG7JXxauVkpMOVySeek7cR2fL+KPD24nXgI1wc+TsguCv+Fl/gmR9a6iw/pn+o2YtYcppJArhYgnFUbfQVxC41shF2y0ooSpAd9X+o9dKSPNnisjujX6Y3y7+DX+9MhgmPKLphPLGkfndJgtv0lxdeXuQGxxWla0YjWtXhO563ANRPFDKIR1i3FyTQkUGwEAAQA= @unknown]
[0;39mWHPX on Windows 10.0.26200 detected.
Windows Hypervisor Platform accelerator is operational
[0;39mINFO         | Monitoring duration of emulator setup.
[0;39m[33mWARNING      | The emulator now requires a signed jwt token for gRPC access! Use the -grpc flag if you really want an open unprotected grpc port
[0;39m[0;39mINFO         | Using security allow list from: C:\Shashank\loom_multiverse\runs\toolchains\android-sdk\emulator\lib\emulator_access.json
[0;39m[33mWARNING      | *** Basic token auth should only be used by android-studio ***
[0;39m[0;39mINFO         | The active JSON Web Key Sets can be found here: C:\Users\SAI SHASHANK\AppData\Local\Temp\avd\running\29492\jwks\da7079c6-1661-4082-b1bb-c9fac3de1153\active.jwk
[0;39m[0;39mINFO         | Scanning C:\Users\SAI SHASHANK\AppData\Local\Temp\avd\running\29492\jwks\da7079c6-1661-4082-b1bb-c9fac3de1153 for jwk keys.
[0;39m[0;39mINFO         | Started GRPC server at 127.0.0.1:8554, security: Local, auth: +token
[0;39m[0;39mINFO         | Advertising in: C:\Users\SAI SHASHANK\AppData\Local\Temp\avd\running\pid_29492.ini
[0;39mI0920 20:24:51.821723   29308 FrameBuffer.cpp:2805] Setting display: 0 configuration to: 320x640, dpi: 160x160 
I0920 20:24:51.822027   29308 FrameBuffer.cpp:2818] setDisplayActiveConfig 0
USER_INFO    | Emulator is performing a full startup. This may take upto two minutes, or more.
[0;39mINFO         | OpenGL Vendor=[Google (Google Inc.)]
[0;39m[0;39mINFO         | OpenGL Renderer=[Android Emulator OpenGL ES Translator (Google SwiftShader)]
[0;39m[0;39mINFO         | OpenGL Version=[OpenGL ES 3.0 (OpenGL ES 3.0 SwiftShader 4.0.0.1)]
[0;39m[0;39mINFO         | Activated packet streamer for uwb emulation
[0;39m[0;39mINFO         | Activated packet streamer for bluetooth emulation
[0;39m[0;39mINFO         | Wait for emulator (pid 29492) 20 seconds to shutdown gracefully before kill;you can set environment variable ANDROID_EMULATOR_WAIT_TIME_BEFORE_KILL(in seconds) to change the default value (20 seconds)

[0;39m[33mWARNING      | Not saving state: RAM not mapped as shared
[0;39m