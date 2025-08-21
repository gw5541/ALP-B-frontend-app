// Core API Types based on ALP-B-backend-app API specification

export interface District {
  id: number;          // 프론트엔드 내부 식별자 (1~25)
  name: string;        // 자치구명
  pathId?: string;     // SVG 지도용 (옵션)
}

export interface PopulationPoint {
  hour: number;
  value: number;
}

// ====== 백엔드 API DTO 타입들 ======

// 1. Population Raw Data
export interface PopulationRawDto {
  id: number;
  districtId: number;
  dateTime: string;
  totalPopulation: number;
  maleBuckets: Record<string, number>;
  femaleBuckets: Record<string, number>;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

// 2. Population Aggregation (기존 PopulationStats 대체)
export interface PopulationAggDto {
  districtId: number;
  districtName: string;
  periodType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'DAYTIME' | 'NIGHTTIME';
  periodStartDate: string;  // periodEndDate 제거됨
  totalAvg: number;
  maleBucketsAvg: Record<string, number>;
  femaleBucketsAvg: Record<string, number>;
  daytimeAvg: number;
  nighttimeAvg: number;
}

// 3. Hourly Trends
export interface HourlyTrendDto {
  districtId: number;
  districtName: string;
  date: string;
  hourlyData: PopulationPoint[];
  compare?: {
    date: string;
    hourlyData: PopulationPoint[];
  };
}

// 4. Monthly Trends
export interface MonthlyTrendDto {
  districtId: number;
  districtName: string;
  monthlyData: MonthlyPopulation[];
}

export interface MonthlyPopulation {
  month: string;
  value: number;
  districtId?: number;
}

// 5. Age Distribution
export interface AgeDistributionDto {
  districtId: number;
  districtName: string;
  from: string;
  to: string;
  ageDistribution: AgeDistribution[];
}

export interface AgeDistribution {
  ageGroup: string;
  male: number;
  female: number;
}

// 6. Favorites API
export interface FavoriteDto {
  favoriteId: number;
  userId: number;
  districtId: number;
  districtName: string;
  createdAt: string;
}

export interface FavoriteCreateRequest {
  districtId: number;
}

// 7. Notes API
export interface NoteDto {
  noteId: number;
  userId: number;
  districtId: number;
  districtName: string;
  content: string;  // title 제거됨
  createdAt: string;
}

export interface NoteCreateRequest {
  districtId: number;
  content: string;
}

export interface NoteUpdateRequest {
  content: string;
}

// 8. Presets API
export interface PresetDto {
  presetId: number;
  userId: number;
  name: string;  // 필수 필드
  filters: Record<string, any>;
  createdAt: string;
}

export interface PresetCreateRequest {
  name: string;
  filters: Record<string, any>;
}

export interface PresetUpdateRequest {
  name: string;
  filters: Record<string, any>;
}

// ====== 기존 타입들 (호환성 유지) ======

// 기존 PopulationTrend - 차트 컴포넌트 호환성을 위해 유지
export interface PopulationTrend {
  date: string;
  districtId: number;
  districtName?: string;
  hourlyData: PopulationPoint[];
}

// 기존 PopulationStats - 기존 컴포넌트 호환성을 위해 유지 (deprecated)
/** @deprecated PopulationAggDto 사용 권장 */
export interface PopulationStats {
  districtId: number;
  districtName: string;
  total: number;
  male: number;
  female: number;
  dayTime: number;
  nightTime: number;
  peakHour: number;
  peakValue: number;
  minHour: number;
  minValue: number;
}

export interface PopulationHighlights {
  districtId: number;
  avgDaily: number;
  peakTime: string;
  peakValue: number;
  lowTime: string;
  lowValue: number;
  growthRate: number;
}

// 기존 UserFavorite - 호환성을 위해 유지 (deprecated)
/** @deprecated FavoriteDto 사용 권장 */
export interface UserFavorite {
  userId: string;
  districtId: number;
  districtName?: string;
  createdAt: string;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  status: 'success' | 'error';
  message?: string;
}

// Chart Data Types
export interface HourPoint {
  hour: number;
  value: number;
}

export interface ChartSeries {
  name: string;
  data: HourPoint[];
  color?: string;
}

// Filter Types - 백엔드 enum에 맞게 확장
export type Gender = 'all' | 'male' | 'female';

// 백엔드 AgeBucket enum에 맞게 확장
export type AgeBucket = 
  | 'all'
  | 'F0T9' | 'F10T14' | 'F15T19' | 'F20T24' | 'F25T29' | 'F30T34' | 'F35T39'
  | 'F40T44' | 'F45T49' | 'F50T54' | 'F55T59' | 'F60T64' | 'F65T69' | 'F70T74'
  | 'M0T9' | 'M10T14' | 'M15T19' | 'M20T24' | 'M25T29' | 'M30T34' | 'M35T39'
  | 'M40T44' | 'M45T49' | 'M50T54' | 'M55T59' | 'M60T64' | 'M65T69' | 'M70T74';

// 프론트엔드 UI용 간단한 연령대 (기존 호환성)
export type AgeBucketSimple = 'all' | '10s' | '20s' | '30s' | '40s' | '50s' | '60plus';

export type PeriodType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'DAYTIME' | 'NIGHTTIME';
export type TabType = 'daily' | 'weekly' | 'monthly';

// URL Query Types
export interface FilterParams {
  districtId?: number;
  gender?: Gender;
  ageBucket?: AgeBucket | AgeBucketSimple;
  period?: PeriodType;
  date?: string;
  from?: string;
  to?: string;
}

// 에러 응답 타입
export interface ErrorResponse {
  code: string;
  message: string;
}
