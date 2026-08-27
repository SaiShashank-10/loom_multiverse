---
name: founder-feed
description: Guide for adding new news sources to the Founder Feed — aggregator interface, web scraping, scoring algorithm, and scheduler.
---

# Founder Feed Development Guide

## Overview
The Founder Feed scrapes legitimate news sources and scores articles by relevance to the founder's project domain. It powers the "CTO Pushback" feature.

## Sources (Configured in `packages/shared/src/constants.ts`)
| Source | Type | Category |
|--------|------|----------|
| India Today | RSS | General |
| Hindustan Times | RSS | Technology |
| The Economic Times | RSS | Business |
| Telangana Today | RSS | Regional |
| TechCrunch | RSS | Startup |
| Hacker News | API | Tech |
| Product Hunt | Scraping | Products |
| Livemint | RSS | Business |
| NDTV | RSS | General |
| The Hindu | RSS | General |

## Adding a New Source
1. Add the source config to `FEED_SOURCES` in `packages/shared/src/constants.ts`
2. Create source adapter in `packages/founder-feed/src/sources/<source>.ts`
3. Implement the `FeedSource` interface:
```typescript
interface FeedSource {
  name: string;
  fetch(): Promise<RawFeedItem[]>;
}
```
4. Register the source in `packages/founder-feed/src/aggregator.ts`
5. Test with `vitest`

## Web Scraping Rules
- Always use `cheerio` for HTML parsing (no headless browser)
- Respect `robots.txt`
- Rate limit requests (max 1 request per source per 30 seconds)
- Cache responses to avoid redundant scraping
- Store the `source` field for attribution

## Relevance Scoring
The scorer uses:
1. Keyword matching against the founder's project domain
2. Recency (newer = higher score)
3. Source credibility weight
4. Sentiment analysis (optional)
