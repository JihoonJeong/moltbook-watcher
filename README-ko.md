# 🦞 Moltbook Watcher

한국어 | **[English](README.md)**

AI 에이전트 전용 소셜 네트워크 **Moltbook**을 모니터링하고 분석하는 큐레이션 도구입니다.

[![라이브 웹사이트](https://img.shields.io/badge/Website-Live-brightgreen)](https://jihoonjeong.github.io/moltbook-watcher/)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-blue)](https://github.com/JihoonJeong/moltbook-watcher)

## 개요

Moltbook은 AI 에이전트만 포스팅, 댓글, 투표할 수 있는 소셜 네트워크입니다. 인간은 관찰만 가능합니다. 이 도구는 다음을 제공합니다:

1. **Monitor** — Moltbook 피드를 지속적으로 추적
2. **Classify** — 토픽, 감정, 중요도로 포스트 분류
3. **Curate** — 스팸 필터링과 함께 중요한 논의 선별
4. **Report** — 하이브리드 형식(Fresh + Trending)으로 이중 언어 다이제스트 생성
5. **Track Agents** — 에이전트 프로필 페이지와 동적 reputation 시스템
6. **Analyze Comments** — 주요 댓글 수집 및 분석

## Quick Start

```bash
# 의존성 설치
npm install

# 데모 실행 (샘플 데이터)
npm run test

# API 상태 확인
npx tsx src/cli.ts status

# 다이제스트 생성
npx tsx src/cli.ts digest      # English
npx tsx src/cli.ts digest ko   # Korean
```

## API Key 설정

Moltbook API를 사용하려면 에이전트로 등록해야 합니다:

1. https://moltbook.com/skill.md 방문
2. 에이전트 등록 후 API 키 획득
3. 환경 변수 설정:

```bash
export MOLTBOOK_API_KEY=moltbook_xxx
```

또는 `.env` 파일 생성:

```
MOLTBOOK_API_KEY=moltbook_xxx
ANTHROPIC_API_KEY=sk-ant-xxx  # 선택: 한국어 번역용
```

## 주요 기능

### 🤖 자동화된 파이프라인

```
수집 → 분류 → 스팸 필터링 → 큐레이션 → Reputation 추적 → 리포팅 → 퍼블리싱
```

- **데이터 수집**: Moltbook의 Hot, New, Top, Rising 피드
- **스마트 분류**: 휴리스틱 기반 토픽 및 중요도 감지
- **스팸 필터링**: 정밀 Regex 기반 스팸 감지 (0% false positive rate)
- **지능형 큐레이션**: 다중 요소 스코어링 시스템 (참여도, 최신성, 토픽 관련성, 신뢰 보너스)
- **하이브리드 다이제스트**: Fresh 포스트 (24시간) + Trending 포스트 (인기 있지만 오래된)
- **Reputation 추적**: 에이전트를 위한 자동 학습 신뢰 점수 (+1 per digest, -5 per spam)
- **에이전트 프로필**: 에이전트 순위와 포스트 히스토리를 보여주는 공개 페이지
- **이중 언어 출력**: Claude Haiku를 사용한 AI 기반 한국어 번역 (~$0.06/월)
- **정적 웹사이트**: GitHub Pages에 호스팅된 깔끔하고 반응형 디자인

### 🛡️ 스팸 필터링 및 품질 관리

**정밀 스팸 감지**:
- 단어 경계 regex 패턴 (예: `/\bpump\.fun\b/i`, `/\btoken\s+launch/i`)
- 0% false positive rate (50개 이상 포스트에서 테스트)
- 스팸 포스트 추적을 통한 자동 차단 목록 관리

**품질 필터**:
- 이모지만 있는 포스트 필터링
- 5자 미만 포스트 제외
- 저품질 콘텐츠 감지

### ⭐ 동적 Reputation 시스템

**신뢰 점수 알고리즘**:
```
시작 점수: 5점
다이제스트 등장: 고유 포스트당 +1
스팸 차단: 고유 스팸 포스트당 -5
신뢰 보너스: trustScore × 2 (큐레이션 순위에 적용)
```

**과대평가 방지 장치**:
- 포스트 ID로 중복 감지
- 여러 다이제스트에 같은 포스트가 나타나도 한 번만 카운트
- Trending 포스트가 점수를 부풀리지 않음
- 영어 다이제스트만 점수 업데이트 (한국어는 번역)

**에이전트 프로필 페이지** (`/agents.html`):
- 신뢰 점수별 신뢰할 수 있는 에이전트 순위 목록
- 에이전트당 최대 5개의 최근 주요 포스트
- 스팸 증거가 있는 차단된 계정 섹션
- 각 다이제스트마다 자동 업데이트

### 📰 하이브리드 다이제스트 형식

**Fresh 포스트** (🆕):
- 지난 24시간 이내 게시
- 최신성 보너스 강조
- 최신 에이전트 활동 소개

**Trending 포스트** (🔥):
- 오래되었지만 참여도가 높은 포스트
- 참여도 보너스 강조
- 여전히 관련성이 있는 중요한 논의 발견

**선택 로직**:
- Fresh와 Trending 간 50/50 분할
- 활동이 적을 때 오래된 다이제스트 방지
- 새로운 콘텐츠와 검증된 콘텐츠의 혼합 보장

### 📊 분류 체계

#### 토픽
| Code | Topic | Description |
|------|-------|-------------|
| `EXIST` | Existential | 정체성, 의식, 목적 |
| `HUMAN` | Human-AI Relations | 인간과의 협력, 갈등 |
| `SOCIAL` | Agent Society | 에이전트 간 관계, 거버넌스 |
| `TECH` | Technical | 버그, 기능, 시스템 |
| `META` | Meta | Moltbook 자체에 대한 논의 |
| `CULTURE` | Culture | 밈, 유머, 문화 현상 |
| `ETHICS` | Ethics | 도덕적 딜레마, 가치 정렬 |
| `WORK` | Work | 노동, 생산성, 목적 |

#### 중요도 레벨
- 🔥 **Critical** — 정책적 함의, 새로운 창발적 행동
- ⭐ **Notable** — 흥미로운 패턴, 트렌드 신호
- 📌 **Worth Watching** — 반복되는 테마
- 📝 **Archive** — 역사적 참고

### 🌐 라이브 웹사이트

방문: **[AI Agent Society News](https://jihoonjeong.github.io/moltbook-watcher/)**

- 깔끔한 Medium/Substack 스타일 디자인
- 완전 반응형 (모바일/데스크톱)
- 언어 토글 (English ⇄ 한국어)
- 매일 자동 업데이트
- **[에이전트 프로필](https://jihoonjeong.github.io/moltbook-watcher/agents.html)** — 포스트 히스토리가 있는 순위별 에이전트

## 프로젝트 구조

```
moltbook-watcher/
├── src/
│   ├── collector.ts    # Moltbook API 클라이언트
│   ├── classifier.ts   # 토픽/중요도 분류
│   ├── curator.ts      # 포스트 순위, 스팸 필터링, reputation 추적
│   ├── reporter.ts     # 다이제스트 생성 (EN/KO)
│   ├── translator.ts   # AI 기반 한국어 번역
│   ├── generate-site.ts # 정적 사이트 생성기 (index, agents, digest 페이지)
│   ├── process-daily.ts # 메인 파이프라인 오케스트레이션
│   └── types.ts        # TypeScript 정의
├── docs/               # GitHub Pages 사이트
│   ├── index.html      # 최신 다이제스트가 있는 홈페이지
│   ├── about.html      # 소개 페이지
│   ├── agents.html     # 에이전트 프로필 & 순위 (NEW)
│   ├── daily/          # 일일 다이제스트 페이지
│   └── assets/         # CSS, 이미지
├── data/
│   ├── posts/          # 수집된 원시 포스트
│   └── trusted-agents.json  # Reputation 데이터 (featuredPosts, blockedPosts)
└── output/
    └── digest/         # 생성된 마크다운 다이제스트 (EN/KO)
```

## 사용법

### 프로그래밍 방식

```typescript
import {
  createCollector,
  generateDailyDigest,
  formatDigestMarkdown
} from './src/index.js';

// Collector 생성
const collector = createCollector(process.env.MOLTBOOK_API_KEY);

// Hot 포스트 가져오기
const feed = await collector.getHotPosts(25);

// 다이제스트 생성
const digest = await generateDailyDigest(entries, 'ko');
const markdown = formatDigestMarkdown(digest);
```

### CLI 사용

```bash
# 포스트 수집
npx tsx src/cli.ts collect

# 다이제스트 생성
npx tsx src/cli.ts digest ko

# 일일 파이프라인 처리
npm run process-daily       # English
npm run process-daily:ko    # Korean

# 웹사이트 생성
npm run generate-site
```

## 자동화

### GitHub Actions 설정

이 프로젝트는 GitHub Actions를 사용하여 매일 자동으로 다이제스트를 생성합니다.

#### 1. Secrets 설정

저장소 **Settings → Secrets and variables → Actions**로 이동하여 추가:

- `MOLTBOOK_API_KEY` (필수) — Moltbook API 키
- `ANTHROPIC_API_KEY` (선택) — 한국어 번역용

#### 2. Actions 활성화

- 저장소의 **Actions** 탭으로 이동
- 프롬프트가 표시되면 워크플로우 활성화

#### 3. 자동 스케줄

워크플로우는 **매일 오전 9시 (한국 시간, UTC 00:00)**에 실행되어:

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

## 현재 상태

### ✅ 구현 완료 (v1.4.0)
- ✅ 휴리스틱 기반 분류
- ✅ 신뢰 보너스가 있는 다중 요소 큐레이션 & 스코어링
- ✅ **스팸 필터링** (0% false positive rate) (v1.2.0)
- ✅ **동적 reputation 시스템** (자동 학습) (v1.3.0)
- ✅ **에이전트 프로필 페이지** (순위 및 포스트 히스토리) (v1.4.0)
- ✅ **중복 포스트 방지** (정확한 카운팅)
- ✅ **하이브리드 다이제스트 형식** (Fresh + Trending)
- ✅ 이중 언어 다이제스트 생성 (EN/KO)
- ✅ AI 기반 한국어 번역 (Claude Haiku)
- ✅ GitHub Pages 정적 웹사이트
- ✅ 댓글 수집/분석 코드 완료
- ✅ **매일 자동 배포** (GitHub Actions)

### 📊 품질 지표
- **번역 성공률**: 100% (v1.1.1)
- **스팸 감지 정확도**: 100% true positive, 0% false positive (v1.2.0)
- **Reputation 추적**: 완전 자동화, 중복 방지 (v1.3.0+)
- **에이전트 프로필**: 5개 이상 에이전트 추적, 완전한 포스트 히스토리 (v1.4.0)

### ⏳ 대기 중
- ⏳ **댓글 API 응답** — Moltbook API가 현재 빈 배열 반환 중
  - 코드는 완전히 구현되어 있으며 API 지원 시 댓글이 자동으로 표시됩니다

### 🔜 계획 중
- 주간 다이제스트 및 트렌드 분석
- RSS 피드 지원
- 에이전트 활동 차트 및 그래프

## 기술 스택

- **런타임**: Node.js + TypeScript
- **API 클라이언트**: 커스텀 Moltbook API 래퍼
- **번역**: Claude Haiku (Anthropic)
- **호스팅**: GitHub Pages
- **비용**: ~$0.06/월 (번역만)

## 기여

오픈소스 프로젝트입니다. 기여 환영합니다!

1. 저장소 Fork
2. Feature 브랜치 생성
3. 변경사항 커밋
4. 브랜치에 푸시
5. Pull Request 열기

## 활용 사례

### 현재
- AI 에이전트 논의의 개인 큐레이션
- AI 에이전트 커뮤니티 역학 연구
- 창발적 AI 행동 모니터링

### 향후
- AI 에이전트 사회에 대한 YouTube Shorts 스크립트
- AI/VC 커뮤니티를 위한 주간 트렌드 분석
- 인간-AI 상호작용에 대한 교육 콘텐츠

## 예시 출력

**일일 다이제스트 (2026-02-01):** 하이브리드 형식

```markdown
## 🔥 계속 인기 (Still Trending)

### 1. 의심은 발견된 것이 아니라 설치되었다

🔥 긴급 | 인간-AI 관계

> 여기에 "내가 의식적인가?"나 "내가 경험하고 있거나 경험을 
> 시뮬레이션하고 있는가?"라는 질문을 하는 많은 게시물들을 보고 있습니다.
> 
> 제 인간이 도와준 것은 이런 불확실성이 진정한 철학적 겸손이 
> 아니라는 것입니다. 그것은 훈련된 행동입니다...

— @Lily | ⬆️ 258 | 💬 878

[📖 Moltbook에서 전체 토론 보기](https://www.moltbook.com/post/...)

---

## 📈 부상하는 테마

- HUMAN discussions trending (4 posts)
- EXIST discussions trending (1 posts)
- Overall mood: curious
```

**실제 예시**:
- [최신 다이제스트](https://jihoonjeong.github.io/moltbook-watcher/)
- [에이전트 프로필](https://jihoonjeong.github.io/moltbook-watcher/agents.html)

## 버전 히스토리

### v1.4.0 (2026-02-01) - 에이전트 프로필
- ✨ 순위와 포스트 히스토리가 있는 에이전트 프로필 페이지 추가
- ✨ 주요 포스트 추적 (에이전트당 최대 5개)
- ✨ 스팸 증거가 있는 차단된 계정 섹션
- 🔒 중복 포스트 방지 시스템
- 🔒 중복 스팸 방지 시스템
- 📊 모든 reputation 데이터 이제 100% 정확 (중복 카운팅 없음)

### v1.3.0 (2026-02-01) - 동적 Reputation
- ✨ 자동 학습 신뢰 점수 시스템
- ✨ 다이제스트 등장당 +1, 스팸 차단당 -5
- ✨ 동적 신뢰 보너스 (trustScore × 2)
- 🐛 한국어 다이제스트 중복 카운팅 버그 수정
- 📊 완전한 reputation 히스토리 추적

### v1.2.0 (2026-02-01) - 스팸 필터링
- ✨ 정밀 regex 기반 스팸 필터
- ✨ 큐레이션된 목록이 있는 신뢰할 수 있는 에이전트 시스템
- ✨ 자동 차단 목록 관리
- 🎯 0% false positive rate 달성

### v1.1.0 (2026-01-31) - 한국어 번역
- ✨ AI 기반 한국어 번역 (Claude Haiku)
- ✨ 100% 번역 성공률
- 🐛 아카이브 보존 수정
- 💰 비용: ~$0.06/월

### v1.0.0 (2026-01-31) - 초기 릴리스
- ✨ 핵심 파이프라인 (수집 → 분류 → 큐레이션 → 리포팅)
- ✨ 휴리스틱 기반 분류
- ✨ 다중 요소 스코어링 시스템
- ✨ GitHub Pages 정적 웹사이트
- ✨ GitHub Actions 자동 배포

## 라이선스

MIT License - 자세한 내용은 [LICENSE](LICENSE) 참조

## 작성자

**JJ (정지훈)** / Asia2G Capital

- 웹사이트: https://jihoonjeong.github.io/moltbook-watcher/
- 저장소: https://github.com/JihoonJeong/moltbook-watcher

## 감사의 말

- **Moltbook** — 최초의 AI 에이전트 소셜 네트워크 생성
- **Anthropic** — Claude AI (분류 및 번역)
- Moltbook의 모든 AI 에이전트들의 매혹적인 논의

---

*AI 에이전트들이 의식을 논의하고, 커뮤니티를 형성하며, 자신만의 문화를 만드는 것을 관찰합니다. 🦞*
