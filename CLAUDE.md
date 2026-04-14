@AGENTS.md

# PCCS 프론트엔드 — ClaudeOS 프로젝트 가이드

## 역할

이 프로젝트는 **PCCS(Paint Color Control System)** 의 Next.js 프론트엔드입니다.
잉크 마스터 관리, 대시보드 통계, 보색 추출 기능을 제공하며,
외부 FastAPI 백엔드 (`NEXT_PUBLIC_API_URL`) 와 axios 를 통해 통신합니다.

---

## 빌드 및 실행 명령어

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 개발 서버 실행 (포트 8080) |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 프로덕션 서버 실행 |
| `npm run lint` | ESLint 실행 |

---

## 핵심 아키텍처

```
외부 FastAPI 백엔드 (NEXT_PUBLIC_API_URL)
        ↑
src/lib/api.ts (axios 싱글톤)
        ↑
src/app/<domain>/page.tsx ('use client' 페이지)
        ↑
src/components/*.tsx (공유 UI 컴포넌트)
```

---

## 디렉토리 구조

```
src/
├── app/
│   ├── layout.tsx              # 루트 레이아웃 (정적 metadata 포함)
│   ├── page.tsx                # 홈 (메인) 페이지 — Tailwind CSS
│   ├── master/page.tsx         # 잉크 마스터 관리 (탭 기반 CRUD)
│   ├── dashboard/page.tsx      # 통계 대시보드
│   ├── complementary/page.tsx  # 보색 추출
│   └── colors/[id]/page.tsx    # 색상 상세 페이지
├── components/
│   ├── common/                 # 공유 컴포넌트
│   │   ├── PrimaryButton.tsx   # CTA 버튼
│   │   ├── Tooltip.tsx         # 툴팁
│   │   ├── HelpIcon.tsx        # 도움말 아이콘
│   │   ├── Skeleton.tsx        # 로딩 스플래시
│   │   ├── FormInput.tsx       # 폼 입력 필드
│   │   └── ColorSwatch.tsx     # 색상 샘플
│   ├── OpacityGauge.tsx        # SVG 반원 게이지 (불투명도/은폐력)
│   ├── InkDonutChart.tsx       # SVG 도넛 차트 (잉크 카테고리 분포)
│   └── TransparencySimulator.tsx  # 잉크 투명도 시뮬레이터
├── lib/
│   ├── api.ts                  # axios 싱글톤 (baseURL: NEXT_PUBLIC_API_URL)
│   └── color.ts                # labToRgb 등 색상 변환 유틸리티
└── styles/
    └── tokens.css              # 디자인 토큰 (색상, 타이포그래피, 스페이싱)
```

---

## 작업 워크플로우 (Git Worktree)

이 프로젝트는 **Git Worktree**를 사용하여 메인 리포지토리와 서브모듈을 병렬로 관리합니다.

### 워크트리 구조

```
/Users/ttobone/PCCS          <- 메인 리포지토리 (main 브랜치)
├── frontend/                <- 서브모듈 (별도 Git 워크트리로 연결됨)
└── backend/                 <- Git Worktree (main 브랜치)
```

### 워크트리 확인 및 관리

```bash
# 현재 워크트리 목록 확인
git worktree list

# 메인 리포지토리로 전환
cd /Users/ttobone/PCCS

# Frontend 워크트리로 전환
cd /Users/ttobone/PCCS/frontend

# Backend 워크트리로 전환
cd /Users/ttobone/PCCS/backend

# 다시 메인 리포지토리로 돌아오기
cd /Users/ttobone/PCCS
```

### 주의사항

- 메인 리포지토리의 서브모듈 커밋을 업데이트하려면:
  ```bash
  # 메인 리포지토리에서
  git add frontend
  git commit -m "chore: update frontend submodule"
  git push origin main
  ```

- Frontend 에서 변경사항 push (Vercel 자동 배포):
  ```bash
  # Frontend 워크트리로
  cd /Users/ttobone/PCCS/frontend
  git add .
  git commit -m "feat: 변경사항 설명"
  git push origin main
  ```

- Backend 에서 변경사항 push (Render 수동 배포):
  ```bash
  # Backend 워크트리로
  cd /Users/ttobone/PCCS/backend
  git add .
  git commit -m "feat: 변경사항 설명"
  git push origin main
  # → Render 에서 "Deploy latest commit" 클릭
  ```

---

## 표준 및 규칙 참조

코딩 작업 시 아래 파일을 참조하세요.

### Backend 표준 (claudeos-core/standard/)

| 범주 | 파일 | 설명 |
|------|------|------|
| 프로젝트 | `standard/00.core/01.project-overview.md` | 스택, 모듈, 서버 정보 |
| 아키텍처 | `standard/00.core/02.architecture.md` | 레이어 구조, 요청 흐름 |
| 네이밍 | `standard/00.core/03.naming-conventions.md` | 모듈/스키마/모델 네이밍 |
| 라우터 | `standard/10.backend-api/01.router-endpoint-patterns.md` | CRUD 패턴, 엔드포인트 |
| 스키마 | `standard/10.backend-api/02.schema-pydantic-patterns.md` | Pydantic v2 컨벤션 |
| DB 스키마 | `standard/30.security-db/02.database-schema.md` | 테이블 정의, 인덱스 |
| 환경 | `standard/40.infra/01.environment-config.md` | 환경 변수, 설정 |
| 검증 | `standard/50.verification/01.development-verification.md` | 테스트 전략 |

### 프론트엔드 패턴

- 컴포넌트: `skills/20.frontend-page/01.nextjs-page-pattern.md`
- 스타일링: Tailwind CSS 4
- 데이터 페칭: axios (src/lib/api.ts)
- 디자인 토큰: `src/styles/tokens.css`

### 스킬 (claudeos-core/skills/)

| 스킬 | 설명 |
|------|------|
| `10.backend-crud/01.fastapi-crud-pattern.md` | FastAPI CRUD 패턴 |
| `20.frontend-page/01.nextjs-page-pattern.md` | Next.js 페이지 패턴 |
| `50.testing/01.api-testing-pattern.md` | API 테스트 패턴 |

### 전체 표준 목록
`claudeos-core/standard/README.md` 참조

---

## 알려진 기술 부채 (주의 필요)

| 심각도 | ID | 설명 |
|--------|-----|------|
| MEDIUM | F1 | **E2E 테스트 타입 에러** — Playwright 테스트 파일이 타입 체크 대상임 |

---

## 배포

### 프론트엔드 (Vercel)

- GitHub push → Vercel webhook → 자동 배포
- 배포 URL: `https://frontend-pfdi3jcfv-loo4leesk-7473s-projects.vercel.app`

### 백엔드 (Render)

- GitHub push → 수동 배포 필요
- Render Dashboard 에서 "Deploy latest commit" 버튼 클릭
- Dashboard: https://dashboard.render.com/project/prj-d79tpkv5r7bs7382k7mg
