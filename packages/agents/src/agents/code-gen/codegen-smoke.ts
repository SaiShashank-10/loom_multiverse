import { createHash } from "node:crypto";
import { config } from "@loom/shared/config";
import { createTier2LLM } from "../../llm/index.js";
import { ensureOllamaReady } from "../../llm/ollama-health.js";
import { generateSource } from "./source-output.js";

async function main() {
  if (config.LLM_PROVIDER !== "ollama")
    throw new Error("This local smoke check currently requires LLM_PROVIDER=ollama");
  await ensureOllamaReady(config.OLLAMA_BASE_URL, config.OLLAMA_CODE_MODEL, console.log);
  const llm = createTier2LLM({ maxTokens: 2048, contextWindow: 8192, temperature: 0 });
  const content = await generateSource(
    llm,
    {
      path: "lib/main.dart",
      description:
        "Complete Flutter entrypoint rendering a MaterialApp with a stateful counter, accessible increment button and visible count",
    },
    "Client explicitly requires Flutter. The smoke application must compile as a normal Flutter Material application and implement a working counter interaction.",
    "Senior Flutter engineer",
    {
      structure: "pubspec.yaml\nlib/main.dart\ntest/widget_test.dart",
      constraints: "Use Flutter and Dart. Do not use React Native. Implement actual behavior.",
    },
  );
  console.log(
    JSON.stringify({
      model: config.OLLAMA_CODE_MODEL,
      file: "lib/main.dart",
      bytes: Buffer.byteLength(content),
      sha256: createHash("sha256").update(content).digest("hex"),
      hasFlutterEntrypoint: /void\s+main\s*\(/.test(content) && /MaterialApp/.test(content),
    }),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
