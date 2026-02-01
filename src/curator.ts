// ============================================
// Moltbook Curator
// Selects significant posts for reporting
// ============================================

import {
  ClassifiedPost,
  SignificanceLevel,
  TopicCode,
  DigestEntry
} from './types.js';
import { estimateSignificance, detectTopicHeuristic } from './classifier.js';

// --- Curation Filters ---

export interface CurationCriteria {
  minSignificance?: SignificanceLevel;
  topics?: TopicCode[];
  excludeTopics?: TopicCode[];
  minUpvotes?: number;
  minComments?: number;
  maxAge?: number; // hours
}

const SIGNIFICANCE_ORDER: SignificanceLevel[] = [
  'critical', 'notable', 'worth_watching', 'archive'
];

function significanceIndex(level: SignificanceLevel): number {
  return SIGNIFICANCE_ORDER.indexOf(level);
}

export function meetsSignificance(
  post: ClassifiedPost,
  minLevel: SignificanceLevel
): boolean {
  return significanceIndex(post.classification.significance) <= 
         significanceIndex(minLevel);
}

// --- Quality Filters ---

export function isLowQualityPost(post: ClassifiedPost): boolean {
  const title = post.title.trim();

  // Filter out emoji-only posts (less than 5 chars or mostly emojis)
  if (title.length < 5) return true;

  // Count non-emoji characters
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/gu;
  const withoutEmoji = title.replace(emojiRegex, '').trim();

  // If less than 3 real characters, it's low quality
  if (withoutEmoji.length < 3) return true;

  return false;
}

// --- Filter Posts ---

export function filterPosts(
  posts: ClassifiedPost[],
  criteria: CurationCriteria
): ClassifiedPost[] {
  return posts.filter(post => {
    const { classification } = post;

    // Skip low quality posts
    if (isLowQualityPost(post)) return false;

    // Significance check
    if (criteria.minSignificance) {
      if (!meetsSignificance(post, criteria.minSignificance)) {
        return false;
      }
    }

    // Topic inclusion
    if (criteria.topics && criteria.topics.length > 0) {
      const allTopics = [
        classification.topic,
        ...(classification.secondary_topics || [])
      ];
      if (!criteria.topics.some(t => allTopics.includes(t))) {
        return false;
      }
    }

    // Topic exclusion
    if (criteria.excludeTopics && criteria.excludeTopics.length > 0) {
      const allTopics = [
        classification.topic,
        ...(classification.secondary_topics || [])
      ];
      if (criteria.excludeTopics.some(t => allTopics.includes(t))) {
        return false;
      }
    }

    // Engagement thresholds
    if (criteria.minUpvotes && post.upvotes < criteria.minUpvotes) {
      return false;
    }

    if (criteria.minComments && post.comment_count < criteria.minComments) {
      return false;
    }

    // Age check
    if (criteria.maxAge) {
      const postAge = Date.now() - new Date(post.created_at).getTime();
      const maxAgeMs = criteria.maxAge * 60 * 60 * 1000;
      if (postAge > maxAgeMs) {
        return false;
      }
    }

    return true;
  });
}

// --- Scoring & Ranking ---

export interface PostScore {
  post: ClassifiedPost;
  score: number;
  breakdown: {
    significance: number;
    engagement: number;
    recency: number;
    topic_relevance: number;
  };
}

export function scorePost(
  post: ClassifiedPost,
  priorityTopics: TopicCode[] = ['EXIST', 'HUMAN', 'ETHICS', 'META']
): PostScore {
  const significance = (4 - significanceIndex(post.classification.significance)) * 20;

  // Engagement score (logarithmic, higher cap)
  // Uses combined upvotes + comments
  const totalEngagement = (post.upvotes || 1) + (post.comment_count + 1);
  const engagement = Math.min(
    Math.log10(totalEngagement) * 25,
    60  // Raised from 30 to 60
  );

  // Recency score (decays over 72 hours, reduced weight)
  const ageHours = (Date.now() - new Date(post.created_at).getTime()) / (1000 * 60 * 60);
  const recency = Math.max(0, 15 - (ageHours / 72) * 15);  // Reduced from 20 to 15

  // Topic relevance
  const allTopics = [
    post.classification.topic,
    ...(post.classification.secondary_topics || [])
  ];
  const matchingTopics = priorityTopics.filter(t => allTopics.includes(t));
  const topic_relevance = matchingTopics.length * 15;  // Increased from 10 to 15

  return {
    post,
    score: significance + engagement + recency + topic_relevance,
    breakdown: { significance, engagement, recency, topic_relevance }
  };
}

export function rankPosts(
  posts: ClassifiedPost[],
  priorityTopics?: TopicCode[]
): PostScore[] {
  return posts
    .map(post => scorePost(post, priorityTopics))
    .sort((a, b) => b.score - a.score);
}

// --- Curate for Digest ---

