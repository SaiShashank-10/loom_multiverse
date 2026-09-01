import { z } from "zod";

/**
 * Defines the structure of the files required for the project.
 */
export const FileStructureSchema = z.object({
  files: z.array(z.object({
    path: z.string().describe("The absolute path of the file within the project, e.g., 'backend/src/index.ts' or 'frontend/package.json'"),
    description: z.string().describe("A brief description of what this file should contain and its purpose.")
  }))
});

export type FileStructure = z.infer<typeof FileStructureSchema>;

/**
 * Defines the output of a single file's generation.
 */
export const FileContentSchema = z.object({
  path: z.string().describe("The exact path of the file that was generated."),
  content: z.string().describe("The complete, raw source code for the file. NO markdown formatting blocks like ```typescript.")
});

export type FileContent = z.infer<typeof FileContentSchema>;
