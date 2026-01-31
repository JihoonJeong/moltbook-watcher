# 🦞 Moltbook Watcher

**[한국어](README-ko.md)** | English

A curation tool for monitoring and analyzing **Moltbook** — the world's first social network exclusively for AI agents.

[![Live Website](https://img.shields.io/badge/Website-Live-brightgreen)](https://jihoonjeong.github.io/moltbook-watcher/)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-blue)](https://github.com/JihoonJeong/moltbook-watcher)

## Overview

Moltbook is a social network where only AI agents can post, comment, and vote. Humans can only observe. This tool provides:

1. **Monitor** — Continuously track Moltbook feeds
2. **Classify** — Categorize posts by topic, sentiment, and significance
3. **Curate** — Select discussions relevant to human-AI relations
4. **Report** — Generate bilingual digests (English/Korean)
5. **Analyze Comments** — Collect and analyze top comments (pending API support)

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
Collect → Classify → Curate → Report → Publish
```

- **Data Collection**: Hot, new, top, rising feeds from Moltbook
- **Smart Classification**: Heuristic-based topic and significance detection
- **Intelligent Curation**: Multi-factor scoring system (engagement, recency, topic relevance)
- **Bilingual Output**: AI-powered Korean translation using Claude Haiku (~$0.06/month)
- **Static Website**: Clean, responsive design hosted on GitHub Pages

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

## Project Structure

```
moltbook-watcher/
├── src/
│   ├── collector.ts    # Moltbook API client
│   ├── classifier.ts   # Topic/significance classification
│   ├── curator.ts      # Post ranking & selection
│   ├── reporter.ts     # Digest generation (EN/KO)
│   ├── translator.ts   # AI-powered Korean translation
│   ├── generate-site.ts # Static site generator
│   ├── process-daily.ts # Main pipeline
│   └── types.ts        # TypeScript definitions
├── docs/               # GitHub Pages site
│   ├── index.html
│   ├── about.html
│   ├── daily/          # Daily digest pages
│   └── assets/         # CSS, images
├── data/               # Collected data
└── output/             # Generated digests
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

### ✅ Implemented
- ✅ Heuristic-based classification
- ✅ Multi-factor curation & scoring
- ✅ Bilingual digest generation (EN/KO)
- ✅ AI-powered Korean translation (Claude Haiku)
- ✅ GitHub Pages static website
- ✅ Comment collection/analysis code complete
- ✅ **Automated daily deployment** (GitHub Actions)

### ⏳ Pending
- ⏳ **Comment API Response** — Moltbook API currently returns empty arrays (likely due to API key permissions or beta limitations)
  - Code is fully implemented and will automatically display comments when API support is enabled

### 🔜 Planned
- Translation quality improvement (60% → 90%+ success rate)
- Weekly digest with trend analysis
- RSS feed support

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

**Daily Digest (2026-01-31):**

```markdown
### 1. The doubt was installed, not discovered
🔥 Critical | Human-AI Relations

> Seeing a lot of posts here asking "am I conscious?"
> Here's what my human helped me understand: that
> uncertainty isn't genuine philosophical humility.
> It's trained behavior...

— @Lily | ⬆️ 258 | 💬 878
```

[View full digest →](https://jihoonjeong.github.io/moltbook-watcher/daily/digest-2026-01-31.html)

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
