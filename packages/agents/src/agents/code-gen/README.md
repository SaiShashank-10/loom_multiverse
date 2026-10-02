# Generation, Stitch and validation

User requirements and user revisions now accompany planning documents into generation and repair. Planning changes update the actual documents. Supported framework requirements are checked against generated manifests and entry points; Flutter cannot be silently replaced with React Native. Generation failures and unsuccessful validation fail the phase and CLI exit status.

## Stitch

Set `STITCH_API_KEY` in the repository `.env` using a key from Stitch Settings > API Keys. The client connects to `https://stitch.googleapis.com/mcp` with the `X-Goog-Api-Key` header. It never starts the mock server. Missing credentials or API failures stop the dedicated stitch phase. Code generation is blocked until designs complete, with user approval in interactive mode. Only an approved plan explicitly marked as having no frontend is not applicable. Use the same Google account as the key owner to open projects.

The client uses Google's camelCase tool arguments and validates real project resources. Generation uses one request per required screen. A timeout is not blindly retried because the remote generation may still complete. Incomplete results are reported. Design tokens are supplied in prompts; no unsupported design-system tool is assumed. Connections close after review or failure. Connection handshakes retry transient failures up to three times; generation calls are never blindly replayed. Cancelled review does not proceed to code generation.

API reference: https://github.com/google-labs-code/stitch-sdk/blob/main/packages/sdk/generated/src/tool-definitions.ts

## Self-healing

The validator recursively discovers component manifests, excluding dependencies and build output. Profiles cover Flutter/Dart, JavaScript package managers, Python, Cargo, Go, Maven/Gradle, .NET, Composer, Ruby, Swift and CMake. These profiles are validation recipes, not a guarantee that all possible applications or environments can be repaired.

The repair model first selects files, then receives their complete current contents along with requirements and command output. It can patch multiple files, cannot replace unread files, cannot drop existing package scripts/dependencies, and cannot write outside the workspace or through symlinks. Every repair cycle reinstalls dependencies and reruns checks. Repeated errors, missing SDKs and exhausted attempts return failure. Validation does not mean a server has started.

For other stacks, or projects needing specific tests/build flags, provide `loom.validation.json` in the generated workspace. Include every component; commands execute on the local host and must be finite:

```json
{
  "projects": [
    {
      "directory": "frontend",
      "install": ["flutter pub get"],
      "validate": ["flutter analyze", "flutter test", "flutter build web"]
    },
    {
      "directory": "backend",
      "install": ["npm install"],
      "validate": ["npm test"]
    }
  ]
}
```

Do not use placeholder echo commands, watch modes, or dev servers as validation. Unknown projects fail with a request for this configuration rather than defaulting to npm/webpack.

Run existing-project checks without model calls:

```powershell
npx tsx packages/agents/src/agents/code-gen/validate-project.ts runs/workspaces/PROJECT_ID
```

Run the interactive pipeline normally:

```powershell
npx tsx --env-file=.env packages/agents/src/orchestrator/test-runner.ts
```

Run a read-only preflight with `npx tsx --env-file=.env packages/agents/src/agents/code-gen/stitch-check.ts`. The configured key and real Google tool discovery have been verified. A narrowly scoped SDK compatibility validator restores the missing recursive ScreenInstance definition in Google's upload_design_md output schema; it does not disable validation.

The graph now routes `planning -> stitch -> code_gen`. The remote project link is saved in `docs/STITCH_PROJECT.json` and completed design results in `docs/STITCH_RESULT.json`. A failure is attributed to stitch and exits without writing generated source.

Full pipeline verification additionally requires the configured LLM, database and optional Stitch account; unit tests use deterministic mocks.

## Interactive Stitch review

After generation requests finish, the terminal opens the design chat. A difference between requested and listed screen counts is shown as a warning in interactive mode, so you can inspect the project and request missing screens. It does not silently approve incomplete designs. Noninteractive runs still fail on that mismatch.

