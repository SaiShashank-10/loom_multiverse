import { requiredFramework } from "./validation.js";

export interface ProjectTarget {
  framework: "flutter" | "react-native" | "web" | "unknown";
  platform: "mobile" | "web" | "none";
  deviceType: "MOBILE" | "DESKTOP";
  evidence: string;
}

/** User requirements take precedence over planning alternatives; backend stacks do not select the UI. */
export function resolveProjectTarget(requirements: string, technicalPlan?: unknown): ProjectTarget {
  const plan =
    technicalPlan && typeof technicalPlan === "object"
      ? (technicalPlan as Record<string, unknown>)
      : {};
  const clean = (value: string) =>
    value.replace(
      /\b(?:not|never|without|rather than|instead of)\s+(?:a\s+)?(?:flutter|react[ -]native|mobile(?: application| app)?|web(?:site| app)?)\b/gi,
      "",
    );
  const explicit = clean(requirements);
  const fallback = clean(JSON.stringify(plan));
  const chosen =
    requiredFramework(explicit.replace(/react-native/gi, "react native")) ??
    requiredFramework(fallback.replace(/react-native/gi, "react native"));
  const web =
    /\b(?:website|web[ -](?:based|app(?:lication)?|platform)|browser[ -]based|desktop website)\b/i.test(
      explicit,
    );
  const mobile =
    /\b(?:mobile[ -](?:app(?:lication)?|based)|android app|ios app|smartphone app)\b/i.test(
      explicit,
    );
  const explicitFramework = requiredFramework(explicit.replace(/react-native/gi, "react native"));
  let framework: ProjectTarget["framework"] =
    chosen === "flutter"
      ? "flutter"
      : chosen === "react native" || /\bexpo\b/i.test(explicit)
        ? "react-native"
        : ["react", "next.js", "nextjs", "vue", "vue.js", "angular", "svelte"].includes(
              chosen ?? "",
            )
          ? "web"
          : "unknown";
  if (web && !mobile && !explicitFramework) framework = "web";
  if (mobile && (framework === "unknown" || (!explicitFramework && framework === "web")))
    framework = "flutter";
  const platform = mobile
    ? "mobile"
    : web
      ? "web"
      : framework === "flutter" || framework === "react-native"
        ? "mobile"
        : plan.hasFrontend === false
          ? "none"
          : /\b(?:mobile|android|ios)\b/i.test(fallback) && framework !== "web"
            ? "mobile"
            : "web";
  return {
    framework,
    platform,
    deviceType: platform === "mobile" ? "MOBILE" : "DESKTOP",
    evidence: `Approved target: ${platform}; client framework: ${framework}. ${requirements.trim() ? "Explicit user requirements were evaluated before the technical plan." : "Selected from the saved technical plan."}`,
  };
}
