import { createDatabaseClient, feedItems, projects } from './packages/database/src/index.js';
import { config } from 'dotenv';
config();

async function clean() {
  const db = createDatabaseClient(process.env.DATABASE_URL!);
  await db.delete(feedItems);
  await db.delete(projects);
  console.log('✅ Successfully cleaned old data!');
  process.exit(0);
}

clean();
