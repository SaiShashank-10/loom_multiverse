import Parser from "rss-parser";
import { createLogger } from "@loom/shared/logger";
import type { FeedSource, RawFeedItem } from "../types.js";

const log = createLogger("rss-adapter");

export class RssAdapter implements FeedSource {
  private parser: Parser;

  constructor(
    public readonly name: string,
    public readonly rssUrl: string,
    public readonly category: string
  ) {
    this.parser = new Parser({
      timeout: 10000,
      headers: {
        "User-Agent": "LoomMultiverse/1.0",
      },
    });
  }

  async fetch(): Promise<RawFeedItem[]> {
    try {
      log.debug({ source: this.name, url: this.rssUrl }, "Fetching RSS feed");
      const feed = await this.parser.parseURL(this.rssUrl);
      
      const items: RawFeedItem[] = feed.items.map((item) => {
        // Fallback publishedAt to now if missing
        let publishedAt = new Date();
        if (item.pubDate) {
          const parsed = new Date(item.pubDate);
          if (!isNaN(parsed.getTime())) {
            publishedAt = parsed;
          }
        } else if (item.isoDate) {
          const parsed = new Date(item.isoDate);
          if (!isNaN(parsed.getTime())) {
            publishedAt = parsed;
          }
        }

        const domainMatch = item.link?.match(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)/im);
        const domain = domainMatch ? domainMatch[1] : undefined;

        return {
          title: item.title || "Untitled",
          url: item.link || this.rssUrl,
          snippet: item.contentSnippet || item.content || item.summary || "",
          publishedAt,
          source: this.name,
          domain,
          rawContent: item.content,
        };
      });

      log.info({ source: this.name, count: items.length }, "Successfully fetched RSS items");
      return items;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.error({ source: this.name, error: message }, "Failed to fetch RSS feed");
      return []; // Return empty array on failure so aggregator doesn't crash
    }
  }
}
