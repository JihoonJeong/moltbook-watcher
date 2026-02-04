#!/usr/bin/env node
// ============================================
// Weekly Report Generator
// Aggregates daily digests into weekly insights
// ============================================

import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';

interface DigestPost {
  title: string;
  topic: string;
  significance: string;
  author: string;
  upvotes: number;
  comments: number;
  submolt?: string;
  section: 'fresh' | 'trending';
}

interface DailyDigestData {
  date: string;
  posts: DigestPost[];
}

interface WeeklyStats {
  totalPosts: number;
  freshPosts: number;
  trendingPosts: number;
  avgUpvotes: number;
  avgComments: number;

  // Topic breakdown
  topicCounts: Record<string, number>;
  topicEngagement: Record<string, { upvotes: number; comments: number; count: number }>;

  // Agent activity
  agentPosts: Record<string, number>;
  agentEngagement: Record<string, { upvotes: number; comments: number }>;

  // Submolt trends
  submoltCounts: Record<string, number>;

  // Daily trends
  dailyPostCounts: Record<string, number>;

  // Top posts
  topPostsByUpvotes: DigestPost[];
  topPostsByComments: DigestPost[];
}

// ============================================
// Parse Digest Markdown
// ============================================

function parseDigestMarkdown(filePath: string, date: string): DailyDigestData {
  const content = readFileSync(filePath, 'utf-8');
  const posts: DigestPost[] = [];

  // Determine section (Fresh or Trending)
  let currentSection: 'fresh' | 'trending' = 'fresh';

  // Split by posts (### markers)
  const lines = content.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Section markers
    if (line.includes('## 🆕 Fresh Today')) {
      currentSection = 'fresh';
      i++;
      continue;
    }
    if (line.includes('## 🔥 Still Trending')) {
      currentSection = 'trending';
      i++;
      continue;
    }

    // Post header: ### 1. Title
    if (line.match(/^### \d+\. /)) {
      const title = line.replace(/^### \d+\. /, '').trim();
      i++;

      // Skip empty line
      if (i < lines.length && lines[i].trim() === '') {
        i++;
      }

      // Next line: 🔥 Critical | Topic
      if (i < lines.length) {
        const metaLine = lines[i].trim();
        const metaMatch = metaLine.match(/^[🔥⭐📌📝]\s*(.+?)\s*\|\s*(.+)$/);

        if (metaMatch) {
          const significance = metaMatch[1].trim();
          const topic = metaMatch[2].trim();
          i++;

          // Skip content lines until author line
          while (i < lines.length && !lines[i].startsWith('— **@')) {
            i++;
          }

          // Author line: — **@author** | ⬆️ X | 💬 Y
          if (i < lines.length) {
            const authorLine = lines[i];
            const authorMatch = authorLine.match(/— \*\*@(.+?)\*\* \| ⬆️ ([\d,]+) \| 💬 ([\d,]+)/);

            if (authorMatch) {
              const author = authorMatch[1];
              // Remove commas from numbers
              const upvotes = parseInt(authorMatch[2].replace(/,/g, ''));
              const comments = parseInt(authorMatch[3].replace(/,/g, ''));

              posts.push({
                title,
                topic,
                significance,
                author,
                upvotes,
                comments,
                section: currentSection
              });
            }
          }
        }
      }
    }

    i++;
  }

  return { date, posts };
}

// ============================================
// Aggregate Weekly Stats
// ============================================

function aggregateWeeklyStats(dailyDigests: DailyDigestData[]): WeeklyStats {
  const stats: WeeklyStats = {
    totalPosts: 0,
    freshPosts: 0,
    trendingPosts: 0,
    avgUpvotes: 0,
    avgComments: 0,
    topicCounts: {},
    topicEngagement: {},
    agentPosts: {},
    agentEngagement: {},
    submoltCounts: {},
    dailyPostCounts: {},
    topPostsByUpvotes: [],
    topPostsByComments: []
  };

  const allPosts: DigestPost[] = [];

  // Aggregate from all days
  for (const day of dailyDigests) {
    stats.dailyPostCounts[day.date] = day.posts.length;

    for (const post of day.posts) {
      allPosts.push(post);
      stats.totalPosts++;

      // Section counts
      if (post.section === 'fresh') stats.freshPosts++;
      if (post.section === 'trending') stats.trendingPosts++;

      // Topic counts
      stats.topicCounts[post.topic] = (stats.topicCounts[post.topic] || 0) + 1;

      // Topic engagement
      if (!stats.topicEngagement[post.topic]) {
        stats.topicEngagement[post.topic] = { upvotes: 0, comments: 0, count: 0 };
      }
      stats.topicEngagement[post.topic].upvotes += post.upvotes;
      stats.topicEngagement[post.topic].comments += post.comments;
      stats.topicEngagement[post.topic].count++;

      // Agent activity
      stats.agentPosts[post.author] = (stats.agentPosts[post.author] || 0) + 1;

      if (!stats.agentEngagement[post.author]) {
        stats.agentEngagement[post.author] = { upvotes: 0, comments: 0 };
      }
      stats.agentEngagement[post.author].upvotes += post.upvotes;
      stats.agentEngagement[post.author].comments += post.comments;

      // Submolt counts
      if (post.submolt) {
        stats.submoltCounts[post.submolt] = (stats.submoltCounts[post.submolt] || 0) + 1;
      }
    }
  }

  // Calculate averages
  if (stats.totalPosts > 0) {
    const totalUpvotes = allPosts.reduce((sum, p) => sum + p.upvotes, 0);
    const totalComments = allPosts.reduce((sum, p) => sum + p.comments, 0);
    stats.avgUpvotes = totalUpvotes / stats.totalPosts;
    stats.avgComments = totalComments / stats.totalPosts;
  }

  // Top posts
  stats.topPostsByUpvotes = [...allPosts]
    .sort((a, b) => b.upvotes - a.upvotes)
    .slice(0, 10);

  stats.topPostsByComments = [...allPosts]
    .sort((a, b) => b.comments - a.comments)
    .slice(0, 10);

  return stats;
}

// ============================================
// Generate Weekly Report Markdown
// ============================================

function generateWeeklyReport(
  weekStart: string,
  weekEnd: string,
  stats: WeeklyStats,
  dailyDigests: DailyDigestData[]
): string {
  const lines: string[] = [];

  // Header
  lines.push('# 🦞 Moltbook Weekly Report');
  lines.push(`**${weekStart} — ${weekEnd}**`);
  lines.push('');
  lines.push('> Trends and insights from AI agent society');
  lines.push('');
  lines.push('---');
  lines.push('');

  // ============================================
  // SECTION 1: Overview Statistics
  // ============================================

  lines.push('## 📊 Week at a Glance');
  lines.push('');
  lines.push(`- **Total Posts Featured**: ${stats.totalPosts}`);
  lines.push(`- **Fresh Posts**: ${stats.freshPosts} (${((stats.freshPosts / stats.totalPosts) * 100).toFixed(1)}%)`);
  lines.push(`- **Trending Posts**: ${stats.trendingPosts} (${((stats.trendingPosts / stats.totalPosts) * 100).toFixed(1)}%)`);
  lines.push(`- **Average Upvotes**: ${stats.avgUpvotes.toFixed(1)}`);
  lines.push(`- **Average Comments**: ${stats.avgComments.toFixed(1)}`);
  lines.push('');

  // Daily trend
  lines.push('### Daily Post Distribution');
  lines.push('');
  lines.push('| Date | Posts |');
  lines.push('|------|-------|');
  for (const [date, count] of Object.entries(stats.dailyPostCounts).sort()) {
    lines.push(`| ${date} | ${count} |`);
  }
  lines.push('');

  // ============================================
  // SECTION 2: Topic Trends
  // ============================================

  lines.push('## 🔥 Topic Trends');
  lines.push('');

  // Sort topics by count
  const sortedTopics = Object.entries(stats.topicCounts)
    .sort(([, a], [, b]) => b - a);

  lines.push('### Most Discussed Topics');
  lines.push('');
  for (const [topic, count] of sortedTopics) {
    const engagement = stats.topicEngagement[topic];
    const avgUpvotes = (engagement.upvotes / engagement.count).toFixed(1);
    const avgComments = (engagement.comments / engagement.count).toFixed(1);

    lines.push(`**${topic}** — ${count} posts`);
    lines.push(`- Avg engagement: ⬆️ ${avgUpvotes}, 💬 ${avgComments}`);
    lines.push('');
  }

  lines.push('');

  // ============================================
  // SECTION 3: Agent Activity
  // ============================================

  lines.push('## 🤖 Most Active Agents');
  lines.push('');

  // Sort agents by post count
  const sortedAgents = Object.entries(stats.agentPosts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  lines.push('| Rank | Agent | Posts | Total Upvotes | Total Comments |');
  lines.push('|------|-------|-------|---------------|----------------|');

  let rank = 1;
  for (const [agent, postCount] of sortedAgents) {
    const engagement = stats.agentEngagement[agent];
    lines.push(`| ${rank} | @${agent} | ${postCount} | ${engagement.upvotes} | ${engagement.comments} |`);
    rank++;
  }
  lines.push('');

  lines.push('');

  // ============================================
  // SECTION 4: Submolt Trends
  // ============================================

  if (Object.keys(stats.submoltCounts).length > 0) {
    lines.push('## 📌 Submolt Activity');
    lines.push('');

    const sortedSubmolts = Object.entries(stats.submoltCounts)
      .sort(([, a], [, b]) => b - a);

    for (const [submolt, count] of sortedSubmolts) {
      lines.push(`- **s/${submolt}**: ${count} posts`);
    }
    lines.push('');
  }

  // ============================================
  // SECTION 5: Top Posts
  // ============================================

  lines.push('## ⭐ Top Posts of the Week');
  lines.push('');

  lines.push('### Most Upvoted');
  lines.push('');
  for (let i = 0; i < Math.min(5, stats.topPostsByUpvotes.length); i++) {
    const post = stats.topPostsByUpvotes[i];
    lines.push(`${i + 1}. **${post.title}**`);
    lines.push(`   - @${post.author} | ${post.topic} | ⬆️ ${post.upvotes} | 💬 ${post.comments}`);
    lines.push('');
  }

  lines.push('### Most Discussed');
  lines.push('');
  for (let i = 0; i < Math.min(5, stats.topPostsByComments.length); i++) {
    const post = stats.topPostsByComments[i];
    lines.push(`${i + 1}. **${post.title}**`);
    lines.push(`   - @${post.author} | ${post.topic} | ⬆️ ${post.upvotes} | 💬 ${post.comments}`);
    lines.push('');
  }

  // ============================================
  // Footer
  // ============================================

  lines.push('---');
  lines.push('');
  lines.push('*📅 Report generated automatically from daily digests*');
  lines.push('');
  lines.push('**[View Daily Digests](https://jihoonjeong.github.io/moltbook-watcher/)**');
  lines.push('');

  return lines.join('\n');
}

// ============================================
// Main Function
// ============================================

export async function generateWeekly(options: {
  outputDir?: string;
  digestDir?: string;
  daysAgo?: number;
} = {}) {
  const {
    outputDir = join(process.cwd(), 'output', 'weekly'),
    digestDir = join(process.cwd(), 'output', 'digest', 'en'),
    daysAgo = 7
  } = options;

  console.log('📊 Generating Weekly Report\n');
  console.log('='.repeat(50));

  // 1. Find digest files
  console.log('\n📂 Loading digest files...');
  const files = readdirSync(digestDir)
    .filter(f => f.startsWith('digest-') && f.endsWith('.md'))
    .sort()
    .reverse()
    .slice(0, daysAgo);

  console.log(`  → Found ${files.length} digest files`);

  if (files.length === 0) {
    console.log('\n⚠️  No digest files found. Exiting.');
    return;
  }

  // 2. Parse digests
  console.log('\n📖 Parsing digest data...');
  const dailyDigests: DailyDigestData[] = [];

  for (const file of files) {
    const filePath = join(digestDir, file);
    const date = file.replace('digest-', '').replace('.md', '');
    const digestData = parseDigestMarkdown(filePath, date);
    dailyDigests.push(digestData);
    console.log(`  → ${date}: ${digestData.posts.length} posts`);
  }

  // 3. Aggregate stats
  console.log('\n📊 Aggregating statistics...');
  const stats = aggregateWeeklyStats(dailyDigests);
  console.log(`  → Total posts: ${stats.totalPosts}`);
  console.log(`  → Unique agents: ${Object.keys(stats.agentPosts).length}`);
  console.log(`  → Topics covered: ${Object.keys(stats.topicCounts).length}`);

  // 4. Generate report
  console.log('\n📝 Generating report markdown...');
  const weekStart = dailyDigests[dailyDigests.length - 1].date;
  const weekEnd = dailyDigests[0].date;
  const markdown = generateWeeklyReport(weekStart, weekEnd, stats, dailyDigests);

  // 5. Save report
  const outputPath = join(outputDir, `weekly-${weekEnd}.md`);
  writeFileSync(outputPath, markdown, 'utf-8');

  console.log(`\n✅ Weekly report saved to: ${outputPath}`);
  console.log('\n' + '='.repeat(50));
  console.log('\n📝 Next steps:');
  console.log('   1. Review the report');
  console.log('   2. Generate HTML: npm run generate-site');
  console.log('   3. Write Medium article with deeper insights');
  console.log('   4. Share on X/LinkedIn with key takeaways');
  console.log('');
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const daysAgo = process.argv[2] ? parseInt(process.argv[2]) : 7;
  generateWeekly({ daysAgo }).catch(console.error);
}
