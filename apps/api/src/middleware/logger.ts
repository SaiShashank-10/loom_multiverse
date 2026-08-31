import { Context, Next } from "hono";
import { createLogger } from "@loom/shared/logger";

const log = createLogger("api-request");

export const requestLogger = async (c: Context, next: Next) => {
  const start = Date.now();
  const { method, url } = c.req;
  
  await next();
  
  const duration = Date.now() - start;
  const status = c.res.status;

  if (status >= 500) {
    log.error({ method, url, status, duration }, "Request failed with server error");
  } else if (status >= 400) {
    log.warn({ method, url, status, duration }, "Request failed with client error");
  } else {
    log.info({ method, url, status, duration }, "Request processed successfully");
  }
};
