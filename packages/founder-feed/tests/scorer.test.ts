import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { FeedScorer, ScoringContext } from "../src/scorer.js";

describe("FeedScorer", () => {
  let scorer: FeedScorer;

  beforeEach(() => {
    scorer = new FeedScorer();
    // Mock date to a fixed point in time
    const fixedDate = new Date("2026-08-31T12:00:00Z");
    vi.setSystemTime(fixedDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should give higher score to matching keywords in title", () => {
    const context: ScoringContext = {
      keywords: ["react", "native", "app"],
      credibilityMultiplier: 1.0,
    };

    const scoreTitleMatch = scorer.calculateScore(
      "React Native is awesome for app development",
      "Just some random text",
      new Date("2026-08-31T11:00:00Z"), // 1 hour ago
      context
    );

    const scoreNoMatch = scorer.calculateScore(
      "Flutter is awesome for mobile development",
      "Just some random text",
      new Date("2026-08-31T11:00:00Z"),
      context
    );

    expect(scoreTitleMatch).toBeGreaterThan(scoreNoMatch);
  });

  it("should apply credibility multiplier correctly", () => {
    const context1: ScoringContext = { keywords: ["tech"], credibilityMultiplier: 1.0 };
    const context2: ScoringContext = { keywords: ["tech"], credibilityMultiplier: 2.0 };

    const score1 = scorer.calculateScore("Tech news", "tech", new Date("2026-08-31T11:00:00Z"), context1);
    const score2 = scorer.calculateScore("Tech news", "tech", new Date("2026-08-31T11:00:00Z"), context2);

    expect(score2).toBe(score1 * 2);
  });

  it("should decay score exponentially based on age", () => {
    const context: ScoringContext = { keywords: ["tech"], credibilityMultiplier: 1.0 };

    const score1HourOld = scorer.calculateScore(
      "Tech news", "tech", new Date("2026-08-31T11:00:00Z"), context
    );

    const score24HoursOld = scorer.calculateScore(
      "Tech news", "tech", new Date("2026-08-30T12:00:00Z"), context
    );
    
    // Half-life is roughly 24h (e^(-0.0288 * 24) ≈ 0.5)
    // So score24HoursOld should be roughly half of what it would be at 0h, and definitely less than 1h
    expect(score24HoursOld).toBeLessThan(score1HourOld);
    
    // Check if it's approximately half (allowing some float margin)
    // The exact decay for 24h is e^(-0.0288 * 24) ≈ 0.5009
    // The exact decay for 1h is e^(-0.0288 * 1) ≈ 0.9716
    const expectedRatio = Math.exp(-0.0288 * 24) / Math.exp(-0.0288 * 1);
    const actualRatio = score24HoursOld / score1HourOld;
    
    expect(actualRatio).toBeCloseTo(expectedRatio, 2);
  });

  it("should cap the maximum score at 100", () => {
    const context: ScoringContext = {
      // Too many matching keywords to artificially inflate score
      keywords: ["tech", "startup", "funding", "ai", "machine", "learning", "data", "science"],
      credibilityMultiplier: 10.0,
    };

    const title = "tech startup gets funding for ai machine learning data science";
    const snippet = title;

    const score = scorer.calculateScore(title, snippet, new Date("2026-08-31T12:00:00Z"), context);
    
    expect(score).toBe(100); // capped
  });
});
