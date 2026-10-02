import { expect, it, vi, afterEach } from "vitest";
import { request, safeLink } from "./api";
afterEach(() => vi.unstubAllGlobals());
it("shows backend validation errors without accepting a failed operation", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            success: false,
            error: { message: "The agent is not waiting for a reply" },
          }),
          { status: 409 },
        ),
    ),
  );
  await expect(request("/pipeline/test/message")).rejects.toThrow("not waiting");
});
it("explains a disconnected server and handles non-JSON proxy errors", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new TypeError("fetch failed");
    }),
  );
  await expect(request("/health")).rejects.toThrow("couldn’t reach its server");
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("Bad Gateway", { status: 502 })),
  );
  await expect(request("/health")).rejects.toThrow("502");
});
it("does not put JSON headers on a document upload, and only opens ordinary web links", async () => {
  const mock = vi
    .fn<typeof fetch>()
    .mockImplementation(
      async () => new Response(JSON.stringify({ success: true, data: { name: "brief.md" } })),
    );
  vi.stubGlobal("fetch", mock);
  await request("/projects/id/documents", { method: "POST", body: new FormData() });
  expect(mock.mock.calls[0]?.[1]?.headers).not.toHaveProperty("Content-Type");
  expect(safeLink("javascript:alert(1)")).toBeUndefined();
  expect(safeLink("https://stitch.withgoogle.com/projects/123")).toBeTruthy();
});
