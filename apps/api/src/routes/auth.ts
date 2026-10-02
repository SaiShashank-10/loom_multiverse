import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { bodyLimit } from "hono/body-limit";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { users, sessions } from "@loom/database";
import { config } from "@loom/shared/config";
import {
  accountDb,
  authenticate,
  registerAccount,
  createSession,
  sessionAccount,
  revokeSession,
  sessionCookie,
  sessionSeconds,
  hashPassword,
  verifyPassword,
  type Account,
} from "../services/accounts.js";

export type AuthEnv = { Variables: { user: Account } };
export const authRouter = new Hono<AuthEnv>();
authRouter.use("*", bodyLimit({ maxSize: 16384 }));
const password = z.string().min(12, "Use at least 12 characters").max(128);
const email = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((v) => v.toLowerCase());
const attempts = new Map<string, { count: number; until: number }>();
authRouter.use("*", async (c, next) => {
  if (c.req.method !== "GET") {
    // The API binds to loopback: use one bounded local budget rather than trusting forwarded IPs.
    const key = "local-auth";
    const now = Date.now();
    const old = attempts.get(key);
    const bucket = old && old.until > now ? old : { count: 0, until: now + 60_000 };
    if (++bucket.count > 20)
      return c.json(
        {
          success: false,
          error: { message: "Too many authentication attempts. Try again in one minute." },
        },
        429,
      );
    attempts.set(key, bucket);
  }
  c.header("Cache-Control", "no-store");
  return next();
});
const options = {
  httpOnly: true,
  sameSite: "Strict" as const,
  path: "/",
  secure: config.NODE_ENV === "production",
  maxAge: sessionSeconds,
};
authRouter.get("/status", async (c) =>
  c.json({
    success: true,
    data: {
      setupRequired: !(await accountDb.select({ id: users.id }).from(users).limit(1)).length,
    },
  }),
);
authRouter.get("/me", async (c) => {
  const user = await sessionAccount(getCookie(c, sessionCookie));
  return user
    ? c.json({ success: true, data: user })
    : c.json({ success: false, error: { message: "Please sign in to your workspace." } }, 401);
});
authRouter.post(
  "/register",
  zValidator("json", z.object({ name: z.string().trim().min(1).max(80), email, password })),
  async (c) => {
    const body = c.req.valid("json");
    const user = await registerAccount(body.name, body.email, body.password);
    if (!user)
      return c.json(
        {
          success: false,
          error: { message: "An account with that email already exists. Sign in instead." },
        },
        409,
      );
    await revokeSession(getCookie(c, sessionCookie));
    setCookie(c, sessionCookie, await createSession(user.id), options);
    return c.json({ success: true, data: user }, 201);
  },
);
authRouter.post(
  "/login",
  zValidator("json", z.object({ email, password: z.string().min(1).max(128) })),
  async (c) => {
    const body = c.req.valid("json");
    const user = await authenticate(body.email, body.password);
    if (!user)
      return c.json({ success: false, error: { message: "Email or password is incorrect." } }, 401);
    await revokeSession(getCookie(c, sessionCookie));
    setCookie(c, sessionCookie, await createSession(user.id), options);
    return c.json({ success: true, data: user });
  },
);
authRouter.post("/logout", async (c) => {
  await revokeSession(getCookie(c, sessionCookie));
  deleteCookie(c, sessionCookie, { path: "/" });
  return c.json({ success: true, data: { signedOut: true } });
});
authRouter.patch(
  "/profile",
  zValidator("json", z.object({ name: z.string().trim().min(1).max(80) })),
  async (c) => {
    const user = await sessionAccount(getCookie(c, sessionCookie));
    if (!user) return c.json({ success: false, error: { message: "Please sign in." } }, 401);
    const name = c.req.valid("json").name;
    await accountDb.update(users).set({ name, updatedAt: new Date() }).where(eq(users.id, user.id));
    return c.json({ success: true, data: { ...user, name } });
  },
);
authRouter.post(
  "/password",
  zValidator(
    "json",
    z.object({ currentPassword: z.string().min(1).max(128), newPassword: password }),
  ),
  async (c) => {
    const user = await sessionAccount(getCookie(c, sessionCookie));
    if (!user) return c.json({ success: false, error: { message: "Please sign in." } }, 401);
    const [row] = await accountDb.select().from(users).where(eq(users.id, user.id)).limit(1);
    const body = c.req.valid("json");
    if (!row || !(await verifyPassword(body.currentPassword, row.passwordHash)))
      return c.json({ success: false, error: { message: "Current password is incorrect." } }, 400);
    const passwordHash = await hashPassword(body.newPassword);
    await accountDb.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ passwordHash, updatedAt: new Date() })
        .where(eq(users.id, user.id));
      await tx.delete(sessions).where(eq(sessions.userId, user.id));
    });
    setCookie(c, sessionCookie, await createSession(user.id), options);
    return c.json({ success: true, data: { changed: true } });
  },
);
