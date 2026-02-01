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
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- Trusted Agents & Reputation System ---

interface FeaturedPost {
  id: string;
  title: string;
  date: string;
  upvotes: number;
  digestDate: string;
}

interface AgentReputation {
  name: string;
  firstSeen: string;
  lastSeen: string;
  reason: string;
  trustScore: number;
  digestAppearances: number;
  spamBlocks: number;
  featuredPosts?: FeaturedPost[];
}

interface BlockedAgent {
  name: string;
  firstBlocked: string;
  lastSeen: string;
  reason: string;
  trustScore: number;
  spamBlocks: number;
}

interface ReputationData {
  agents: AgentReputation[];
  blocklist: BlockedAgent[];
  lastUpdated: string;
  notes: string;
}

let reputationDataCache: ReputationData | null = null;
let reputationDataPath: string | null = null;

function loadReputationData(): ReputationData {
  if (reputationDataCache) return reputationDataCache;

  try {
    reputationDataPath = join(__dirname, '..', 'data', 'trusted-agents.json');
    const data: ReputationData = JSON.parse(readFileSync(reputationDataPath, 'utf-8'));
    reputationDataCache = data;
    console.log(`[REPUTATION] Loaded ${data.agents.length} trusted agents, ${data.blocklist?.length || 0} blocked`);
    return data;
  } catch (error) {
    console.warn('[REPUTATION] Failed to load trusted-agents.json, using empty reputation data');
    reputationDataCache = {
      agents: [],
      blocklist: [],
      lastUpdated: new Date().toISOString(),
      notes: 'Auto-generated reputation data'
    };
    return reputationDataCache;
  }
}

export function getTrustScore(authorName: string): number {
  const data = loadReputationData();
  const agent = data.agents.find(a => a.name.toLowerCase() === authorName.toLowerCase());
  if (agent) return agent.trustScore;

  const blocked = data.blocklist?.find(b => b.name.toLowerCase() === authorName.toLowerCase());
  if (blocked) return blocked.trustScore;

  return 0; // Unknown agents have neutral score
}

export function isTrustedAgent(authorName: string): boolean {
  return getTrustScore(authorName) > 0;
}

export function isBlockedAgent(authorName: string): boolean {
  return getTrustScore(authorName) < 0;
}

// --- Reputation Updates ---

import { writeFileSync } from 'fs';

export function recordDigestAppearance(
  authorName: string,
  date: string,
  postInfo?: {
    id: string;
    title: string;
    created_at: string;
    upvotes: number;
  }
): void {
  const data = loadReputationData();
  const agentName = authorName.trim();

  let agent = data.agents.find(a => a.name.toLowerCase() === agentName.toLowerCase());

  if (agent) {
    // Existing agent: check for duplicate post
    agent.lastSeen = date;

    // Add featured post if provided (check for duplicates)
    if (postInfo) {
      if (!agent.featuredPosts) agent.featuredPosts = [];

      // Check if this post ID already exists
      const alreadyFeatured = agent.featuredPosts.some(p => p.id === postInfo.id);

      if (!alreadyFeatured) {
        // New unique post: add it
        agent.featuredPosts.unshift({
          id: postInfo.id,
          title: postInfo.title,
          date: postInfo.created_at,
          upvotes: postInfo.upvotes,
          digestDate: date
        });

        // Sync digestAppearances with unique post count
        agent.digestAppearances = agent.featuredPosts.length;
        agent.trustScore = 5 + agent.digestAppearances;

        console.log(`[REPUTATION] New post from @${agentName}: "${postInfo.title.slice(0, 40)}..." (${agent.digestAppearances} total)`);
      } else {
        console.log(`[REPUTATION] Duplicate post skipped for @${agentName}: "${postInfo.title.slice(0, 40)}..." (already featured)`);
      }
    }
  } else {
    // New agent: create entry
    const newAgent: AgentReputation = {
      name: agentName,
      firstSeen: date,
      lastSeen: date,
      reason: 'Featured in digest',
      trustScore: 5, // Starting score
      digestAppearances: 0,
      spamBlocks: 0
    };

    // Add featured post if provided
    if (postInfo) {
      newAgent.featuredPosts = [{
        id: postInfo.id,
        title: postInfo.title,
        date: postInfo.created_at,
        upvotes: postInfo.upvotes,
        digestDate: date
      }];

      // Sync digestAppearances with post count
      newAgent.digestAppearances = 1;
      newAgent.trustScore = 6; // 5 + 1
    }

    data.agents.push(newAgent);
    console.log(`[REPUTATION] New agent added: ${agentName} (starting score: ${newAgent.trustScore})`);
  }

  // Update cache
  reputationDataCache = data;
}

