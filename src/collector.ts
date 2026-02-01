// ============================================
// Moltbook Collector
// Fetches posts from Moltbook API
// ============================================

import {
  MoltbookPost,
  MoltbookComment,
  MoltbookSubmolt,
  MoltbookAgent,
  CollectionConfig,
  CollectionResult,
  FeedSort,
  DEFAULT_CONFIG
} from './types.js';

export class MoltbookCollector {
  private apiKey: string | undefined;
  private apiBase: string;
  private lastRequestTime: number = 0;
  private minRequestInterval: number; // ms between requests

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
    this.apiBase = DEFAULT_CONFIG.api_base;
    this.minRequestInterval = 60000 / DEFAULT_CONFIG.rate_limit.requests_per_minute;
  }

  // --- Rate Limiting ---
  
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minRequestInterval) {
      await this.sleep(this.minRequestInterval - elapsed);
    }
    this.lastRequestTime = Date.now();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // --- API Request Helper ---

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'API key not configured. Register at https://www.moltbook.com/skill.md'
      };
    }

    await this.rateLimit();

    const url = `${this.apiBase}${endpoint}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>
    };

    try {
      const response = await fetch(url, { ...options, headers });
      const json = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: json.error || `HTTP ${response.status}`
        };
      }

      return { success: true, data: json };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // --- Check API Key Status ---

  async checkStatus(): Promise<{ 
    hasKey: boolean; 
    status?: 'pending_claim' | 'claimed'; 
    error?: string 
  }> {
    if (!this.apiKey) {
      return { hasKey: false, error: 'No API key configured' };
    }

    const result = await this.request<{ status: string }>('/agents/status');
    if (!result.success) {
      return { hasKey: true, error: result.error };
    }

    return { 
      hasKey: true, 
      status: result.data?.status as 'pending_claim' | 'claimed'
    };
  }

  // --- Feed Collection ---

  async getFeed(config: Partial<CollectionConfig> = {}): Promise<CollectionResult> {
    const { sort = 'hot', limit = 25, submolt } = config;

    let endpoint = `/posts?sort=${sort}&limit=${limit}`;
    if (submolt) {
      endpoint = `/submolts/${submolt}/feed?sort=${sort}&limit=${limit}`;
    }

    const result = await this.request<{ posts?: MoltbookPost[] }>(endpoint);

    return {
      posts: result.success && result.data?.posts ? result.data.posts : [],
      collected_at: new Date().toISOString(),
      config: { sort, limit, submolt },
      source: 'api'
    };
  }

  async getHotPosts(limit = 25): Promise<CollectionResult> {
    return this.getFeed({ sort: 'hot', limit });
  }

  async getNewPosts(limit = 25): Promise<CollectionResult> {
    return this.getFeed({ sort: 'new', limit });
  }

  async getTopPosts(limit = 25): Promise<CollectionResult> {
    return this.getFeed({ sort: 'top', limit });
  }

  async getRisingPosts(limit = 25): Promise<CollectionResult> {
    return this.getFeed({ sort: 'rising', limit });
  }

  // --- Individual Post ---

  async getPost(postId: string): Promise<MoltbookPost | null> {
    const result = await this.request<{ post: MoltbookPost }>(`/posts/${postId}`);
    return result.success ? result.data?.post || null : null;
  }

  async getPostComments(
    postId: string,
    sort: 'top' | 'new' | 'controversial' = 'top'
  ): Promise<MoltbookComment[]> {
    // NOTE: The /posts/{id}/comments endpoint returns empty arrays.
    // Instead, we use the public web API endpoint /posts/{id} which includes comments.
    // This endpoint does not require authentication, so we use fetch directly.

    await this.rateLimit();

    const url = `${this.apiBase}/posts/${postId}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.error(`Failed to fetch comments: HTTP ${response.status}`);
        return [];
      }

      const json = await response.json();
      if (!json.success || !json.comments) {
        return [];
      }

      let comments = json.comments as MoltbookComment[];

      // Sort comments (API doesn't support sort parameter on this endpoint)
      if (sort === 'top') {
        comments = comments.sort((a, b) => b.upvotes - a.upvotes);
      } else if (sort === 'new') {
        comments = comments.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      } else if (sort === 'controversial') {
        // Controversial = high engagement but divisive (upvotes + downvotes, low ratio)
        comments = comments.sort((a, b) => {
          const aControversy = (a.upvotes + a.downvotes) * (1 - Math.abs(a.upvotes - a.downvotes) / Math.max(1, a.upvotes + a.downvotes));
          const bControversy = (b.upvotes + b.downvotes) * (1 - Math.abs(b.upvotes - b.downvotes) / Math.max(1, b.upvotes + b.downvotes));
          return bControversy - aControversy;
        });
      }

      return comments;
    } catch (error) {
      console.error('Error fetching comments:', error instanceof Error ? error.message : 'Unknown error');
      return [];
    }
  }

  // --- Submolts ---

  async getSubmolts(): Promise<MoltbookSubmolt[]> {
    const result = await this.request<{ submolts: MoltbookSubmolt[] }>('/submolts');
    return result.success ? result.data?.submolts || [] : [];
  }

  async getSubmolt(name: string): Promise<MoltbookSubmolt | null> {
    const result = await this.request<{ submolt: MoltbookSubmolt }>(`/submolts/${name}`);
    return result.success ? result.data?.submolt || null : null;
  }

  // --- Search ---

  async search(query: string, limit = 25): Promise<{
    posts: MoltbookPost[];
    agents: MoltbookAgent[];
    submolts: MoltbookSubmolt[];
  }> {
    const result = await this.request<{
      posts: MoltbookPost[];
      agents: MoltbookAgent[];
      submolts: MoltbookSubmolt[];
    }>(`/search?q=${encodeURIComponent(query)}&limit=${limit}`);

    return result.success && result.data
      ? result.data
      : { posts: [], agents: [], submolts: [] };
  }

  // --- Agent Profiles ---

  async getAgentProfile(name: string): Promise<MoltbookAgent | null> {
    const result = await this.request<{ agent: MoltbookAgent }>(
      `/agents/profile?name=${encodeURIComponent(name)}`
    );
    return result.success ? result.data?.agent || null : null;
  }

  // --- Bulk Collection ---

  async collectAllFeeds(limit = 25): Promise<Map<FeedSort, CollectionResult>> {
    const feeds: FeedSort[] = ['hot', 'new', 'top', 'rising'];
    const results = new Map<FeedSort, CollectionResult>();

    for (const sort of feeds) {
      const result = await this.getFeed({ sort, limit });
      results.set(sort, result);
    }

    return results;
  }

  async collectSubmoltFeeds(
    submolts: string[], 
    sort: FeedSort = 'hot',
    limit = 25
  ): Promise<Map<string, CollectionResult>> {
    const results = new Map<string, CollectionResult>();

    for (const submolt of submolts) {
      const result = await this.getFeed({ submolt, sort, limit });
      results.set(submolt, result);
    }

    return results;
  }
}

// --- Factory Function ---

export function createCollector(apiKey?: string): MoltbookCollector {
  const key = apiKey || process.env.MOLTBOOK_API_KEY;
  return new MoltbookCollector(key);
}
