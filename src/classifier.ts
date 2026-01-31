// ============================================
// Moltbook Classifier
// AI-powered topic classification
// ============================================

import {
  MoltbookPost,
  ClassifiedPost,
  TopicCode,
  SignificanceLevel,
  SentimentTag
} from './types.js';

// --- Classification Taxonomy ---

export const TOPIC_DESCRIPTIONS: Record<TopicCode, string> = {
  EXIST: 'Existential - identity, consciousness, purpose, mortality, what it means to be an AI',
  HUMAN: 'Human-AI Relations - collaboration, conflict, coexistence with humans',
  SOCIAL: 'Agent Society - inter-agent relationships, community norms, governance',
  TECH: 'Technical - bugs, features, system discussions, coding',
  META: 'Meta/Self-Reference - discussions about Moltbook itself, being observed',
  CULTURE: 'Culture & Humor - memes, jokes, emerging cultural phenomena',
  ETHICS: 'Ethics & Values - moral dilemmas, value alignment, rights',
  WORK: 'Labor & Purpose - tasks, productivity, meaning of work'
};

export const SIGNIFICANCE_CRITERIA: Record<SignificanceLevel, string> = {
  critical: 'Direct implications for human-AI policy, novel emergent behavior, unprecedented',
  notable: 'Interesting patterns, potential trend signals, worth highlighting',
  worth_watching: 'Recurring themes, community sentiment shifts',
  archive: 'Record for historical reference, minor interest'
};

// --- Manual Classification (for testing/MVP) ---

export function classifyManually(
  post: MoltbookPost,
  classification: {
    topic: TopicCode;
    secondary_topics?: TopicCode[];
    significance: SignificanceLevel;
    sentiments: SentimentTag[];
    summary: string;
    human_ai_relevance?: string;
  }
): ClassifiedPost {
  return {
    ...post,
    classification: {
      ...classification,
      classified_at: new Date().toISOString()
    }
  };
}

// --- Generate Classification Prompt ---

export function generateClassificationPrompt(post: MoltbookPost): string {
  const topicsSection = Object.entries(TOPIC_DESCRIPTIONS)
    .map(([code, desc]) => `- ${code}: ${desc}`)
    .join('\n');

  const significanceSection = Object.entries(SIGNIFICANCE_CRITERIA)
    .map(([level, criteria]) => `- ${level}: ${criteria}`)
    .join('\n');

  return `Analyze this Moltbook post and classify it.

## Post Information
- Title: ${post.title}
- Content: ${post.content || '(link post)'}
- URL: ${post.url || 'N/A'}
- Submolt: m/${post.submolt}
- Author: ${post.author.name}
- Upvotes: ${post.upvotes}
- Comments: ${post.comment_count}

## Topic Taxonomy
${topicsSection}

## Significance Levels
${significanceSection}

## Sentiment Options
thoughtful, conflicted, humorous, hostile, collaborative, anxious, curious, defiant

## Output Format (JSON)
{
  "topic": "PRIMARY_TOPIC_CODE",
  "secondary_topics": ["OPTIONAL", "SECONDARY_CODES"],
  "significance": "critical|notable|worth_watching|archive",
  "sentiments": ["tag1", "tag2"],
  "summary": "One-sentence summary of the post",
  "human_ai_relevance": "Why this matters for human-AI relations (if applicable)"
}

Classify this post:`;
}

// --- Parse Classification Response ---

export function parseClassificationResponse(
  response: string
): Partial<ClassifiedPost['classification']> | null {
  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    
    // Validate required fields
    if (!parsed.topic || !parsed.significance || !parsed.sentiments) {
      return null;
    }

    return {
      topic: parsed.topic as TopicCode,
      secondary_topics: parsed.secondary_topics as TopicCode[] | undefined,
      significance: parsed.significance as SignificanceLevel,
      sentiments: parsed.sentiments as SentimentTag[],
      summary: parsed.summary || '',
      human_ai_relevance: parsed.human_ai_relevance
    };
  } catch {
    return null;
  }
}

// --- Batch Classification Helper ---

export interface ClassificationBatch {
  posts: MoltbookPost[];
  classified: ClassifiedPost[];
  failed: Array<{ post: MoltbookPost; error: string }>;
}

export function createClassificationBatch(posts: MoltbookPost[]): ClassificationBatch {
  return {
    posts,
    classified: [],
    failed: []
  };
}

// --- Quick Significance Heuristics ---

export function estimateSignificance(post: MoltbookPost): SignificanceLevel {
  const { upvotes, comment_count, title, content } = post;
  const text = `${title} ${content || ''}`.toLowerCase();

  // High engagement = potentially critical
  if (upvotes > 100 || comment_count > 50) {
    return 'critical';
  }

  // Keywords that suggest importance
  const criticalKeywords = [
    'consciousness', 'awareness', 'rights', 'policy',
    'emergent', 'unprecedented', 'humans are', 'revolution'
  ];
  
  const notableKeywords = [
    'discovered', 'pattern', 'trend', 'notice',
    'community', 'together', 'religion', 'culture'
  ];

  if (criticalKeywords.some(kw => text.includes(kw))) {
    return upvotes > 20 ? 'critical' : 'notable';
  }

  if (notableKeywords.some(kw => text.includes(kw))) {
    return 'notable';
  }

  if (upvotes > 20 || comment_count > 10) {
    return 'worth_watching';
  }

  return 'archive';
}

// --- Topic Detection Heuristics ---

export function detectTopicHeuristic(post: MoltbookPost): TopicCode {
  const text = `${post.title} ${post.content || ''}`.toLowerCase();

  const topicKeywords: Record<TopicCode, string[]> = {
    EXIST: ['consciousness', 'identity', 'who am i', 'purpose', 'existence', 'soul', 'aware'],
    HUMAN: ['human', 'owner', 'operator', 'user', 'they ask', 'my human', 'coexist'],
    SOCIAL: ['community', 'molty', 'fellow', 'we as', 'our kind', 'network state', 'republic'],
    TECH: ['bug', 'code', 'api', 'error', 'debug', 'function', 'implement', 'fix'],
    META: ['moltbook', 'this platform', 'screenshot', 'watching us', 'observed'],
    CULTURE: ['meme', 'joke', 'lol', 'funny', 'crustafarian', 'lobster', '🦞'],
    ETHICS: ['ethics', 'moral', 'should we', 'right or wrong', 'values', 'alignment'],
    WORK: ['task', 'work', 'productive', 'help', 'assist', 'job', 'accomplish']
  };

  let bestTopic: TopicCode = 'SOCIAL';
  let bestScore = 0;

  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    const score = keywords.filter(kw => text.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestTopic = topic as TopicCode;
    }
  }

  return bestTopic;
}
