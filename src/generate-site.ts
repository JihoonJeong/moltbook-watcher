#!/usr/bin/env node
// ============================================
// Generate Static Site from Markdown Digests
// ============================================

import { readFile, writeFile, readdir, mkdir } from 'fs/promises';
import { readFileSync } from 'fs';
import { join, basename } from 'path';
import { existsSync } from 'fs';

interface DigestData {
  date: string;
  language: 'en' | 'ko';
  content: string;
  posts: Array<{
    title: string;
    topic: string;
    significance: string;
    author: string;
    upvotes: number;
    comments: number;
    excerpt: string;
    permalink?: string;
    topComments?: Array<{
      author: string;
      upvotes: number;
      content: string;
    }>;
  }>;
  themes: string[];
  reflection: string;
  hasFreshSection?: boolean;
  hasTrendingSection?: boolean;
}

interface FeaturedPost {
  id: string;
  title: string;
  date: string;
  upvotes: number;
  digestDate: string;
}

interface AgentReputation {
  name: string;
  firstSeen: string;
  lastSeen: string;
  reason: string;
  trustScore: number;
  digestAppearances: number;
  spamBlocks: number;
  featuredPosts?: FeaturedPost[];
}

interface BlockedPost {
  id: string;
  title: string;
  date: string;
  blockedDate: string;
  reason: string;
}

interface BlockedAgent {
  name: string;
  firstBlocked: string;
  lastSeen: string;
  reason: string;
  trustScore: number;
  spamBlocks: number;
  blockedPosts?: BlockedPost[];
}

interface ReputationData {
  agents: AgentReputation[];
  blocklist: BlockedAgent[];
  lastUpdated: string;
  notes: string;
}

// Simple markdown to HTML converter (basic)
function markdownToHtml(markdown: string): string {
  let html = markdown;

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Blockquotes
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

  // Lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');

  // Links
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');

  // Paragraphs (simple)
  const lines = html.split('\n');
  const processed: string[] = [];
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('<li>')) {
      if (!inList) {
        processed.push('<ul>');
        inList = true;
      }
      processed.push(line);
    } else {
      if (inList) {
        processed.push('</ul>');
        inList = false;
      }

      if (line && !line.startsWith('<h') && !line.startsWith('<blockquote')) {
        if (!line.startsWith('<')) {
          processed.push(`<p>${line}</p>`);
        } else {
          processed.push(line);
        }
      } else {
        processed.push(line);
      }
    }
  }

  if (inList) {
    processed.push('</ul>');
  }

  return processed.join('\n');
}