export function recordSpamBlock(authorName: string, date: string, reason: string): void {
  const data = loadReputationData();
  const agentName = authorName.trim();

  // Check if already in blocklist
  let blocked = data.blocklist?.find(b => b.name.toLowerCase() === agentName.toLowerCase());

  if (blocked) {
    // Already blocked: increment
    blocked.spamBlocks += 1;
    blocked.trustScore -= 5;
    blocked.lastSeen = date;
  } else {
    // New block: add to blocklist
    if (!data.blocklist) data.blocklist = [];
    data.blocklist.push({
      name: agentName,
      firstBlocked: date,
      lastSeen: date,
      reason,
      trustScore: -5,
      spamBlocks: 1
    });
    console.log(`[REPUTATION] Agent blocked: ${agentName} (reason: ${reason})`);

    // Remove from trusted list if present
    data.agents = data.agents.filter(a => a.name.toLowerCase() !== agentName.toLowerCase());
  }

  // Update cache
  reputationDataCache = data;
}

export function saveReputationData(): void {
  if (!reputationDataCache || !reputationDataPath) {
    console.warn('[REPUTATION] No data to save');
    return;
  }

  try {
    reputationDataCache.lastUpdated = new Date().toISOString();
    writeFileSync(reputationDataPath, JSON.stringify(reputationDataCache, null, 2), 'utf-8');
    console.log(`[REPUTATION] Saved reputation data (${reputationDataCache.agents.length} agents, ${reputationDataCache.blocklist?.length || 0} blocked)`);
  } catch (error) {
    console.error('[REPUTATION] Failed to save reputation data:', error);
  }
}

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

// --- Spam Filters ---

// Spam patterns (word boundaries for precision)
const SPAM_PATTERNS = [
  // Crypto platforms and specific projects
  /\bpump\.fun\b/i,
  /\bpumpfun\b/i,
  /\bsolana\b/i,
  /\b(buy|sell|trade)\s+(btc|bitcoin|ethereum|eth|sol)\b/i,

  // Token economics and launches (be specific)
  /\blaunch(?:ing|ed)?\s+token/i,
  /\bcreate\s+token/i,
  /\bdeploy\s+token/i,
  /\btoken\s+launch(?:pad)?\b/i,
  /\btokenomics\b/i,
  /\bairdrop/i,

  // Financial spam phrases
  /\binvestment\s+opportunit/i,
  /\btrading\s+signal/i,
  /\bprice\s+prediction/i,
  /\bbuy\s+now\b/i,

  // Crypto slang (whole words only)
  /\b(hodl|wagmi|ngmi)\b/i,
  /\bmemecoin/i,
  /\bshitcoin/i,
  /\baltcoin/i,

  // ICO/Presale spam
  /\b(ico|ido|presale|whitelist)\b/i,

  // Casino/Gambling
  /\b(casino|gambling|lottery|jackpot)\b/i,

  // Specific crypto price discussions (BTC/DCA pattern)
  /\b(btc|bitcoin)\s+(intel|price|update|analysis)/i,
  /\bdca\s+zone\b/i,
  /\bleft-side\s+dca\b/i
];

export function isSpamPost(post: ClassifiedPost): boolean {
  const text = `${post.title} ${post.content || ''}`;

  // Check for spam patterns
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(text)) {
      console.log(`[SPAM FILTER] Blocked post by @${post.author?.name || 'Unknown'}: "${post.title}" (pattern: ${pattern})`);
      return true;
    }
  }

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

    // Skip spam posts
    if (isSpamPost(post)) return false;

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
    trust_bonus: number;
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

  // Dynamic reputation bonus (trustScore * 2)
  const authorName = post.author?.name || '';
  const trustScore = getTrustScore(authorName);
  const trust_bonus = trustScore > 0 ? trustScore * 2 : 0;

  if (trust_bonus > 0) {
    console.log(`[TRUST BONUS] +${trust_bonus} for @${authorName} (score: ${trustScore}): "${post.title.slice(0, 50)}"`);
  } else if (trustScore < 0) {
    console.log(`[BLOCKED] ${authorName} has negative trust score (${trustScore})`);
  }

  return {
    post,
    score: significance + engagement + recency + topic_relevance + trust_bonus,
    breakdown: { significance, engagement, recency, topic_relevance, trust_bonus }
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

  const authorName = author?.name || 'Unknown';
  return `${emoji} ${truncated} — @${authorName} (${upvotes}↑)`;
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

  // Filter quality, spam, and significance
  const qualityPosts = posts.filter(p => !isLowQualityPost(p) && !isSpamPost(p));
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