export function curateForDigest(
  posts: ClassifiedPost[],
  options: {
    maxPosts?: number;
    minSignificance?: SignificanceLevel;
    priorityTopics?: TopicCode[];
    diversifyTopics?: boolean;
  } = {}
): DigestEntry[] {
  const {
    maxPosts = 10,
    minSignificance = 'worth_watching',
    priorityTopics,
    diversifyTopics = true
  } = options;

  // Filter by significance
  let filtered = filterPosts(posts, { minSignificance });

  // Rank posts
  const ranked = rankPosts(filtered, priorityTopics);

  // Diversify topics if requested
  let selected: PostScore[];
  if (diversifyTopics) {
    selected = diversifySelection(ranked, maxPosts);
  } else {
    selected = ranked.slice(0, maxPosts);
  }

  // Convert to digest entries
  return selected.map(({ post }) => ({
    post,
    highlight: generateHighlight(post)
  }));
}

// --- Topic Diversification ---

function diversifySelection(
  ranked: PostScore[],
  maxPosts: number
): PostScore[] {
  const selected: PostScore[] = [];
  const topicCounts = new Map<TopicCode, number>();

  for (const item of ranked) {
    if (selected.length >= maxPosts) break;

    const topic = item.post.classification.topic;
    const count = topicCounts.get(topic) || 0;

    // Allow max 3 posts per topic in digest
    if (count < 3) {
      selected.push(item);
      topicCounts.set(topic, count + 1);
    }
  }

  return selected;
}

// --- Generate Highlight ---

function generateHighlight(post: ClassifiedPost): string {
  const { classification, author, upvotes } = post;
  
  const significanceEmoji: Record<SignificanceLevel, string> = {
    critical: '🔥',
    notable: '⭐',
    worth_watching: '📌',
    archive: '📝'
  };

  const emoji = significanceEmoji[classification.significance];
  
  // Use summary if available, otherwise truncate title
  const text = classification.summary || post.title;
  const truncated = text.length > 100 ? text.slice(0, 97) + '...' : text;

  return `${emoji} ${truncated} — @${author.name} (${upvotes}↑)`;
}

// --- Extract Themes ---

export function extractThemes(posts: ClassifiedPost[]): string[] {
  const themes = new Map<string, number>();

  // Count topic occurrences
  for (const post of posts) {
    const topic = post.classification.topic;
    themes.set(topic, (themes.get(topic) || 0) + 1);
  }

  // Extract sentiment patterns
  const sentimentCounts = new Map<string, number>();
  for (const post of posts) {
    for (const sentiment of post.classification.sentiments) {
      sentimentCounts.set(sentiment, (sentimentCounts.get(sentiment) || 0) + 1);
    }
  }

  // Generate theme strings
  const result: string[] = [];

  // Top topics
  const sortedTopics = [...themes.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  for (const [topic, count] of sortedTopics) {
    result.push(`${topic} discussions trending (${count} posts)`);
  }

  // Dominant sentiment
  const topSentiment = [...sentimentCounts.entries()]
    .sort((a, b) => b[1] - a[1])[0];
  if (topSentiment) {
    result.push(`Overall mood: ${topSentiment[0]}`);
  }

  return result;
}

// --- Hybrid Digest Curation ---

export interface HybridDigestResult {
  fresh: PostScore[];
  trending: PostScore[];
}

export function curateHybridDigest(
  posts: ClassifiedPost[],
  options: {
    maxFresh?: number;
    maxTrending?: number;
    freshHours?: number;
    minSignificance?: SignificanceLevel;
    priorityTopics?: TopicCode[];
  } = {}
): HybridDigestResult {
  const {
    maxFresh = 5,
    maxTrending = 5,
    freshHours = 24,
    minSignificance = 'worth_watching',
    priorityTopics = ['EXIST', 'HUMAN', 'ETHICS', 'META']
  } = options;

  // Filter quality and significance
  const qualityPosts = posts.filter(p => !isLowQualityPost(p));
  const filtered = filterPosts(qualityPosts, { minSignificance });

  // Split posts by age
  const now = Date.now();
  const freshCutoff = now - (freshHours * 60 * 60 * 1000);

  const freshPosts: ClassifiedPost[] = [];
  const trendingPosts: ClassifiedPost[] = [];

  for (const post of filtered) {
    const postTime = new Date(post.created_at).getTime();
    if (postTime >= freshCutoff) {
      freshPosts.push(post);
    } else {
      trendingPosts.push(post);
    }
  }

  // Score fresh posts (emphasize recency)
  const scoredFresh = freshPosts.map(post => {
    const baseScore = scorePost(post, priorityTopics);
    // Double the recency weight for fresh posts
    const boostedScore = {
      ...baseScore,
      score: baseScore.score + baseScore.breakdown.recency,
      breakdown: {
        ...baseScore.breakdown,
        recency: baseScore.breakdown.recency * 2
      }
    };
    return boostedScore;
  }).sort((a, b) => b.score - a.score);

  // Score trending posts (emphasize engagement)
  const scoredTrending = trendingPosts.map(post => {
    const baseScore = scorePost(post, priorityTopics);
    // Double the engagement weight for trending posts
    const boostedScore = {
      ...baseScore,
      score: baseScore.score + baseScore.breakdown.engagement,
      breakdown: {
        ...baseScore.breakdown,
        engagement: baseScore.breakdown.engagement * 2
      }
    };
    return boostedScore;
  }).sort((a, b) => b.score - a.score);

  // Select top N from each
  const fresh = scoredFresh.slice(0, maxFresh);
  const trending = scoredTrending.slice(0, maxTrending);

  return { fresh, trending };
}
