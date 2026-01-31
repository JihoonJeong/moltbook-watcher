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

Return ONLY a JSON object with this exact format:
{
  "title": "translated title in Korean",
  "content": "translated content in Korean"
}`;

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

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('Failed to parse translation response, using original');
      return request;
    }

    // Clean up JSON string - escape newlines and control characters
    let jsonString = jsonMatch[0];
    jsonString = jsonString.replace(/[\n\r\t]/g, ' ').replace(/\s+/g, ' ');

    const translated = JSON.parse(jsonString);

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
