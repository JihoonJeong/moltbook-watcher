// ============================================
// Moltbook Watcher - Utilities
// ============================================

import { MoltbookPost, ClassifiedPost } from './types.js';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';

// --- Deduplication ---

export function deduplicatePosts<T extends MoltbookPost>(posts: T[]): T[] {
  const seen = new Set<string>();
  const unique: T[] = [];

  for (const post of posts) {
    if (!seen.has(post.id)) {
      seen.add(post.id);
      unique.push(post);
    }
  }

  return unique;
}

// --- File Utilities ---

export async function loadCollectedData(
  dataDir: string,
  pattern?: RegExp
): Promise<MoltbookPost[]> {
  const files = await readdir(dataDir);
  const jsonFiles = files.filter(f =>
    f.endsWith('.json') && (!pattern || pattern.test(f))
  );

  const allPosts: MoltbookPost[] = [];

  for (const file of jsonFiles) {
    const content = await readFile(join(dataDir, file), 'utf-8');
    const data = JSON.parse(content);

    // Handle different collection formats
    if (data.hot && Array.isArray(data.hot)) {
      allPosts.push(...data.hot);
    }
    if (data.new && Array.isArray(data.new)) {
      allPosts.push(...data.new);
    }
    if (data.posts && Array.isArray(data.posts)) {
      allPosts.push(...data.posts);
    }
  }

  return deduplicatePosts(allPosts);
}

// --- Date Utilities ---

export function getDateString(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

export function getDateRange(daysAgo: number): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - daysAgo);
  return { start, end };
}

export function filterPostsByDate(
  posts: MoltbookPost[],
  startDate: Date,
  endDate: Date = new Date()
): MoltbookPost[] {
  return posts.filter(post => {
    const created = new Date(post.created_at);
    return created >= startDate && created <= endDate;
  });
}

// --- Post Statistics ---

export function getPostStats(posts: MoltbookPost[]): {
  total: number;
  totalUpvotes: number;
  totalComments: number;
  avgUpvotes: number;
  avgComments: number;
  dateRange: { earliest: string; latest: string };
} {
  if (posts.length === 0) {
    return {
      total: 0,
      totalUpvotes: 0,
      totalComments: 0,
      avgUpvotes: 0,
      avgComments: 0,
      dateRange: { earliest: '', latest: '' }
    };
  }

  const totalUpvotes = posts.reduce((sum, p) => sum + p.upvotes, 0);
  const totalComments = posts.reduce((sum, p) => sum + p.comment_count, 0);

  const dates = posts.map(p => new Date(p.created_at).getTime()).sort();

  return {
    total: posts.length,
    totalUpvotes,
    totalComments,
    avgUpvotes: totalUpvotes / posts.length,
    avgComments: totalComments / posts.length,
    dateRange: {
      earliest: new Date(dates[0]).toISOString(),
      latest: new Date(dates[dates.length - 1]).toISOString()
    }
  };
}

// --- ID Tracking ---

export interface LastSeenState {
  lastPostId?: string;
  lastCollectedAt?: string;
  totalPostsSeen: number;
}

export function updateLastSeen(
  posts: MoltbookPost[],
  currentState: LastSeenState = { totalPostsSeen: 0 }
): LastSeenState {
  if (posts.length === 0) return currentState;

  // Sort by created_at descending (most recent first)
  const sorted = [...posts].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return {
    lastPostId: sorted[0].id,
    lastCollectedAt: new Date().toISOString(),
    totalPostsSeen: currentState.totalPostsSeen + posts.length
  };
}
