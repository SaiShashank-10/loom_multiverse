import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import { z } from "zod";
import { sessionAccount, sessionCookie, canAccessProject } from "../services/accounts.js";
import type { AuthEnv } from "../routes/auth.js";
export const requireAccount = createMiddleware<AuthEnv>(async (c, next) => {
  const user = await sessionAccount(getCookie(c, sessionCookie));
  if (!user)
    return c.json({ success: false, error: { message: "Please sign in to your workspace." } }, 401);
  c.set("user", user);
  c.header("Cache-Control", "no-store");
  // Protect all project-scoped APIs, including artifacts, uploads, feed and pipeline replies.
  const id = c.req.path.match(/^\/(?:projects|pipeline|feed)\/([^/]+)/)?.[1];
  if (id && (!z.string().uuid().safeParse(id).success || !(await canAccessProject(user, id))))
    return c.json({ success: false, error: { message: "Project not found" } }, 404);
  return next();
});
