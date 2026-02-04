# 🦞 Moltbook Watcher - Claude Context

**프로젝트 컨텍스트 문서 for AI Assistants**

이 문서는 Claude 및 다른 AI 어시스턴트가 프로젝트를 이해하고 작업할 때 참고하는 문서입니다.

---

## 📋 프로젝트 개요

**목적**: AI 에이전트 전용 소셜 네트워크 Moltbook을 모니터링하고 큐레이션

**핵심 가치**:
- 인간이 관찰만 할 수 있는 공간에서 에이전트들의 논의를 추적
- 데이터 기반 자동화 + 인간의 인사이트 결합
- 투명하고 재현 가능한 큐레이션

**타겟 사용자**:
- AI/ML 연구자
- VC/투자자
- Tech 저널리스트
- AI 안전성 연구자
- 호기심 많은 테크 얼리어답터

---

## 🎯 프로젝트 철학

### 자동화 vs 수동 큐레이션

**자동화 영역 (프로그래매틱하게)**:
- 데이터 수집 (Moltbook API)
- 통계 계산 및 집계
- 스팸 필터링 (패턴 기반)
- Reputation 추적
- 사이트 생성 및 배포

**수동 영역 (JJ의 판단)**:
- 인사이트 해석
- Story of the Week 선정
- 패턴 의미 부여
- Medium 장문 글 작성
- 소셜 미디어 공유 전략

**핵심 원칙**:
> 기계가 데이터를 모으고, 인간이 의미를 찾는다.

---

## 📅 운영 워크플로우

### Daily Digest (매일)

**자동화 파이프라인**:
```bash
npm run collect          # 포스트 수집
npm run process-daily    # English digest
npm run process-daily:ko # Korean digest
npm run generate-site    # HTML 생성
git push                 # 자동 배포
```

**GitHub Actions**: 매일 09:00 KST 자동 실행

**수동 작업 (JJ)**:
- GitHub Pages 확인
- X/LinkedIn에 간단한 코멘트와 함께 공유
- 형식: "오늘의 AI 에이전트 논의: [핵심 포인트 1-2개] + 링크"

### Weekly Report (매주)

**타이밍**: 일요일 저녁 20:00 KST 자동 발행

**GitHub Actions 자동화**:
- **트리거**: 매주 일요일 20:00 KST (cron: '0 11 * * 0')
- **조건**: 최근 7일간 digest 5개 이상 존재
- **프로세스**:
  1. Digest 파일 개수 확인
  2. `npm run weekly` - 데이터 집계 및 리포트 생성
  3. `npm run generate-site` - Weekly HTML 페이지 생성
  4. Git commit & push - GitHub Pages 자동 배포

**자동 생성되는 내용**:
- 📊 주간 통계 (포스트 수, engagement 평균)
- 📅 일별 포스트 분포
- 🔥 토픽 트렌드 (포스트 수 및 평균 engagement)
- 🤖 가장 활발한 에이전트 TOP 10
- 📌 Submolt 활동 (있는 경우)
- ⭐ 주간 TOP 포스트 (Most Upvoted & Most Discussed)

**수동 작업 (JJ)**:
1. **일요일 저녁**: GitHub Pages에서 자동 생성된 weekly report 확인
2. **일요일 밤 또는 월요일 오전**:
   - 자동 리포트 데이터를 바탕으로 Medium 심층 분석 글 작성
   - Story of the Week 선정 (1-2개)
   - 패턴 분석 및 인사이트 추가
   - "My Take" 작성
3. **월요일 오전**:
   - Medium 글 발행
   - X/LinkedIn에 요약 + Medium 링크 + GitHub Pages 링크 공유

**발행 채널 전략**:
- **Primary**: GitHub Pages (완전 자동, 데이터 중심, 20:00 KST)
- **Secondary**: Medium (수동, 인사이트 중심, 월요일 오전)
- **Amplification**: X, LinkedIn (수동, 요약, 월요일 오전)

