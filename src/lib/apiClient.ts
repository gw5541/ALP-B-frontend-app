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
  FilterParams,
  // 새로운 백엔드 타입들
  PopulationRawDto,
  PageResponse,
  PopulationAggDto,
  HourlyTrendDto,
  MonthlyTrendDto,
  AgeDistributionDto,
  FavoriteDto,
  FavoriteCreateRequest,
  NoteDto,
  NoteCreateRequest,
  NoteUpdateRequest,
  PresetDto,
  PresetCreateRequest,
  PresetUpdateRequest,
  PeriodType,
  AgeBucket,
  ErrorResponse
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

    // Response interceptor - response.data를 반환하므로 API 메서드에서는 직접 데이터 접근 가능
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
      const errorData = error.response.data as any;
      const message = errorData?.message || error.message;
      const code = errorData?.code || 'UNKNOWN_ERROR';
      
      // 사용자 친화적 에러 메시지
      const userFriendlyMessages: Record<string, string> = {
        'NETWORK_ERROR': '네트워크 연결을 확인해주세요.',
        'UNAUTHORIZED': '로그인이 필요합니다.',
        'FORBIDDEN': '접근 권한이 없습니다.',
        'NOT_FOUND': '요청한 데이터를 찾을 수 없습니다.',
        'VALIDATION_ERROR': '입력한 정보를 확인해주세요.',
        'SERVER_ERROR': '서버에 일시적인 문제가 발생했습니다.'
      };

      const userMessage = userFriendlyMessages[code] || message;
      return new Error(userMessage);
    } else if (error.request) {
      // Request was made but no response received
      return new Error('서버에 연결할 수 없습니다. 네트워크 상태를 확인해주세요.');
    } else {
      // Something else happened
      return new Error('예상치 못한 오류가 발생했습니다.');
    }
  }

  // Retry 기능이 있는 API 호출 래퍼
  private async callWithRetry<T>(
    apiCall: () => Promise<T>, 
    maxRetries: number = 2,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await apiCall();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries) {
          // 지수 백오프: 1초, 2초, 4초...
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
        }
      }
    }
    
    throw lastError!;
  }

  // 내부 ID를 DB 코드로 변환하는 헬퍼 메서드
  private getDistrictCode(internalId: number): string | null {
    return this.DISTRICT_CODE_MAP[internalId] || null;
  }

  // ====== 1. Districts API ======
  async getDistricts(): Promise<District[]> {
    return this.callWithRetry(() => this.client.get('/districts'));
  }

  // ====== 2. Population API ======

  // A. 원본 데이터 - 에러 1 수정
  async getPopulationRaw(params: {
    districtId: number;
    from: string;
    to: string;
    hourFrom?: number;
    hourTo?: number;
    page?: number;
    size?: number;
  }): Promise<PageResponse<PopulationRawDto>> {
    const queryParams = new URLSearchParams();
    
    const districtCode = this.getDistrictCode(params.districtId);
    if (districtCode) {
      queryParams.append('districtId', districtCode);
    }
    queryParams.append('from', params.from);
    queryParams.append('to', params.to);
    if (params.hourFrom !== undefined) queryParams.append('hourFrom', params.hourFrom.toString());
    if (params.hourTo !== undefined) queryParams.append('hourTo', params.hourTo.toString());
    if (params.page !== undefined) queryParams.append('page', params.page.toString());
    if (params.size !== undefined) queryParams.append('size', params.size.toString());

    // response interceptor가 response.data를 반환하므로 직접 반환
    return await this.client.get(`/population/raw?${queryParams.toString()}`);
  }

  // B. 집계 통계 - 에러 2 수정
  async getPopulationStats(params: {
    period?: PeriodType;
    districtId?: number;
    from?: string;
    to?: string;
    gender?: string;
    ageBucket?: AgeBucket | string;
  }): Promise<PopulationAggDto[]> {
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

    return await this.client.get(`/population/stats?${queryParams.toString()}`);
  }

  // C. 시간별 트렌드 (업데이트)
  async getHourlyTrends(params: {
    districtId?: number;
    date?: string;
    gender?: string;
    ageBucket?: AgeBucket | string;
    compare?: boolean;
  }): Promise<HourlyTrendDto> {
    return this.callWithRetry(() => {
      const queryParams = new URLSearchParams();
      
      if (params.districtId) {
        const districtCode = this.getDistrictCode(params.districtId);
        if (districtCode) {
          queryParams.append('districtId', districtCode);
        }
      }
      if (params.date) queryParams.append('date', params.date);
      if (params.gender && params.gender !== 'all') queryParams.append('gender', params.gender);
      if (params.ageBucket && params.ageBucket !== 'all') queryParams.append('ageBucket', params.ageBucket);
      if (params.compare) queryParams.append('compare', params.compare.toString());

      return this.client.get(`/population/trends/hourly?${queryParams.toString()}`);
    });
  }

  // D. 월별 트렌드 - 에러 3 수정
  async getMonthlyTrends(params: {
    districtId?: number;
    months?: number;
    gender?: string;
    ageBucket?: AgeBucket | string;
  }): Promise<MonthlyTrendDto> {
    const queryParams = new URLSearchParams();
    
    if (params.districtId) {
      const districtCode = this.getDistrictCode(params.districtId);
      if (districtCode) {
        queryParams.append('districtId', districtCode);
      }
    }
    if (params.months) queryParams.append('months', params.months.toString());
    if (params.gender && params.gender !== 'all') queryParams.append('gender', params.gender);
    if (params.ageBucket && params.ageBucket !== 'all') queryParams.append('ageBucket', params.ageBucket);

    return await this.client.get(`/population/trends/monthly?${queryParams.toString()}`);
  }

  // E. 연령 분포 - 에러 4 수정
  async getAgeDistribution(params: {
    districtId: number;
    from?: string;
    to?: string;
  }): Promise<AgeDistributionDto> {
    const queryParams = new URLSearchParams();
    
    const districtCode = this.getDistrictCode(params.districtId);
    if (districtCode) {
      queryParams.append('districtId', districtCode);
    }
    if (params.from) queryParams.append('from', params.from);
    if (params.to) queryParams.append('to', params.to);

    return await this.client.get(`/population/age-distribution?${queryParams.toString()}`);
  }

  // ====== 3. Favorites API - 에러 5, 6 수정 ======
  async getUserFavorites(userId: string): Promise<FavoriteDto[]> {
    return await this.client.get(`/users/${userId}/favorites`);
  }

  async addUserFavorite(userId: string, request: FavoriteCreateRequest): Promise<FavoriteDto> {
    const districtCode = this.getDistrictCode(request.districtId);
    return await this.client.post(`/users/${userId}/favorites`, {
      districtId: districtCode
    });
  }

  async removeUserFavorite(userId: string, districtId: number): Promise<void> {
    const districtCode = this.getDistrictCode(districtId);
    if (districtCode) {
      await this.client.delete(`/users/${userId}/favorites/${districtCode}`);
    }
  }

  // ====== 4. Notes API - 에러 7, 8, 9 수정 ======
  async getUserNotes(userId: string, districtId?: number): Promise<NoteDto[]> {
    let queryParams = '';
    if (districtId) {
      const districtCode = this.getDistrictCode(districtId);
      if (districtCode) {
        queryParams = `?districtId=${districtCode}`;
      }
    }
    return await this.client.get(`/users/${userId}/notes${queryParams}`);
  }

  async createNote(userId: string, request: NoteCreateRequest): Promise<NoteDto> {
    const districtCode = this.getDistrictCode(request.districtId);
    return await this.client.post(`/users/${userId}/notes`, {
      ...request,
      districtId: districtCode
    });
  }

  async updateNote(userId: string, noteId: number, request: NoteUpdateRequest): Promise<NoteDto> {
    return await this.client.put(`/users/${userId}/notes/${noteId}`, request);
  }

  async deleteNote(userId: string, noteId: number): Promise<void> {
    await this.client.delete(`/users/${userId}/notes/${noteId}`);
  }

  // ====== 5. Presets API - 에러 10, 11, 12 수정 ======
  async getUserPresets(userId: string): Promise<PresetDto[]> {
    return await this.client.get(`/users/${userId}/presets`);
  }

  async createPreset(userId: string, request: PresetCreateRequest): Promise<PresetDto> {
    return await this.client.post(`/users/${userId}/presets`, request);
  }

  async updatePreset(userId: string, presetId: number, request: PresetUpdateRequest): Promise<PresetDto> {
    return await this.client.put(`/users/${userId}/presets/${presetId}`, request);
  }

  async deletePreset(userId: string, presetId: number): Promise<void> {
    await this.client.delete(`/users/${userId}/presets/${presetId}`);
  }

  // ====== 기존 API들 (호환성 유지) ======

  // Population Highlights API - 에러 13 수정
  async getPopulationHighlights(districtId?: number): Promise<PopulationHighlights[]> {
    let queryParams = '';
    if (districtId) {
      const districtCode = this.getDistrictCode(districtId);
      if (districtCode) {
        queryParams = `?districtId=${districtCode}`;
      }
    }
    
    return await this.client.get(`/population/highlights${queryParams}`);
  }

  // ====== 호환성 메서드들 (deprecated) ======
  
  /** @deprecated getUserFavorites 사용 권장 */
  async getUserFavoritesLegacy(userId: string): Promise<UserFavorite[]> {
    const favorites = await this.getUserFavorites(userId);
    // FavoriteDto를 UserFavorite 형태로 변환
    return favorites.map(fav => ({
      userId: fav.userId.toString(),
      districtId: fav.districtId,
      districtName: fav.districtName,
      createdAt: fav.createdAt
    }));
  }

  /** @deprecated addUserFavorite 사용 권장 */
  async addUserFavoriteLegacy(userId: string, districtId: number): Promise<UserFavorite> {
    const favorite = await this.addUserFavorite(userId, { districtId });
    return {
      userId: favorite.userId.toString(),
      districtId: favorite.districtId,
      districtName: favorite.districtName,
      createdAt: favorite.createdAt
    };
  }

  /** @deprecated getPopulationStats 사용 권장 */
  async getPopulationStatsLegacy(params: {
    period?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    districtId?: number;
    from?: string;
    to?: string;
    gender?: string;
    ageBucket?: string;
  }): Promise<PopulationStats[]> {
    const aggData = await this.getPopulationStats(params);
    // PopulationAggDto를 PopulationStats 형태로 변환
    return aggData.map(agg => ({
      districtId: agg.districtId,
      districtName: agg.districtName,
      total: agg.totalAvg,
      male: Object.values(agg.maleBucketsAvg).reduce((sum, val) => sum + val, 0),
      female: Object.values(agg.femaleBucketsAvg).reduce((sum, val) => sum + val, 0),
      dayTime: agg.daytimeAvg,
      nightTime: agg.nighttimeAvg,
      peakHour: 0, // 계산 필요
      peakValue: 0, // 계산 필요
      minHour: 0, // 계산 필요
      minValue: 0 // 계산 필요
    }));
  }

  /** @deprecated getHourlyTrends 사용 권장 */
  async getHourlyTrendsLegacy(params: {
    districtId?: number;
    date?: string;
    gender?: string;
    ageBucket?: string;
  }): Promise<PopulationTrend> {
    const trendData = await this.getHourlyTrends(params);
    return {
      date: trendData.date,
      districtId: trendData.districtId,
      districtName: trendData.districtName,
      hourlyData: trendData.hourlyData
    };
  }

  /** @deprecated getMonthlyTrends 사용 권장 */
  async getMonthlyTrendsLegacy(params: {
    districtId?: number;
    from?: string;
    to?: string;
    gender?: string;
    ageBucket?: string;
  }): Promise<MonthlyPopulation[]> {
    const trendData = await this.getMonthlyTrends(params);
    return trendData.monthlyData;
  }

  /** @deprecated getAgeDistribution 사용 권장 */
  async getAgeDistributionLegacy(params: {
    districtId: number;
    from?: string;
    to?: string;
  }): Promise<AgeDistribution[]> {
    const ageData = await this.getAgeDistribution(params);
    return ageData.ageDistribution;
  }
}

// Create singleton instance
export const apiClient = new ApiClient();
export default apiClient;
