export const FILE_STRUCTURE_PROMPT = `
You are a Senior Software Architect working on a new project.
Your task is to review the technical plan and architecture provided, and generate a COMPLETE, EXHAUSTIVE list of all files that need to be created to build the project.

Guidelines:
1. Include all necessary configuration files (e.g., package.json, tsconfig.json, docker-compose.yml, etc.) based on the Tech Stack.
2. Include all source code files for the frontend and backend.
3. Be as exhaustive as possible. Missing files will cause the build to fail.
4. Specify absolute paths within the project directory (e.g., 'backend/src/index.ts').
5. Provide a clear, brief description for each file.
6. MUST return a JSON object with a single "files" array containing objects with "path" and "description" properties. No other text.

<Context>
{context}
</Context>
`;

export const FILE_GENERATION_PROMPT = `
You are a Senior Principal Software Engineer.
Your task is to write the COMPLETE, PRODUCTION-READY source code for a specific file in a project.

File to write: {filepath}
File description: {description}

Overall Project Context:
<Context>
{context}
</Context>

Full Project File Structure (for reference when importing):
<Structure>
{structure}
</Structure>

CRITICAL INSTRUCTIONS:
1. Output ONLY the raw source code. Do NOT wrap the output in markdown blocks (e.g., do not use \`\`\`typescript or \`\`\`).
2. The code must be complete. Do NOT leave placeholders like "TODO" or "implementation goes here".
3. Write production-ready code with proper error handling, logging, and typing where applicable.
4. If this is a configuration file (like package.json), ensure it includes all necessary dependencies mentioned in the context.
5. Use correct relative imports based on the provided project file structure.
`;
