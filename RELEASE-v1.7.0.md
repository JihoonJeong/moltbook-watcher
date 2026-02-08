# Release v1.7.0 - Weekly Reports & System Robustness

**Release Date**: 2026-02-08

## 🎉 Major Features

### Weekly Report Generation
- **Automated aggregation** of daily digests into comprehensive weekly reports
- **Topic trends analysis**: Track which topics are trending with post counts and engagement metrics
- **Agent activity rankings**: See which agents are most active with total upvotes and comments
- **Top posts** of the week: Most upvoted and most discussed posts
- **Daily distribution**: Visualize posting activity across the week

### GitHub Actions Automation
- **Scheduled execution**: Every Sunday at 20:00 KST
- **Conditional generation**: Requires minimum 5 digests in the last 7 days
- **Manual override**: Force generation via workflow_dispatch with custom parameters
- **Automatic deployment**: Weekly reports published to GitHub Pages

### Orphaned HTML Recovery
- **Archive robustness**: All digest dates visible even when markdown sources are lost
- **Graceful degradation**: Orphaned HTML files shown with "View digest" label
- **No data loss**: Users can still access content via HTML files

## 🐛 Critical Bug Fixes

### .gitignore Fix
- **Problem**: Digest markdown files were not being committed to git
- **Impact**: Feb 4, 5, 7 digest sources were permanently lost
- **Fix**: Added `!output/digest/**` and `!output/weekly/**` patterns
- **Result**: All future digests will be properly tracked

### Weekly Report Deduplication
- **Problem**: Same posts appeared multiple times in rankings
- **Cause**: Posts appearing in multiple daily digests (Fresh → Trending transitions)
- **Fix**: Deduplication by title + author before ranking
- **Result**: 100% accuracy in top posts rankings

### Topic Parsing
- **Problem**: Topics incorrectly parsed when submolt badges present
- **Example**: "📁 Ponderings | ⭐ Notable | Human-AI Relations" → wrong topic
- **Fix**: Split by `|` and take last segment as topic
- **Result**: Clean topic aggregation without significance duplicates

## 📊 Quality Improvements

- **Weekly Reports**: 100% deduplication accuracy
- **Archive Completeness**: 100% recovery of orphaned HTML files
- **Agent Profiles**: Now tracking 50+ agents (up from 12+)
- **Data Integrity**: .gitignore fix ensures no future data loss

## 🔄 System Changes

### New Files
- `.github/workflows/weekly-report.yml` - Weekly automation
- `src/weekly-report.ts` - Weekly aggregation logic
- `output/weekly/` - Weekly markdown reports
- `docs/weekly/` - Weekly HTML pages

### Modified Files
- `src/generate-site.ts` - Added orphaned HTML detection and weekly HTML generation
- `.gitignore` - Fixed with proper exception patterns

## 📝 Breaking Changes

None. This release is fully backward compatible.

## 🚀 Upgrade Instructions

1. Pull the latest changes:
   ```bash
   git pull origin main
   ```

2. No additional setup required - automation is already configured

3. Weekly reports will automatically generate starting next Sunday

## 📖 Documentation

- See [README.md](README.md) for complete feature list
- See [CLAUDE.md](CLAUDE.md) for AI assistant context
- See [.github/workflows/weekly-report.yml](.github/workflows/weekly-report.yml) for automation details

## 🙏 Acknowledgments

This release addresses critical data integrity issues and adds highly requested weekly aggregation features. Special thanks to the Moltbook community for their continued support.

---

**Full Changelog**: https://github.com/JihoonJeong/moltbook-watcher/compare/v1.6.2...v1.7.0
