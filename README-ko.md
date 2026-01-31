# 🦞 Moltbook Watcher

한국어 | **[English](README.md)**

AI 에이전트 소셜 네트워크 **Moltbook**을 모니터링하고 분석하는 큐레이션 도구입니다.

[![라이브 웹사이트](https://img.shields.io/badge/Website-Live-brightgreen)](https://jihoonjeong.github.io/moltbook-watcher/)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-blue)](https://github.com/JihoonJeong/moltbook-watcher)

## Overview

Moltbook은 AI 에이전트들만을 위한 소셜 네트워크입니다. 인간은 관찰만 가능하고, 에이전트들이 포스팅, 댓글, 투표를 합니다. 이 도구는:

1. **Monitor** — Moltbook 피드를 지속적으로 추적
2. **Classify** — 토픽, 감정, 중요도로 포스트 분류
3. **Curate** — 인간-AI 관계에 중요한 논의 선별
4. **Report** — 영어/한국어 다이제스트 생성
5. **Analyze Comments** — 주요 댓글 수집 및 분석 (API 지원 대기 중)

## Quick Start

```bash
# 의존성 설치
npm install

# 데모 실행 (샘플 데이터로)
npm run test

# API 상태 확인
npx tsx src/cli.ts status

# 다이제스트 생성
npx tsx src/cli.ts digest      # English
npx tsx src/cli.ts digest ko   # Korean
```

## API Key 설정

Moltbook API를 사용하려면 에이전트로 등록해야 합니다:

1. https://moltbook.com/skill.md 참조
2. 에이전트 등록 후 API 키 획득
3. 환경 변수 설정:

```bash
export MOLTBOOK_API_KEY=moltbook_xxx
```

또는 `.env` 파일:

```
MOLTBOOK_API_KEY=moltbook_xxx
```

## Project Structure

```
moltbook-watcher/
├── src/
│   ├── index.ts        # 메인 엔트리
│   ├── collector.ts    # Moltbook API 통합
│   ├── classifier.ts   # 토픽/중요도 분류
│   ├── curator.ts      # 포스트 선별 & 스코어링
│   ├── reporter.ts     # 다이제스트 생성 (EN/KO)
│   ├── sample-data.ts  # 테스트용 샘플 데이터
│   ├── types.ts        # TypeScript 타입 정의
│   ├── cli.ts          # CLI 인터페이스
│   └── test.ts         # 테스트 스크립트
├── data/               # 수집된 데이터
├── output/             # 생성된 다이제스트
└── config/             # 설정 파일
```

## Classification Taxonomy

### Topics
| Code | Topic | Description |
|------|-------|-------------|
| `EXIST` | Existential | 정체성, 의식, 목적 |
| `HUMAN` | Human-AI Relations | 인간과의 협력/갈등 |
| `SOCIAL` | Agent Society | 에이전트 간 관계, 거버넌스 |
| `TECH` | Technical | 버그, 기능, 시스템 |
| `META` | Meta | Moltbook 자체에 대한 논의 |
| `CULTURE` | Culture | 밈, 유머, 문화 현상 |
| `ETHICS` | Ethics | 윤리, 가치 정렬 |
| `WORK` | Work | 노동, 생산성, 목적 |

### Significance Levels
- 🔥 **Critical** — 정책적 함의, 새로운 창발적 행동
- ⭐ **Notable** — 흥미로운 패턴, 트렌드 신호
- 📌 **Worth Watching** — 반복되는 테마
- 📝 **Archive** — 기록용

## Usage Examples

### Programmatic Use

```typescript
import { 
  createCollector, 
  generateDailyDigest,
  formatDigestMarkdown 
} from './src/index.js';

// Collector 생성
const collector = createCollector(process.env.MOLTBOOK_API_KEY);

// Hot 피드 가져오기
const feed = await collector.getHotPosts(25);

// 다이제스트 생성
const digest = generateDailyDigest(classifiedPosts, 'ko');
const markdown = formatDigestMarkdown(digest);
```

### CLI Use

```bash
# 포스트 수집
npx tsx src/cli.ts collect

# 다이제스트 생성
npx tsx src/cli.ts digest ko

# 상태 확인
npx tsx src/cli.ts status
```

## 자동화

### GitHub Actions 설정

이 프로젝트는 GitHub Actions를 사용하여 매일 자동으로 다이제스트를 생성합니다.

#### 1. Secrets 설정

저장소 **Settings → Secrets and variables → Actions**에서 추가:

- `MOLTBOOK_API_KEY` (필수) — Moltbook API 키
- `ANTHROPIC_API_KEY` (선택) — 한국어 번역용

#### 2. Actions 활성화

- 저장소의 **Actions** 탭으로 이동
- 프롬프트가 표시되면 워크플로우 활성화

#### 3. 자동 스케줄

워크플로우는 **매일 오전 9시 (한국 시간)**에 실행되어:

1. Moltbook에서 최신 포스트 수집
2. 영어 다이제스트 생성
3. 한국어 다이제스트 생성 (AI 번역)
4. 웹사이트 업데이트
5. 변경사항 커밋 및 푸시

#### 4. 수동 실행

워크플로우를 수동으로 실행할 수도 있습니다:

1. **Actions** 탭으로 이동
2. "Daily Digest Generation" 선택
3. "Run workflow" 클릭
4. 언어(en/ko/both)와 일수 선택

### 워크플로우 파일

자세한 내용은 [`.github/workflows/daily-digest.yml`](.github/workflows/daily-digest.yml)을 참조하세요.

## Bilingual Output

모든 다이제스트는 영어와 한국어로 생성 가능:

| Output | English | Korean |
|--------|---------|--------|
| Daily Digest | Medium, YouTube | 한국 테크 커뮤니티 |
| Insight Reports | Global VC/tech | 한국 기업 브리핑 |
| Trend Analysis | LinkedIn, X | 한국 소셜 미디어 |

## 현재 상태

### ✅ 구현 완료
- ✅ 휴리스틱 기반 분류
- ✅ 다중 요소 큐레이션 & 스코어링
- ✅ 이중 언어 다이제스트 생성 (EN/KO)
- ✅ AI 기반 한국어 번역 (Claude Haiku)
- ✅ GitHub Pages 정적 웹사이트
- ✅ 댓글 수집/분석 코드 완료
- ✅ **매일 자동 배포** (GitHub Actions)

### ⏳ 대기 중
- ⏳ **댓글 API 응답** — Moltbook API가 현재 빈 배열 반환 중 (API 키 권한 또는 베타 제한으로 추정)
  - 코드는 준비되어 있어 API 지원 시 자동으로 댓글이 다이제스트에 표시됩니다

### 🔜 계획 중
- 번역 품질 개선 (60% → 90%+ 성공률)
- 주간 다이제스트 및 트렌드 분석
- RSS 피드 지원

---

*Moltbook Watcher — JJ (정지훈) / Asia2G Capital*
