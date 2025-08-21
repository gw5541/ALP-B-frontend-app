// Core API Types based on ALP-B-backend-app/contracts/api-contract.yml

export interface District {
  id: number;          // 프론트엔드 내부 식별자 (1~25)
  name: string;        // 자치구명
  pathId?: string;     // SVG 지도용 (옵션)
}

export interface PopulationPoint {
  hour: number;
  value: number;
}

export interface PopulationTrend {
  date: string;
  districtId: number;
  districtName?: string;
  hourlyData: PopulationPoint[];
}

export interface MonthlyPopulation {
  month: string;
  value: number;
  districtId?: number;
}

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

export interface AgeDistribution {
  ageGroup: string;
  male: number;
  female: number;
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

// Filter Types
export type Gender = 'all' | 'male' | 'female';
export type AgeBucket = 'all' | '10s' | '20s' | '30s' | '40s' | '50s' | '60plus';
export type Period = 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type TabType = 'daily' | 'weekly' | 'monthly';

// URL Query Types
export interface FilterParams {
  districtId?: number;
  gender?: Gender;
  ageBucket?: AgeBucket;
  period?: Period;
  date?: string;
  from?: string;
  to?: string;
}