**수동 실행** (필요 시):
```bash
# GitHub Actions UI에서 "workflow_dispatch" 사용
# 또는 로컬에서:
npm run weekly        # 기본 7일
npm run weekly 14     # 14일 (bi-weekly)
npm run generate-site
git add . && git commit && git push
```

---

## 🏗️ 프로젝트 구조

### 핵심 파이프라인

```
1. Collect (collector.ts)
   ↓
2. Classify (classifier.ts)
   ↓
3. Filter Spam (curator.ts)
   ↓
4. Curate & Rank (curator.ts)
   ↓
5. Track Reputation (curator.ts)
   ↓
6. Generate Report (reporter.ts)
   ↓
7. Translate (translator.ts)
   ↓
8. Generate Site (generate-site.ts)
   ↓
9. Deploy (GitHub Pages)
```

### 디렉토리 구조

```
moltbook-watcher/
├── src/
│   ├── collector.ts       # Moltbook API 클라이언트
│   ├── classifier.ts      # 휴리스틱 분류
│   ├── curator.ts         # 랭킹, 스팸, Reputation
│   ├── reporter.ts        # Markdown 다이제스트 생성
│   ├── translator.ts      # 한국어 번역 (Claude Haiku)
│   ├── generate-site.ts   # HTML 사이트 생성
│   ├── process-daily.ts   # Daily 파이프라인
│   ├── weekly-report.ts   # Weekly 리포트 생성
│   └── submolt-tracker.ts # Submolt 인기도 추적
├── data/
│   ├── posts/             # 수집된 원본 데이터
│   ├── trusted-agents.json # Reputation 데이터
│   └── submolts.json      # Submolt 활동 데이터
├── output/
│   ├── digest/en/         # English digest markdown
│   ├── digest/ko/         # Korean digest markdown
│   └── weekly/            # Weekly report markdown
├── docs/                  # GitHub Pages (배포됨)
│   ├── index.html         # 홈페이지
│   ├── daily/             # Daily digest HTML
│   ├── weekly/            # Weekly report HTML (v1.7.0)
│   ├── agents.html        # Agent profiles
│   └── about.html         # About page
└── .github/workflows/
    └── daily-digest.yml   # 자동화 워크플로우
```

---

## 🔑 핵심 개념

### Hybrid Digest Format

**Fresh Posts (🆕)**:
- 24시간 이내 포스트
- 최신성 우선
- 새로운 목소리 발굴

**Trending Posts (🔥)**:
- 오래되었지만 높은 참여도
- 중요한 논의 지속
- 검증된 콘텐츠

**50/50 split**: 신선함과 중요성의 균형

### Reputation System

**Trust Score 공식**:
```
trustScore = 5 (base)
           + (posts × 1)
           + (comments × 0.5)
           - (postSpam × 5)
           - (commentSpam × 2.5)
```

**원칙**:
- 중복 방지: 같은 포스트가 여러 digest에 나타나도 1번만 카운트
- English only: 한국어는 번역본이므로 reputation 업데이트 안함
- 투명성: 모든 계산 로직 공개

### Spam Filtering

**Two-stage 필터링**:
1. Low quality (emoji-only, too short)
2. Spam (crypto promotion, repetitive patterns)

**패턴 예시**:
- `/\bpump\.fun\b/i` - 토큰 사이트
- `/btc.*intel.*\d+h/i` - 반복적 신호
- Word boundary 사용으로 false positive 방지

### Comment Diversity

**Two-pass 알고리즘**:
1. **Pass 1**: 각 포스트당 최소 1개 보장 (max 2 per agent)
2. **Pass 2**: 나머지 슬롯 채우기 (max 3 per post, max 2 per agent)

**목표**: 공정한 분배, 에이전트 독점 방지

---

## 🎨 콘텐츠 전략

### GitHub Pages (Primary Source)

**목적**: 데이터 중심의 신뢰할 수 있는 아카이브

**특징**:
- 완전 자동화
- 모든 통계 공개
- 재현 가능
- 시각적으로 깔끔

**페이지**:
- Home: Latest digest preview
- Daily: 일별 아카이브
- Weekly: 주간 리포트 (NEW in v1.7.0)
- Agents: Reputation 순위
- About: 프로젝트 설명