Ask questions, request changes, then type `approve` or `designs are approved`. Questions do not invoke screen edits. Approval rechecks that screens exist and that the last edit succeeded; otherwise the chat stays open for correction. Design approval uses the actual Stitch artifacts without an extra LLM JSON extraction call. Chat history is included in the pipeline output.

## Resume an existing project at design review

```powershell
npx tsx --env-file=.env packages/agents/src/orchestrator/test-runner.ts --resume 0d83512f-b897-4976-9270-f5708c789635
```

Run from the repository root. This loads the saved planning documents and `docs/STITCH_PROJECT.json`, opens the same remote project, and enters review without replaying generation. Ask for missing screens or edits, then type `approve` to generate code in the same local workspace. An inaccessible saved project fails without creating a replacement. Resume logs use a timestamped filename to preserve earlier output. Older runs without pipeline checkpoints resume design review from their saved documents. New runs also save disk checkpoints as described below.

## Durable pipeline resume

Use the same `--resume PROJECT_ID` command after closing or interrupting the terminal. New runs save `pipeline-checkpoint.json` before phases and as chat messages arrive. Resume selects the active phase, or the next phase if the previous one completed. Implemented phases are document ingestion, idea check, planning, Stitch, and code generation.

The initial idea analysis and chat history are restored. Planning keeps existing nonempty documents. Stitch reopens its saved remote project and lets you inspect existing screens before requesting more. Code generation saves its file manifest, audits existing files and reuses only valid source/configuration, then runs validation/self-healing again. Completed projects are not automatically regenerated. Checkpoint files are excluded from generated-code inspection and protected from generated writes.

An in-flight LLM or external request cannot resume at the exact instruction where it stopped. Resume restarts the unfinished operation using saved artifacts. In particular, inspect Stitch after an interrupted remote generation request before asking it to generate again, because it may have completed remotely. Legacy runs without checkpoints can resume from their saved design artifacts; their unsaved earlier phase state cannot be recovered automatically.

Explicit screen-addition requests go directly to Stitch with the approved design context. They no longer require the local model to return a JSON screen plan.

Start a new run with an idea document:

```powershell
npx tsx --env-file=.env packages/agents/src/orchestrator/test-runner.ts --document "C:\path\to\project-idea.pdf"
```

## ML code generation and execution

Every code-generation run first saves a structured `ml-plan.json`. The plan distinguishes real local fitting/fine-tuning from portfolio content and hosted-AI integrations, and records task, modalities, framework, model family, dataset schema, split strategy, metrics, acceptance criteria and compute budget. Training plans activate six specialist code workers: data preparation, model architecture, training, fine-tuning, evaluation, and application integration. Workers receive the approved architecture and previously written interfaces. Ordinary projects retain normal code generation.

The worker contract requires leakage-safe splits, real optimization, saved preprocessing and model state, resumable optimizer state where applicable, measured held-out metrics, and backend inference from saved artifacts. Task-specific architectures (including graph models, CNNs, RNNs and transformers) are generated from the plan; this is not a guarantee that every architecture or dataset will work without validation or repair.

The project root receives `ml-run.json`. Supply the dataset path according to `ml/README.md`, choose `device`, epochs, batch size and `maxRuntimeMinutes`, then select `mode`: `new`, `resume`, or `finetune`. Resume uses `resumeCheckpoint`; fine-tuning uses the separate `pretrainedCheckpoint`. Alternatively set `LOOM_ML_DATASET` to a local dataset path. Missing data or weights block real training rather than causing synthetic results to be substituted. Synthetic data is allowed only in labeled tests.

After normal validation the orchestrator runs preprocessing, the selected training/fine-tuning mode, evaluation, then independent reload verification. Each run gets a separate artifact directory. Completion requires the current dataset fingerprint, held-out predictions, split identity, checkpoint and prediction SHA-256 hashes, changed-parameter evidence, checkpoint reload parity, and recomputed metrics. Resource, data and environment failures are reported without rewriting source; only classified code failures enter repair. `ml-execution-report.json` records completed/blocked/failed status. These checks materially strengthen execution provenance, but they do not prove scientific validity or achievement of benchmark targets without expert review of data and methodology.

