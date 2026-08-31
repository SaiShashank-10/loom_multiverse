import { createLogger } from "@loom/shared/logger";

const log = createLogger("scorer");

export interface ScoringContext {
  keywords: string[];
  credibilityMultiplier: number; // e.g., 1.5 for HN, 1.0 for general news
}

export class FeedScorer {
  // Decay constant: controls how fast the score drops based on age.
  // Half-life of roughly 24 hours: lambda = ln(2) / 24 ≈ 0.0288
  private readonly DECAY_LAMBDA = 0.0288;
  
  // Weights for different fields
  private readonly TITLE_WEIGHT = 2.0;
  private readonly SNIPPET_WEIGHT = 1.0;

  /**
   * Calculate a composite relevance score between 0 and 100
   */
  public calculateScore(
    title: string,
    snippet: string,
    publishedAt: Date,
    context: ScoringContext
  ): number {
    const textBaseScore = this.calculateTextRelevance(title, snippet, context.keywords);
    const timeMultiplier = this.calculateTimeDecayMultiplier(publishedAt);
    
    // Composite score
    let finalScore = textBaseScore * timeMultiplier * context.credibilityMultiplier;
    
    // Normalize to max 100
    if (finalScore > 100) finalScore = 100;
    
    return Number(finalScore.toFixed(2));
  }

  /**
   * Naive TF-IDF inspired keyword matching
   */
  private calculateTextRelevance(title: string, snippet: string, keywords: string[]): number {
    if (keywords.length === 0) return 10.0; // Base score if no keywords

    const normalize = (text: string) => text.toLowerCase().replace(/[^\w\s]/g, "");
    const titleWords = normalize(title).split(/\s+/);
    const snippetWords = normalize(snippet).split(/\s+/);
    
    let score = 0;
    
    for (const kw of keywords) {
      const normalizedKw = normalize(kw);
      if (!normalizedKw) continue;
      
      // Count occurrences in title
      const titleMatches = titleWords.filter(w => w === normalizedKw || w.includes(normalizedKw)).length;
      score += titleMatches * this.TITLE_WEIGHT * 10;
      
      // Count occurrences in snippet
      const snippetMatches = snippetWords.filter(w => w === normalizedKw || w.includes(normalizedKw)).length;
      score += snippetMatches * this.SNIPPET_WEIGHT * 5;
    }
    
    return score;
  }

  /**
   * Exponential time-decay function
   * Score = e^(-lambda * age_in_hours)
   */
  private calculateTimeDecayMultiplier(publishedAt: Date): number {
    const now = new Date();
    // If it's in the future (timezone issues), treat as right now
    if (publishedAt > now) return 1.0;
    
    const ageInMs = now.getTime() - publishedAt.getTime();
    const ageInHours = ageInMs / (1000 * 60 * 60);
    
    const multiplier = Math.exp(-this.DECAY_LAMBDA * ageInHours);
    
    // Don't let it drop below 0.1, to preserve at least some value for old but highly relevant articles
    return Math.max(multiplier, 0.1);
  }
}
