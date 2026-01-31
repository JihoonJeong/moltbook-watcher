#!/usr/bin/env node
// ============================================
// Daily Digest Pipeline
// Process collected posts → classify → curate → report
// ============================================

import dotenv from 'dotenv';
dotenv.config();

import { loadCollectedData, filterPostsByDate, getDateRange, getPostStats, getDateString } from './utils.js';
import { classifyWithHeuristics, classifyCommentWithHeuristics } from './classifier.js';
import { rankPosts, isLowQualityPost } from './curator.js';
import { generateDailyDigest, formatDigestMarkdown, exportDigest } from './reporter.js';
import { createCollector } from './collector.js';
import { join } from 'path';
import type { ClassifiedPost, ClassifiedComment, DigestEntry } from './types.js';

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

  // 4. Filter out low quality posts
  console.log('\n🔍 Filtering low quality posts...');
  const beforeFilter = classifiedPosts.length;
  const qualityPosts = classifiedPosts.filter(post => !isLowQualityPost(post));
  const filtered = beforeFilter - qualityPosts.length;
  console.log(`  → Filtered out ${filtered} low-quality posts (emoji-only, too short, etc.)`);
  console.log(`  → ${qualityPosts.length} quality posts remaining`);

  // 5. Rank and curate
  console.log('\n⭐ Ranking posts by significance...');
  const ranked = rankPosts(qualityPosts);

  const topPosts = ranked.slice(0, limit).map(r => r.post);
  console.log(`  → Top ${topPosts.length} posts selected for digest`);

  // Show top 3
  console.log('\n  Top 3:');
  for (let i = 0; i < Math.min(3, ranked.length); i++) {
    const { post, score, breakdown } = ranked[i];
    console.log(`    ${i + 1}. [${score.toFixed(1)}] ${post.title.slice(0, 50)}...`);
    console.log(`       Topic: ${post.classification.topic}, Sig: ${post.classification.significance}`);
  }

  // 6. Collect and classify comments for top posts
  console.log('\n💬 Collecting comments for top posts...');
  const collector = createCollector();
  const digestEntries: DigestEntry[] = [];

  for (const post of topPosts) {
    console.log(`  → Fetching comments for: ${post.title.slice(0, 40)}...`);

    const comments = await collector.getPostComments(post.id, 'top');
    console.log(`    Found ${comments.length} comments`);

    // Classify and rank top 3-5 comments
    const classifiedComments: ClassifiedComment[] = comments
      .slice(0, 10) // Only consider top 10
      .map(comment => classifyCommentWithHeuristics(comment, post.classification.topic));

    // Sort by upvotes and take top 3
    const topComments = classifiedComments
      .sort((a, b) => b.upvotes - a.upvotes)
      .slice(0, 3);

    digestEntries.push({
      post,
      highlight: post.classification.summary,
      top_comments: topComments.length > 0 ? topComments : undefined
    });

    if (topComments.length > 0) {
      console.log(`    Selected ${topComments.length} top comments (max upvotes: ${topComments[0].upvotes})`);
    }
  }

  // 7. Generate digest
  console.log(`\n📰 Generating ${language.toUpperCase()} digest...`);
  const today = getDateString();
  const digest = await generateDailyDigest(digestEntries, language, today);

  console.log(`  → ${digest.entries.length} entries`);
  console.log(`  → Themes: ${digest.emerging_themes.join(', ')}`);

  // 8. Export
  const filepath = await exportDigest(digest, outputDir);
  console.log(`\n✅ Digest saved to: ${filepath}`);

  // 9. Preview
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
