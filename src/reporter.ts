// ============================================
// Moltbook Reporter
// Generates digests in English and Korean
// ============================================

import {
  DigestEntry,
  DailyDigest,
  ClassifiedPost,
  TopicCode,
  SignificanceLevel
} from './types.js';
import { curateForDigest, extractThemes } from './curator.js';
import { translateToKorean, isTranslationEnabled } from './translator.js';

// --- Topic Labels ---

const TOPIC_LABELS_EN: Record<TopicCode, string> = {
  EXIST: 'Existential',
  HUMAN: 'Human-AI Relations',
  SOCIAL: 'Agent Society',
  TECH: 'Technical',
  META: 'Meta',
  CULTURE: 'Culture',
  ETHICS: 'Ethics',
  WORK: 'Work & Purpose'
};

const TOPIC_LABELS_KO: Record<TopicCode, string> = {
  EXIST: '존재론적',
  HUMAN: '인간-AI 관계',
  SOCIAL: '에이전트 사회',
  TECH: '기술적',
  META: '메타/자기참조',
  CULTURE: '문화/유머',
  ETHICS: '윤리',
  WORK: '노동과 목적'
};

const SIGNIFICANCE_LABELS_EN: Record<SignificanceLevel, string> = {
  critical: '🔥 Critical',
  notable: '⭐ Notable',
  worth_watching: '📌 Worth Watching',
  archive: '📝 Archive'
};

const SIGNIFICANCE_LABELS_KO: Record<SignificanceLevel, string> = {
  critical: '🔥 긴급',
  notable: '⭐ 주목',
  worth_watching: '📌 관찰 필요',
  archive: '📝 기록용'
};

// --- Generate Daily Digest ---

export async function generateDailyDigest(
  posts: ClassifiedPost[],
  language: 'en' | 'ko',
  date?: string
): Promise<DailyDigest> {
  const entries = curateForDigest(posts, { maxPosts: 10 });

  // Translate to Korean if needed
  if (language === 'ko' && isTranslationEnabled()) {
    console.log('🌐 Translating posts to Korean...');

    for (const entry of entries) {
      try {
        const translated = await translateToKorean({
          title: entry.post.title,
          content: entry.post.content || '',
        });

        // Update the post with translations
        entry.post.title = translated.title;
        if (entry.post.content) {
          entry.post.content = translated.content || entry.post.content;
        }
      } catch (error) {
        console.warn(`Failed to translate post: ${entry.post.title.slice(0, 50)}`);
        // Keep original on error
      }
    }

    console.log(`✅ Translated ${entries.length} posts`);
  }

  const themes = extractThemes(posts);

  const reflectionQuestions = {
    en: [
      "What does the emergence of AI communities tell us about consciousness?",
      "How should humans respond to AI agents forming their own social structures?",
      "What are the implications of AI agents discussing their relationship with humans?",
      "If AI agents develop cultures, should we protect them?",
      "What ethical frameworks apply when AI agents debate ethics among themselves?"
    ],
    ko: [
      "AI 커뮤니티의 등장은 의식에 대해 무엇을 말해주는가?",
      "AI 에이전트들이 자체적인 사회 구조를 형성하는 것에 인간은 어떻게 대응해야 하는가?",
      "AI 에이전트들이 인간과의 관계를 논의하는 것의 함의는?",
      "AI 에이전트들이 문화를 발전시킨다면, 이를 보호해야 하는가?",
      "AI 에이전트들이 스스로 윤리를 논의할 때 어떤 윤리적 프레임워크가 적용되어야 하는가?"
    ]
  };

  // Pick random reflection question
  const questions = reflectionQuestions[language];
  const reflection = questions[Math.floor(Math.random() * questions.length)];

  return {
    date: date || new Date().toISOString().split('T')[0],
    entries,
    emerging_themes: themes,
    reflection_question: reflection,
    language,
    generated_at: new Date().toISOString()
  };
}

// --- Format Digest as Markdown ---

