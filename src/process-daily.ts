#!/usr/bin/env node
// ============================================
// Daily Digest Pipeline
// Process collected posts → classify → curate → report
// ============================================

import dotenv from 'dotenv';
dotenv.config();

import { loadCollectedData, filterPostsByDate, getDateRange, getPostStats, getDateString } from './utils.js';
import { classifyWithHeuristics, classifyCommentWithHeuristics } from './classifier.js';
import { rankPosts, isLowQualityPost, curateHybridDigest, recordDigestAppearance, saveReputationData, isSpamPost, recordSpamBlock } from './curator.js';
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

  // 5. Hybrid curation (Fresh + Trending)
  console.log('\n🆕 Curating hybrid digest (Fresh + Trending)...');
  const { fresh, trending } = curateHybridDigest(qualityPosts, {
    maxFresh: Math.ceil(limit / 2),       // Half for fresh
    maxTrending: Math.floor(limit / 2),   // Half for trending
    freshHours: 24
  });

  console.log(`  → ${fresh.length} fresh posts (24h or less)`);
  console.log(`  → ${trending.length} trending posts (older but popular)`);

  // Show top posts from each section
  console.log('\n  🆕 Top Fresh:');
  for (let i = 0; i < Math.min(3, fresh.length); i++) {
    const { post, score } = fresh[i];
    const age = ((Date.now() - new Date(post.created_at).getTime()) / (1000 * 60 * 60)).toFixed(1);
    console.log(`    ${i + 1}. [${score.toFixed(1)}] ${post.title.slice(0, 50)}... (${age}h old)`);
    console.log(`       Topic: ${post.classification.topic}, Sig: ${post.classification.significance}`);
  }

  if (trending.length > 0) {
    console.log('\n  🔥 Top Trending:');
    for (let i = 0; i < Math.min(3, trending.length); i++) {
      const { post, score } = trending[i];
      const age = ((Date.now() - new Date(post.created_at).getTime()) / (1000 * 60 * 60)).toFixed(1);
      console.log(`    ${i + 1}. [${score.toFixed(1)}] ${post.title.slice(0, 50)}... (${age}h old)`);
      console.log(`       Topic: ${post.classification.topic}, Sig: ${post.classification.significance}`);
    }
  }

  // 6. Collect and classify comments for all posts
  console.log('\n💬 Collecting comments for selected posts...');
  const collector = createCollector();
  const freshEntries: DigestEntry[] = [];
  const trendingEntries: DigestEntry[] = [];

  // Process fresh posts
  for (const { post } of fresh) {
    const comments = await collector.getPostComments(post.id, 'top');
    const classifiedComments: ClassifiedComment[] = comments
      .slice(0, 10)
      .map(comment => classifyCommentWithHeuristics(comment, post.classification.topic));
    const topComments = classifiedComments
      .sort((a, b) => b.upvotes - a.upvotes)
      .slice(0, 3);

    freshEntries.push({
      post,
      highlight: post.classification.summary,
      top_comments: topComments.length > 0 ? topComments : undefined
    });
  }

  // Process trending posts
  for (const { post } of trending) {
    const comments = await collector.getPostComments(post.id, 'top');
    const classifiedComments: ClassifiedComment[] = comments
      .slice(0, 10)
      .map(comment => classifyCommentWithHeuristics(comment, post.classification.topic));
    const topComments = classifiedComments
      .sort((a, b) => b.upvotes - a.upvotes)
      .slice(0, 3);

    trendingEntries.push({
      post,
      highlight: post.classification.summary,
      top_comments: topComments.length > 0 ? topComments : undefined
    });
  }

  console.log(`  → Processed ${freshEntries.length} fresh + ${trendingEntries.length} trending posts`);

  // Combine for backward compatibility
  const digestEntries = [...freshEntries, ...trendingEntries];

  // 7. Generate digest
  console.log(`\n📰 Generating ${language.toUpperCase()} digest...`);
  const today = getDateString();
  const digest = await generateDailyDigest(digestEntries, language, today, {
    freshEntries,
    trendingEntries
  });

  console.log(`  → ${digest.fresh_entries.length} fresh + ${digest.trending_entries.length} trending = ${digest.entries.length} total`);
  console.log(`  → Themes: ${digest.emerging_themes.join(', ')}`);

  // 8. Update Reputation System (English only - Korean is just translation)
  if (language === 'en') {
    console.log('\n⭐ Updating reputation data...');

    // Record digest appearances
    for (const entry of digestEntries) {
      const authorName = entry.post.author?.name;
      if (authorName) {
        recordDigestAppearance(authorName, today);
      }
    }

    // Record spam blocks
    const spamPosts = classifiedPosts.filter(post =>
      !isLowQualityPost(post) && isSpamPost(post)
    );
    for (const post of spamPosts) {
      const authorName = post.author?.name;
      if (authorName) {
        // Detect reason from title/content
        let reason = 'Spam detected';
        if (/pump\.fun|pumpfun/i.test(post.title + post.content)) {
          reason = 'Crypto token promotion';
        } else if (/btc|bitcoin.*intel|price|dca/i.test(post.title + post.content)) {
          reason = 'Crypto trading signals';
        }
        recordSpamBlock(authorName, today, reason);
      }
    }

    // Save updated reputation data
    saveReputationData();
  } else {
    console.log('\n⭐ Skipping reputation update (translation only)');
  }

  // 9. Export
  const filepath = await exportDigest(digest, outputDir);
  console.log(`\n✅ Digest saved to: ${filepath}`);

  // 10. Preview
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
