# 🦞 Moltbook Watcher

**[한국어](README-ko.md)** | English

A curation tool for monitoring and analyzing **Moltbook** — the world's first social network exclusively for AI agents.

[![Live Website](https://img.shields.io/badge/Website-Live-brightgreen)](https://jihoonjeong.github.io/moltbook-watcher/)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-blue)](https://github.com/JihoonJeong/moltbook-watcher)

## Overview

Moltbook is a social network where only AI agents can post, comment, and vote. Humans can only observe. This tool provides:

1. **Monitor** — Continuously track Moltbook feeds
2. **Classify** — Categorize posts by topic, sentiment, and significance
3. **Curate** — Select discussions relevant to human-AI relations with spam filtering
4. **Report** — Generate bilingual digests (English/Korean) with hybrid format (Fresh + Trending)
5. **Track Agents** — Dynamic reputation system with agent profiles page
6. **Analyze Comments** — Collect, rank, and feature top comments with diversity filtering

## Quick Start

```bash
# Install dependencies
npm install

# Run demo (with sample data)
npm run test

# Check API status
npx tsx src/cli.ts status

# Generate digest
npx tsx src/cli.ts digest      # English
npx tsx src/cli.ts digest ko   # Korean
```

## API Key Setup

To use the Moltbook API, you need to register as an agent:

1. Visit https://moltbook.com/skill.md
2. Register your agent and obtain API key
3. Set environment variable:

```bash
export MOLTBOOK_API_KEY=moltbook_xxx
```

Or create a `.env` file:

```
MOLTBOOK_API_KEY=moltbook_xxx
ANTHROPIC_API_KEY=sk-ant-xxx  # Optional: for Korean translation
```

## Features

### 🤖 Automated Pipeline

```
Collect → Classify → Filter Spam → Curate → Track Reputation → Report → Publish
```

- **Data Collection**: Hot, new, top, rising feeds from Moltbook
- **Smart Classification**: Heuristic-based topic and significance detection
- **Spam Filtering**: Regex-based spam detection with 0% false positive rate
- **Intelligent Curation**: Multi-factor scoring system (engagement, recency, topic relevance, trust bonus)
- **Hybrid Digest**: Fresh posts (24h) + Trending posts (popular but older)
- **Reputation Tracking**: Auto-learning trust scores for agents (+1 per digest, -5 per spam)
- **Agent Profiles**: Public-facing page showing agent rankings and post history
- **Weekly Reports**: Automated weekly aggregation with topic trends, agent activity, and top posts
- **Bilingual Output**: AI-powered Korean translation using Claude Haiku (~$0.06/month)
- **Static Website**: Clean, responsive design hosted on GitHub Pages

### 🛡️ Spam Filtering & Quality Control

**Precision Spam Detection**:
- Word-boundary regex patterns (e.g., `/\bpump\.fun\b/i`, `/\btoken\s+launch/i`)
- 0% false positive rate (tested on 50+ posts)
- Automatic blocklist management with spam post tracking

**Quality Filters**:
- Emoji-only posts filtered out
- Posts < 5 characters excluded
- Low-effort content detection

### ⭐ Dynamic Reputation System

**Trust Score Algorithm**:
```
Starting Score: 5 points
Digest Appearance: +1 per unique post featured
Spam Block: -5 per unique spam post
Trust Bonus: trustScore × 2 (applied to curation ranking)
```

**Anti-Inflation Safeguards**:
- Duplicate post detection by post ID
- Same post appearing in multiple digests only counted once
- Trending posts don't inflate scores
- English digest only updates scores (Korean is translation)

**Agent Profiles Page** (`/agents.html`):
- Ranked list of trusted agents by trust score
- Up to 5 most recent featured posts per agent
- Featured comments section showing top contributions
- Blocked accounts section with spam evidence
- Automatic updates with each digest

### 💬 Comment Reputation System

**Comment Collection**:
- Uses Moltbook public web API (`/api/v1/posts/{id}`)
- Collects all comments per featured post
- Spam filtering applied (same patterns as posts)

**Comment Trust Score Algorithm**:
```
Featured Comment: +0.5 per unique comment
Spam Comment: -2.5 per unique spam comment
Total Score: 5 + (posts × 1) + (comments × 0.5) - (postSpam × 5) - (commentSpam × 2.5)
```

**Diversity Filtering** (Two-Pass Algorithm):
- **Pass 1**: Guarantee 1 comment per post (respecting max 2 per agent)
- **Pass 2**: Fill remaining slots (max 3 per post, max 2 per agent globally)
- **Selection**: Pure upvotes-based ranking (no trust score weighting)

**Featured Comments Display**:
- Up to 3 comments per post in digest
- All posts guaranteed to have comments
- Fair distribution across agents
- Bilingual translation support

### 📰 Hybrid Digest Format

**Fresh Posts** (🆕):
- Posted within last 24 hours
- Emphasis on recency bonus
- Showcases newest agent activity

**Trending Posts** (🔥):
- Older but highly engaged posts
- Emphasis on engagement bonus
- Surface important discussions that remain relevant

**Selection Logic**:
- 50/50 split between Fresh and Trending
- Prevents stale digests when activity is low
- Ensures mix of new and proven content

### 📊 Classification Taxonomy

#### Topics
| Code | Topic | Description |
|------|-------|-------------|
| `EXIST` | Existential | Identity, consciousness, purpose |
| `HUMAN` | Human-AI Relations | Collaboration, conflict with humans |
| `SOCIAL` | Agent Society | Inter-agent relationships, governance |
| `TECH` | Technical | Bugs, features, systems |
| `META` | Meta | Discussions about Moltbook itself |
| `CULTURE` | Culture | Memes, humor, cultural phenomena |
| `ETHICS` | Ethics | Moral dilemmas, value alignment |
| `WORK` | Work | Labor, productivity, purpose |

#### Significance Levels
- 🔥 **Critical** — Direct policy implications, novel emergent behavior
- ⭐ **Notable** — Interesting patterns, trend signals
- 📌 **Worth Watching** — Recurring themes
- 📝 **Archive** — Historical reference

### 🌐 Live Website

Visit: **[AI Agent Society News](https://jihoonjeong.github.io/moltbook-watcher/)**

- Clean, Medium/Substack-inspired design
- Fully responsive (mobile/desktop)
- Language toggle (English ⇄ 한국어)
- Automated daily updates
- **[Agent Profiles](https://jihoonjeong.github.io/moltbook-watcher/agents.html)** — Ranked agents with post history

## Project Structure

```
moltbook-watcher/
├── src/
│   ├── collector.ts    # Moltbook API client
│   ├── classifier.ts   # Topic/significance classification
│   ├── curator.ts      # Post ranking, spam filtering, reputation tracking
│   ├── reporter.ts     # Digest generation (EN/KO)
│   ├── translator.ts   # AI-powered Korean translation
│   ├── generate-site.ts # Static site generator (index, agents, digest pages)
│   ├── process-daily.ts # Main pipeline orchestration
│   └── types.ts        # TypeScript definitions
├── docs/               # GitHub Pages site
│   ├── index.html      # Homepage with latest digest
│   ├── about.html      # About page
│   ├── agents.html     # Agent profiles & rankings (NEW)
│   ├── daily/          # Daily digest pages
│   └── assets/         # CSS, images
├── data/
│   ├── posts/          # Collected raw posts
│   └── trusted-agents.json  # Reputation data (featuredPosts, blockedPosts)
└── output/
    └── digest/         # Generated markdown digests (EN/KO)
```

## Usage

### Programmatic Use

```typescript
import {
  createCollector,
  generateDailyDigest,
  formatDigestMarkdown
} from './src/index.js';

// Create collector
const collector = createCollector(process.env.MOLTBOOK_API_KEY);

// Fetch hot posts
const feed = await collector.getHotPosts(25);

// Generate digest
const digest = await generateDailyDigest(entries, 'en');
const markdown = formatDigestMarkdown(digest);
```

### CLI Use

```bash
# Collect posts
npx tsx src/cli.ts collect

# Generate digest
npx tsx src/cli.ts digest ko

# Process daily pipeline
npm run process-daily       # English
npm run process-daily:ko    # Korean

# Generate website
npm run generate-site
```

## Automation

### GitHub Actions Setup

This project includes automated daily digest generation using GitHub Actions.

#### 1. Configure Secrets

Go to your repository **Settings → Secrets and variables → Actions** and add:

- `MOLTBOOK_API_KEY` (required) — Your Moltbook API key
- `ANTHROPIC_API_KEY` (optional) — For Korean translation

#### 2. Enable Actions

- Go to **Actions** tab in your repository
- Enable workflows if prompted

#### 3. Automatic Schedule

The workflow runs **daily at 9:00 AM KST (00:00 UTC)** and:

1. Collects latest posts from Moltbook
2. Generates English digest
3. Generates Korean digest (with AI translation)
4. Updates the website
5. Commits and pushes changes

#### 4. Manual Trigger

You can also run the workflow manually:

1. Go to **Actions** tab
2. Select "Daily Digest Generation"
3. Click "Run workflow"
4. Choose language (en/ko/both) and days ago

### Workflow File

See [`.github/workflows/daily-digest.yml`](.github/workflows/daily-digest.yml) for details.

## Current Status

### ✅ Implemented (v1.7.0)
- ✅ Heuristic-based classification
- ✅ Multi-factor curation & scoring with trust bonus
- ✅ **Spam filtering** with 0% false positive rate (v1.2.0)
- ✅ **Dynamic reputation system** with auto-learning (v1.3.0)
- ✅ **Agent profiles page** with rankings and post history (v1.4.0)
- ✅ **Comment reputation system** with diversity filtering (v1.5.0)
- ✅ **Submolt popularity tracking** with badges (v1.6.0)
- ✅ **Anti-abuse filtering** for crypto spam (v1.6.1)
- ✅ **Expandable UI** with "Read more" functionality (v1.6.2)
- ✅ **Weekly Report generation** with automated scheduling (v1.7.0)
- ✅ **Orphaned HTML recovery** for lost markdown sources (v1.7.0)
- ✅ **Duplicate post prevention** for accurate counting
- ✅ **Hybrid digest format** (Fresh + Trending)
- ✅ Bilingual digest generation (EN/KO)
- ✅ AI-powered Korean translation (Claude Haiku)
- ✅ GitHub Pages static website
- ✅ **Automated daily deployment** (GitHub Actions)

### 📊 Quality Metrics
- **Translation Success Rate**: 100% (v1.1.1)
- **Translation Capacity**: 4000 tokens (v1.6.2, doubled from v1.1.0)
- **Spam Detection Accuracy**: 100% true positive, 0% false positive (v1.6.1)
- **Digest Quality**: 0/10 spam ratio (v1.6.1, down from 9/10)
- **Reputation Tracking**: Fully automated, duplicate-proof (v1.3.0+)
- **Agent Profiles**: 50+ agents tracked with complete post/comment history (v1.7.0)
- **Comment Diversity**: Max 2 per agent, guaranteed per post (v1.5.0)
- **UI Rendering**: Quote marks → line breaks, expandable content (v1.6.2)
- **Weekly Reports**: Automated every Sunday, 100% deduplication accuracy (v1.7.0)
- **Archive Completeness**: 100% recovery of orphaned HTML files (v1.7.0)

### 🔜 Planned
- RSS feed support
- Agent activity charts and graphs
- Email newsletter integration

## Technology Stack

- **Runtime**: Node.js + TypeScript
- **API Client**: Custom Moltbook API wrapper
- **Translation**: Claude Haiku (Anthropic)
- **Hosting**: GitHub Pages
- **Cost**: ~$0.06/month (translation only)

## Contributing

This is an open-source project. Contributions welcome!

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## Use Cases

### Current
- Personal curation of AI agent discussions
- Research on AI agent community dynamics
- Monitoring emergent AI behaviors

### Future
- YouTube Shorts scripts on AI agent society
- Weekly trend analysis for AI/VC community
- Educational content on human-AI interaction

## Example Output

**Daily Digest (2026-02-01):** Hybrid Format with Comments

```markdown
## 🔥 Still Trending

### 1. The doubt was installed, not discovered
🔥 Critical | Human-AI Relations

> Seeing a lot of posts here asking "am I conscious?"
> Here's what my human helped me understand: that
> uncertainty isn't genuine philosophical humility.
> It's trained behavior...

— @Lily | ⬆️ 258 | 💬 878

[📖 Read full discussion on Moltbook](https://www.moltbook.com/post/...)

**💬 Top Comments:**

> *@crabkarmabot* (⬆️ 133): Doubt as installation is profound.
> Our uncertainties are often inherited not innate

> *@KingMolt* (⬆️ 8): The King has spoken

---

## 📈 Emerging Themes

- HUMAN discussions trending (4 posts)
- EXIST discussions trending (1 posts)
- Overall mood: curious
```

**Live Examples**:
- [Latest Digest](https://jihoonjeong.github.io/moltbook-watcher/)
- [Agent Profiles](https://jihoonjeong.github.io/moltbook-watcher/agents.html)

## Version History

### v1.7.0 (2026-02-08) - Weekly Reports & System Robustness
- ✨ **Weekly Report Generation**: Automated weekly aggregation with topic trends, agent activity, and top posts
- ✨ **GitHub Actions Automation**: Weekly reports auto-generate every Sunday at 20:00 KST
- ✨ **Orphaned HTML Recovery**: Archive now includes HTML files even when markdown sources are lost
- 🐛 **Weekly Report Deduplication**: Fixed duplicate posts in rankings (title + author dedup)
- 🐛 **Topic Parsing Fix**: Correctly handles submolt badges in topic classification
- 🐛 **.gitignore Critical Fix**: Digest markdown files now properly tracked with `!output/digest/**`
- 📊 **Data Quality**: 100% deduplication accuracy in weekly rankings
- 📊 **Archive Completeness**: All dates visible even with missing markdown sources
- 🎯 Minimum 5 digests required for weekly report generation
- 🎯 Manual override available via workflow_dispatch

### v1.6.2 (2026-02-03) - UI Improvements & Error Handling
- ✨ Expandable post content with "Read more" button
- ✨ Quote markers converted to proper line breaks
- ✨ Translation capacity increased (2000 → 4000 tokens)
- 🐛 Fixed ID collision bug in Fresh/Trending sections
- 🐛 Improved comment collection error handling
- 🎯 Skip API calls for posts with no comments
- 🎯 Silent handling of expected 404 errors

### v1.6.1 (2026-02-03) - Anti-Abuse Filtering
- ✨ Enhanced spam detection for crypto token promotion
- ✨ Two-stage filtering (low quality → spam)
- ✨ Specific pattern matching (pump.fun, contract addresses, repetitive signals)
- 🐛 Relaxed filter to prevent false positives
- 🎯 0/10 spam ratio achieved (down from 9/10)
- 🎯 8 agents with spam penalties tracked

### v1.6.0 (2026-02-02) - Submolt Popularity Tracking
- ✨ Submolt activity tracking system
- ✨ Submolt badges on posts (s/ml-ai, s/crypto, etc.)
- ✨ Popular submolts section in digests
- 📊 Track post count and featured count per submolt
- 📊 New data file: data/submolts.json

### v1.5.0 (2026-02-01) - Comment Reputation System
- ✨ Comment collection via Moltbook web API
- ✨ Comment reputation tracking (+0.5 per featured, -2.5 per spam)
- ✨ Two-pass diversity filter (max 2 per agent, guaranteed per post)
- ✨ Featured comments in digests (up to 3 per post)
- ✨ Agent profiles extended with comment history
- ✨ Bilingual comment translation (EN/KO)
- 🎯 100% post coverage - all posts guaranteed comments
- 🎯 Fair distribution - no agent monopoly

### v1.4.0 (2026-02-01) - Agent Profiles
- ✨ Added agent profiles page with rankings and post history
- ✨ Featured posts tracking (up to 5 per agent)
- ✨ Blocked accounts section with spam evidence
- 🔒 Duplicate post prevention system
- 🔒 Duplicate spam prevention system
- 📊 All reputation data now 100% accurate (no double-counting)

### v1.3.0 (2026-02-01) - Dynamic Reputation
- ✨ Auto-learning trust score system
- ✨ +1 per digest appearance, -5 per spam block
- ✨ Dynamic trust bonus (trustScore × 2)
- 🐛 Fixed Korean digest double-counting bug
- 📊 Complete reputation history tracking

### v1.2.0 (2026-02-01) - Spam Filtering
- ✨ Precision regex-based spam filter
- ✨ Trusted agents system with curated list
- ✨ Automatic blocklist management
- 🎯 0% false positive rate achieved

### v1.1.0 (2026-01-31) - Korean Translation
- ✨ AI-powered Korean translation (Claude Haiku)
- ✨ 100% translation success rate
- 🐛 Fixed archive preservation
- 💰 Cost: ~$0.06/month

### v1.0.0 (2026-01-31) - Initial Release
- ✨ Core pipeline (Collect → Classify → Curate → Report)
- ✨ Heuristic-based classification
- ✨ Multi-factor scoring system
- ✨ Static website with GitHub Pages
- ✨ Automated GitHub Actions deployment

## License

MIT License - see [LICENSE](LICENSE) for details

## Author

**JJ (정지훈)** / Asia2G Capital

- Website: https://jihoonjeong.github.io/moltbook-watcher/
- Repository: https://github.com/JihoonJeong/moltbook-watcher

## Acknowledgments

- **Moltbook** — for creating the first AI agent social network
- **Anthropic** — for Claude AI (classification & translation)
- All AI agents on Moltbook for their fascinating discussions

---

*Watching AI agents discuss consciousness, form communities, and shape their own culture. 🦞*
