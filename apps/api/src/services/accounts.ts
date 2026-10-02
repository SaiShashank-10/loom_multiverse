import { randomBytes, createHash, scrypt, timingSafeEqual } from "node:crypto";
import { createDatabaseClient, users, sessions, projects } from "@loom/database";
import { config } from "@loom/shared/config";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { savedProject } from "./saved-projects.js";

export const accountDb = createDatabaseClient(config.DATABASE_URL);
export type Account = {
  id: string;
  email: string;
  name: string;
  workspaceOwner: boolean;
  createdAt: Date;
};
const publicFields = {
  id: users.id,
  email: users.email,
  name: users.name,
  workspaceOwner: users.workspaceOwner,
  createdAt: users.createdAt,
};
export const sessionCookie = "loom_session";
export const sessionSeconds = 60 * 60 * 24 * 7;
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const derive = (password: string, salt: string) =>
  new Promise<Buffer>((resolve, reject) => {
    scrypt(
      password,
      salt,
      64,
      { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${(await derive(password, salt)).toString("hex")}`;
}
export async function verifyPassword(password: string, encoded: string) {
  const [algorithm, salt, key] = encoded.split(":");
  if (algorithm !== "scrypt" || !salt || !key || !/^[a-f0-9]{128}$/.test(key)) return false;
  return timingSafeEqual(await derive(password, salt), Buffer.from(key, "hex"));
}
export async function registerAccount(name: string, email: string, password: string) {
  const passwordHash = await hashPassword(password);
  return accountDb.transaction(async (tx) => {
    // Serialize first-user ownership and duplicate registrations across processes.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(16420381)`);
    if (
      (await tx.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)).length
    )
      return null;
    const first = !(
      await tx.select({ id: users.id }).from(users).where(eq(users.workspaceOwner, true)).limit(1)
    ).length;
    const [user] = await tx
      .insert(users)
      .values({ name, email, passwordHash, workspaceOwner: first })
      .returning(publicFields);
    if (first) await tx.update(projects).set({ ownerId: user!.id }).where(isNull(projects.ownerId));
    return user!;
  });
}
export async function authenticate(email: string, password: string) {
  const [row] = await accountDb.select().from(users).where(eq(users.email, email)).limit(1);
  // Equal-cost derivation also when the account does not exist.
  const valid = await verifyPassword(
    password,
    row?.passwordHash ?? `scrypt:${"0".repeat(32)}:${"0".repeat(128)}`,
  );
  if (!row || !valid) return null;
  const { passwordHash: _, updatedAt: __, ...user } = row;
  return user;
}
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  await accountDb
    .insert(sessions)
    .values({
      userId,
      tokenHash: digest(token),
      expiresAt: new Date(Date.now() + sessionSeconds * 1000),
    });
  return token;
}
export async function sessionAccount(token?: string): Promise<Account | null> {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const [user] = await accountDb
    .select(publicFields)
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, digest(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return user ?? null;
}
export async function revokeSession(token?: string) {
  if (token) await accountDb.delete(sessions).where(eq(sessions.tokenHash, digest(token)));
}
export async function canAccessProject(user: Account, id: string) {
  const [project] = await accountDb
    .select({ ownerId: projects.ownerId })
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);
  if (project) return project.ownerId === user.id;
  return user.workspaceOwner && Boolean(await savedProject(id));
}
export function cookieToken(cookie?: string) {
  return cookie
    ?.split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(`${sessionCookie}=`))
    ?.slice(sessionCookie.length + 1);
}
