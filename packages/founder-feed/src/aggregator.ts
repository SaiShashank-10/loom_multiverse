import { createLogger } from "@loom/shared/logger";
import { FEED_SOURCES } from "@loom/shared/constants";
import { FeedScorer } from "./scorer.js";
import { RssAdapter } from "./sources/rss-adapter.js";
import { HackerNewsAdapter } from "./sources/hacker-news.js";
import { ProductHuntAdapter } from "./sources/product-hunt.js";
import type { FeedSource, RawFeedItem } from "./types.js";
import { createDatabaseClient, feedItems } from "@loom/database";

const log = createLogger("feed-aggregator");

export class FeedAggregator {
  private sources: FeedSource[] = [];
  private scorer: FeedScorer;
  private db: ReturnType<typeof createDatabaseClient>;

  constructor() {
    this.scorer = new FeedScorer();
    this.db = createDatabaseClient(process.env.DATABASE_URL!);
    this.registerSources();
  }

  private registerSources() {
    // RSS Sources
    const rssFeeds = [
      FEED_SOURCES.INDIA_TODAY,
      FEED_SOURCES.HINDUSTAN_TIMES,
      FEED_SOURCES.ECONOMIC_TIMES,
      FEED_SOURCES.TELANGANA_TODAY,
      FEED_SOURCES.TECHCRUNCH,
      FEED_SOURCES.MINT,
      FEED_SOURCES.NDTV,
      FEED_SOURCES.THE_HINDU,
    ];

    for (const feed of rssFeeds) {
      if ("rssUrl" in feed) {
        this.sources.push(new RssAdapter(feed.name, feed.rssUrl, feed.category));
      }
    }

    // API Sources
    this.sources.push(new HackerNewsAdapter(FEED_SOURCES.HACKER_NEWS.apiUrl));
    
    // Scraping Sources
    this.sources.push(new ProductHuntAdapter(FEED_SOURCES.PRODUCT_HUNT.url));
    
    log.info({ count: this.sources.length }, "Registered feed sources");
  }

  /**
   * Run the aggregation process for a specific project
   */
  public async aggregateForProject(
    projectId: string, 
    projectKeywords: string[]
  ): Promise<void> {
    log.info({ projectId, sourceCount: this.sources.length }, "Starting feed aggregation");
    
    let totalStored = 0;

    for (const source of this.sources) {
      try {
        log.debug({ source: source.name }, "Fetching from source");
        const items = await source.fetch();
        
        if (items.length > 0) {
          await this.processAndStoreItems(projectId, projectKeywords, items);
          totalStored += items.length;
        }

        // Strict 30-second rate limiting between scraping/fetching different domains
        // to prevent IP blocks as per SKILL.md rules
        if (this.sources.indexOf(source) < this.sources.length - 1) {
          log.debug("Waiting 30 seconds before next fetch to respect rate limits...");
          await new Promise(resolve => setTimeout(resolve, 30000));
        }
      } catch (error) {
        log.error({ source: source.name, error: String(error) }, "Failed processing source");
      }
    }
    
    log.info({ projectId, totalStored }, "Completed feed aggregation");
  }

  private async processAndStoreItems(
    projectId: string, 
    keywords: string[], 
    items: RawFeedItem[]
  ) {
    const records = items.map(item => {
      // Determine credibility weight
      let credibilityMultiplier = 1.0;
      if (item.source === "Hacker News" || item.source === "TechCrunch") {
        credibilityMultiplier = 1.5;
      } else if (item.source === "Product Hunt") {
        credibilityMultiplier = 1.2;
      }

      const score = this.scorer.calculateScore(
        item.title, 
        item.snippet, 
        item.publishedAt, 
        { keywords, credibilityMultiplier }
      );

      return {
        projectId,
        title: item.title,
        summary: item.snippet,
        url: item.url,
        source: item.source,
        publishedAt: item.publishedAt,
        relevanceScore: score,
        domain: item.domain,
        rawContent: item.rawContent,
      };
    });

    // Hard Filter: Only keep articles that are highly relevant to tech / project
    const MIN_RELEVANCE_SCORE = 5.0;
    const highlyRelevantRecords = records.filter(record => record.relevanceScore >= MIN_RELEVANCE_SCORE);

    if (highlyRelevantRecords.length === 0) {
      log.debug("All items were filtered out due to low relevance score.");
      return;
    }

    try {
      // Upsert into database
      await this.db.insert(feedItems).values(highlyRelevantRecords);
      log.debug({ count: highlyRelevantRecords.length, filteredOut: records.length - highlyRelevantRecords.length }, "Stored items in database");
    } catch (error) {
      log.error({ error: String(error) }, "Failed to store items in database");
    }
  }
}
