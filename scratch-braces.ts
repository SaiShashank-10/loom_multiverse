import * as fs from 'fs';

const logFile = fs.readFileSync('C:/Users/SAI SHASHANK/.gemini/antigravity-ide/brain/4d79d207-f5cc-4c51-82a0-602c2e3dd67a/.system_generated/tasks/task-297.log', 'utf-8');
const match = logFile.match(/content: "(.*?)"\n\[/s);
if (match && match[1]) {
  const rawContent = match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
  
  let left = 0;
  let right = 0;
  for (const char of rawContent) {
     if (char === '{') left++;
     if (char === '}') right++;
  }
  console.log(`Left braces: ${left}, Right braces: ${right}`);
}