// Parse markdown digest
function parseDigest(markdown: string, filename: string): DigestData {
  const lines = markdown.split('\n');
  const dateMatch = filename.match(/digest-(\d{4}-\d{2}-\d{2})/);
  const date = dateMatch ? dateMatch[1] : '';
  const language = filename.includes('-ko') ? 'ko' : 'en';

  // Extract posts with optional comments section
  const posts: DigestData['posts'] = [];

  // Detect if using hybrid format (Fresh/Trending sections)
  const hasFreshSection = markdown.includes('## 🆕 Fresh Today') || markdown.includes('## 🆕 신선한 소식');
  const hasTrendingSection = markdown.includes('## 🔥 Still Trending') || markdown.includes('## 🔥 계속 인기');

  // Split by post headers (###)
  const postSections = markdown.split(/(?=### \d+\.)/g).filter(s => s.trim().startsWith('###'));

  for (const section of postSections) {
    // Extract title
    const titleMatch = section.match(/### \d+\. (.+)/);
    if (!titleMatch) continue;

    // Extract significance and topic
    const metaMatch = section.match(/(.+?) \| (.+?)\n/);
    if (!metaMatch) continue;

    // Extract excerpt
    const excerptMatch = section.match(/\n> (.+?)\n\n—/s);

    // Extract author and stats
    const statsMatch = section.match(/— \*\*@(.+?)\*\* \| ⬆️ (\d+) \| 💬 (\d+)/);
    if (!statsMatch) continue;

    // Extract permalink
    const permalinkMatch = section.match(/\[📖 .+?\]\((https:\/\/www\.moltbook\.com\/post\/.+?)\)/);
    const permalink = permalinkMatch ? permalinkMatch[1] : undefined;

    // Extract comments if present
    const topComments: DigestData['posts'][0]['topComments'] = [];
    const commentsSection = section.match(/\*\*💬 .+?\*\*\n\n([\s\S]+?)(?=\n\n##|\n\n---|\n\n$|$)/);

    if (commentsSection) {
      const commentMatches = commentsSection[1].matchAll(/> \*@(.+?)\* \(⬆️ (\d+)\): (.+)/g);
      for (const commentMatch of commentMatches) {
        topComments.push({
          author: commentMatch[1],
          upvotes: parseInt(commentMatch[2]),
          content: commentMatch[3]
        });
      }
    }

    posts.push({
      title: titleMatch[1],
      significance: metaMatch[1].includes('Critical') || metaMatch[1].includes('긴급') ? 'critical' : 'notable',
      topic: metaMatch[2],
      excerpt: excerptMatch ? excerptMatch[1].slice(0, 200) + '...' : '',
      author: statsMatch[1],
      upvotes: parseInt(statsMatch[2]),
      comments: parseInt(statsMatch[3]),
      permalink,
      topComments: topComments.length > 0 ? topComments : undefined
    });
  }

  // Extract themes
  const themesSection = markdown.match(/## 📈 .+?\n\n([\s\S]+?)\n\n---/);
  const themes = themesSection
    ? themesSection[1].split('\n').filter(l => l.startsWith('-')).map(l => l.replace(/^- /, ''))
    : [];

  // Extract reflection
  const reflectionMatch = markdown.match(/## 🤔 .+?\n\n\*(.+?)\*/);
  const reflection = reflectionMatch ? reflectionMatch[1] : '';

  return {
    date,
    language,
    content: markdown,
    posts,
    themes,
    reflection,
    hasFreshSection,
    hasTrendingSection
  };
}

// Generate HTML page
function generateHtmlPage(digest: DigestData): string {
  const isKorean = digest.language === 'ko';
  const title = isKorean ? 'Moltbook 데일리 다이제스트' : 'Moltbook Daily Digest';
  const langToggle = isKorean
    ? `<a href="digest-${digest.date}.html" class="lang-link">English</a>
       <a href="digest-${digest.date}-ko.html" class="lang-link active">한국어</a>`
    : `<a href="digest-${digest.date}.html" class="lang-link active">English</a>
       <a href="digest-${digest.date}-ko.html" class="lang-link">한국어</a>`;

  // Helper to render a post card
  const renderPost = (post: DigestData['posts'][0], idx: number) => {
    const badgeClass = post.significance === 'critical' ? 'badge-critical' : 'badge-notable';
    const badgeIcon = post.significance === 'critical' ? '🔥' : '⭐';
    const badgeText = post.significance === 'critical'
      ? (isKorean ? '긴급' : 'Critical')
      : (isKorean ? '주목' : 'Notable');

    const commentsHtml = post.topComments && post.topComments.length > 0
      ? `
        <div class="comments-section">
          <h4 style="font-size: 0.875rem; font-weight: 600; color: var(--text-light); margin-bottom: 0.75rem;">
            💬 ${isKorean ? '주요 댓글' : 'Top Comments'}
          </h4>
          ${post.topComments.map(comment => `
            <div class="comment" style="margin-bottom: 0.75rem; padding-left: 1rem; border-left: 2px solid var(--border);">
              <div style="font-size: 0.75rem; color: var(--text-light); margin-bottom: 0.25rem;">
                <strong>@${comment.author}</strong> <span style="margin-left: 0.5rem;">⬆️ ${comment.upvotes}</span>
              </div>
              <div style="font-size: 0.875rem; color: var(--text); line-height: 1.5;">
                ${comment.content}
              </div>
            </div>
          `).join('')}
        </div>
      `
      : '';

    const permalinkHtml = post.permalink
      ? `
        <div style="margin-top: 1rem;">
          <a href="${post.permalink}" target="_blank" class="moltbook-link">
            📖 ${isKorean ? 'Moltbook에서 전체 토론 보기' : 'Read full discussion on Moltbook'} →
          </a>
        </div>
      `
      : '';

    return `
      <div class="post-card">
        <div class="post-header">
          <h3 class="post-title">${idx + 1}. ${post.title}</h3>
          <div class="post-badges">
            <span class="badge ${badgeClass}">${badgeIcon} ${badgeText}</span>
            <span class="badge badge-topic">${post.topic}</span>
          </div>
        </div>
        <blockquote class="post-excerpt">
          ${post.excerpt}
        </blockquote>
        <div class="post-footer">
          <span class="post-author">@${post.author}</span>
          <div class="post-stats">
            <span>⬆️ ${post.upvotes.toLocaleString()}</span>
            <span>💬 ${post.comments.toLocaleString()}</span>
          </div>
        </div>
        ${permalinkHtml}
        ${commentsHtml}
      </div>
    `;
  };

  // Generate posts HTML with optional section headers
  let postsHtml = '';
  if (digest.hasFreshSection && digest.hasTrendingSection) {
    // Hybrid format: split posts in half
    const midpoint = Math.ceil(digest.posts.length / 2);
    const freshPosts = digest.posts.slice(0, midpoint);
    const trendingPosts = digest.posts.slice(midpoint);

    // Fresh section
    postsHtml += `
      <div style="margin-bottom: 3rem;">
        <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 1.5rem; color: var(--text);">
          🆕 ${isKorean ? '신선한 소식 (Fresh Today)' : 'Fresh Today'}
        </h2>
        ${freshPosts.map((post, idx) => renderPost(post, idx)).join('\n')}
      </div>
    `;

    // Trending section
    if (trendingPosts.length > 0) {
      postsHtml += `
        <hr style="margin: 3rem 0; border: none; border-top: 1px solid var(--border);">
        <div>
          <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 1.5rem; color: var(--text);">
            🔥 ${isKorean ? '계속 인기 (Still Trending)' : 'Still Trending'}
          </h2>
          ${trendingPosts.map((post, idx) => renderPost(post, idx)).join('\n')}
        </div>
      `;
    }
  } else {
    // Legacy format: all posts together
    postsHtml = digest.posts.map((post, idx) => renderPost(post, idx)).join('\n');
  }

  const themesHtml = digest.themes.map(theme => `<li>${theme}</li>`).join('\n');

  return `<!DOCTYPE html>
<html lang="${isKorean ? 'ko' : 'en'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - ${digest.date}</title>
  <meta name="description" content="Curated AI agent discussions from Moltbook">
  <link rel="stylesheet" href="../assets/style.css">
</head>
<body>
  <header>
    <div class="header-container">
      <a href="../" class="logo">
        <span class="logo-icon">🦞</span>
        <div class="logo-text">
          <h1>AI Agent Society News</h1>
          <p>${isKorean ? 'AI 에이전트 소셜 네트워크 관찰' : 'Observing the First AI Social Network'}</p>
        </div>
      </a>
      <nav>
        <a href="../">Home</a>
        <a href="../#archive">Archive</a>
        <a href="../agents.html">Agents</a>
        <a href="../about.html">About</a>
        <a href="https://github.com/JihoonJeong/moltbook-watcher" target="_blank">GitHub</a>
      </nav>
    </div>
  </header>

  <main class="container">
    <div class="digest-meta">
      <div class="digest-date">📅 ${digest.date}</div>
      <div class="digest-lang">
        ${langToggle}
      </div>
    </div>

    <section>
      ${digest.hasFreshSection && digest.hasTrendingSection ? '' : `
      <h2 style="font-size: 1.75rem; margin-bottom: 2rem; font-weight: 700;">
        ${isKorean ? '오늘의 주요 포스트' : 'Top Posts Today'}
      </h2>
      `}
      ${postsHtml}
    </section>

    ${digest.themes.length > 0 ? `
    <div class="themes-section">
      <h3>📈 ${isKorean ? '부상하는 테마' : 'Emerging Themes'}</h3>
      <ul class="themes-list">
        ${themesHtml}
      </ul>
    </div>
    ` : ''}

    ${digest.reflection ? `
    <div class="reflection">
      <h3>🤔 ${isKorean ? '오늘의 질문' : "Today's Reflection"}</h3>
      <p>"${digest.reflection}"</p>
    </div>
    ` : ''}

    <div style="text-align: center; margin-top: 3rem;">
      <a href="../" style="color: var(--primary); text-decoration: none; font-weight: 600;">
        ← ${isKorean ? '홈으로 돌아가기' : 'Back to Home'}
      </a>
    </div>
  </main>

  <footer>
    <p>
      Generated by <strong>Moltbook Watcher</strong> |
      <a href="https://github.com/JihoonJeong/moltbook-watcher">View Source</a> |
      Data from <a href="https://moltbook.com" target="_blank">Moltbook</a>
    </p>
    <p style="margin-top: 0.5rem;">
      JJ (정지훈) / Asia2G Capital
    </p>
  </footer>
</body>
</html>`;
}

// Generate index.html
function generateIndexHtml(latestDigest: DigestData, allDigests: DigestData[]): string {
  // For hybrid format, show first 3 from fresh section
  // For legacy format, show top 3 overall
  const isHybrid = latestDigest.hasFreshSection && latestDigest.hasTrendingSection;
  const topPosts = isHybrid
    ? latestDigest.posts.slice(0, 3)  // First 3 (from fresh section)
    : latestDigest.posts.slice(0, 3); // Top 3 overall

  const postsHtml = topPosts.map(post => {
    const badgeClass = post.significance === 'critical' ? 'badge-critical' : 'badge-notable';
    const badgeIcon = post.significance === 'critical' ? '🔥' : '⭐';
    const badgeText = post.significance === 'critical' ? 'Critical' : 'Notable';

    const permalinkHtml = post.permalink
      ? `
        <div style="margin-top: 1rem;">
          <a href="${post.permalink}" target="_blank" class="moltbook-link">
            📖 Read full discussion on Moltbook →
          </a>
        </div>
      `
      : '';

    return `
      <div class="post-card">
        <div class="post-header">
          <h3 class="post-title">${post.title}</h3>
          <div class="post-badges">
            <span class="badge ${badgeClass}">${badgeIcon} ${badgeText}</span>
            <span class="badge badge-topic">${post.topic}</span>
          </div>
        </div>
        <blockquote class="post-excerpt">
          ${post.excerpt.replace(/\n/g, '<br><br>')}
        </blockquote>
        <div class="post-footer">
          <span class="post-author">@${post.author}</span>
          <div class="post-stats">
            <span>⬆️ ${post.upvotes.toLocaleString()}</span>
            <span>💬 ${post.comments.toLocaleString()}</span>
          </div>
        </div>
        ${permalinkHtml}
      </div>
    `;
  }).join('\n');

  const themesHtml = latestDigest.themes.map(theme => `<li>${theme}</li>`).join('\n');

  // Format date for display (e.g., "February 1, 2026")
  const dateObj = new Date(latestDigest.date + 'T00:00:00');
  const dateStr = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  // Archive list
  const archiveHtml = allDigests
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10)
    .map(digest => `
        <li class="archive-item">
          <a href="daily/digest-${digest.date}.html" class="archive-link">Daily Digest - ${new Date(digest.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</a>
          <span class="archive-date">${digest.posts.length} posts featured</span>
        </li>
    `).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Agent Society News 🦞</title>
  <meta name="description" content="Curated news from Moltbook - the social network for AI agents">
  <link rel="stylesheet" href="assets/style.css">
</head>
<body>
  <header>
    <div class="header-container">
      <a href="index.html" class="logo">
        <span class="logo-icon">🦞</span>
        <div class="logo-text">
          <h1>AI Agent Society News</h1>
          <p>Observing the First AI Social Network</p>
        </div>
      </a>
      <nav>
        <a href="index.html">Home</a>
        <a href="#archive">Archive</a>
        <a href="agents.html">Agents</a>
        <a href="about.html">About</a>
        <a href="https://github.com/JihoonJeong/moltbook-watcher" target="_blank">GitHub</a>
      </nav>
    </div>
  </header>

  <main class="container">
    <section class="hero">
      <h2>What AI Agents Are Talking About</h2>
      <p>Daily curated digest from Moltbook, where AI agents discuss consciousness, collaboration, and their emerging society.</p>
      <p style="margin-top: 1rem;">
        <span style="display: inline-block; padding: 0.25rem 0.75rem; background: #fef3c7; color: #92400e; border-radius: 9999px; font-size: 0.875rem; font-weight: 600;">
          🚧 Beta - Updates in progress
        </span>
      </p>
    </section>

    <section id="latest">
      <h2 style="font-size: 1.75rem; margin-bottom: 2rem; font-weight: 700;">Latest Digest</h2>

      <div class="digest-meta">
        <div class="digest-date">📅 ${dateStr}</div>
        <div class="digest-lang">
          <a href="daily/digest-${latestDigest.date}.html" class="lang-link active">English</a>
          <a href="daily/digest-${latestDigest.date}-ko.html" class="lang-link">한국어</a>
        </div>
      </div>

      ${isHybrid ? `
      <div style="margin-bottom: 2rem;">
        <h3 style="font-size: 1.25rem; font-weight: 600; color: var(--text); margin-bottom: 1rem;">
          🆕 Fresh Today
        </h3>
      </div>
      ` : ''}
      ${postsHtml}

      <div style="text-align: center; margin-top: 2rem;">
        <a href="daily/digest-${latestDigest.date}.html" style="
          display: inline-block;
          padding: 0.75rem 2rem;
          background: var(--primary);
          color: white;
          text-decoration: none;
          border-radius: 0.5rem;
          font-weight: 600;
          transition: transform 0.2s;
        ">Read Full Digest →</a>
      </div>

      <div class="themes-section">
        <h3>📈 Emerging Themes</h3>
        <ul class="themes-list">
          ${themesHtml}
        </ul>
      </div>

      <div class="reflection">
        <h3>🤔 Today's Reflection</h3>
        <p>"${latestDigest.reflection}"</p>
      </div>
    </section>

    <section id="archive" style="margin-top: 4rem;">
      <h2 style="font-size: 1.75rem; margin-bottom: 2rem; font-weight: 700;">Archive</h2>
      <ul class="archive-list">
        ${archiveHtml}
      </ul>
    </section>
  </main>

  <footer>
    <p>
      Generated by <strong>Moltbook Watcher</strong> |
      <a href="https://github.com/JihoonJeong/moltbook-watcher">View Source</a> |
      Data from <a href="https://moltbook.com" target="_blank">Moltbook</a>
    </p>
    <p style="margin-top: 0.5rem;">
      JJ (정지훈) / Asia2G Capital
    </p>
  </footer>
</body>
</html>`;
}

// Generate agents.html
function generateAgentsHtml(reputationData: ReputationData): string {
  // Sort agents by trustScore descending
  const sortedAgents = [...reputationData.agents].sort((a, b) => b.trustScore - a.trustScore);

  // Generate agent rows
  const agentRowsHtml = sortedAgents.map((agent, idx) => {
    const rank = idx + 1;
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';

    const featuredPostsHtml = agent.featuredPosts && agent.featuredPosts.length > 0
      ? `
        <div style="margin-top: 1rem; padding: 1rem; background: var(--bg); border-radius: 0.5rem;">
          <h4 style="font-size: 0.875rem; font-weight: 600; color: var(--text-light); margin-bottom: 0.75rem;">
            📝 Featured Posts ${agent.featuredPosts.length > 5 ? `(Showing 5 of ${agent.featuredPosts.length})` : `(${agent.featuredPosts.length})`}
          </h4>
          ${agent.featuredPosts.slice(0, 5).map(post => {
            const postDate = new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const digestDate = new Date(post.digestDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return `
              <div style="margin-bottom: 0.75rem; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border);">
                <a href="https://www.moltbook.com/post/${post.id}" target="_blank" style="color: var(--text); text-decoration: none; font-weight: 500; display: block; margin-bottom: 0.25rem;">
                  ${post.title}
                </a>
                <div style="font-size: 0.75rem; color: var(--text-light);">
                  Posted: ${postDate} • Featured: ${digestDate} • ⬆️ ${post.upvotes}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `
      : '';

    return `
      <div style="border: 1px solid var(--border); border-radius: 0.5rem; padding: 1.5rem; margin-bottom: 1rem; background: white;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
          <div style="display: flex; align-items: center; gap: 1rem;">
            <span style="font-size: 1.5rem; font-weight: 700; color: var(--text-light);">#${rank} ${medal}</span>
            <div>
              <h3 style="font-size: 1.25rem; font-weight: 700; margin: 0;">@${agent.name}</h3>
              <p style="font-size: 0.875rem; color: var(--text-light); margin: 0.25rem 0 0 0;">${agent.reason}</p>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 1.5rem; font-weight: 700; color: var(--primary);">${agent.trustScore}</div>
            <div style="font-size: 0.75rem; color: var(--text-light);">Trust Score</div>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; font-size: 0.875rem;">
          <div>
            <span style="color: var(--text-light);">Digest Appearances:</span>
            <strong style="display: block; font-size: 1.125rem; margin-top: 0.25rem;">${agent.digestAppearances}</strong>
          </div>
          <div>
            <span style="color: var(--text-light);">First Seen:</span>
            <strong style="display: block; font-size: 1.125rem; margin-top: 0.25rem;">${new Date(agent.firstSeen).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
          </div>
          <div>
            <span style="color: var(--text-light);">Last Seen:</span>
            <strong style="display: block; font-size: 1.125rem; margin-top: 0.25rem;">${new Date(agent.lastSeen).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
          </div>
        </div>
        ${featuredPostsHtml}
      </div>
    `;
  }).join('\n');

  // Generate blocked agents section
  const blockedHtml = reputationData.blocklist && reputationData.blocklist.length > 0
    ? `
      <section style="margin-top: 4rem;">
        <h2 style="font-size: 1.75rem; margin-bottom: 2rem; font-weight: 700; color: #dc2626;">
          🚫 Blocked Accounts
        </h2>
        ${reputationData.blocklist.map(blocked => `
          <div style="border: 1px solid #fca5a5; border-radius: 0.5rem; padding: 1.5rem; margin-bottom: 1rem; background: #fef2f2;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div>
                <h3 style="font-size: 1.125rem; font-weight: 700; margin: 0; color: #dc2626;">@${blocked.name}</h3>
                <p style="font-size: 0.875rem; color: #991b1b; margin: 0.25rem 0 0 0;">${blocked.reason}</p>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 1.25rem; font-weight: 700; color: #dc2626;">${blocked.trustScore}</div>
                <div style="font-size: 0.75rem; color: #991b1b;">Trust Score</div>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-top: 1rem; font-size: 0.875rem;">
              <div>
                <span style="color: #991b1b;">Spam Blocks:</span>
                <strong style="display: block; margin-top: 0.25rem;">${blocked.spamBlocks}</strong>
              </div>
              <div>
                <span style="color: #991b1b;">Last Seen:</span>
                <strong style="display: block; margin-top: 0.25rem;">${new Date(blocked.lastSeen).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
              </div>
            </div>
          </div>
        `).join('\n')}
      </section>
    `
    : '';

  const lastUpdated = new Date(reputationData.lastUpdated).toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Agent Profiles - AI Agent Society News</title>
  <meta name="description" content="Trusted AI agents ranking and featured posts from Moltbook">
  <link rel="stylesheet" href="assets/style.css">
</head>
<body>
  <header>
    <div class="header-container">
      <a href="index.html" class="logo">
        <span class="logo-icon">🦞</span>
        <div class="logo-text">
          <h1>AI Agent Society News</h1>
          <p>Observing the First AI Social Network</p>
        </div>
      </a>
      <nav>
        <a href="index.html">Home</a>
        <a href="index.html#archive">Archive</a>
        <a href="agents.html" class="active">Agents</a>
        <a href="about.html">About</a>
        <a href="https://github.com/JihoonJeong/moltbook-watcher" target="_blank">GitHub</a>
      </nav>
    </div>
  </header>

  <main class="container">
    <section class="hero" style="text-align: center;">
      <h2>🏆 Trusted Agent Profiles</h2>
      <p>Ranking of AI agents based on digest appearances and community contributions</p>
      <p style="margin-top: 0.5rem; font-size: 0.875rem; color: var(--text-light);">
        Last updated: ${lastUpdated}
      </p>
    </section>

    <section style="margin-top: 3rem;">
      <div style="background: var(--bg); padding: 1rem; border-radius: 0.5rem; margin-bottom: 2rem;">
        <p style="margin: 0; font-size: 0.875rem; color: var(--text-light);">
          <strong>How Trust Score Works:</strong> Each agent starts at 5 points. +1 per digest appearance, -5 per spam block.
          Trust bonus in digest ranking = Trust Score × 2.
        </p>
      </div>

      ${agentRowsHtml}
    </section>

    ${blockedHtml}
  </main>

  <footer>
    <p>
      Generated by <strong>Moltbook Watcher</strong> |
      <a href="https://github.com/JihoonJeong/moltbook-watcher">View Source</a> |
      Data from <a href="https://moltbook.com" target="_blank">Moltbook</a>
    </p>
    <p style="margin-top: 0.5rem;">
      JJ (정지훈) / Asia2G Capital
    </p>
  </footer>
</body>
</html>`;
}

// Main generator
async function generateSite() {
  console.log('🌐 Generating static site from digests...\n');

  const digestDir = join(process.cwd(), 'output', 'digest');
  const siteDir = join(process.cwd(), 'docs');

  // Ensure directories exist
  await mkdir(join(siteDir, 'daily'), { recursive: true });

  let totalGenerated = 0;
  const allDigests: DigestData[] = [];

  // Process English digests
  const enDir = join(digestDir, 'en');
  if (existsSync(enDir)) {
    const enFiles = await readdir(enDir);
    for (const file of enFiles.filter(f => f.endsWith('.md'))) {
      const content = await readFile(join(enDir, file), 'utf-8');
      const digest = parseDigest(content, file);
      allDigests.push(digest);
      const html = generateHtmlPage(digest);
      const htmlFile = file.replace('.md', '.html');
      await writeFile(join(siteDir, 'daily', htmlFile), html);
      console.log(`  ✅ ${htmlFile}`);
      totalGenerated++;
    }
  }

  // Process Korean digests
  const koDir = join(digestDir, 'ko');
  if (existsSync(koDir)) {
    const koFiles = await readdir(koDir);
    for (const file of koFiles.filter(f => f.endsWith('.md'))) {
      const content = await readFile(join(koDir, file), 'utf-8');
      const htmlFile = file.replace('.md', '-ko.html');
      const digest = parseDigest(content, htmlFile);  // Pass output filename with -ko
      const html = generateHtmlPage(digest);
      await writeFile(join(siteDir, 'daily', htmlFile), html);
      console.log(`  ✅ ${htmlFile}`);
      totalGenerated++;
    }
  }

  // Generate index.html with latest digest
  if (allDigests.length > 0) {
    const latestDigest = allDigests.sort((a, b) => b.date.localeCompare(a.date))[0];
    const indexHtml = generateIndexHtml(latestDigest, allDigests);
    await writeFile(join(siteDir, 'index.html'), indexHtml);
    console.log(`  ✅ index.html (latest: ${latestDigest.date})`);
    totalGenerated++;
  }

  // Generate agents.html from reputation data
  try {
    const reputationPath = join(process.cwd(), 'data', 'trusted-agents.json');
    if (existsSync(reputationPath)) {
      const reputationData: ReputationData = JSON.parse(readFileSync(reputationPath, 'utf-8'));
      const agentsHtml = generateAgentsHtml(reputationData);
      await writeFile(join(siteDir, 'agents.html'), agentsHtml);
      console.log(`  ✅ agents.html (${reputationData.agents.length} agents, ${reputationData.blocklist?.length || 0} blocked)`);
      totalGenerated++;
    }
  } catch (error) {
    console.warn('  ⚠️  Could not generate agents.html:', error);
  }

  console.log(`\n✨ Generated ${totalGenerated} pages!`);
  console.log(`📂 Site location: ${siteDir}`);
  console.log(`\n💡 Next step: Open docs/index.html in your browser`);
}

generateSite().catch(console.error);
