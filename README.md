# 서울 생활인구 분석 대시보드

Next.js 기반의 서울시 생활인구 분석 프론트엔드 애플리케이션입니다.

## 🛠 기술 스택

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **HTTP Client**: Axios
- **Package Manager**: npm

## 📁 프로젝트 구조

```
src/
├── app/                     # Next.js App Router 페이지
│   ├── dashboard/          # 메인 대시보드
│   ├── districts/[id]/     # 자치구 상세 페이지
│   └── reports/summary/    # 요약 보고서
├── components/
│   ├── common/             # 공통 컴포넌트
│   ├── charts/             # 차트 컴포넌트
│   └── tables/             # 테이블 컴포넌트
└── lib/                    # 유틸리티 및 API 클라이언트
    ├── apiClient.ts        # API 클라이언트
    ├── types.ts           # 타입 정의
    └── utils.ts           # 유틸리티 함수
```

## 🚀 시작하기

1. **의존성 설치**
   ```bash
   npm install
   ```

2. **환경 변수 설정**
   `.env.local` 파일을 생성하고 다음 내용을 추가:
   ```env
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api/v1
   ```

3. **개발 서버 실행**
   ```bash
   npm run dev
   ```

4. **브라우저에서 확인**
   [http://localhost:3000](http://localhost:3000)에서 애플리케이션을 확인할 수 있습니다.

## 📱 주요 기능

### 1. 메인 대시보드 (`/dashboard`)
- 서울시 지도 기반 인터랙티브 인터페이스
- 자치구별 호버링 시 실시간 인구 정보 표시
- 관심 지역 즐겨찾기 기능
- 시간대별 인구 현황 차트

### 2. 자치구 상세 (`/districts/[id]`)
- 일간/주간/월간 탭으로 구분된 상세 분석
- 성별, 연령대별 필터링 지원
- 인구 피라미드 차트
- KPI 카드 (평균 인구, 최대/최소 시간 등)

### 3. 요약 보고서 (`/reports/summary`)
- 전체 자치구 월간 집계 테이블
- 시간대별 현황 ↔ 연령대별 분포 차트 토글
- 주요 인사이트 요약

## 🔧 주요 컴포넌트

### 공통 컴포넌트
- `Header`: 로고와 네비게이션
- `Card`: 재사용 가능한 카드 레이아웃
- `FilterBar`: URL 동기화된 필터링
- `Skeleton`: 로딩 상태 표시
- `ErrorBoundary`: 에러 처리

### 차트 컴포넌트
- `HourlyLine`: 시간대별 라인 차트
- `MonthlyLine`: 월별 라인 차트
- `Pyramid`: 연령대별 인구 피라미드

### 데이터 관리
- `apiClient`: Axios 기반 API 클라이언트
- URL 쿼리 파라미터를 통한 필터 상태 관리
- 타입 안전성을 위한 TypeScript 인터페이스

## 📊 API 연동

백엔드 API는 `ALP-B-backend-app/contracts/api-contract.yml`을 기준으로 합니다.

주요 API 엔드포인트:
- `GET /districts` - 자치구 목록
- `GET /population/trends/hourly` - 시간대별 인구 데이터
- `GET /population/trends/monthly` - 월별 인구 데이터
- `GET /population/stats` - 인구 통계
- `GET /population/age-distribution` - 연령대별 분포
- `GET /users/{userId}/favorites` - 사용자 관심 지역

## 🎨 디자인 시스템

- **Color Palette**: 
  - Primary: Red (#ef4444)
  - Secondary: Blue (#3b82f6)
  - Success: Green (#10b981)
- **Typography**: Inter 폰트 사용
- **Responsive**: 모바일 퍼스트 반응형 디자인

## 🧪 개발 스크립트

```bash
# 개발 서버 (TurboPack 사용)
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm run start

# 코드 린팅
npm run lint
```

## 🌐 배포

Vercel, Netlify 등 Next.js를 지원하는 플랫폼에서 쉽게 배포할 수 있습니다.

환경 변수 `NEXT_PUBLIC_API_BASE_URL`을 배포 환경에 맞게 설정하세요.

## 📝 추가 개발 시 고려사항

1. **API 변경 사항**: `lib/types.ts`와 `lib/apiClient.ts` 업데이트
2. **새로운 차트**: `components/charts/` 디렉토리에 추가
3. **라우팅**: Next.js App Router 규칙 준수
4. **상태 관리**: URL 쿼리 파라미터 기반 필터 상태 유지
5. **성능 최적화**: React.memo, useMemo 등 적절히 활용

## 🤝 기여하기

1. 이슈 확인 및 등록
2. 기능 브랜치 생성
3. 변경사항 커밋
4. 풀 리퀘스트 생성

---

**ALP-B 프로젝트** - 서울시 생활인구 분석 시스템