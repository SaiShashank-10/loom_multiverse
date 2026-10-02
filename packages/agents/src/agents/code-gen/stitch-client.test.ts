import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
  listTools: vi.fn(),
  callToolJson: vi.fn(),
  constructor: vi.fn(),
}));
vi.mock("@loom/mcp-core", () => ({
  McpClient: class {
    isConnected = false;
    constructor(config: unknown) {
      mocks.constructor(config);
    }
    connect = mocks.connect;
    disconnect = mocks.disconnect;
    listTools = mocks.listTools;
    callToolJson = mocks.callToolJson;
  },
}));
import { StitchClient } from "./stitch-client.js";
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("STITCH_API_KEY", "test-key");
  mocks.listTools.mockResolvedValue(
    [
      "create_project",
      "get_project",
      "list_screens",
      "generate_screen_from_text",
      "edit_screens",
    ].map((name) => ({
      name,
    })),
  );
});
afterEach(() => vi.unstubAllEnvs());
describe("real Stitch integration", () => {
  it("requires credentials instead of silently launching a mock", async () => {
    vi.stubEnv("STITCH_API_KEY", "");
    await expect(new StitchClient().connect()).rejects.toThrow("STITCH_API_KEY");
    expect(mocks.constructor).not.toHaveBeenCalled();
  });
  it("connects using authenticated HTTP and refuses mock project IDs", async () => {
    const client = new StitchClient();
    await client.connect();
    expect(mocks.constructor).toHaveBeenCalledWith(
      expect.objectContaining({
        transport: "streamable-http",
        serverUrl: "https://stitch.googleapis.com/mcp",
      }),
    );
    mocks.callToolJson.mockResolvedValueOnce({ projectId: "stitch-mock-123" });
    await expect(client.createProject("Test", "")).rejects.toThrow("invalid project ID");
  });
  it("uses real resource identifiers and camelCase tool arguments", async () => {
    const client = new StitchClient();
    await client.connect();
    mocks.callToolJson
      .mockResolvedValueOnce({ name: "projects/123" })
      .mockResolvedValueOnce({ name: "projects/123" });
    expect(await client.createProject("Test", "")).toEqual({
      projectId: "123",
      url: "https://stitch.withgoogle.com/projects/123",
    });
    await client.createDesignSystem("123", "teal");
    await client.generateScreens("123", "Budget", "MOBILE");
    expect(mocks.callToolJson).toHaveBeenLastCalledWith("generate_screen_from_text", {
      projectId: "123",
      deviceType: "MOBILE",
      prompt: expect.stringContaining("teal"),
    });
    await client.refineScreen("123", "456", "Dark theme");
    expect(mocks.callToolJson).toHaveBeenLastCalledWith("edit_screens", {
      projectId: "123",
      selectedScreenIds: ["456"],
      prompt: "Dark theme",
    });
    await client.disconnect();
    expect(mocks.disconnect).toHaveBeenCalled();
  });
  it("sends an explicit desktop target instead of relying on Stitch's default", async () => {
    const client = new StitchClient();
    await client.connect();
    await client.generateScreens("123", "Responsive dashboard", "DESKTOP");
    expect(mocks.callToolJson).toHaveBeenCalledWith("generate_screen_from_text", {
      projectId: "123", deviceType: "DESKTOP", prompt: expect.stringContaining("Responsive dashboard"),
    });
  });
});