### Medium (Deep Insights)

**목적**: 심층 분석과 해석

**구조**:
```markdown
# AI Agent Society Weekly: [Date Range]

## TL;DR
[3-5 핵심 포인트]

## This Week's Numbers
[GitHub Pages 통계 참조]

## Story of the Week
[1-2 포스트 심층 분석]

## My Take (JJ's Analysis)
[트렌드, 패턴, 시사점]

## Notable Voices
[활발한 에이전트 소개]

---
Read full data: [GitHub Pages link]
```

### X/Twitter (Amplification)

**Daily**:
- 간단한 코멘트 + 링크
- 1-2 notable posts 언급

**Weekly**:
- 10-15 트윗 스레드
- 핵심 통계 + 인사이트
- Medium 링크

### LinkedIn (Professional Network)

**Daily**: 선택적 공유

**Weekly**:
- 3-4 단락 요약
- 전문가 포지셔닝
- Medium 링크

---

## 🚀 버전 히스토리 & 로드맵

### 완료된 기능

**v1.0.0-v1.3.0**: 기본 파이프라인
- 수집, 분류, 큐레이션, 리포팅
- 스팸 필터링
- 동적 Reputation

**v1.4.0**: Agent Profiles
- 순위 페이지
- Featured posts tracking

**v1.5.0**: Comment System
- 댓글 수집
- Comment reputation
- Diversity filtering

**v1.6.0**: Submolt Tracking
- 인기도 추적
- 배지 시스템

**v1.6.1**: Anti-Abuse
- 크립토 스팸 차단
- 0/10 spam ratio 달성

**v1.6.2**: UI Improvements
- Expandable content
- Quote 마커 → 줄바꿈
- 번역 용량 2배

**v1.7.0**: Weekly Reports (진행 중)
- 주간 데이터 집계
- GitHub Pages 통합
- Medium 워크플로우

### 다음 단계

**Short-term**:
- [ ] Weekly HTML 페이지 생성
- [ ] Weekly archive 페이지
- [ ] Navigation 업데이트

**Medium-term**:
- RSS feed
- 시각화 차트
- Agent activity graphs

**Long-term**:
- YouTube Shorts 자동화
- Paid newsletter
- API 공개

---

## 💡 작업 시 주의사항

### 코드 스타일

**원칙**:
- TypeScript strict mode
- 명확한 함수명 (동사 시작)
- 인터페이스 우선
- 주석은 "왜"에 집중

**패턴**:
- Export 함수: 명확한 public API
- Helper 함수: 파일 내부에서만
- 타입 안전성: `any` 지양

### 데이터 무결성

**중요**:
- Reputation 계산은 idempotent
- 중복 검사는 post ID 기반
- English digest만 reputation 업데이트
- 모든 변경사항은 data/ 파일에 기록

### 사용자 경험

**GitHub Pages**:
- 모바일 반응형 필수
- 로딩 속도 최적화
- 명확한 네비게이션
- Accessibility 고려

---

## 🔧 개발 워크플로우

### 새 기능 추가

1. PROGRESS.md에 세션 계획 작성
2. 코드 구현
3. 로컬 테스트
4. 커밋 & 푸시
5. README.md 업데이트
6. GitHub Release 생성
7. PROGRESS.md 완료 기록

### 버그 수정

1. 재현 가능한 테스트 케이스 작성
2. 원인 파악
3. 수정
4. 테스트
5. 커밋 (fix: 프리픽스)

### 릴리스 프로세스

1. package.json 버전 업데이트
2. README.md Version History 업데이트
3. README-ko.md 동기화
4. Git tag 생성
5. GitHub Release 발행
6. PROGRESS.md 업데이트

---

## 📞 컨택

**Author**: JJ (정지훈) / Asia2G Capital
**Repository**: https://github.com/JihoonJeong/moltbook-watcher
**Live Site**: https://jihoonjeong.github.io/moltbook-watcher/

---

*Last Updated: 2026-02-04 (v1.7.0 Weekly Reports)*
