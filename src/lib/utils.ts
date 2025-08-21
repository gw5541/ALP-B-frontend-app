import { FilterParams } from './types';

// Date utilities
export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const formatDateTime = (date: Date): string => {
  return date.toLocaleString('ko-KR');
};

export const getToday = (): string => {
  return formatDate(new Date());
};

// 🔧 추가: 10일 전 날짜 함수 (DB에 데이터가 있는 날짜로 설정)
export const getTenDaysAgo = (): string => {
  const date = new Date();
  date.setDate(date.getDate() - 10);  // 오늘부터 10일 전
  return formatDate(date);
};

// 🔧 추가: 20일 전 날짜 함수 (주간 차트용)
export const getTwentyDaysAgo = (): string => {
  const date = new Date();
  date.setDate(date.getDate() - 20);  // 오늘부터 20일 전
  return formatDate(date);
};

export const getLastMonth = (): string => {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  return formatDate(date);
};

// Number formatting
export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('ko-KR').format(num);
};

export const formatPopulation = (num: number): string => {
  if (num >= 10000) {
    return `${(num / 10000).toFixed(1)}만`;
  }
  return formatNumber(num);
};

// URL query utilities
export const parseSearchParams = (searchParams: URLSearchParams): FilterParams => {
  const params: FilterParams = {};
  
  const districtId = searchParams.get('districtId');
  if (districtId) params.districtId = parseInt(districtId, 10);
  
  const gender = searchParams.get('gender');
  if (gender) params.gender = gender as any;
  
  const ageBucket = searchParams.get('ageBucket');
  if (ageBucket) params.ageBucket = ageBucket as any;
  
  const period = searchParams.get('period');
  if (period) params.period = period as any;
  
  const date = searchParams.get('date');
  if (date) params.date = date;
  
  const from = searchParams.get('from');
  if (from) params.from = from;
  
  const to = searchParams.get('to');
  if (to) params.to = to;
  
  return params;
};

export const buildSearchParams = (params: FilterParams): URLSearchParams => {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, value.toString());
    }
  });
  
  return searchParams;
};

// Chart utilities
export const getChartColors = () => ({
  primary: '#ef4444',    // red-500
  secondary: '#3b82f6',  // blue-500
  tertiary: '#10b981',   // emerald-500
  quaternary: '#f59e0b', // amber-500
  male: '#3b82f6',       // blue-500
  female: '#ef4444',     // red-500
  accent: '#8b5cf6',     // violet-500
});

export const generateHourLabels = (): string[] => {
  return Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    return `${hour}:00`;
  });
};

// District utilities
export const getDistrictColor = (districtId: number): string => {
  const colors = [
    '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
  ];
  return colors[districtId % colors.length];
};

// Error handling
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return '알 수 없는 오류가 발생했습니다.';
};

// Local storage utilities
export const getStoredUserId = (): string => {
  // 🔧 테스트용: user_id 1번 고정 (로그인 기능 구현 전까지)
  return '1';
  
  // 원래 코드 (로그인 기능 구현 후 사용)
  // if (typeof window === 'undefined') return 'demo-user';
  // return localStorage.getItem('userId') || 'demo-user';
};

export const setStoredUserId = (userId: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('userId', userId);
  }
};

// Age bucket utilities
export const getAgeBucketLabel = (ageBucket: string): string => {
  const labels: { [key: string]: string } = {
    'all': '전체',
    '10s': '10대',
    '20s': '20대',
    '30s': '30대',
    '40s': '40대',
    '50s': '50대',
    '60plus': '60대+'
  };
  return labels[ageBucket] || ageBucket;
};

export const getGenderLabel = (gender: string): string => {
  const labels: { [key: string]: string } = {
    'all': '전체',
    'male': '남성',
    'female': '여성'
  };
  return labels[gender] || gender;
};

// District code mapping utilities
// DB에서 사용하는 행정구역 코드(11xxx)와 프론트엔드 내부 ID(1-25) 매핑
const DISTRICT_CODE_MAP: Record<number, string> = {
  1: '11680', 2: '11740', 3: '11305', 4: '11500', 5: '11620',
  6: '11215', 7: '11530', 8: '11545', 9: '11350', 10: '11320',
  11: '11230', 12: '11590', 13: '11440', 14: '11410', 15: '11650',
  16: '11200', 17: '11290', 18: '11710', 19: '11470', 20: '11560',
  21: '11170', 22: '11380', 23: '11110', 24: '11140', 25: '11260'
};

// DB 코드(11xxx)를 내부 ID(1-25)로 변환
export const convertDbCodeToInternalId = (dbCode: string | number): number | null => {
  const codeStr = dbCode.toString();
  for (const [internalId, code] of Object.entries(DISTRICT_CODE_MAP)) {
    if (code === codeStr) {
      return parseInt(internalId);
    }
  }
  return null;
};

// 내부 ID(1-25)를 DB 코드(11xxx)로 변환
export const convertInternalIdToDbCode = (internalId: number): string | null => {
  return DISTRICT_CODE_MAP[internalId] || null;
};