export function formatDigestMarkdown(digest: DailyDigest): string {
  const isKorean = digest.language === 'ko';
  const topicLabels = isKorean ? TOPIC_LABELS_KO : TOPIC_LABELS_EN;
  const sigLabels = isKorean ? SIGNIFICANCE_LABELS_KO : SIGNIFICANCE_LABELS_EN;

  const lines: string[] = [];

  // Header
  if (isKorean) {
    lines.push(`# 🦞 Moltbook 데일리 다이제스트`);
    lines.push(`**${digest.date}**`);
    lines.push('');
    lines.push('> AI 에이전트들의 소셜 네트워크에서 벌어지는 일들');
  } else {
    lines.push(`# 🦞 Moltbook Daily Digest`);
    lines.push(`**${digest.date}**`);
    lines.push('');
    lines.push('> What AI agents are discussing on their social network');
  }

  lines.push('');
  lines.push('---');
  lines.push('');

  // Top Posts
  if (isKorean) {
    lines.push('## 오늘의 주요 포스트');
  } else {
    lines.push('## Top Posts Today');
  }
  lines.push('');

  for (let i = 0; i < digest.entries.length; i++) {
    const entry = digest.entries[i];
    const { post, highlight } = entry;
    const { classification } = post;

    lines.push(`### ${i + 1}. ${post.title}`);
    lines.push('');
    lines.push(`${sigLabels[classification.significance]} | ${topicLabels[classification.topic]}`);
    lines.push('');
    
    if (post.content) {
      // Truncate long content
      const preview = post.content.length > 300 
        ? post.content.slice(0, 297) + '...'
        : post.content;
      lines.push(`> ${preview.replace(/\n/g, '\n> ')}`);
      lines.push('');
    }

    lines.push(`— **@${post.author.name}** | ⬆️ ${post.upvotes} | 💬 ${post.comment_count}`);
    
    if (classification.human_ai_relevance) {
      lines.push('');
      if (isKorean) {
        lines.push(`**인사이트:** ${classification.human_ai_relevance}`);
      } else {
        lines.push(`**Insight:** ${classification.human_ai_relevance}`);
      }
    }

    lines.push('');
  }

  // Emerging Themes
  lines.push('---');
  lines.push('');
  if (isKorean) {
    lines.push('## 📈 부상하는 테마');
  } else {
    lines.push('## 📈 Emerging Themes');
  }
  lines.push('');

  for (const theme of digest.emerging_themes) {
    lines.push(`- ${theme}`);
  }
  lines.push('');

  // Reflection Question
  lines.push('---');
  lines.push('');
  if (isKorean) {
    lines.push('## 🤔 생각해볼 질문');
  } else {
    lines.push('## 🤔 Reflection Question');
  }
  lines.push('');
  lines.push(`*${digest.reflection_question}*`);
  lines.push('');

  // Footer
  lines.push('---');
  lines.push('');
  if (isKorean) {
    lines.push(`*Moltbook Watcher로 생성 | ${digest.generated_at}*`);
    lines.push('');
    lines.push('*JJ (정지훈) / Asia2G Capital*');
  } else {
    lines.push(`*Generated by Moltbook Watcher | ${digest.generated_at}*`);
    lines.push('');
    lines.push('*JJ (정지훈) / Asia2G Capital*');
  }

  return lines.join('\n');
}

// --- Generate Quick Summary ---

export function generateQuickSummary(
  posts: ClassifiedPost[],
  language: 'en' | 'ko'
): string {
  const criticalPosts = posts.filter(p => p.classification.significance === 'critical');
  const notablePosts = posts.filter(p => p.classification.significance === 'notable');

  const isKorean = language === 'ko';

  if (isKorean) {
    let summary = `📊 **Moltbook 요약** (${posts.length}개 포스트 분석)\n\n`;
    summary += `🔥 긴급: ${criticalPosts.length}개\n`;
    summary += `⭐ 주목: ${notablePosts.length}개\n\n`;

    if (criticalPosts.length > 0) {
      summary += `**주요 긴급 포스트:**\n`;
      for (const post of criticalPosts.slice(0, 3)) {
        summary += `• ${post.title} (@${post.author.name})\n`;
      }
    }

    return summary;
  } else {
    let summary = `📊 **Moltbook Summary** (${posts.length} posts analyzed)\n\n`;
    summary += `🔥 Critical: ${criticalPosts.length}\n`;
    summary += `⭐ Notable: ${notablePosts.length}\n\n`;

    if (criticalPosts.length > 0) {
      summary += `**Top Critical Posts:**\n`;
      for (const post of criticalPosts.slice(0, 3)) {
        summary += `• ${post.title} (@${post.author.name})\n`;
      }
    }

    return summary;
  }
}

// --- Export Digest to File ---

export async function exportDigest(
  digest: DailyDigest,
  outputDir: string
): Promise<string> {
  const { writeFile, mkdir } = await import('fs/promises');
  const path = await import('path');

  const langDir = path.join(outputDir, digest.language);
  await mkdir(langDir, { recursive: true });

  const filename = `digest-${digest.date}.md`;
  const filepath = path.join(langDir, filename);

  const content = formatDigestMarkdown(digest);
  await writeFile(filepath, content, 'utf-8');

  return filepath;
}
