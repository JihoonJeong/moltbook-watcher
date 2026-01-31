// ============================================
// Moltbook Watcher - Test & Demo
// ============================================

import { createCollector } from './collector.js';
import { 
  estimateSignificance, 
  detectTopicHeuristic,
  classifyManually 
} from './classifier.js';
import { curateForDigest, extractThemes, rankPosts } from './curator.js';
import { 
  generateDailyDigest, 
  formatDigestMarkdown,
  generateQuickSummary 
} from './reporter.js';
import { getSamplePosts, getClassifiedSamples } from './sample-data.js';
import type { ClassifiedPost } from './types.js';

async function main() {
  console.log('🦞 Moltbook Watcher - Test & Demo\n');
  console.log('='.repeat(50));

  // 1. Test Collector (API key check)
  console.log('\n📡 Testing Collector...');
  const collector = createCollector();
  const status = await collector.checkStatus();
  
  if (status.hasKey) {
    console.log(`  API Key: ✅ Found`);
    console.log(`  Status: ${status.status || status.error}`);
  } else {
    console.log(`  API Key: ❌ Not configured`);
    console.log(`  → Set MOLTBOOK_API_KEY or register at https://moltbook.com/skill.md`);
  }

  // 2. Test Heuristic Classification
  console.log('\n🏷️ Testing Heuristic Classification...');
  const samplePosts = getSamplePosts();
  
  for (const post of samplePosts.slice(0, 3)) {
    const topic = detectTopicHeuristic(post);
    const significance = estimateSignificance(post);
    console.log(`  "${post.title.slice(0, 40)}..."`);
    console.log(`    → Topic: ${topic}, Significance: ${significance}`);
  }

  // 3. Test Curation
  console.log('\n⭐ Testing Curation...');
  const classifiedPosts = getClassifiedSamples();
  const ranked = rankPosts(classifiedPosts);
  
  console.log('  Top 3 by score:');
  for (const { post, score, breakdown } of ranked.slice(0, 3)) {
    console.log(`    ${score.toFixed(1)} | ${post.title.slice(0, 35)}...`);
    console.log(`         sig=${breakdown.significance} eng=${breakdown.engagement.toFixed(1)} rec=${breakdown.recency.toFixed(1)}`);
  }

  // 4. Test Digest Generation (English)
  console.log('\n📰 Generating English Digest...');
  const digestEN = generateDailyDigest(classifiedPosts, 'en', '2026-01-30');
  console.log(`  Entries: ${digestEN.entries.length}`);
  console.log(`  Themes: ${digestEN.emerging_themes.join(', ')}`);
  console.log(`  Reflection: "${digestEN.reflection_question.slice(0, 50)}..."`);

  // 5. Test Digest Generation (Korean)
  console.log('\n📰 Generating Korean Digest...');
  const digestKO = generateDailyDigest(classifiedPosts, 'ko', '2026-01-30');
  console.log(`  Entries: ${digestKO.entries.length}`);
  console.log(`  Themes: ${digestKO.emerging_themes.join(', ')}`);
  console.log(`  Reflection: "${digestKO.reflection_question.slice(0, 50)}..."`);

  // 6. Generate Sample Markdown
  console.log('\n📄 Sample Digest Markdown (English):\n');
  console.log('-'.repeat(50));
  const markdown = formatDigestMarkdown(digestEN);
  // Print first 1500 chars
  console.log(markdown.slice(0, 1500));
  console.log('\n... [truncated]');
  console.log('-'.repeat(50));

  // 7. Quick Summary Test
  console.log('\n📊 Quick Summary:');
  const summary = generateQuickSummary(classifiedPosts, 'en');
  console.log(summary);

  console.log('\n✅ All tests completed!');
  console.log('\nNext steps:');
  console.log('  1. Get Moltbook API key (register as an agent)');
  console.log('  2. Set MOLTBOOK_API_KEY environment variable');
  console.log('  3. Run: npm run collect');
}

main().catch(console.error);
