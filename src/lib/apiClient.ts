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

  // Districts API
  async getDistricts(): Promise<District[]> {
    const response = await this.client.get<ApiResponse<District[]>>('/districts');
    return response.data;
  }

  // Population Trends API
  async getHourlyTrends(params: {
    districtId?: number;
    date?: string;
    gender?: string;
    ageBucket?: string;
  }): Promise<PopulationTrend> {
    const queryParams = new URLSearchParams();
    if (params.districtId) queryParams.append('districtId', params.districtId.toString());
    if (params.date) queryParams.append('date', params.date);
    if (params.gender && params.gender !== 'all') queryParams.append('gender', params.gender);
    if (params.ageBucket && params.ageBucket !== 'all') queryParams.append('ageBucket', params.ageBucket);

    const response = await this.client.get<ApiResponse<PopulationTrend>>(
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
    if (params.districtId) queryParams.append('districtId', params.districtId.toString());
    if (params.from) queryParams.append('from', params.from);
    if (params.to) queryParams.append('to', params.to);
    if (params.gender && params.gender !== 'all') queryParams.append('gender', params.gender);
    if (params.ageBucket && params.ageBucket !== 'all') queryParams.append('ageBucket', params.ageBucket);

    const response = await this.client.get<ApiResponse<MonthlyPopulation[]>>(
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
    if (params.districtId) queryParams.append('districtId', params.districtId.toString());
    if (params.from) queryParams.append('from', params.from);
    if (params.to) queryParams.append('to', params.to);
    if (params.gender && params.gender !== 'all') queryParams.append('gender', params.gender);
    if (params.ageBucket && params.ageBucket !== 'all') queryParams.append('ageBucket', params.ageBucket);

    const response = await this.client.get<ApiResponse<PopulationStats[]>>(
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
    queryParams.append('districtId', params.districtId.toString());
    if (params.from) queryParams.append('from', params.from);
    if (params.to) queryParams.append('to', params.to);

    const response = await this.client.get<ApiResponse<AgeDistribution[]>>(
      `/population/age-distribution?${queryParams.toString()}`
    );
    return response.data;
  }

  // Population Highlights API
  async getPopulationHighlights(districtId?: number): Promise<PopulationHighlights[]> {
    const queryParams = districtId ? `?districtId=${districtId}` : '';
    const response = await this.client.get<ApiResponse<PopulationHighlights[]>>(
      `/population/highlights${queryParams}`
    );
    return response.data;
  }

  // User Favorites API
  async getUserFavorites(userId: string): Promise<UserFavorite[]> {
    const response = await this.client.get<ApiResponse<UserFavorite[]>>(
      `/users/${userId}/favorites`
    );
    return response.data;
  }

  async addUserFavorite(userId: string, districtId: number): Promise<UserFavorite> {
    const response = await this.client.post<ApiResponse<UserFavorite>>(
      `/users/${userId}/favorites`,
      { districtId }
    );
    return response.data;
  }

  async removeUserFavorite(userId: string, districtId: number): Promise<void> {
    await this.client.delete(`/users/${userId}/favorites/${districtId}`);
  }
}

// Create singleton instance
export const apiClient = new ApiClient();
export default apiClient;
