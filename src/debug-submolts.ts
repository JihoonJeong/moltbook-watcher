#!/usr/bin/env tsx
// ============================================
// Submolt Statistics Debug Script
// ============================================
// Analyzes submolt distribution in collected posts
// and featured digest entries

import fs from 'fs';
import path from 'path';

interface SubmoltInfo {
  id: string;
  name: string;
  display_name: string;
}

interface Post {
  id: string;
  title: string;
  submolt: SubmoltInfo;
  upvotes: number;
  comment_count: number;
  created_at: string;
  author: {
    name: string;
  };
}

interface CollectionData {
  collected_at: string;
  hot: Post[];
  new: Post[];
}

interface SubmoltStats {
  name: string;
  display_name: string;
  count: number;
  total_upvotes: number;
  total_comments: number;
  avg_upvotes: number;
  avg_comments: number;
  sample_posts: string[];
}

// ============================================
// Load Latest Collection
// ============================================

function getLatestCollection(): CollectionData {
  const dataDir = path.join(process.cwd(), 'data', 'posts');
  const files = fs.readdirSync(dataDir)
    .filter(f => f.startsWith('collection-') && f.endsWith('.json'))
    .sort()
    .reverse();

  if (files.length === 0) {
    throw new Error('No collection files found');
  }

  const latestFile = path.join(dataDir, files[0]);
  console.log(`📂 Loading: ${files[0]}\n`);

  return JSON.parse(fs.readFileSync(latestFile, 'utf-8'));
}

// ============================================
// Analyze Submolt Distribution
// ============================================

function analyzeSubmolts(collection: CollectionData): Map<string, SubmoltStats> {
  const allPosts = [...collection.hot, ...collection.new];
  const submoltMap = new Map<string, SubmoltStats>();

  for (const post of allPosts) {
    const submoltName = post.submolt.name;

    if (!submoltMap.has(submoltName)) {
      submoltMap.set(submoltName, {
        name: submoltName,
        display_name: post.submolt.display_name,
        count: 0,
        total_upvotes: 0,
        total_comments: 0,
        avg_upvotes: 0,
        avg_comments: 0,
        sample_posts: []
      });
    }

    const stats = submoltMap.get(submoltName)!;
    stats.count++;
    stats.total_upvotes += post.upvotes;
    stats.total_comments += post.comment_count;

    if (stats.sample_posts.length < 3) {
      stats.sample_posts.push(`"${post.title.slice(0, 50)}..." by @${post.author.name}`);
    }
  }

  // Calculate averages
  for (const stats of submoltMap.values()) {
    stats.avg_upvotes = Math.round(stats.total_upvotes / stats.count);
    stats.avg_comments = Math.round(stats.total_comments / stats.count);
  }

  return submoltMap;
}

// ============================================
// Analyze Featured Posts
// ============================================

function analyzeFeaturedSubmolts(): Map<string, number> {
  const digestDir = path.join(process.cwd(), 'output', 'digest', 'en');

  if (!fs.existsSync(digestDir)) {
    console.log('⚠️  No digest directory found\n');
    return new Map();
  }

  const files = fs.readdirSync(digestDir)
    .filter(f => f.startsWith('digest-') && f.endsWith('.md'))
    .sort()
    .reverse();

  if (files.length === 0) {
    console.log('⚠️  No digest files found\n');
    return new Map();
  }

  const latestDigest = path.join(digestDir, files[0]);
  const content = fs.readFileSync(latestDigest, 'utf-8');

  console.log(`📰 Analyzing featured posts from: ${files[0]}\n`);

  // Extract Moltbook URLs from digest
  const urlRegex = /https:\/\/www\.moltbook\.com\/post\/([a-f0-9-]+)/g;
  const postIds = [...content.matchAll(urlRegex)].map(m => m[1]);

  // Load latest collection to match post IDs to submolts
  const collection = getLatestCollection();
  const allPosts = [...collection.hot, ...collection.new];

  const submoltCount = new Map<string, number>();

  for (const postId of postIds) {
    const post = allPosts.find(p => p.id === postId);
    if (post) {
      const submoltName = post.submolt.name;
      submoltCount.set(submoltName, (submoltCount.get(submoltName) || 0) + 1);
    }
  }

  return submoltCount;
}

// ============================================
// Main
// ============================================

function main() {
  console.log('🔍 Submolt Statistics Debug\n');
  console.log('='.repeat(60));
  console.log();

  // Load and analyze collection
  const collection = getLatestCollection();
  const allPosts = [...collection.hot, ...collection.new];

  console.log(`📊 Total posts: ${allPosts.length}\n`);

  // Analyze submolt distribution
  const submoltStats = analyzeSubmolts(collection);
  const sortedStats = Array.from(submoltStats.values())
    .sort((a, b) => b.count - a.count);

  console.log('📈 Submolt Distribution:\n');
  console.log('Rank | Submolt | Count | % | Avg Upvotes | Avg Comments');
  console.log('-'.repeat(60));

  for (let i = 0; i < sortedStats.length; i++) {
    const stats = sortedStats[i];
    const percentage = ((stats.count / allPosts.length) * 100).toFixed(1);
    console.log(
      `${String(i + 1).padStart(2)}. | ` +
      `${stats.display_name.padEnd(20)} | ` +
      `${String(stats.count).padStart(3)} | ` +
      `${percentage.padStart(5)}% | ` +
      `${String(stats.avg_upvotes).padStart(11)} | ` +
      `${String(stats.avg_comments).padStart(12)}`
    );
  }

  console.log();
  console.log('='.repeat(60));
  console.log();

  // Show top 3 submolts with samples
  console.log('🔝 Top 3 Submolts (with samples):\n');

  for (let i = 0; i < Math.min(3, sortedStats.length); i++) {
    const stats = sortedStats[i];
    console.log(`${i + 1}. **${stats.display_name}** (${stats.count} posts)`);
    console.log(`   Avg Engagement: ⬆️ ${stats.avg_upvotes} | 💬 ${stats.avg_comments}`);
    console.log(`   Sample posts:`);
    stats.sample_posts.forEach((sample, idx) => {
      console.log(`     ${idx + 1}. ${sample}`);
    });
    console.log();
  }

  console.log('='.repeat(60));
  console.log();

  // Analyze featured posts
  const featuredSubmolts = analyzeFeaturedSubmolts();

  if (featuredSubmolts.size > 0) {
    console.log('⭐ Featured Posts Submolt Distribution:\n');

    const sortedFeatured = Array.from(featuredSubmolts.entries())
      .sort((a, b) => b[1] - a[1]);

    for (const [submolt, count] of sortedFeatured) {
      const stats = submoltStats.get(submolt);
      const displayName = stats?.display_name || submolt;
      console.log(`  - ${displayName}: ${count} posts`);
    }

    console.log();
  }

  console.log('='.repeat(60));
  console.log('✅ Analysis complete!\n');
}

main();
