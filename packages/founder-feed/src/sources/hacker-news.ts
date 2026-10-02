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
      
      const responseIds: unknown = await topStoriesRes.json();
      if (!Array.isArray(responseIds)) throw new Error("Invalid Hacker News story list");
      const storyIds = responseIds.filter((id): id is number => typeof id === "number" && Number.isSafeInteger(id));
      
      // We only take the top 30 to avoid rate limiting and excessive requests
      const top30 = storyIds.slice(0, 30);
      
      const items: RawFeedItem[] = [];
      
      for (const id of top30) {
        try {
          const itemRes = await fetch(`${this.apiUrl}/item/${id}.json`);
          if (!itemRes.ok) continue;
          
          const raw: unknown = await itemRes.json();
          if (!raw || typeof raw !== "object") continue;
          const item = raw as Record<string, unknown>;
          
          // Skip if it's not a story or if it has no title
          if (item.type !== "story" || typeof item.title !== "string" || typeof item.time !== "number") continue;
          
          const url = typeof item.url === "string" ? item.url : `https://news.ycombinator.com/item?id=${id}`;
          
          let domain: string | undefined;
          if (typeof item.url === "string") {
            const domainMatch = item.url.match(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)/im);
            domain = domainMatch ? domainMatch[1] : undefined;
          }

          items.push({
            title: item.title,
            url,
            snippet: typeof item.text === "string" ? item.text : "",
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
