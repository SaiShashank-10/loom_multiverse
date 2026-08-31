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
  // First, if there are unbalanced left braces, forcefully close them at the end.
  let leftCount = (content.match(/\{/g) || []).length;
  let rightCount = (content.match(/\}/g) || []).length;
  
  if (leftCount > rightCount) {
    const missingBraces = leftCount - rightCount;
    log.warn(`Found ${missingBraces} unclosed braces. Forcefully appending '}' to repair JSON.`);
    content += "}".repeat(missingBraces);
  }

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

  // Sort blocks by length descending to find the largest (most complete) JSON object
  jsonBlocks.sort((a, b) => b.length - a.length);

  for (const block of jsonBlocks) {
    try {
      // Use non-null assertion because we are iterating valid array indices
      parsedJson = JSON.parse(block);
      
      // Basic heuristic: check if it's an object/array, not just a string/number
      if (typeof parsedJson === "object" && parsedJson !== null) {
         return parsedJson;
      }
    } catch {
      // Continue to the next block if parsing fails
    }
  }

  // 3. Complete failure
  log.error({ rawContent: content }, "Failed to extract valid JSON from LLM response");
  throw new Error(`Failed to extract valid JSON from LLM response. Raw output: ${content}`);
}
