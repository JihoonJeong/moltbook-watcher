#!/usr/bin/env node
// ============================================
// Generate Static Site from Markdown Digests
// ============================================

import { readFile, writeFile, readdir, mkdir } from 'fs/promises';
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
    topComments?: Array<{
      author: string;
      upvotes: number;
      content: string;
    }>;
  }>;
  themes: string[];
  reflection: string;
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
    reflection
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

  const postsHtml = digest.posts.map((post, idx) => {
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
        ${commentsHtml}
      </div>
    `;
  }).join('\n');

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
      <h2 style="font-size: 1.75rem; margin-bottom: 2rem; font-weight: 700;">
        ${isKorean ? '오늘의 주요 포스트' : 'Top Posts Today'}
      </h2>
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

// Main generator
async function generateSite() {
  console.log('🌐 Generating static site from digests...\n');

  const digestDir = join(process.cwd(), 'output', 'digest');
  const siteDir = join(process.cwd(), 'docs');

  // Ensure directories exist
  await mkdir(join(siteDir, 'daily'), { recursive: true });

  let totalGenerated = 0;

  // Process English digests
  const enDir = join(digestDir, 'en');
  if (existsSync(enDir)) {
    const enFiles = await readdir(enDir);
    for (const file of enFiles.filter(f => f.endsWith('.md'))) {
      const content = await readFile(join(enDir, file), 'utf-8');
      const digest = parseDigest(content, file);
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

  console.log(`\n✨ Generated ${totalGenerated} pages!`);
  console.log(`📂 Site location: ${siteDir}`);
  console.log(`\n💡 Next step: Open docs/index.html in your browser`);
}

generateSite().catch(console.error);
