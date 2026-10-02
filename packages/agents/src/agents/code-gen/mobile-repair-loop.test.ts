import { describe, expect, it, vi } from "vitest";
import { runMobileRepairLoop, type MobileRepairLoopOptions } from "./mobile-repair-loop.js";

const passed = { success: true, message: "Analysis, tests, build and device launch passed." };
const failed = { success: false, message: "Gradle build failed." };
function fixture(inputs: Array<string | null>, overrides: Partial<MobileRepairLoopOptions> = {}) {
  return {
    waitForUserInput: vi.fn(async () => inputs.shift()),
    repair: vi.fn(async () => ({ success: true, message: "Applied the requested correction." })),
    retry: vi.fn(async () => passed),
    ...overrides,
  };
}

describe("mobile repair follow-up", () => {
  it("repairs pasted multiline errors and validates before accepting success", async () => {
    const error = "/app/lib/main.dart:17: error\nUndefined class Example";
    const options = fixture([error, "/done"], { initialError: "Original compiler failure." });
    const result = await runMobileRepairLoop(options);
    expect(options.repair).toHaveBeenCalledExactlyOnceWith(error);
    expect(options.retry).toHaveBeenCalledOnce();
    expect(result).toMatchObject({ ...passed, closed: true, reason: "done" });
    expect(result.history.some((entry) => entry.role === "user" && entry.content === error)).toBe(
      true,
    );
  });

  it("does not accept applied repairs when subsequent checks fail", async () => {
    const result = await runMobileRepairLoop(
      fixture(["Launch crashes", "quit"], { retry: vi.fn(async () => failed) }),
    );
    expect(result).toMatchObject({ ...failed, reason: "quit" });
    expect(result.history.at(-1)?.content).toContain("unresolved");
  });

  it("preserves failed state on approve, done and EOF without automatic retry", async () => {
    for (const closing of ["/done", null, ""]) {
      const options = fixture(["approved", closing], { initialError: "No connected device." });
      expect(await runMobileRepairLoop(options)).toMatchObject({
        success: false,
        message: "No connected device.",
      });
      expect(options.repair).not.toHaveBeenCalled();
      expect(options.retry).not.toHaveBeenCalled();
    }
  });

  it("retries local checks when requested and preserves a successful state on exit", async () => {
    const options = fixture(["/retry", "quit"], { initialResult: failed });
    expect(await runMobileRepairLoop(options)).toMatchObject({ ...passed, reason: "quit" });
    expect(options.retry).toHaveBeenCalledOnce();
    expect(options.repair).not.toHaveBeenCalled();
  });

  it("invalidates a previous successful launch when a new error cannot be repaired", async () => {
    const options = fixture(["Login crashes", "quit"], {
      initialResult: passed,
      repair: vi.fn(async () => {
        throw new Error("Provider unavailable");
      }),
    });
    const result = await runMobileRepairLoop(options);
    expect(result.success).toBe(false);
    expect(result.message).toContain("Provider unavailable");
    expect(options.retry).not.toHaveBeenCalled();
  });

  it("handles validation exceptions and can recover on a later retry", async () => {
    const retry = vi
      .fn()
      .mockRejectedValueOnce(new Error("Device disconnected"))
      .mockResolvedValueOnce(passed);
    const result = await runMobileRepairLoop(fixture(["/retry", "/retry", "/done"], { retry }));
    expect(result.success).toBe(true);
    expect(result.history.some((entry) => entry.content.includes("Device disconnected"))).toBe(
      true,
    );
  });

  it("closes once on empty input or an input exception and snapshots history safely", async () => {
    const onHistory = vi.fn(async (history) => {
      history[0].content = "external mutation";
    });
    const options = fixture([], { onHistory, initialResult: passed });
    const result = await runMobileRepairLoop(options);
    expect(result.reason).toBe("eof");
    expect(result.history[0]?.content).not.toBe("external mutation");
    expect(options.waitForUserInput).toHaveBeenCalledOnce();
    expect(
      await runMobileRepairLoop(
        fixture([], {
          waitForUserInput: async () => {
            throw new Error("Input closed");
          },
        }),
      ),
    ).toMatchObject({ reason: "eof", success: false });
  });
});

it("finishes automatically after recovery without another user prompt", async () => {
  const options = fixture(["/retry"], { initialResult: failed, stopOnSuccess: true });
  expect(await runMobileRepairLoop(options)).toMatchObject({ success: true, reason: "recovered" });
  expect(options.waitForUserInput).toHaveBeenCalledTimes(1);
});
