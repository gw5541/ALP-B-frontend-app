import axios, { AxiosInstance, AxiosError } from 'axios';
import { 
  District, 
  PopulationTrend, 
  MonthlyPopulation, 
  PopulationStats,
  AgeDistribution,
  PopulationHighlights,
  UserFavorite,
  ApiResponse,
  FilterParams
} from './types';

class ApiClient {
  private client: AxiosInstance;

  // ID → DB 코드 매핑 테이블
  private readonly DISTRICT_CODE_MAP: Record<number, string> = {
    1: '11680',   // 강남구
    2: '11740',   // 강동구  
    3: '11305',   // 강북구
    4: '11500',   // 강서구
    5: '11620',   // 관악구
    6: '11215',   // 광진구
    7: '11530',   // 구로구
    8: '11545',   // 금천구
    9: '11350',   // 노원구
    10: '11320',  // 도봉구
    11: '11230',  // 동대문구
    12: '11590',  // 동작구
    13: '11440',  // 마포구
    14: '11410',  // 서대문구
    15: '11650',  // 서초구
    16: '11200',  // 성동구
    17: '11290',  // 성북구
    18: '11710',  // 송파구
    19: '11470',  // 양천구
    20: '11560',  // 영등포구
    21: '11170',  // 용산구
    22: '11380',  // 은평구
    23: '11110',  // 종로구
    24: '11140',  // 중구
    25: '11260'   // 중랑구
  };

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response.data,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Handle unauthorized
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            window.location.href = '/login';
          }
        }
        return Promise.reject(this.handleError(error));
      }
    );
  }

  private handleError(error: AxiosError): Error {
    if (error.response) {
      // Server responded with error status
      const message = (error.response.data as any)?.message || error.message;
      return new Error(`API Error: ${message}`);
    } else if (error.request) {
      // Request was made but no response received
      return new Error('Network Error: No response from server');
    } else {
      // Something else happened
      return new Error(`Request Error: ${error.message}`);
    }
  }

  // 내부 ID를 DB 코드로 변환하는 헬퍼 메서드
  private getDistrictCode(internalId: number): string | null {
    return this.DISTRICT_CODE_MAP[internalId] || null;
  }

  // Districts API
  async getDistricts(): Promise<District[]> {
    const response = await this.client.get('/districts');
    return response.data;
  }

  // Population Trends API
  async getHourlyTrends(params: {
    districtId?: number;  // 내부 ID (1~25)
    date?: string;
    gender?: string;
    ageBucket?: string;
  }): Promise<PopulationTrend> {
    const queryParams = new URLSearchParams();
    
    if (params.districtId) {
      const districtCode = this.getDistrictCode(params.districtId);
      if (districtCode) {
        queryParams.append('districtId', districtCode);  // DB 코드로 전송
      }
    }
    if (params.date) queryParams.append('date', params.date);
    if (params.gender && params.gender !== 'all') queryParams.append('gender', params.gender);
    if (params.ageBucket && params.ageBucket !== 'all') queryParams.append('ageBucket', params.ageBucket);

    const response = await this.client.get(
      `/population/trends/hourly?${queryParams.toString()}`
    );
    return response.data;
  }

  async getMonthlyTrends(params: {
    districtId?: number;
    from?: string;
    to?: string;
    gender?: string;
    ageBucket?: string;
  }): Promise<MonthlyPopulation[]> {
    const queryParams = new URLSearchParams();
    
    if (params.districtId) {
      const districtCode = this.getDistrictCode(params.districtId);
      if (districtCode) {
        queryParams.append('districtId', districtCode);
      }
    }
    if (params.from) queryParams.append('from', params.from);
    if (params.to) queryParams.append('to', params.to);
    if (params.gender && params.gender !== 'all') queryParams.append('gender', params.gender);
    if (params.ageBucket && params.ageBucket !== 'all') queryParams.append('ageBucket', params.ageBucket);

    const response = await this.client.get(
      `/population/trends/monthly?${queryParams.toString()}`
    );
    return response.data;
  }

  // Population Stats API
  async getPopulationStats(params: {
    period?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    districtId?: number;
    from?: string;
    to?: string;
    gender?: string;
    ageBucket?: string;
  }): Promise<PopulationStats[]> {
    const queryParams = new URLSearchParams();
    if (params.period) queryParams.append('period', params.period);
    
    if (params.districtId) {
      const districtCode = this.getDistrictCode(params.districtId);
      if (districtCode) {
        queryParams.append('districtId', districtCode);
      }
    }
    if (params.from) queryParams.append('from', params.from);
    if (params.to) queryParams.append('to', params.to);
    if (params.gender && params.gender !== 'all') queryParams.append('gender', params.gender);
    if (params.ageBucket && params.ageBucket !== 'all') queryParams.append('ageBucket', params.ageBucket);

    const response = await this.client.get(
      `/population/stats?${queryParams.toString()}`
    );
    return response.data;
  }

  // Age Distribution API
  async getAgeDistribution(params: {
    districtId: number;
    from?: string;
    to?: string;
  }): Promise<AgeDistribution[]> {
    const queryParams = new URLSearchParams();
    
    const districtCode = this.getDistrictCode(params.districtId);
    if (districtCode) {
      queryParams.append('districtId', districtCode);
    }
    if (params.from) queryParams.append('from', params.from);
    if (params.to) queryParams.append('to', params.to);

    const response = await this.client.get(
      `/population/age-distribution?${queryParams.toString()}`
    );
    return response.data;
  }

  // Population Highlights API
  async getPopulationHighlights(districtId?: number): Promise<PopulationHighlights[]> {
    let queryParams = '';
    if (districtId) {
      const districtCode = this.getDistrictCode(districtId);
      if (districtCode) {
        queryParams = `?districtId=${districtCode}`;
      }
    }
    
    const response = await this.client.get(
      `/population/highlights${queryParams}`
    );
    return response.data;
  }

  // User Favorites API
  async getUserFavorites(userId: string): Promise<UserFavorite[]> {
    const response = await this.client.get(
      `/users/${userId}/favorites`
    );
    return response.data;
  }

  async addUserFavorite(userId: string, districtId: number): Promise<UserFavorite> {
    const districtCode = this.getDistrictCode(districtId);
    const response = await this.client.post(
      `/users/${userId}/favorites`,
      { districtId: districtCode }  // DB 코드로 전송
    );
    return response.data;
  }

  async removeUserFavorite(userId: string, districtId: number): Promise<void> {
    const districtCode = this.getDistrictCode(districtId);
    if (districtCode) {
      await this.client.delete(`/users/${userId}/favorites/${districtCode}`);
    }
  }
}

// Create singleton instance
export const apiClient = new ApiClient();
export default apiClient;