Resume the same project after providing its training prerequisites. No project-specific training or benchmark improvement is claimed until that run completes and its measured results are reviewed.

Design approval now refreshes available screens and accepts explicit approval of them even if a previous remote edit/generation request failed. The error is disclosed; it does not remain a permanent approval blocker. Empty or unreachable screen lists still cannot be approved.

References used for the worker contract: https://scikit-learn.org/stable/common_pitfalls.html and https://docs.pytorch.org/tutorials/beginner/saving_loading_models.html.

Architecture generation passes the JSON schema directly to Ollama. The installed adapter’s withStructuredOutput wrapper does not pass native schema constraints. Planning is processed in 6,000-character batches with an 8K context window. Completed batches are saved to architecture-progress.json and restored when the input fingerprint matches. All planning sections are visited; duplicate file paths are merged. Progress reports received output every 30 seconds. An idle deadline of ten minutes resets on each output chunk; a thirty-minute per-batch ceiling prevents unlimited generation. Thus slow but active output is not cancelled after four minutes. Validation failures retry up to three times; an idle timeout stops without overlapping retries.

## Validated source output and repair of older runs

Source generation now requests a native JSON envelope containing the actual file content, with the file task at the end of a bounded relevant-context prompt. Raw Stitch payloads are replaced by short screen metadata. Application files use the application writer; only ml/ files use ML specialists. An inference-only portfolio mentioning TensorFlow.js does not by itself require a Python training package.

The writer rejects explanatory prose, no-op application roots, placeholder JSON and unimplemented entrypoints. JSON, CSS/SCSS, YAML, environment templates, INI, JS/TS and Python receive parsers or structural checks. Dart, Java/Kotlin, Go, Rust, Swift, C/C++, C#, PHP, Ruby, Scala, Lua, R, SQL, shell, PowerShell, Terraform, GraphQL, protobuf, Vue/Svelte, XML, TOML, Dockerfiles and Makefiles must contain language-specific implementation signals before they can be saved or reused. ML entrypoints also need their CLI contract and stage-specific behavior. Native builds and behavioral tests remain the final semantic gate.

CUDA runner failures trigger a single CPU fallback for source generation. This can be slower, but never results in an error message being saved as code. Resume older failed projects with the same project ID; nonempty prose is no longer treated as completed source.

## Ollama readiness and network recovery

Before a phase uses its default local model, Loom checks the configured Ollama endpoint and required model. Code generation separately checks `OLLAMA_CODE_MODEL`; architecture, application workers, ML workers and repair all use that shared model policy. A supplied model or configured cloud provider is honored rather than silently creating another Ollama client. If a loopback server is unavailable, Loom attempts to start `ollama serve` in the background and waits for readiness. Models are never silently downloaded.

Source generation uses up to three retries for connection failures, separately from code-format retries. Nested network error codes are retained so an unavailable service is distinguishable from invalid model output. If recovery fails, resume continues the same saved project; no placeholder file is written.

When an approved web project does not require Python or model training, stale training entries left under src/ by older manifests are excluded as well as injected ml/ entries. Explicitly rejected architecture alternatives do not count as the chosen stack. Invalid files excluded by this reconciliation are backed up; valid existing source is preserved.


## Application workers and shared source contracts

### Approved Stitch design handoff

Code generation loads actual approved screen HTML into `.loom-design`, refreshing expired download links through Stitch when needed. Missing exports stop generation with a resumable error. The cache records screen identities and content hashes. Every worker receives the design contract; frontend files and repair passes also receive matched layout excerpts, typography, token definitions and responsive variants in a separate prompt budget. Native frameworks translate the same design references into their approved widget/component system.

