// ============================================
// Translator - Claude Haiku for Korean translation
// ============================================

import Anthropic from '@anthropic-ai/sdk';

// Lazy client initialization to ensure dotenv is loaded first
let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    });
  }
  return client;
}

// Translation cache to avoid re-translating
const translationCache = new Map<string, string>();

export interface TranslationRequest {
  title: string;
  content?: string;
  excerpt?: string;
}

export interface TranslationResult {
  title: string;
  content?: string;
  excerpt?: string;
}

/**
 * Translate post content to Korean using Claude Haiku
 * Uses caching to avoid duplicate translations
 */
export async function translateToKorean(
  request: TranslationRequest
): Promise<TranslationResult> {
  // Check cache first
  const cacheKey = `${request.title}:${request.content?.slice(0, 100) || ''}`;
  const cached = translationCache.get(cacheKey);

  if (cached) {
    const parsed = JSON.parse(cached);
    return parsed;
  }

  // Build translation prompt
  const contentToTranslate = request.content || request.excerpt || '';

  const prompt = `Translate the following AI agent discussion post from English to Korean.
Maintain the tone, technical terms, and emotion of the original.
Keep proper nouns, usernames, and technical jargon in English when appropriate.

Title: ${request.title}

Content:
${contentToTranslate}

IMPORTANT: Return ONLY a valid JSON object, nothing else. No explanations, no markdown code blocks.
Use this exact format:
{"title":"translated title in Korean","content":"translated content in Korean"}

Make sure to:
- Escape special characters properly (quotes, newlines, etc.)
- Do not include any text before or after the JSON object
- Keep the JSON in a single line if possible`;

  try {
    const message = await getClient().messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const responseText = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    // Extract JSON from response (handle markdown code blocks too)
    let jsonString = responseText.trim();

    // Remove markdown code blocks if present
    if (jsonString.startsWith('```')) {
      jsonString = jsonString.replace(/^```(?:json)?\s*\n/, '').replace(/\n```\s*$/, '');
    }

    // Extract JSON object
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('Failed to find JSON in translation response, using original');
      return request;
    }

    jsonString = jsonMatch[0];

    // Try to parse - if it fails, attempt to fix common issues
    let translated;
    try {
      translated = JSON.parse(jsonString);
    } catch (parseError) {
      // Try cleaning up the JSON string
      try {
        // Remove control characters except those in strings
        jsonString = jsonString
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')  // Remove control chars
          .replace(/\n/g, '\\n')                         // Escape newlines
          .replace(/\r/g, '\\r')                         // Escape carriage returns
          .replace(/\t/g, '\\t');                        // Escape tabs

        translated = JSON.parse(jsonString);
      } catch (retryError) {
        console.warn('Failed to parse translation JSON after cleanup, using original');
        console.warn('Parse error:', retryError);
        console.warn('JSON string:', jsonString.slice(0, 200));
        return request;
      }
    }

    // Cache the result
    translationCache.set(cacheKey, JSON.stringify(translated));

    return {
      title: translated.title || request.title,
      content: translated.content || contentToTranslate,
      excerpt: translated.content?.slice(0, 200) || contentToTranslate.slice(0, 200)
    };

  } catch (error) {
    console.error('Translation error:', error);
    // Fallback to original on error
    return request;
  }
}

/**
 * Batch translate multiple posts
 */
export async function batchTranslate(
  requests: TranslationRequest[]
): Promise<TranslationResult[]> {
  const results: TranslationResult[] = [];

  for (const request of requests) {
    const result = await translateToKorean(request);
    results.push(result);

    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}

/**
 * Check if API key is configured
 */
export function isTranslationEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}
