import { z } from "zod";

const StitchResult = z.object({
  status: z.enum(["approved", "completed", "not_applicable"]),
  screens: z.array(z.record(z.unknown())),
  url: z.string().url().optional(),
  projectId: z.string().optional(),
});

export function requireStitchResult(payload: Record<string, unknown>, interactive: boolean) {
  const result = StitchResult.safeParse(payload.stitch);
  if (!result.success)
    throw new Error("Code generation is blocked: Google Stitch must complete successfully first.");
  const stitch = result.data;
  if (stitch.status === "not_applicable") {
    if ((payload.technicalPlan as { hasFrontend?: boolean })?.hasFrontend !== false)
      throw new Error("Stitch may only be not applicable for an approved plan without a UI");
  } else {
    if (!stitch.screens.length || !stitch.url || !stitch.projectId)
      throw new Error("Code generation is blocked: Stitch design artifacts are missing");
    if (interactive && stitch.status !== "approved")
      throw new Error("Code generation is blocked: Stitch designs need user approval");
  }
  return stitch;
}