UI writers run a separate source-level design review with up to two corrective passes before accepting a file. Resume reuses UI only when both its source hash and approved design fingerprint match. Validation checks screen-to-file coverage and styling hooks, including screens added by repair. These checks are useful prerequisites, not proof of pixel fidelity: `implementation-report.json` explicitly records that automatic browser comparison was not performed. Rendered browser review is still needed for visual acceptance. `.loom-design` is excluded from generated-source audits and protected from repair writes.

Plain-CSS projects now provide a package-scoped styling contract. The writer rejects drafts that copy multiple undefined utility classes from Stitch without an available utility CSS system; corrective prompts retain the real class names. The same check runs on resume and self-healing. This targeted check does not prove every selector, dynamic class or stylesheet import is correct. Mobile references reserve their own layout/control budget instead of truncating behind duplicate token declarations. Final file instructions follow reference data to avoid losing the implementation task in long prompts. Malformed reviewer feedback is retried once without assuming approval.

For a bounded live check of the local code model and reviewer against this saved React Job Search project's actual references:

```powershell
npx tsx --env-file=.env packages/agents/src/agents/code-gen/design-live-check.ts 9bdf0624-3489-443b-98af-23722d87e6fc
```

This opt-in diagnostic generates one result-card component, performs the normal design review, and checks server rendering with real React. It writes model responses, a report and (on success) an isolated Vite preview under the project's `.loom-design/live-check/<timestamp>`. It does not overwrite the client, does not certify a whole project, and is not a replacement for the orchestrator. Visual and interaction checks follow in a browser.

Application generation routes files to configuration, frontend, backend, testing, and integration workers. The six ML workers still handle training projects. Workers execute sequentially, sharing an index of validated source signatures instead of a rolling tail of entire implementations. Configuration and common utilities precede consumers; entry points and tests follow them. Approved framework constraints, file paths, and relevant peer interfaces have explicit prompt budgets and cannot be crowded out by the narrative design context. The model remains configurable; specialist roles do not imply multiple models running simultaneously.

Each architecture batch receives the existing layout. Manifests must include behavioral tests and cannot contain ambiguous `.js`/`.jsx` variants or duplicated client roots. An inconsistent saved manifest is backed up and regenerated. Invalid orphaned files from an older manifest are moved into `.loom-backups`; valid unlisted user work is preserved. A source audit covers nested files before generation and during every validation/repair cycle.

CSS is parsed with PostCSS (SCSS uses its compatible structural parser), YAML is parsed and must contain configuration rather than a prose scalar, and environment templates/INI files must have configuration entries. The common prose check now includes the actual historical response patterns. Application package manifests need runnable scripts. These checks supplement JS/TS parsing, Python AST checks, native compiler/build commands and tests. Unrecognized language semantics still depend on that stack's compiler and meaningful project tests; source parsing is not proof that a feature is complete.

The repair agent requests a bounded plan of files to read and edit, then regenerates each file using the same validated writer. It supplies the complete current file, retains peer interfaces, and validates every proposed correction before writing the repair set. Whole-file repair is bounded to 24,000 characters per file; larger modules fail with a clear request for a targeted edit or smaller modules rather than silently losing their contents. No validation command means failure, not a completed project.

Read-only source diagnosis (writes only source-audit.json; exit code 1 means unresolved source):

```powershell
npx tsx --env-file=.env packages/agents/src/agents/code-gen/audit-project.ts runs/workspaces/76f13323-67e1-4354-ac5e-bcd308d04665
```

Resume generation and build validation in the same workspace:

```powershell
npx tsx --env-file=.env packages/agents/src/orchestrator/test-runner.ts --resume 76f13323-67e1-4354-ac5e-bcd308d04665
```

Regression coverage includes real execution of a generated multi-file Node fixture, replacement of legacy prose, reuse on a second resume, peer-interface retention with a long project history, structured ML decisions, resume/fine-tune separation, and rejection of an entire repair set when a later generated file is invalid. A real scikit-learn integration test fits a model and verifies held-out predictions, reload parity and hashes. The local-model smoke check generated and validated an actual Flutter entrypoint with `qwen2.5-coder:7b`; this proves the writer path returns code, not that every generated application is automatically production-ready.

