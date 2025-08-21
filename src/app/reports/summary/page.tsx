'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/common/Header';
import Card from '@/components/common/Card';
import FilterBar from '@/components/common/FilterBar';
import StatTable from '@/components/tables/StatTable';
import HourlyLine from '@/components/charts/HourlyLine';
import Pyramid from '@/components/charts/Pyramid';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { SkeletonChart, SkeletonTable } from '@/components/common/Skeleton';
import { 
  PopulationAggDto,
  AgeDistributionDto,
  HourlyTrendDto,
  District 
} from '@/lib/types';
import { buildAgeDistributionFromBuckets } from '@/lib/charts/pyramid'; // 🔧 추가
import { apiClient } from '@/lib/apiClient';
import { 
  getToday, 
  getTwentyDaysAgo,  // 🔧 추가
  getLastMonth, 
  getErrorMessage, 
  parseSearchParams,
  getStoredUserId,  // 🔧 추가
  convertDbCodeToInternalId // 🔧 추가
} from '@/lib/utils';
import { DISTRICTS } from '@/components/common/SeoulMap';

type ChartMode = 'hourly' | 'pyramid';
type TimePeriod = 'daily' | 'monthly' | 'yearly';

// Reports Summary 컴포넌트를 별도로 분리
const ReportsSummaryContent = () => {
  const searchParams = useSearchParams();
  const [districts, setDistricts] = useState<District[]>([]);
  const [favoriteDistricts, setFavoriteDistricts] = useState<(number | null)[]>([null, null, null]);
  const [monthlyStats, setMonthlyStats] = useState<PopulationAggDto[]>([]);
  const [chartMode, setChartMode] = useState<ChartMode>('hourly');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('daily');
  const [hourlyData, setHourlyData] = useState<HourlyTrendDto[]>([]);
  const [favoriteHourlyData, setFavoriteHourlyData] = useState<HourlyTrendDto[]>([]);
  const [ageDistribution, setAgeDistribution] = useState<AgeDistributionDto | null>(null);
  const [favoriteAgeDistributions, setFavoriteAgeDistributions] = useState<AgeDistributionDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filters = parseSearchParams(searchParams);

  useEffect(() => {
    loadDistricts();
    loadFavoriteDistricts();
  }, []); // 🔧 수정: 한 번만 로드

  useEffect(() => {
    loadMonthlyStats();
  }, [
    filters.districtId, 
    filters.from, 
    filters.to, 
    filters.gender, 
    filters.ageBucket,
    favoriteDistricts // 🔧 추가: favoriteDistricts 의존성 추가
  ]);

  useEffect(() => {
    loadChartData();
  }, [
    chartMode, 
    timePeriod, 
    filters.districtId,
    filters.date,
    filters.from,
    filters.to,
    filters.gender,
    filters.ageBucket
  ]);

  const loadDistricts = async () => {
    try {
      const districtsData = await apiClient.getDistricts();
      setDistricts(districtsData);
    } catch (err) {
      console.error('Failed to load districts:', err);
    }
  };

  const loadFavoriteDistricts = async () => {
    try {
      // 🔧 수정: 백엔드 API 사용으로 변경
      setError(null);
      
      const userId = getStoredUserId();
      const favorites = await apiClient.getUserFavorites(userId);
      
      console.log('📍 Summary: 백엔드에서 불러온 관심 지역:', favorites);
      
      // 🔧 수정: 백엔드에서 온 districtId를 내부 ID로 변환
      const favoriteIds = favorites.map(fav => {
        return convertDbCodeToInternalId(fav.districtId);
      }).filter((id): id is number => id !== null);
      
      // 3개 슬롯에 맞게 변환 (부족한 부분은 null로 채우기)
      const paddedFavorites: (number | null)[] = [
        favoriteIds[0] || null,
        favoriteIds[1] || null,
        favoriteIds[2] || null
      ];
      
      console.log('📍 Summary: 변환된 관심 지역 배열:', paddedFavorites);
      
      setFavoriteDistricts(paddedFavorites);
    } catch (err) {
      console.error('Failed to load favorite districts from backend:', err);
      
      // 🔧 fallback: localStorage에서 불러오기
    try {
      const saved = localStorage.getItem('favoriteDistricts');
      if (saved) {
        const parsed = JSON.parse(saved);
        setFavoriteDistricts(parsed);
          console.log('📍 Summary: Fallback to localStorage favorites:', parsed);
        }
      } catch (localErr) {
        console.error('Failed to load favorite districts from localStorage:', localErr);
      }
    }
  };

  const loadMonthlyStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (filters.districtId) {
      const params = {
        period: 'MONTHLY' as const,
          districtId: filters.districtId,
        from: filters.from || getLastMonth(),
          to: filters.to || getTwentyDaysAgo(),
        gender: filters.gender,
        ageBucket: filters.ageBucket
      };

        // 🔧 추가: 디버깅 모드 설정
        const DEBUG_MODE = process.env.NODE_ENV === 'development';

        // 로그를 다음과 같이 조건부로 변경
        if (DEBUG_MODE) {
          console.log('📊 Summary: Loading monthly stats for specific district:', params);
        }
      const stats = await apiClient.getPopulationStats(params);
      setMonthlyStats(stats);
      } else {
        const selectedDistricts = favoriteDistricts.filter((id): id is number => id !== null);
        
        if (selectedDistricts.length > 0) {
          console.log('📊 Summary: Loading monthly stats for favorite districts (internal IDs):', selectedDistricts);
          
          const statsPromises = selectedDistricts.map(internalDistrictId => 
            apiClient.getPopulationStats({
              period: 'MONTHLY' as const,
              districtId: internalDistrictId,
              from: filters.from || getLastMonth(),
              to: filters.to || getTwentyDaysAgo(),
              gender: filters.gender,
              ageBucket: filters.ageBucket
            })
          );

          const statsResponses = await Promise.all(statsPromises);
          const allStats = statsResponses.flat();
          setMonthlyStats(allStats);
        } else {
          console.log('📊 Summary: No districts selected, clearing monthly stats');
          setMonthlyStats([]);
        }
      }
    } catch (err) {
      setError(getErrorMessage(err));
      console.error('Failed to load monthly stats:', err);
    } finally {
      setLoading(false);
    }
  }, [
    filters.districtId,
    filters.from,
    filters.to,
    filters.gender,
    filters.ageBucket,
    favoriteDistricts
  ]);

  const loadChartData = useCallback(async () => {
    try {
      setChartLoading(true);

      if (chartMode === 'hourly') {
        const districtId = filters.districtId;
        const params = {
          districtId,
          date: filters.date || getTwentyDaysAgo(), // 🔧 수정: 20일 전 기준
          gender: filters.gender,
          ageBucket: filters.ageBucket
        };

        if (districtId) {
          const hourlyResponse = await apiClient.getHourlyTrends({
            districtId,
            date: params.date,
            gender: params.gender,
            ageBucket: params.ageBucket
          });
          setHourlyData([hourlyResponse]);
          setFavoriteHourlyData([]); // 특정 지역 선택 시 관심 지역 데이터 초기화
        } else {
          // 관심 지역별로 개별 차트 데이터 로드
          const selectedDistricts = favoriteDistricts.filter((id): id is number => id !== null);
          
          if (selectedDistricts.length > 0) {
            const favoriteHourlyPromises = selectedDistricts.map(internalDistrictId =>
              apiClient.getHourlyTrends({
                districtId: internalDistrictId,
                date: params.date,
                gender: params.gender,
                ageBucket: params.ageBucket
              })
            );
            
            const favoriteHourlyResponses = await Promise.all(favoriteHourlyPromises);
            setFavoriteHourlyData(favoriteHourlyResponses);
            setHourlyData([]); // 관심 지역 모드에서는 기존 hourlyData 초기화
          } else {
            // 관심 지역이 없으면 상위 5개 지역 표시 (기존 로직)
            const topDistricts = monthlyStats
              .sort((a, b) => b.totalAvg - a.totalAvg)
              .slice(0, 5);
            
            const hourlyPromises = topDistricts.map(district =>
              apiClient.getHourlyTrends({ ...params, districtId: district.districtId })
            );
            
            const hourlyResponses = await Promise.all(hourlyPromises);
            setHourlyData(hourlyResponses);
            setFavoriteHourlyData([]);
          }
        }
      } else if (chartMode === 'pyramid') {
        const baseDate = getTwentyDaysAgo();
        const districtId = filters.districtId;

        if (districtId) {
          // 특정 지역 선택 시
          const params = {
            districtId,
            period: 'DAILY' as const,
            from: filters.from || baseDate,
            to: filters.to || baseDate,
            gender: filters.gender,
            ageBucket: filters.ageBucket
          };

          console.log('📊 Summary: Loading age distribution for specific district:', params);

          try {
            const statsResponse = await apiClient.getPopulationStats(params);
            
            if (statsResponse && statsResponse.length > 0) {
              const ageStats = statsResponse[0];
              
              if (ageStats.maleBucketsAvg && ageStats.femaleBucketsAvg) {
                const ageDistributionArray = buildAgeDistributionFromBuckets(
                  ageStats.maleBucketsAvg,
                  ageStats.femaleBucketsAvg
                );

                if (ageDistributionArray.length > 0) {
                  const ageDistributionDto: AgeDistributionDto = {
                    districtId: ageStats.districtId,
                    districtName: ageStats.districtName,
                    from: params.from,
                    to: params.to,
                    ageDistribution: ageDistributionArray
                  };

                  setAgeDistribution(ageDistributionDto);
                  setFavoriteAgeDistributions([]); // 특정 지역 선택 시 관심 지역 데이터 초기화
                } else {
                  setAgeDistribution(null);
                  setFavoriteAgeDistributions([]);
                }
              } else {
                setAgeDistribution(null);
                setFavoriteAgeDistributions([]);
              }
            } else {
              setAgeDistribution(null);
              setFavoriteAgeDistributions([]);
            }
          } catch (ageError) {
            console.error('❌ Summary: Age distribution loading failed:', ageError);
            setAgeDistribution(null);
            setFavoriteAgeDistributions([]);
          }
        } else {
          // 관심 지역별로 개별 연령대 분포 데이터 로드
          const selectedDistricts = favoriteDistricts.filter((id): id is number => id !== null);
          
          if (selectedDistricts.length > 0) {
            console.log('📊 Summary: Loading age distributions for favorite districts:', selectedDistricts);
            
            const favoriteAgePromises = selectedDistricts.map(async (internalDistrictId) => {
              const params = {
                districtId: internalDistrictId,
                period: 'DAILY' as const,
                from: filters.from || baseDate,
                to: filters.to || baseDate,
                gender: filters.gender,
                ageBucket: filters.ageBucket
              };

              try {
                const statsResponse = await apiClient.getPopulationStats(params);
                
                if (statsResponse && statsResponse.length > 0) {
                  const ageStats = statsResponse[0];
                  
                  if (ageStats.maleBucketsAvg && ageStats.femaleBucketsAvg) {
                    const ageDistributionArray = buildAgeDistributionFromBuckets(
                      ageStats.maleBucketsAvg,
                      ageStats.femaleBucketsAvg
                    );

                    if (ageDistributionArray.length > 0) {
                      return {
                        districtId: ageStats.districtId,
                        districtName: ageStats.districtName,
                        from: params.from,
                        to: params.to,
                        ageDistribution: ageDistributionArray
                      } as AgeDistributionDto;
                    }
                  }
                }
                return null;
              } catch (error) {
                console.error(`Failed to load age distribution for district ${internalDistrictId}:`, error);
                return null;
              }
            });
            
            const favoriteAgeResponses = await Promise.all(favoriteAgePromises);
            const validAgeDistributions = favoriteAgeResponses.filter((dist): dist is AgeDistributionDto => dist !== null);
            
            setFavoriteAgeDistributions(validAgeDistributions);
            setAgeDistribution(null); // 관심 지역 모드에서는 기존 단일 데이터 초기화
          } else {
            setFavoriteAgeDistributions([]);
            setAgeDistribution(null);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load chart data:', err);
    } finally {
      setChartLoading(false);
    }
  }, [
    chartMode,
    timePeriod,
    filters.districtId,
    filters.date,
    filters.from,
    filters.to,
    filters.gender,
    filters.ageBucket,
    monthlyStats, // 🔧 추가: monthlyStats 의존성 (hourly 차트에서 사용)
    favoriteDistricts // 🔧 추가: favoriteDistricts 의존성
  ]);

  // 🔧 추가: 같은 구의 중복 데이터 제거 (최신 데이터만 유지)
  const getUniqueDistrictStats = useCallback((stats: PopulationAggDto[]): PopulationAggDto[] => {
    if (!stats || stats.length === 0) return [];

    // districtId별로 그룹화
    const groupedByDistrict = stats.reduce((acc, stat) => {
      const districtId = stat.districtId;
      if (!acc[districtId]) {
        acc[districtId] = [];
      }
      acc[districtId].push(stat);
      return acc;
    }, {} as Record<number, PopulationAggDto[]>);

    // 각 그룹에서 가장 최신 데이터만 선택
    const uniqueStats = Object.values(groupedByDistrict).map(districtStats => {
      // periodStartDate 기준으로 정렬 (최신순)
      const sortedStats = districtStats.sort((a, b) => 
        new Date(b.periodStartDate).getTime() - new Date(a.periodStartDate).getTime()
      );
      
      console.log(`📊 District ${districtStats[0].districtName}: ${districtStats.length} records, latest: ${sortedStats[0].periodStartDate}`);
      
      return sortedStats[0]; // 가장 최신 데이터 반환
    });

    console.log('📊 Summary: Original stats count:', stats.length);
    console.log('📊 Summary: Unique stats count:', uniqueStats.length);
    
    return uniqueStats;
  }, []);

  // 🔧 추가: 테이블 subtitle 동적 생성
  const getTableSubtitle = useCallback(() => {
    const uniqueStats = getUniqueDistrictStats(monthlyStats);
    if (uniqueStats.length === 0) return "자치구별 월간 생활인구 통계";
    
    // 가장 많이 사용된 기간 찾기
    const periods = uniqueStats.map(stat => stat.periodStartDate);
    const mostCommonPeriod = periods.reduce((acc, period) => {
      acc[period] = (acc[period] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const latestPeriod = Object.keys(mostCommonPeriod).sort().reverse()[0];
    
    if (latestPeriod) {
      const formattedDate = new Date(latestPeriod).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long'
      });
      return `자치구별 월간 생활인구 통계 (${formattedDate} 기준)`;
    }
    
    return "자치구별 월간 생활인구 통계";
  }, [monthlyStats, getUniqueDistrictStats]);

  const renderChart = () => {
    if (chartLoading) {
      return <SkeletonChart />;
    }

    if (chartMode === 'hourly') {
      // 특정 지역이 선택된 경우 (기존 로직)
      if (hourlyData.length > 0) {
        if (hourlyData.length === 1) {
          return (
            <HourlyLine 
              series={hourlyData[0].currentData}
              title={`${hourlyData[0].districtName || '자치구'} 시간대별 인구`}
              height={350}
            />
          );
        }

        return (
          <HourlyLine 
            series={hourlyData[0].currentData}
            title="주요 자치구 시간대별 인구"
            height={350}
          />
        );
      }

      // 관심 지역별 개별 차트들
      if (favoriteHourlyData.length > 0) {
        return (
          <div className="space-y-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">관심 지역별 시간대별 인구 현황</h4>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {favoriteHourlyData.map((data, index) => (
                <div key={data.districtId || index} className="bg-white border border-gray-200 rounded-lg p-4">
                  <HourlyLine 
                    series={data.currentData}
                    title={`${data.districtName || `자치구 ${data.districtId}`}`}
                    height={280}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      }

      return (
        <div className="h-64 flex items-center justify-center text-gray-500">
          시간대별 데이터가 없습니다
        </div>
      );
    }

    if (chartMode === 'pyramid') {
      // 특정 지역이 선택된 경우 (기존 로직)
      if (ageDistribution?.ageDistribution?.length) {
        return (
          <Pyramid 
            data={ageDistribution.ageDistribution}
            title="연령대별 인구 분포"
            height={350}
          />
        );
      }

      // 관심 지역별 개별 차트들
      if (favoriteAgeDistributions.length > 0) {
        return (
          <div className="space-y-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">관심 지역별 연령대별 인구 분포</h4>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {favoriteAgeDistributions.map((data, index) => (
                <div key={data.districtId || index} className="bg-white border border-gray-200 rounded-lg p-4">
                  <Pyramid 
                    data={data.ageDistribution}
                    title={`${data.districtName || `자치구 ${data.districtId}`}`}
                    height={280}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      }

      return (
        <div className="h-64 flex items-center justify-center text-gray-500">
          연령대별 데이터가 없습니다
        </div>
      );
    }

    return null;
  };

  return (
    <>
        <Header />
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">요약 보고서</h1>
            <p className="text-gray-600">관심 자치구의 생활인구 현황을 한눈에 확인하세요</p>
            
            {/* 현재 관심 지역 표시 */}
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">현재 관심 지역</h3>
              <div className="flex flex-wrap gap-2">
                {favoriteDistricts.filter(id => id !== null).length > 0 ? (
                  favoriteDistricts
                    .filter((id): id is number => id !== null)
                    .map((districtId) => {
                      const district = DISTRICTS.find(d => d.id === districtId);
                      return (
                        <span
                          key={districtId}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 border border-blue-300"
                        >
                          {district?.name || `자치구 ${districtId}`}
                        </span>
                      );
                    })
                ) : (
                  <span className="text-sm text-blue-600">
                    관심 지역이 설정되지 않았습니다. 
                    <a href="/dashboard" className="underline hover:text-blue-700 ml-1">
                      대시보드에서 설정하기
                    </a>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6">
            <FilterBar
              showDistrictFilter={true}
              showGenderFilter={true}
              showAgeBucketFilter={true}
              showDateFilter={chartMode === 'hourly'}
            showPresetManager={true}
              districts={districts}
            />
          </div>

          {/* Summary Table */}
          <div className="mb-8">
          <Card title="월간 집계 현황" subtitle={getTableSubtitle()}>
            {loading ? (
              <SkeletonTable rows={10} cols={5} />
            ) : error ? (
              <div className="text-center py-8 text-red-600">
                {error}
              </div>
            ) : (
              <StatTable data={getUniqueDistrictStats(monthlyStats)} />
            )}
          </Card>
          </div>

          {/* Chart Section */}
          <div className="mb-8">
            <Card>
              {/* Chart Mode Toggle */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">상세 분석</h3>
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setChartMode('hourly')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      chartMode === 'hourly'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    시간대별 현황
                  </button>
                  <button
                    onClick={() => setChartMode('pyramid')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      chartMode === 'pyramid'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    연령대별 분포
                  </button>
                </div>
              </div>

              {/* Time Period Toggle for Hourly Chart */}
              {chartMode === 'hourly' && (
                <div className="flex items-center justify-center mb-6">
                  <div className="flex bg-red-50 rounded-lg p-1">
                    <button
                      onClick={() => setTimePeriod('daily')}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                        timePeriod === 'daily'
                          ? 'bg-red-600 text-white shadow-sm'
                          : 'text-red-600 hover:text-red-700'
                      }`}
                    >
                      일
                    </button>
                    <button
                      onClick={() => setTimePeriod('monthly')}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                        timePeriod === 'monthly'
                          ? 'bg-red-600 text-white shadow-sm'
                          : 'text-red-600 hover:text-red-700'
                      }`}
                    >
                      월
                    </button>
                    <button
                      onClick={() => setTimePeriod('yearly')}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                        timePeriod === 'yearly'
                          ? 'bg-red-600 text-white shadow-sm'
                          : 'text-red-600 hover:text-red-700'
                      }`}
                    >
                      년
                    </button>
                  </div>
                </div>
              )}

              {/* Chart Content */}
              {renderChart()}
            </Card>
          </div>

          {/* Additional Actions */}
          <div className="mb-8">
            <Card title="추가 기능">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <a
                  href="/dashboard"
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <h4 className="font-semibold text-gray-900 mb-2">대시보드</h4>
                  <p className="text-sm text-gray-600">인터랙티브 지도와 실시간 현황</p>
                </a>
                
                <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <h4 className="font-semibold text-gray-900 mb-2">데이터 내보내기</h4>
                  <p className="text-sm text-gray-600">Excel/PDF 형태로 보고서 다운로드</p>
                  <span className="text-xs text-gray-400">(준비 중)</span>
                </div>
              </div>
            </Card>
          </div>
        </main>
    </>
  );
};

// Loading fallback 컴포넌트
const ReportsSummaryLoading = () => (
  <div className="min-h-screen bg-gray-50">
    <Header />
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="h-8 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded w-96 animate-pulse"></div>
      </div>
      <div className="space-y-8">
        <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-96 bg-gray-200 rounded animate-pulse"></div>
      </div>
    </main>
  </div>
);

// 메인 페이지 컴포넌트 - Suspense로 감싸기
const ReportsSummaryPage = () => {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <Suspense fallback={<ReportsSummaryLoading />}>
          <ReportsSummaryContent />
        </Suspense>
      </div>
    </ErrorBoundary>
  );
};

export default ReportsSummaryPage;
