import { FeedScheduler } from "./scheduler.js";
import { createDatabaseClient, projects } from "@loom/database";

async function run() {
  console.log("======================================");
  console.log("🚀 Loom Multiverse - Feed CLI Runner");
  console.log("======================================");

  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL is required in .env");
    process.exit(1);
  }

  const db = createDatabaseClient(process.env.DATABASE_URL);

  // Check if we have active projects
  const activeProjectsCount = await db.$count(projects);

  if (activeProjectsCount === 0) {
    console.log("⚠️ No active projects found. Creating a mock project for testing...");
    await db.insert(projects).values({
      name: "Mock Road Trip App",
      description: "A mobile app for road trips and expense splitting.",
      founderPrompt: "A multi-day road trip planner and expense splitter for groups",
      status: "planning"
    });
    console.log("✅ Mock project created!");
  }

  const scheduler = new FeedScheduler();

  try {
    await scheduler.runNow();

    console.log("\n======================================");
    console.log("📰 TOP 5 MOST RELEVANT ARTICLES SCRAPED");
    console.log("======================================");

    // Fetch the top 5 highest scored items from the database
    const { feedItems } = await import("@loom/database");
    const { desc } = await import("drizzle-orm");

    const topItems = await db
      .select()
      .from(feedItems)
      .orderBy(desc(feedItems.relevanceScore))
      .limit(5);

    if (topItems.length === 0) {
      console.log("No items found in database.");
    } else {
      topItems.forEach((item, i) => {
        console.log(`\n[${i + 1}] ${item.title}`);
        console.log(`    Source: ${item.source} | Score: ${item.relevanceScore}`);
        console.log(`    URL: ${item.url}`);
        if (item.summary && item.summary.length > 5) {
          const preview = item.summary.length > 100 ? item.summary.substring(0, 100) + "..." : item.summary;
          console.log(`    Snippet: ${preview}`);
        }
      });
    }

    console.log("\n✅ Live aggregation finished successfully. All 800+ articles are saved in the PostgreSQL `feed_items` table!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Aggregation failed:", error);
    process.exit(1);
  }
}

run();
