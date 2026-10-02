export interface Project {
  id: string;
  name: string;
  description: string;
  founderPrompt: string;
  status: string;
  techStack?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  deployedUrl?: string;
  repositoryUrl?: string;
}
export interface StudioEvent {
  id: string;
  type: string;
  at: string;
  data: { phase?: string; message?: string; error?: string };
}
export interface PipelineState {
  projectId: string;
  phase: string;
  status: string;
  waiting: boolean;
  events: StudioEvent[];
}
export interface Design {
  id: string;
  title: string;
  device: string;
  screenshotUrl?: string;
}
export interface FeedItem {
  id: string;
  title: string;
  url: string;
  summary?: string;
  source: string;
  publishedAt: string;
}
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...init,
      credentials: "same-origin",
      headers: {
        ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...init?.headers,
      },
      signal: init?.signal ?? AbortSignal.timeout(20000),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new Error(
      "LOOM couldn’t reach its server. Check that the API is running, then try again.",
    );
  }
  const body = await response.json().catch(() => null);
  if(response.status===401 && !path.startsWith("/auth/")) window.dispatchEvent(new Event("loom:session-expired"));
  if (!response.ok || !body?.success)
    throw new Error(
      body?.error?.message ??
        body?.error?.issues?.[0]?.message ??
        `The request couldn’t be completed (${response.status}). Please try again.`,
    );
  return body.data;
}
export const api = {
  projects: () => request<Project[]>("/projects"),
  project: (id: string) => request<Project>(`/projects/${id}`),
  create: (name: string, idea: string) =>
    request<Project>("/projects", {
      method: "POST",
      body: JSON.stringify({ name, description: idea, founderPrompt: idea }),
    }),
  state: (id: string) => request<PipelineState>(`/pipeline/${id}/state`),
  start: (id: string, resume = false) =>
    request(`/pipeline/${id}/${resume ? "resume" : "start"}`, { method: "POST" }),
  reply: (id: string, message: string) =>
    request(`/pipeline/${id}/message`, { method: "POST", body: JSON.stringify({ message }) }),
  files: (id: string) => request<string[]>(`/projects/${id}/files`),
  file: (id: string, file: string) =>
    request<{ path: string; content: string }>(
      `/projects/${id}/file?path=${encodeURIComponent(file)}`,
    ),
  designs: (id: string) => request<{ screens: Design[]; url?: string }>(`/projects/${id}/designs`),
  feed: (id: string) => request<FeedItem[]>(`/feed/${id}`),
  upload: (id: string, file: File) => {
    const body = new FormData();
    body.set("file", file);
    return request(`/projects/${id}/documents`, { method: "POST", body });
  },
};
export const phaseLabel = (s: string) =>
  ({
    idea_check: "Idea validation",
    planning: "Planning",
    stitch: "Design",
    code_gen: "Building",
    document_ingestion: "Reading documents",
    completed: "Completed",
    draft: "Draft",
    failed: "Needs attention",
    paused: "Paused",
    running: "In progress",
    idle: "Ready to begin",
  })[s] ?? s.replaceAll("_", " ");
export const safeLink = (url?: string) => {
  try {
    const u = new URL(url ?? "");
    return ["http:", "https:"].includes(u.protocol) ? u.href : undefined;
  } catch {
    return undefined;
  }
};
