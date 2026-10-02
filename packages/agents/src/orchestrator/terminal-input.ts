import readline from "node:readline";
import type { Readable, Writable } from "node:stream";

/** Keep one listener alive so pasted lines are not lost between asynchronous agent turns. */
export function terminalInput(input: Readable, output: Writable) {
  const rl = readline.createInterface({ input, output });
  const lines: string[] = [];
  let pending: ((line: string | undefined) => void) | undefined;
  let closed = false;
  rl.on("line", (line) => {
    if (pending) {
      const resolve = pending;
      pending = undefined;
      resolve(line);
    } else lines.push(line);
  });
  rl.on("close", () => {
    closed = true;
    pending?.(undefined);
    pending = undefined;
  });
  const next = async (): Promise<string | undefined> =>
    lines.length
      ? lines.shift()
      : closed
        ? undefined
        : new Promise((resolve) => {
            pending = resolve;
          });
  return {
    close: () => rl.close(),
    read: async (): Promise<string> => {
      output.write("\nYou: ");
      const first = await next();
      if (first?.trim() !== "/paste") return first?.trim() ?? "";
      output.write("Paste the error, then put /end on its own line.\n");
      const block: string[] = [];
      while (true) {
        const line = await next();
        if (line === undefined || line.trim() === "/end") break;
        block.push(line);
      }
      return block.join("\n").trim();
    },
  };
}
