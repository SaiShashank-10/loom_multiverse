/** An outcome must describe observed validation/runtime results, not model confidence. */
export interface MobileRepairOutcome {
  success: boolean;
  message: string;
}

export interface MobileRepairMessage {
  role: "user" | "assistant";
  content: string;
}

export interface MobileRepairLoopOptions {
  stopOnSuccess?: boolean;
  /** Return null/undefined or an empty string on EOF. The CLI owns multiline collection. */
  waitForUserInput: () => Promise<string | null | undefined>;
  onMessage?: (message: string) => void | Promise<void>;
  /** Apply a repair; success here means edits succeeded, not that the app works. */
  repair: (errorText: string) => Promise<MobileRepairOutcome>;
  /** Run validation and launch checks, returning their actual outcome. */
  retry: () => Promise<MobileRepairOutcome>;
  initialResult?: MobileRepairOutcome;
  /** An exhausted automatic repair is displayed here; it is not automatically repeated. */
  initialError?: string;
  onHistory?: (history: MobileRepairMessage[]) => void | Promise<void>;
}

export interface MobileRepairLoopResult extends MobileRepairOutcome {
  closed: true;
  reason: "done" | "quit" | "eof" | "recovered";
  history: MobileRepairMessage[];
}

/**
 * Interactive follow-up after automatic mobile generation/repair. Approval cannot
 * bypass validation. New user errors invalidate a previous success until a fresh
 * retry succeeds. Quitting never converts an unresolved failure into success.
 */
export async function runMobileRepairLoop(
  options: MobileRepairLoopOptions,
): Promise<MobileRepairLoopResult> {
  const history: MobileRepairMessage[] = [];
  let outcome: MobileRepairOutcome = options.initialError
    ? { success: false, message: options.initialError }
    : (options.initialResult ?? {
        success: false,
        message: "The app has not yet passed local validation and launch checks.",
      });

  const append = async (role: MobileRepairMessage["role"], content: string) => {
    history.push({ role, content });
    await options.onHistory?.(history.map((entry) => ({ ...entry })));
    if (role === "assistant") await options.onMessage?.(content);
  };
  const execute = async (operation: () => Promise<MobileRepairOutcome>, label: string) => {
    try {
      const result = await operation();
      if (!result || typeof result.success !== "boolean" || typeof result.message !== "string") {
        throw new Error("The operation returned no valid success status and message.");
      }
      return result;
    } catch (error) {
      return {
        success: false,
        message: `${label} failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  };
  const close = async (
    reason: MobileRepairLoopResult["reason"],
  ): Promise<MobileRepairLoopResult> => {
    await append(
      "assistant",
      outcome.success
        ? `Repair session closed. Last local checks passed: ${outcome.message}`
        : `Repair session closed with an unresolved issue: ${outcome.message}`,
    );
    return { ...outcome, closed: true, reason, history: history.map((entry) => ({ ...entry })) };
  };

  await append(
    "assistant",
    `${outcome.success ? "Local checks passed" : "Local checks have not passed"}: ${outcome.message}\nPaste an app error to repair it, use /retry to rerun local checks, or /done (quit) to close this session.`,
  );
  while (true) {
    if (options.stopOnSuccess && outcome.success) return close("recovered");
    let input: string | null | undefined;
    try {
      input = await options.waitForUserInput();
    } catch (error) {
      await append(
        "assistant",
        `Input ended: ${error instanceof Error ? error.message : String(error)}`,
      );
      return close("eof");
    }
    if (!input?.trim()) return close("eof");
    const text = input.trim();
    await append("user", text);
    const command = text.toLowerCase();
    if (command === "/done" || command === "done") return close("done");
    if (command === "quit" || command === "/quit" || command === "exit" || command === "/exit")
      return close("quit");
    if (command === "approve" || command === "approved" || command === "/approve") {
      await append(
        "assistant",
        "Approval does not run or bypass app checks. Paste the error to repair it, use /retry to validate and launch, or /done to close.",
      );
      continue;
    }
    if (command === "/retry" || command === "retry") {
      outcome = await execute(options.retry, "Local validation and launch");
      await append(
        "assistant",
        `${outcome.success ? "Local checks passed" : "Local checks failed"}: ${outcome.message}`,
      );
      continue;
    }
    if (/^\/[a-z]+$/.test(command)) {
      await append(
        "assistant",
        "Unknown command. Use /retry, /done, or paste the error text without a command prefix.",
      );
      continue;
    }
    outcome = { success: false, message: text };
    await append(
      "assistant",
      "Repairing the reported error. Local checks will run again after the repair.",
    );
    const repair = await execute(() => options.repair(text), "Repair");
    await append("assistant", repair.message);
    outcome = repair.success ? await execute(options.retry, "Local validation and launch") : repair;
    await append(
      "assistant",
      `${outcome.success ? "Local checks passed" : "Issue remains unresolved"}: ${outcome.message}`,
    );
  }
}
