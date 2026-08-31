import { createLogger } from "@loom/shared/logger";
import type { FeedSource, RawFeedItem } from "../types.js";

const log = createLogger("hacker-news");

export class HackerNewsAdapter implements FeedSource {
  public readonly name = "Hacker News";

  constructor(public readonly apiUrl: string) {}

  async fetch(): Promise<RawFeedItem[]> {
    try {
      log.debug("Fetching Hacker News top stories");
      
      // Fetch top story IDs
      const topStoriesRes = await fetch(`${this.apiUrl}/topstories.json`);
      if (!topStoriesRes.ok) {
        throw new Error(`Failed to fetch HN top stories: ${topStoriesRes.statusText}`);
      }
      
      const storyIds: number[] = await topStoriesRes.json();
      
      // We only take the top 30 to avoid rate limiting and excessive requests
      const top30 = storyIds.slice(0, 30);
      
      const items: RawFeedItem[] = [];
      
      for (const id of top30) {
        try {
          const itemRes = await fetch(`${this.apiUrl}/item/${id}.json`);
          if (!itemRes.ok) continue;
          
          const item = await itemRes.json();
          
          // Skip if it's not a story or if it has no title
          if (item.type !== "story" || !item.title) continue;
          
          const url = item.url || `https://news.ycombinator.com/item?id=${id}`;
          
          let domain: string | undefined;
          if (item.url) {
            const domainMatch = item.url.match(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)/im);
            domain = domainMatch ? domainMatch[1] : undefined;
          }

          items.push({
            title: item.title,
            url,
            snippet: item.text || "", // HN stories sometimes have text, but usually just title
            publishedAt: new Date(item.time * 1000), // HN time is in Unix seconds
            source: this.name,
            domain,
          });
        } catch (e) {
          log.warn({ id, error: String(e) }, "Failed to fetch individual HN item");
        }
      }
      
      log.info({ count: items.length }, "Successfully fetched Hacker News items");
      return items;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.error({ error: message }, "Failed to fetch Hacker News feed");
      return [];
    }
  }
}
