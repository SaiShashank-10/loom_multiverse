import { createDatabaseClient } from "./packages/database/src/client.js";
import { sql } from "drizzle-orm";

async function run() {
  const db = createDatabaseClient("postgresql://loom:loom_secret@127.0.0.1:5432/loom_multiverse");
  
  try {
    const res = await db.execute(sql`SELECT extname FROM pg_extension`);
    console.log("Extensions:", res);
    
    // Also try to insert without vector cast
    await db.execute(sql`INSERT INTO memory (project_id, namespace, content) VALUES (gen_random_uuid(), 'test', 'test')`);
    console.log("Insert ok");
    
    // Also try the vector cast
    await db.execute(sql`INSERT INTO memory (project_id, namespace, content, embedding) VALUES (gen_random_uuid(), 'test', 'test', '[0.1, 0.2]'::vector(2))`);
    console.log("Vector insert ok");
  } catch(e) {
    console.error("Failed:", e);
  }
  process.exit(0);
}
run();
