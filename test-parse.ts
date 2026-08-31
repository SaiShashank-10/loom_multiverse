import { extractAndParseJson } from './packages/agents/src/llm/json-parser.js';
import * as fs from 'fs';

const logFile = fs.readFileSync('C:/Users/SAI SHASHANK/.gemini/antigravity-ide/brain/4d79d207-f5cc-4c51-82a0-602c2e3dd67a/.system_generated/tasks/task-297.log', 'utf-8');
const match = logFile.match(/content: "(.*?)"\n\[/s);
if (match && match[1]) {
  const rawContent = match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
  
  const jsonBlocks: string[] = [];
  let braceCount = 0;
  let startIndex = -1;

  for (let i = 0; i < rawContent.length; i++) {
    if (rawContent[i] === "{") {
      if (braceCount === 0) startIndex = i;
      braceCount++;
    } else if (rawContent[i] === "}") {
      braceCount--;
      if (braceCount === 0 && startIndex !== -1) {
        jsonBlocks.push(rawContent.substring(startIndex, i + 1));
        startIndex = -1;
      }
    }
  }
  jsonBlocks.sort((a, b) => b.length - a.length);
  
  if (jsonBlocks.length > 0) {
    const largestBlock = jsonBlocks[0];
    console.log("Largest block length:", largestBlock.length);
    try {
      JSON.parse(largestBlock);
      console.log("Largest block parsed successfully!");
    } catch (err) {
      console.error("JSON parse error on largest block:", err.message);
      
      const posMatch = err.message.match(/position (\d+)/);
      if (posMatch) {
          const pos = parseInt(posMatch[1]);
          const start = Math.max(0, pos - 50);
          const end = Math.min(largestBlock.length, pos + 50);
          console.log("Error around: \n", largestBlock.substring(start, end));
          console.log("\n^^^ Syntax error is here ^^^");
      }
    }
  }
} else {
  console.log("Could not extract content from log");
}
