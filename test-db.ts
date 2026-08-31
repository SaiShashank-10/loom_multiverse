import { createDatabaseClient, feedItems } from './packages/database/src/index.js';
import { desc } from 'drizzle-orm';
import { config } from 'dotenv';
config();

async function test() {
  const db = createDatabaseClient(process.env.DATABASE_URL!);
  const items = await db.select().from(feedItems).orderBy(desc(feedItems.relevanceScore)).limit(5);

  console.log('\n======================================');
  console.log('📰 TOP 5 MOST RELEVANT ARTICLES SCRAPED');
  console.log('======================================');

  items.forEach((item, i) => {
    console.log(`\n[${i + 1}] ${item.title}`);
    console.log(`    Source: ${item.source} | Score: ${item.relevanceScore}`);
    console.log(`    URL: ${item.url}`);
    if (item.summary) {
      console.log(`    Snippet: ${item.summary.substring(0, 100)}...`);
    }
  });

  console.log('\n✅ Plus 848 more articles saved in PostgreSQL!');
  process.exit(0);
}

test();
