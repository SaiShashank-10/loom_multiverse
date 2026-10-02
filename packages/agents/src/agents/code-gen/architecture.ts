import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { FileStructureSchema, type FileStructure } from "./schema.js";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";

export const architectureSchema = {
  type: "object",
  additionalProperties: false,
  required: ["files"],
  properties: {
    files: {
      type: "array",
      minItems: 1,
      maxItems: 60,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["path", "description"],
        properties: {
          path: { type: "string", minLength: 1 },
          description: { type: "string", minLength: 1 },
        },
      },
    },
  },
};
/** All input sections are visited; batching bounds local inference memory without silently dropping requirements. */
export function architectureSections(context: string, limit = 6000): string[] {
  const sections: string[] = [];
  for (let offset = 0; offset < context.length; offset += limit)
    sections.push(context.slice(offset, offset + limit));
  return sections.length ? sections : [context];
}
export async function generateArchitecture(
  llm: BaseChatModel,
  context: string,
  screens: string,
  notify: (message: string) => void = () => {},
  idleMs = 600_000,
  cachePath?: string,
): Promise<FileStructure> {
  const sections = architectureSections(context);
  const fingerprint = createHash("sha256")
    .update("native-schema-v2-shared-layout" + context + screens)
    .digest("hex");
  let batches: FileStructure[] = [];
  if (cachePath) {
    try {
      const saved = JSON.parse(await fs.readFile(cachePath, "utf8"));
      if (
        saved.fingerprint === fingerprint &&
        Array.isArray(saved.batches) &&
        saved.batches.length <= sections.length
      )
        batches = saved.batches.map((batch: unknown) => FileStructureSchema.parse(batch));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  const stackHints = context
    .split(/\n/)
    .filter((line) =>
      /flutter|react|python|tensorflow|pytorch|django|fastapi|typescript|java|rust|firebase/i.test(
        line,
      ),
    )
    .map((line) => line.slice(0, 300))
    .join("\n")
    .slice(0, 2000);
  if (batches.length)
    notify(`Restored ${batches.length}/${sections.length} completed architecture batches.`);
  for (let index = batches.length; index < sections.length; index++) {
    let feedback = "";
    for (let attempt = 1; attempt <= 3; attempt++) {
      const controller = new AbortController();
      let bytes = 0,
        timer: ReturnType<typeof setTimeout> | undefined;
      let rejectDeadline: (error: Error) => void = () => {};
      const deadline = new Promise<never>((_, reject) => {
        rejectDeadline = reject;
      });
      const expire = (reason: string) => {
        controller.abort();
        rejectDeadline(new Error(reason));
      };
      const resetIdle = () => {
        clearTimeout(timer);
        timer = setTimeout(
          () =>
            expire(
              `Architecture produced no output for ${idleMs / 1000} seconds; request cancelled. Completed batches are saved.`,
            ),
          idleMs,
        );
      };
      resetIdle();
      const total = setTimeout(
        () =>
          expire(
            "Architecture batch exceeded 30 minutes; request cancelled. Completed batches are saved.",
          ),
        1_800_000,
      );
      const progress = setInterval(
        () =>
          notify(
            `Architecture batch ${index + 1}/${sections.length}: ${bytes} output characters received${bytes ? "" : "; loading model or processing prompt"}.`,
          ),
        30_000,
      );
      notify(
        `Architecture batch ${index + 1}/${sections.length}, attempt ${attempt}/3 (${sections[index]!.length} context characters).`,
      );
      try {
        const consume = async () => {
          // Pass the schema directly: this installed adapter's withStructuredOutput uses plain JSON mode.
          const stream = await llm.stream(
            [
              new SystemMessage(
                "Produce a cohesive file manifest only. Propose .env.example templates with placeholder values, never .env or .env.local files. Preserve the approved technology stack. Reuse the established root/layout and one canonical extension per module; never create duplicate frontend roots or parallel .js/.jsx variants. Every JavaScript/TypeScript application must include its package.json with real dependency and build/test/start scripts. Do not list binary files such as PNG, JPG, fonts, archives, audio, or video because this text generator cannot create them; use source SVG/CSS or an explicitly supplied existing asset. Include real dependency/build manifests and behavioral tests for the requirements, with validation scripts that execute them. Keep the design as small as practical while complete. Each file needs a relative path and precise implementation responsibility including important peer contracts. No implementation code. Do not list orchestrator-owned checkpoint, codegen-manifest, ml-plan, ml-run or execution-report files. This is one section of a larger plan; list files needed by this section. Other sections are processed separately.",
              ),
              new HumanMessage(
                `Stack context (resolve conflicts using explicit user requirements):\n${stackHints}\nEstablished file paths from earlier sections (reuse this layout, do not create a second frontend/backend root or change a module's extension):\n${[...new Set(batches.flatMap((batch) => batch.files.map((file) => file.path)))].join("\n").slice(0, 3500)}\nPlanning section ${index + 1}/${sections.length}:\n${sections[index]}\nApproved screen names: ${screens.slice(0, 2000)}\n${feedback}`,
              ),
            ],
            { signal: controller.signal, format: architectureSchema } as any,
          );
          let output = "";
          for await (const chunk of stream) {
            const text = typeof chunk.content === "string" ? chunk.content : "";
            if (text) {
              output += text;
              bytes += text.length;
              resetIdle();
            }
          }
          return FileStructureSchema.parse(JSON.parse(output));
        };
        const batch = await Promise.race([consume(), deadline]);
        batches.push(batch);
        if (cachePath) {
          await fs.writeFile(`${cachePath}.tmp`, JSON.stringify({ fingerprint, batches }, null, 2));
          await fs.rename(`${cachePath}.tmp`, cachePath);
        }
        break;
      } catch (error) {
        if (controller.signal.aborted) throw error;
        feedback = `Previous response failed schema validation: ${String(error).slice(0, 700)}. Return {"files":[{"path":"relative/file","description":"purpose"}]}.`;
        if (attempt === 3)
          throw new Error(
            `Architecture batch ${index + 1} failed after 3 attempts: ${String(error).slice(0, 1000)}`,
          );
        notify(`Retrying architecture batch ${index + 1}: invalid output.`);
      } finally {
        clearTimeout(timer);
        clearTimeout(total);
        clearInterval(progress);
      }
    }
  }
  const merged = new Map<string, { path: string; description: string }>();
  for (const batch of batches)
    for (const file of batch.files) {
      const normalized = file.path.replace(/\\/g, "/").replace(/^\.\//, "");
      const key = normalized.toLowerCase();
      const previous = merged.get(key);
      merged.set(key, {
        path: previous?.path ?? normalized,
        description: previous
          ? [...new Set([previous.description, file.description])].join("; ")
          : file.description,
      });
    }
  return FileStructureSchema.parse({ files: [...merged.values()] });
}
export function summarizeDesigns(screens: string): string {
  try {
    const parsed: unknown = JSON.parse(screens);
    if (!Array.isArray(parsed)) return "See the approved UI planning document.";
    return JSON.stringify(
      parsed.map((screen) => ({
        id: screen.id,
        name: screen.title ?? screen.name,
        deviceType: screen.deviceType,
        width: screen.width,
        height: screen.height,
      })),
    );
  } catch {
    return "See the approved UI planning document.";
  }
}
