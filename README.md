# Frontend App

Next.js 기반의 모던 프론트엔드 애플리케이션입니다.

## 🚀 기술 스택

- **프레임워크**: Next.js 14 (App Router)
- **언어**: JavaScript
- **스타일링**: Tailwind CSS
- **HTTP 클라이언트**: Axios
- **패키지 매니저**: npm
- **개발 도구**: TurboPack (개발 모드)

## 📁 프로젝트 구조

```
frontend-app/
├── src/
│   ├── app/                 # Next.js App Router 디렉토리
│   │   ├── layout.js        # 루트 레이아웃
│   │   ├── page.js          # 홈 페이지
│   │   └── globals.css      # 전역 스타일
│   ├── components/          # 재사용 가능한 컴포넌트
│   │   └── Header.js        # 헤더 컴포넌트
│   ├── lib/                 # 라이브러리 및 설정
│   │   └── api.js           # Axios 설정
│   └── utils/               # 유틸리티 함수
│       └── helpers.js       # 헬퍼 함수들
├── package.json             # 프로젝트 의존성
├── next.config.js           # Next.js 설정
├── tailwind.config.js       # Tailwind CSS 설정
├── postcss.config.js        # PostCSS 설정
└── README.md                # 프로젝트 문서
```

## 🛠️ 설치 및 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 개발 서버 시작

```bash
npm run dev
```

개발 서버가 [http://localhost:3000](http://localhost:3000)에서 실행됩니다.

### 3. 빌드

```bash
npm run build
```

### 4. 프로덕션 서버 시작

```bash
npm run start
```

## 📋 사용 가능한 스크립트

- `npm run dev` - TurboPack을 사용한 개발 서버 시작
- `npm run build` - 프로덕션 빌드 생성
- `npm run start` - 프로덕션 서버 시작
- `npm run lint` - ESLint를 사용한 코드 검사

## 🎨 주요 기능

### 1. 카운터 컴포넌트
- React 상태 관리 예제
- Tailwind CSS를 사용한 스타일링

### 2. API 통신 테스트
- Axios를 사용한 HTTP 요청 예제
- 에러 핸들링 포함

### 3. 반응형 디자인
- Tailwind CSS를 사용한 모바일 친화적 디자인
- 그리드 레이아웃 및 카드 컴포넌트

## 🔧 환경 설정

### 환경 변수

`.env.local` 파일을 생성하여 환경 변수를 설정할 수 있습니다:

```bash
NEXT_PUBLIC_API_BASE_URL=https://your-api-endpoint.com
```

### Tailwind CSS 설정

`tailwind.config.js` 파일에서 커스텀 스타일을 추가할 수 있습니다.

### API 설정

`src/lib/api.js` 파일에서 Axios 인스턴스를 설정하고 인터셉터를 추가할 수 있습니다.

## 📱 개발 환경

- **OS**: Windows 11
- **Node.js**: v18 이상 권장
- **npm**: v9 이상 권장

## 🚀 배포

이 프로젝트는 다음 플랫폼에 배포할 수 있습니다:

- [Vercel](https://vercel.com/) (권장)
- [Netlify](https://netlify.com/)
- [AWS Amplify](https://aws.amazon.com/amplify/)

## 📚 더 알아보기

- [Next.js 문서](https://nextjs.org/docs)
- [Tailwind CSS 문서](https://tailwindcss.com/docs)
- [Axios 문서](https://axios-http.com/docs/intro)

## 📄 라이선스

MIT License