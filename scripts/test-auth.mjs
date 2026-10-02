import postgres from "../packages/database/node_modules/postgres/src/index.js";
import { drizzle } from "../packages/database/node_modules/drizzle-orm/postgres-js/index.js";
import { migrate } from "../packages/database/node_modules/drizzle-orm/postgres-js/migrator.js";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const database = `loom_auth_test_${randomBytes(6).toString("hex")}`;
const admin = postgres(process.env.DATABASE_URL, { max: 1 });
let testClient;
let created = false;
try {
  await admin.unsafe(`CREATE DATABASE "${database}"`);
  created = true;
  const url = new URL(process.env.DATABASE_URL);
  url.pathname = `/${database}`;
  testClient = postgres(url.href, { max: 1 });
  await testClient.unsafe("CREATE EXTENSION IF NOT EXISTS vector");
  await migrate(drizzle(testClient), {
    migrationsFolder: path.join(root, "packages/database/migrations"),
  });
  await testClient.end();
  testClient = null;
  const child = spawn(
    process.execPath,
    [
      path.join(root, "apps/api/node_modules/vitest/vitest.mjs"),
      "run",
      "src/routes/auth.integration.test.ts",
    ],
    {
      cwd: path.join(root, "apps/api"),
      stdio: "inherit",
      windowsHide: true,
      env: { ...process.env, DATABASE_URL: url.href, LOOM_AUTH_TEST_DATABASE_URL: url.href },
    },
  );
  process.exitCode = await new Promise((resolve, reject) => {
    child.once("exit", (code) => resolve(code ?? 1));
    child.once("error", reject);
  });
} finally {
  await testClient?.end();
  // Only the random, isolated database created by this invocation is removed.
  if (created && /^loom_auth_test_[a-f0-9]{12}$/.test(database))
    await admin.unsafe(`DROP DATABASE "${database}" WITH (FORCE)`);
  await admin.end();
}
