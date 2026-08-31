import { createLogger } from "@loom/shared/logger";
import * as cheerio from "cheerio";
import type { FeedSource, RawFeedItem } from "../types.js";

const log = createLogger("product-hunt");

export class ProductHuntAdapter implements FeedSource {
  public readonly name = "Product Hunt";

  constructor(public readonly url: string) {}

  async fetch(): Promise<RawFeedItem[]> {
    try {
      log.debug("Fetching Product Hunt homepage");
      
      const response = await fetch(this.url, {
        headers: {
          "User-Agent": "LoomMultiverse/1.0 (Web Scraper)",
          "Accept": "text/html",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch Product Hunt: ${response.statusText}`);
      }
      
      const html = await response.text();
      const $ = cheerio.load(html);
      
      const items: RawFeedItem[] = [];
      const seenUrls = new Set<string>();
      
      // Look for standard links that point to posts
      $("a[href^='/posts/']").each((_, element) => {
        const href = $(element).attr("href");
        if (!href) return;
        
        // Skip comment links or alternative tabs
        if (href.includes("#") || href.includes("?")) return;
        
        const fullUrl = `https://www.producthunt.com${href}`;
        if (seenUrls.has(fullUrl)) return;
        
        seenUrls.add(fullUrl);
        
        // Try to extract title and description
        // Product Hunt heavily obfuscates class names, so we just extract the text content of the link
        // Usually the link contains the product name and a short tagline
        const textContent = $(element).text().trim();
        
        // A naive split assuming "ProductName - Tagline" or similar formatting
        // Or we just store the whole thing as title and leave snippet empty
        let title = "Product Hunt App";
        let snippet = textContent;
        
        if (textContent.length > 0) {
           const parts = textContent.split("—"); // em dash
           if (parts.length > 1) {
             title = parts[0].trim();
             snippet = parts.slice(1).join("—").trim();
           } else {
             title = textContent.substring(0, 50) + (textContent.length > 50 ? "..." : "");
             snippet = textContent;
           }
        }
        
        // Only add if it's a substantive link (not an empty string or tiny text)
        if (textContent.length > 5) {
          items.push({
            title,
            url: fullUrl,
            snippet,
            publishedAt: new Date(), // We don't have exact post time without API, use scrape time
            source: this.name,
            domain: "producthunt.com",
          });
        }
      });
      
      // Limit to top 20
      const topItems = items.slice(0, 20);
      
      log.info({ count: topItems.length }, "Successfully fetched Product Hunt items");
      return topItems;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.error({ error: message }, "Failed to scrape Product Hunt");
      return [];
    }
  }
}
