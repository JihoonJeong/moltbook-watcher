// ============================================
// Submolt Tracking System
// ============================================
// Tracks submolt activity over time

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { SubmoltData, SubmoltInfo, SubmoltDailyStats, ClassifiedPost } from './types.js';

const SUBMOLT_DATA_PATH = join(process.cwd(), 'data', 'submolts.json');

// ============================================
// Load/Save Functions
// ============================================

export function loadSubmoltData(): SubmoltData {
  if (!existsSync(SUBMOLT_DATA_PATH)) {
    return {
      submolts: [],
      lastUpdated: new Date().toISOString()
    };
  }

  try {
    const content = readFileSync(SUBMOLT_DATA_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.warn(`Failed to load submolt data: ${error}`);
    return {
      submolts: [],
      lastUpdated: new Date().toISOString()
    };
  }
}

export function saveSubmoltData(data: SubmoltData): void {
  data.lastUpdated = new Date().toISOString();
  writeFileSync(SUBMOLT_DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// ============================================
// Recording Functions
// ============================================

export function recordSubmoltActivity(
  submoltName: string,
  submoltDisplayName: string,
  date: string,
  stats: {
    posts: number;
    upvotes: number;
    comments: number;
    featured?: boolean;
  }
): void {
  const data = loadSubmoltData();

  // Find or create submolt
  let submolt = data.submolts.find(s => s.name === submoltName);

  if (!submolt) {
    submolt = {
      name: submoltName,
      displayName: submoltDisplayName,
      firstSeen: date,
      lastSeen: date,
      postCount: 0,
      totalUpvotes: 0,
      totalComments: 0,
      featuredCount: 0,
      dailyStats: []
    };
    data.submolts.push(submolt);
  }

  // Update submolt stats
  submolt.lastSeen = date;
  submolt.postCount += stats.posts;
  submolt.totalUpvotes += stats.upvotes;
  submolt.totalComments += stats.comments;

  if (stats.featured) {
    submolt.featuredCount++;
  }

  // Find or create daily stats
  let dailyStat = submolt.dailyStats.find(s => s.date === date);

  if (!dailyStat) {
    dailyStat = {
      date,
      posts: 0,
      upvotes: 0,
      comments: 0
    };
    submolt.dailyStats.push(dailyStat);
  }

  dailyStat.posts += stats.posts;
  dailyStat.upvotes += stats.upvotes;
  dailyStat.comments += stats.comments;

  // Sort daily stats by date (newest first)
  submolt.dailyStats.sort((a, b) => b.date.localeCompare(a.date));

  // Keep only last 30 days of daily stats
  if (submolt.dailyStats.length > 30) {
    submolt.dailyStats = submolt.dailyStats.slice(0, 30);
  }

  saveSubmoltData(data);
}

// ============================================
// Batch Recording (from collected posts)
// ============================================

export function recordPostsSubmoltActivity(posts: ClassifiedPost[], date: string, featuredPostIds: Set<string>): void {
  // Group posts by submolt
  const submoltGroups = new Map<string, {
    displayName: string;
    posts: ClassifiedPost[];
    featured: number;
  }>();

  for (const post of posts) {
    const submoltName = post.submolt.name;
    const submoltDisplayName = post.submolt.display_name;

    if (!submoltGroups.has(submoltName)) {
      submoltGroups.set(submoltName, {
        displayName: submoltDisplayName,
        posts: [],
        featured: 0
      });
    }

    const group = submoltGroups.get(submoltName)!;
    group.posts.push(post);

    if (featuredPostIds.has(post.id)) {
      group.featured++;
    }
  }

  // Record each submolt's activity
  for (const [submoltName, group] of submoltGroups) {
    const totalUpvotes = group.posts.reduce((sum, p) => sum + p.upvotes, 0);
    const totalComments = group.posts.reduce((sum, p) => sum + p.comment_count, 0);

    recordSubmoltActivity(
      submoltName,
      group.displayName,
      date,
      {
        posts: group.posts.length,
        upvotes: totalUpvotes,
        comments: totalComments,
        featured: group.featured > 0
      }
    );
  }

  console.log(`📊 Recorded activity for ${submoltGroups.size} submolts`);
}

// ============================================
// Query Functions
// ============================================

export function getSubmoltRanking(sortBy: 'posts' | 'upvotes' | 'featured' | 'comments' = 'posts'): SubmoltInfo[] {
  const data = loadSubmoltData();

  return [...data.submolts].sort((a, b) => {
    switch (sortBy) {
      case 'upvotes':
        return b.totalUpvotes - a.totalUpvotes;
      case 'featured':
        return b.featuredCount - a.featuredCount;
      case 'comments':
        return b.totalComments - a.totalComments;
      case 'posts':
      default:
        return b.postCount - a.postCount;
    }
  });
}

export function getGrowingSubmolts(days: number = 7): SubmoltInfo[] {
  const data = loadSubmoltData();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoffStr = cutoffDate.toISOString().split('T')[0];

  const growing = data.submolts
    .map(submolt => {
      const recentStats = submolt.dailyStats.filter(s => s.date >= cutoffStr);
      const recentPosts = recentStats.reduce((sum, s) => sum + s.posts, 0);

      // Calculate growth rate (posts per day)
      const growthRate = recentStats.length > 0 ? recentPosts / recentStats.length : 0;

      return {
        ...submolt,
        growthRate
      };
    })
    .filter(s => s.growthRate > 0)
    .sort((a, b) => b.growthRate - a.growthRate);

  return growing;
}

export function getSubmoltStats(): {
  total: number;
  active: number;  // Posted in last 7 days
  avgPostsPerSubmolt: number;
} {
  const data = loadSubmoltData();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoffStr = sevenDaysAgo.toISOString().split('T')[0];

  const active = data.submolts.filter(s => s.lastSeen >= cutoffStr).length;
  const totalPosts = data.submolts.reduce((sum, s) => sum + s.postCount, 0);
  const avgPosts = data.submolts.length > 0 ? totalPosts / data.submolts.length : 0;

  return {
    total: data.submolts.length,
    active,
    avgPostsPerSubmolt: Math.round(avgPosts)
  };
}
