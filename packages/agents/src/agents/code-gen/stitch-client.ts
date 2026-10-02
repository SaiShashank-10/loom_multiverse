import { McpClient } from "@loom/mcp-core";

/** Real Google Stitch only. Mock fixtures must never produce public design links. */
export class StitchClient {
  private client: McpClient | null = null;
  private design = new Map<string, string>();

  async connect(): Promise<void> {
    if (this.client?.isConnected) return;
    const key = process.env.STITCH_API_KEY?.trim();
    if (!key)
      throw new Error(
        "Stitch unavailable: set STITCH_API_KEY in .env using Stitch Settings > API Keys. No live designs were created.",
      );
    this.client = new McpClient({
      serverName: "stitch",
      transport: "streamable-http",
      serverUrl: "https://stitch.googleapis.com/mcp",
      headers: { "X-Goog-Api-Key": key },
      timeoutMs: 600_000,
      maxRetries: 3,
    });
    await this.client.connect();
    const tools = await this.client.listTools();
    for (const name of [
      "create_project",
      "get_project",
      "list_screens",
      "generate_screen_from_text",
      "edit_screens",
    ]) {
      if (!tools.some((t) => t.name === name))
        throw new Error(`Stitch is missing required tool ${name}`);
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client?.disconnect();
    } finally {
      this.client = null;
      this.design.clear();
    }
  }

  private async call(name: string, args: Record<string, unknown>): Promise<any> {
    if (!this.client) throw new Error("Stitch is not connected");
    return this.client.callToolJson(name, args);
  }

  async createProject(
    title: string,
    _description: string,
  ): Promise<{ projectId: string; url: string }> {
    const result = await this.call("create_project", { title });
    const project = result.project ?? result;
    const id = String(project.name ?? project.projectId ?? project.id ?? "").replace(
      /^projects\//,
      "",
    );
    if (!/^\d+$/.test(id))
      throw new Error("Stitch returned an invalid project ID; no live URL can be provided.");
    await this.call("get_project", { name: `projects/${id}` });
    return { projectId: id, url: `https://stitch.withgoogle.com/projects/${id}` };
  }

  async openProject(projectId: string): Promise<{ projectId: string; url: string }> {
    if (!/^\d+$/.test(projectId)) throw new Error("Invalid saved Stitch project ID");
    await this.call("get_project", { name: `projects/${projectId}` });
    return { projectId, url: `https://stitch.withgoogle.com/projects/${projectId}` };
  }

  // Include approved tokens in each generation prompt; do not assume a nonstandard MCP tool exists.
  async createDesignSystem(projectId: string, markdown: string): Promise<void> {
    this.design.set(projectId, markdown);
  }

  async generateScreens(projectId: string, prompt: string, deviceType: "MOBILE" | "DESKTOP"): Promise<any> {
    return this.call("generate_screen_from_text", {
      projectId,
      deviceType,
      prompt: `${prompt}\n\nApproved design requirements:\n${this.design.get(projectId) ?? ""}`,
    });
  }

  async refineScreen(projectId: string, screenId: string, prompt: string): Promise<any> {
    return this.call("edit_screens", { projectId, selectedScreenIds: [screenId], prompt });
  }

  async listScreens(projectId: string): Promise<any[]> {
    const result = await this.call("list_screens", { projectId });
    // Protobuf JSON omits empty repeated fields on a newly created project.
    if (result.screens === undefined) return [];
    if (!Array.isArray(result.screens)) throw new Error("Stitch did not return a screens array");
    return result.screens.map((screen: any) => ({
      ...screen,
      id: String(screen.id ?? screen.name ?? "")
        .split("/")
        .pop(),
    }));
  }

  async getScreen(projectId: string, screenId: string): Promise<any> {
    return this.call("get_screen", {
      name: `projects/${projectId}/screens/${screenId}`,
      projectId,
      screenId,
    });
  }
}
