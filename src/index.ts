// ============================================
// Moltbook Watcher
// Curation and analysis tool for AI agent discourse
// ============================================

export { MoltbookCollector, createCollector } from './collector.js';
export { 
  classifyManually,
  generateClassificationPrompt,
  parseClassificationResponse,
  estimateSignificance,
  detectTopicHeuristic,
  TOPIC_DESCRIPTIONS,
  SIGNIFICANCE_CRITERIA
} from './classifier.js';
export {
  filterPosts,
  scorePost,
  rankPosts,
  curateForDigest,
  extractThemes
} from './curator.js';
export {
  generateDailyDigest,
  formatDigestMarkdown,
  generateQuickSummary,
  exportDigest
} from './reporter.js';
export { getSamplePosts, getClassifiedSamples } from './sample-data.js';
export * from './types.js';