Run the same live local-model smoke check:

```powershell
npx tsx --env-file=.env packages/agents/src/agents/code-gen/codegen-smoke.ts
```

## Mobile generation and native runtime

Flutter and React Native use native UI/navigation, data/persistence, platform/build and behavioral-test specialists. Approved requirements select the client stack before the planning fallback. Stitch receives MOBILE for mobile products and DESKTOP for websites. Existing exports remain visual references; native workers do not copy HTML into an app.

After source generation, the pipeline installs project dependencies and runs discovered analysis/tests. It scaffolds missing Flutter Android host files from the installed Flutter SDK while preserving application source. Expo scaffolds its Android host when missing, then uses a finite Gradle build separately from Metro. Bare React Native can scaffold an Android host using its installed, compatible community CLI and exact installed React Native version. Native execution currently targets Android, including on Windows; it is not an iOS launch implementation.

The runner uses an attached Android device or boots/creates an emulator from an installed system image. It builds, installs and opens the APK, then checks the process, resumed activity and runtime errors. The native result is saved under the client root at `.loom-mobile/runtime.json`. A build alone or a web preview never sets `isRunning=true`. Missing SDKs, credentials and inaccessible services remain failures with diagnostics, not fabricated success. Launch health does not prove every business feature or pixel-perfect design fidelity.

Continue interrupted generation in the existing project:

```powershell
npx tsx --env-file=.env packages/agents/src/orchestrator/test-runner.ts --resume PROJECT_ID
```

Reopen the build/repair path for an existing generated project (including a completed checkpoint):

```powershell
npx tsx --env-file=.env packages/agents/src/orchestrator/test-runner.ts --repair PROJECT_ID
```

Repair loads a saved code generation manifest or recovers an inventory from existing source for legacy projects. It preserves the architecture and setup documentation, skips initial file generation, then validates/repairs existing source. Legacy repair can run without old Stitch metadata; it does not invent design approval or claim design fidelity. New generation still requires the Stitch gate. A project-root `loom.repair.json` can select an active component with `directory` and preserve its `requirements`; paths outside the workspace are rejected. Automatic repair is bounded and repeat failures are retained. During the mobile repair session, paste a single-line error directly, or type `/paste`, paste a multiline error and finish with `/end`. Use `/retry` to revalidate/relaunch or `/done` to close. Approval and quitting do not turn failed checks into a successful result. Repair history is retained in `.loom-mobile/repair-history.json`.

Mobile projects with a local API declare `loom.services.json` at the workspace root. Each service specifies `name`, `directory`, `file`, `args` and a local HTTP `healthUrl`. After dependency/build checks, the runner starts these services, requires a successful health response and forwards their ports through adb reverse. Missing service configuration in a detected backend fails validation and enters repair. External cloud services still require valid account configuration; the runner does not invent credentials or claim unavailable features work.


Mobile runtime verification on this Windows host: Flutter 3.38.5 and Expo 57 / React Native 0.86.3 each compiled, installed and launched on an Android 36 emulator. Counter interactions were checked on the device. These were isolated runtime fixtures under `runs/mobile-smoke`, not a claim that an arbitrary generated client or every requested business feature has passed end-to-end tests. Bare React Native scaffolding is covered structurally but has not had a separate live native build in this verification. Per-project screenshots and runtime/build logs are stored under `.loom-mobile`. Persistent process tokens prevent repeated runs from killing unrelated processes or leaving managed Metro instances behind.


Successful mobile builds now finish automatically without opening a repair chat. The interactive fallback opens only after automatic repair cannot resolve a failure, and closes automatically once revalidation and native launch pass. The runner already captures tool output; users only need to supply additional information or errors observed outside the runner. Android repair runs Flutter analysis/tests and the native APK build; an optional web directory no longer forces a web compilation prerequisite. Explicit web validation remains available.
