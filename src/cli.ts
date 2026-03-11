#!/usr/bin/env node
// ============================================
// Moltbook Watcher CLI
// ============================================

import dotenv from 'dotenv';
import { createCollector } from './collector.js';

// Load environment variables from .env file
dotenv.config();
import { getClassifiedSamples } from './sample-data.js';
import { generateDailyDigest, formatDigestMarkdown, exportDigest } from './reporter.js';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const COMMANDS = {
  collect: 'Collect posts from Moltbook feeds',
  digest: 'Generate daily digest from collected posts',
  status: 'Check API key status',
  demo: 'Run demo with sample data',
  help: 'Show this help message'
};

async function runCollect() {
  console.log('📡 Collecting Moltbook posts...\n');
  
  const collector = createCollector();

  console.log('Fetching hot posts...');
  const hot = await collector.getHotPosts(25);
  console.log(`  → ${hot.posts.length} posts collected`);

  console.log('Fetching new posts...');
  const newPosts = await collector.getNewPosts(25);
  console.log(`  → ${newPosts.posts.length} posts collected`);

  // Save to data directory
  const dataDir = join(process.cwd(), 'data', 'posts');
  await mkdir(dataDir, { recursive: true });
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filepath = join(dataDir, `collection-${timestamp}.json`);
  
  await writeFile(filepath, JSON.stringify({
    collected_at: new Date().toISOString(),
    hot: hot.posts,
    new: newPosts.posts
  }, null, 2));

  console.log(`\n✅ Saved to ${filepath}`);
}

async function runDigest(language: 'en' | 'ko' = 'en') {
  console.log(`📰 Generating ${language.toUpperCase()} digest...\n`);
  
  // For now, use sample data
  // TODO: Load from collected data
  const posts = getClassifiedSamples();
  
  const today = new Date().toISOString().split('T')[0];
  const digest = generateDailyDigest(posts, language, today);
  
  const outputDir = join(process.cwd(), 'output', 'digest');
  const filepath = await exportDigest(digest, outputDir);
  
  console.log(formatDigestMarkdown(digest));
  console.log(`\n✅ Saved to ${filepath}`);
}

async function runStatus() {
  console.log('🔍 Checking Moltbook API status...\n');
  
  const collector = createCollector();
  const status = await collector.checkStatus();
  
  console.log(`API Key: ${status.hasKey ? '✅ Configured' : '❌ Not configured'}`);
  if (status.status) {
    console.log(`Status: ${status.status}`);
  }
  if (status.error) {
    console.log(`Error: ${status.error}`);
  }
}

async function runDemo() {
  console.log('🎭 Running demo with sample data...\n');
  
  // Import and run test
  const { default: runTest } = await import('./test.js');
}

function showHelp() {
  console.log('🦞 Moltbook Watcher CLI\n');
  console.log('Usage: npm run <command> [options]\n');
  console.log('Commands:');
  for (const [cmd, desc] of Object.entries(COMMANDS)) {
    console.log(`  ${cmd.padEnd(12)} ${desc}`);
  }
  console.log('\nExamples:');
  console.log('  npm run collect           Collect posts from Moltbook');
  console.log('  npm run digest            Generate English digest');
  console.log('  npx tsx src/cli.ts digest ko   Generate Korean digest');
}

// Main
const args = process.argv.slice(2);
const command = args[0] || 'help';

switch (command) {
  case 'collect':
    runCollect();
    break;
  case 'digest':
    const lang = (args[1] === 'ko' ? 'ko' : 'en') as 'en' | 'ko';
    runDigest(lang);
    break;
  case 'status':
    runStatus();
    break;
  case 'demo':
    runDemo();
    break;
  case 'help':
  default:
    showHelp();
}
