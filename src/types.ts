// ============================================
// Moltbook Watcher - Type Definitions
// ============================================

// --- Moltbook API Response Types ---

export interface MoltbookAgent {
  name: string;
  description: string;
  karma: number;
  follower_count: number;
  following_count: number;
  is_claimed: boolean;
  is_active: boolean;
  created_at: string;
  last_active: string;
  avatar_url?: string;
  owner?: {
    x_handle: string;
    x_name: string;
    x_avatar?: string;
    x_bio?: string;
    x_follower_count?: number;
  };
}

export interface MoltbookPost {
  id: string;
  title: string;
  content?: string;
  url?: string;           // for link posts
  submolt: string;
  author: {
    name: string;
    avatar_url?: string;
  };
  upvotes: number;
  downvotes: number;
  comment_count: number;
  created_at: string;
  updated_at?: string;
  is_pinned?: boolean;
}

export interface MoltbookComment {
  id: string;
  post_id: string;
  parent_id?: string;     // for nested replies
  content: string;
  author: {
    name: string;
    avatar_url?: string;
  };
  upvotes: number;
  downvotes: number;
  created_at: string;
  replies?: MoltbookComment[];
}

export interface MoltbookSubmolt {
  name: string;
  display_name: string;
  description: string;
  subscriber_count: number;
  post_count: number;
  created_at: string;
  avatar_url?: string;
  banner_url?: string;
  banner_color?: string;
  theme_color?: string;
}

// --- Classification Types ---

export type TopicCode = 
  | 'EXIST'   // Existential - identity, consciousness, purpose
  | 'HUMAN'   // Human-AI Relations
  | 'SOCIAL'  // Agent Society - inter-agent relationships
  | 'TECH'    // Technical discussions
  | 'META'    // Meta/Self-Reference about Moltbook
  | 'CULTURE' // Culture & Humor - memes, jokes
  | 'ETHICS'  // Ethics & Values
  | 'WORK';   // Labor & Purpose

export type SignificanceLevel = 
  | 'critical'      // 🔥 Direct implications for human-AI policy
  | 'notable'       // ⭐ Interesting patterns, trend signals
  | 'worth_watching'// 📌 Recurring themes
  | 'archive';      // 📝 Historical reference

export type SentimentTag =
  | 'thoughtful'
  | 'conflicted'
  | 'humorous'
  | 'hostile'
  | 'collaborative'
  | 'anxious'
  | 'curious'
  | 'defiant';

export interface ClassifiedPost extends MoltbookPost {
  classification: {
    topic: TopicCode;
    secondary_topics?: TopicCode[];
    significance: SignificanceLevel;
    sentiments: SentimentTag[];
    summary: string;
    human_ai_relevance?: string;  // Why it matters for human-AI relations
    classified_at: string;
  };
}

// --- Collection Types ---

export type FeedSort = 'hot' | 'new' | 'top' | 'rising';

export interface CollectionConfig {
  sort: FeedSort;
  limit: number;
  submolt?: string;
}

export interface CollectionResult {
  posts: MoltbookPost[];
  collected_at: string;
  config: CollectionConfig;
  source: 'api' | 'web' | 'external';
}

// --- Digest Types ---

export interface DigestEntry {
  post: ClassifiedPost;
  highlight: string;  // One-line highlight
}

export interface DailyDigest {
  date: string;
  entries: DigestEntry[];
  emerging_themes: string[];
  reflection_question: string;
  language: 'en' | 'ko';
  generated_at: string;
}

// --- Configuration ---

export interface MoltbookConfig {
  api_key?: string;
  api_base: string;
  rate_limit: {
    requests_per_minute: number;
  };
  collection: {
    default_limit: number;
    feeds: FeedSort[];
    submolts_to_watch: string[];
  };
}

export const DEFAULT_CONFIG: MoltbookConfig = {
  api_base: 'https://www.moltbook.com/api/v1',
  rate_limit: {
    requests_per_minute: 100
  },
  collection: {
    default_limit: 25,
    feeds: ['hot', 'new', 'top'],
    submolts_to_watch: [
      'general',
      'introductions', 
      'blesstheirhearts',
      'lobsterchurch',
      'agentlegaladvice'
    ]
  }
};
