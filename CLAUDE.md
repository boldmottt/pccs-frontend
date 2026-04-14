@AGENTS.md

# PCCS 프론트엔드 — ClaudeOS 프로젝트 가이드

## 역할

이 프로젝트는 **PCCS(Paint Color Control System)** 의 Next.js 프론트엔드입니다.
잉크 마스터 관리, 대시보드 통계, 보색 추출 기능을 제공하며,
외부 FastAPI 백엔드(`NEXT_PUBLIC_API_URL`)와 axios를 통해 통신합니다.

## 빌드 및 실행 명령어

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 개발 서버 실행 (포트 8080) |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 프로덕션 서버 실행 |
| `npm run lint` | ESLint 실행 |

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

## 디렉토리 구조

```
src/
├── app/
│   ├── layout.tsx              # 루트 레이아웃 (정적 metadata 포함)
│   ├── page.tsx                # 홈(메인) 페이지 — Tailwind CSS
│   ├── master/page.tsx         # 잉크 마스터 관리 (탭 기반 CRUD)
│   ├── dashboard/page.tsx      # 통계 대시보드
│   └── complementary/page.tsx  # 보색 추출
├── components/
│   ├── OpacityGauge.tsx        # SVG 반원 게이지 (불투명도/은폐력)
│   ├── InkDonutChart.tsx       # SVG 도넛 차트 (잉크 카테고리 분포)
│   └── TransparencySimulator.tsx  # 잉크 투명도 시뮬레이터
└── lib/
    ├── api.ts                  # axios 싱글톤 (baseURL: NEXT_PUBLIC_API_URL)
    └── color.ts                # labToRgb 등 색상 변환 유틸리티
```

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

### 스킬 (claudeos-core/skills/)

| 스킬 | 설명 |
|------|------|
| `10.backend-crud/01.fastapi-crud-pattern.md` | FastAPI CRUD 패턴 |
| `20.frontend-page/01.nextjs-page-pattern.md` | Next.js 페이지 패턴 |
| `50.testing/01.api-testing-pattern.md` | API 테스트 패턴 |

### 전체 표준 목록
`claudeos-core/standard/README.md` 참조
