export interface RawFeedItem {
  title: string;
  url: string;
  snippet: string;
  publishedAt: Date;
  source: string;
  domain?: string;
  rawContent?: string;
}

export interface FeedSource {
  name: string;
  fetch(): Promise<RawFeedItem[]>;
}
