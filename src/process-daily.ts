#!/usr/bin/env node
// ============================================
// Daily Digest Pipeline
// Process collected posts → classify → curate → report
// ============================================

import dotenv from 'dotenv';
dotenv.config();

import { loadCollectedData, filterPostsByDate, getDateRange, getPostStats, getDateString } from './utils.js';
import { classifyWithHeuristics } from './classifier.js';
import { rankPosts } from './curator.js';
import { generateDailyDigest, formatDigestMarkdown, exportDigest } from './reporter.js';
import { join } from 'path';
import type { ClassifiedPost } from './types.js';

interface ProcessOptions {
  dataDir?: string;
  outputDir?: string;
  daysAgo?: number;
  language?: 'en' | 'ko';
  limit?: number;
}

async function processDailyDigest(options: ProcessOptions = {}) {
  const {
    dataDir = join(process.cwd(), 'data', 'posts'),
    outputDir = join(process.cwd(), 'output', 'digest'),
    daysAgo = 1,
    language = 'en',
    limit = 10
  } = options;

  console.log('🦞 Moltbook Daily Digest Pipeline\n');
  console.log('='.repeat(50));

  // 1. Load collected data
  console.log('\n📂 Loading collected posts...');
  const allPosts = await loadCollectedData(dataDir);
  console.log(`  → ${allPosts.length} total posts loaded`);

  // 2. Filter by date
  const { start, end } = getDateRange(daysAgo);
  const recentPosts = filterPostsByDate(allPosts, start, end);
  console.log(`  → ${recentPosts.length} posts from last ${daysAgo} day(s)`);

  const stats = getPostStats(recentPosts);
  console.log(`  → Date range: ${stats.dateRange.earliest.split('T')[0]} to ${stats.dateRange.latest.split('T')[0]}`);
  console.log(`  → Avg upvotes: ${stats.avgUpvotes.toFixed(1)}, Avg comments: ${stats.avgComments.toFixed(1)}`);

  if (recentPosts.length === 0) {
    console.log('\n⚠️  No posts to process. Exiting.');
    return;
  }

  // 3. Classify posts
  console.log('\n🏷️  Classifying posts (heuristic-based)...');
  const classifiedPosts: ClassifiedPost[] = recentPosts.map(post =>
    classifyWithHeuristics(post)
  );

  console.log(`  → ${classifiedPosts.length} posts classified`);

  // 4. Rank and curate
  console.log('\n⭐ Ranking posts by significance...');
  const ranked = rankPosts(classifiedPosts);

  const topPosts = ranked.slice(0, limit).map(r => r.post);
  console.log(`  → Top ${topPosts.length} posts selected for digest`);

  // Show top 3
  console.log('\n  Top 3:');
  for (let i = 0; i < Math.min(3, ranked.length); i++) {
    const { post, score, breakdown } = ranked[i];
    console.log(`    ${i + 1}. [${score.toFixed(1)}] ${post.title.slice(0, 50)}...`);
    console.log(`       Topic: ${post.classification.topic}, Sig: ${post.classification.significance}`);
  }

  // 5. Generate digest
  console.log(`\n📰 Generating ${language.toUpperCase()} digest...`);
  const today = getDateString();
  const digest = generateDailyDigest(topPosts, language, today);

  console.log(`  → ${digest.entries.length} entries`);
  console.log(`  → Themes: ${digest.emerging_themes.join(', ')}`);

  // 6. Export
  const filepath = await exportDigest(digest, outputDir);
  console.log(`\n✅ Digest saved to: ${filepath}`);

  // 7. Preview
  console.log('\n' + '='.repeat(50));
  console.log('PREVIEW:\n');
  const markdown = formatDigestMarkdown(digest);
  console.log(markdown.slice(0, 2000));
  if (markdown.length > 2000) {
    console.log('\n... [truncated]');
  }
  console.log('\n' + '='.repeat(50));

  console.log('\n✨ Pipeline complete!');
}

// CLI
const args = process.argv.slice(2);
const language = (args[0] === 'ko' ? 'ko' : 'en') as 'en' | 'ko';
const daysAgo = args[1] ? parseInt(args[1]) : 1;

processDailyDigest({ language, daysAgo }).catch(console.error);
