/**
 * @loom/agents — Resilient JSON Parser
 *
 * Advanced utility to extract and parse JSON from LLM outputs,
 * specifically handling hallucinations from smaller local models (e.g., qwen3).
 */

import { createLogger } from "@loom/shared/logger";

const log = createLogger("llm:json-parser");

/**
 * Extracts the most complete JSON object from a raw LLM text response.
 * It handles markdown code blocks and conversational filler text.
 *
 * @param content The raw string output from the LLM
 * @returns The parsed JSON object as an unknown type
 * @throws Error if no valid JSON block can be extracted
 */
export function extractAndParseJson(content: string): unknown {
  let parsedJson: unknown;

  // 1. Try to extract from a markdown json block
  const markdownMatch = content.match(/```json\s*(\{[\s\S]*?\})\s*```/);
  if (markdownMatch && markdownMatch[1]) {
    try {
      parsedJson = JSON.parse(markdownMatch[1]);
      return parsedJson;
    } catch {
      log.warn("Found markdown block but it contained invalid JSON syntax.");
    }
  }

  // 2. Fallback to advanced brace-matching algorithm.
  // We scan the text for all balanced brace pairs and try parsing them from last to first.
  const jsonBlocks: string[] = [];
  let braceCount = 0;
  let startIndex = -1;

  for (let i = 0; i < content.length; i++) {
    if (content[i] === "{") {
      if (braceCount === 0) startIndex = i;
      braceCount++;
    } else if (content[i] === "}") {
      braceCount--;
      if (braceCount === 0 && startIndex !== -1) {
        jsonBlocks.push(content.substring(startIndex, i + 1));
        startIndex = -1;
      }
    }
  }

  // Iterate backwards since models often write a "draft" JSON before the final one
  for (let i = jsonBlocks.length - 1; i >= 0; i--) {
    try {
      // Use non-null assertion because we are iterating valid array indices
      parsedJson = JSON.parse(jsonBlocks[i]!);
      return parsedJson;
    } catch {
      // Continue to the next block if parsing fails
    }
  }

  // 3. Complete failure
  log.error({ rawContent: content }, "Failed to extract valid JSON from LLM response");
  throw new Error(`Failed to extract valid JSON from LLM response. Raw output: ${content}`);
}
