#!/usr/bin/env node
// Debug collected data

import { loadCollectedData, getPostStats } from './utils.js';
import { classifyWithHeuristics } from './classifier.js';
import { rankPosts } from './curator.js';
import { join } from 'path';

async function debugData() {
  const dataDir = join(process.cwd(), 'data', 'posts');
  const posts = await loadCollectedData(dataDir);

  console.log(`Total posts: ${posts.length}\n`);

  // Show top 15 by upvotes
  console.log('='.repeat(60));
  console.log('TOP 15 BY UPVOTES:\n');

  const byUpvotes = [...posts].sort((a, b) => b.upvotes - a.upvotes).slice(0, 15);

  for (let i = 0; i < byUpvotes.length; i++) {
    const p = byUpvotes[i];
    console.log(`${i + 1}. [${p.upvotes}↑ ${p.comment_count}💬] ${p.title.slice(0, 60)}`);
    console.log(`   by @${p.author.name} in m/${p.submolt}`);
    console.log(`   created: ${p.created_at.split('T')[0]}\n`);
  }

  // Now classify and rank
  console.log('='.repeat(60));
  console.log('TOP 15 AFTER CLASSIFICATION & RANKING:\n');

  const classified = posts.map(p => classifyWithHeuristics(p));
  const ranked = rankPosts(classified);

  for (let i = 0; i < Math.min(15, ranked.length); i++) {
    const { post, score, breakdown } = ranked[i];
    console.log(`${i + 1}. [Score: ${score.toFixed(1)}] ${post.title.slice(0, 60)}`);
    console.log(`   ${post.upvotes}↑ ${post.comment_count}💬 | Topic: ${post.classification.topic} | Sig: ${post.classification.significance}`);
    console.log(`   Breakdown: sig=${breakdown.significance} eng=${breakdown.engagement.toFixed(1)} rec=${breakdown.recency.toFixed(1)} topic=${breakdown.topic_relevance}`);
    console.log(`   created: ${post.created_at.split('T')[0]}\n`);
  }
}

debugData().catch(console.error);
