'use client';

import { useState, useEffect, Suspense } from 'react';
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
  getStoredUserId  // 🔧 추가
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
  const [ageDistribution, setAgeDistribution] = useState<AgeDistributionDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filters = parseSearchParams(searchParams);

  useEffect(() => {
    loadDistricts();
    loadFavoriteDistricts();
    loadMonthlyStats();
  }, [filters]);

  useEffect(() => {
    loadChartData();
  }, [chartMode, timePeriod, filters]);

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
        // DB 코드 (11xxx)를 내부 ID (1-25)로 변환
        const district = DISTRICTS.find(d => {
          // DISTRICTS 배열에서 매칭되는 DB 코드 찾기 (메모리 매핑 사용)
          const DISTRICT_CODE_MAP: Record<number, string> = {
            1: '11680', 2: '11740', 3: '11305', 4: '11500', 5: '11620',
            6: '11215', 7: '11530', 8: '11545', 9: '11350', 10: '11320',
            11: '11230', 12: '11590', 13: '11440', 14: '11410', 15: '11650',
            16: '11200', 17: '11290', 18: '11710', 19: '11470', 20: '11560',
            21: '11170', 22: '11380', 23: '11110', 24: '11140', 25: '11260'
          };
          
          return DISTRICT_CODE_MAP[d.id] === fav.districtId.toString();
        });
        
        return district ? district.id : null;
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

  const loadMonthlyStats = async () => {
    try {
      setLoading(true);
      setError(null);

      if (filters.districtId) {
        // 🔧 특정 자치구가 선택된 경우
        const params = {
          period: 'MONTHLY' as const,
          districtId: filters.districtId,
          from: filters.from || getLastMonth(),
          to: filters.to || getTwentyDaysAgo(),
          gender: filters.gender,
          ageBucket: filters.ageBucket
        };

        console.log('📊 Summary: Loading monthly stats for specific district:', params);
        const stats = await apiClient.getPopulationStats(params);
        setMonthlyStats(stats);
      } else {
        // 🔧 자치구가 선택되지 않은 경우, 관심 지역들의 데이터 가져오기
        const selectedDistricts = favoriteDistricts.filter((id): id is number => id !== null);
        
        if (selectedDistricts.length > 0) {
          console.log('📊 Summary: Loading monthly stats for favorite districts (internal IDs):', selectedDistricts);
          
          const statsPromises = selectedDistricts.map(internalDistrictId => 
            apiClient.getPopulationStats({
              period: 'MONTHLY' as const,
              districtId: internalDistrictId, // 🔧 내부 ID 전달 (apiClient에서 자동 변환)
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
  };

  const loadChartData = async () => {
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
        } else {
          // districtId가 없는 경우의 로직
          const topDistricts = monthlyStats
            .sort((a, b) => b.totalAvg - a.totalAvg)
            .slice(0, 5);
          
          const hourlyPromises = topDistricts.map(district =>
            apiClient.getHourlyTrends({ ...params, districtId: district.districtId })
          );
          
          const hourlyResponses = await Promise.all(hourlyPromises);
          setHourlyData(hourlyResponses);
        }
      } else if (chartMode === 'pyramid') {
        // 🔧 수정: getPopulationStats와 buildAgeDistributionFromBuckets 사용
        const targetDistrictId = filters.districtId || 1;
        const baseDate = getTwentyDaysAgo();
        
        const params = {
          districtId: targetDistrictId,
          period: 'DAILY' as const, // 🔧 수정: DAILY period 사용
          from: filters.from || baseDate,
          to: filters.to || baseDate,
          gender: filters.gender,
          ageBucket: filters.ageBucket
        };

        console.log('📊 Summary: Loading age distribution via stats API:', params);

        try {
          // 🔧 수정: getPopulationStats로 변경
          const statsResponse = await apiClient.getPopulationStats(params);
          
          console.log('📊 Summary: Stats response for age distribution:', statsResponse);
          
          if (statsResponse && statsResponse.length > 0) {
            const ageStats = statsResponse[0];
            
            if (ageStats.maleBucketsAvg && ageStats.femaleBucketsAvg) {
              // 🔧 수정: buildAgeDistributionFromBuckets로 변환
              const ageDistributionArray = buildAgeDistributionFromBuckets(
                ageStats.maleBucketsAvg,
                ageStats.femaleBucketsAvg
              );

              console.log('📊 Summary: Converted age distribution array:', ageDistributionArray);

              if (ageDistributionArray.length > 0) {
                // AgeDistributionDto 형태로 구성
                const ageDistributionDto: AgeDistributionDto = {
                  districtId: ageStats.districtId,
                  districtName: ageStats.districtName,
                  from: params.from,
                  to: params.to,
                  ageDistribution: ageDistributionArray
                };

                console.log('✅ Summary: Final ageDistributionDto:', ageDistributionDto);
                setAgeDistribution(ageDistributionDto);
              } else {
                console.log('❌ Summary: Converted age distribution array is empty');
                setAgeDistribution(null);
              }
            } else {
              console.log('❌ Summary: No maleBucketsAvg or femaleBucketsAvg in stats response');
              setAgeDistribution(null);
            }
          } else {
            console.log('❌ Summary: No stats data for age distribution');
            setAgeDistribution(null);
          }
        } catch (ageError) {
          console.error('❌ Summary: Age distribution loading failed:', ageError);
          setAgeDistribution(null);
        }
      }
    } catch (err) {
      console.error('Failed to load chart data:', err);
    } finally {
      setChartLoading(false);
    }
  };

  const renderChart = () => {
    if (chartLoading) {
      return <SkeletonChart />;
    }

    if (chartMode === 'hourly') {
      if (hourlyData.length === 0) {
        return (
          <div className="h-64 flex items-center justify-center text-gray-500">
            시간대별 데이터가 없습니다
          </div>
        );
      }

      if (hourlyData.length === 1) {
        return (
          <HourlyLine 
            series={hourlyData[0].currentData}  // 🔧 currentData 사용
            title={`${hourlyData[0].districtName || '자치구'} 시간대별 인구`}
            height={350}
          />
        );
      }

      return (
        <HourlyLine 
          series={hourlyData[0].currentData}  // 🔧 currentData 사용
          title="주요 자치구 시간대별 인구"
          height={350}
        />
      );
    }

    if (chartMode === 'pyramid') {
      if (!ageDistribution?.ageDistribution?.length) {
        return (
          <div className="h-64 flex items-center justify-center text-gray-500">
            연령대별 데이터가 없습니다
          </div>
        );
      }

      return (
        <Pyramid 
          data={ageDistribution.ageDistribution}
          title="연령대별 인구 분포"
          height={350}
        />
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
          <Card title="월간 집계 현황" subtitle="자치구별 월간 생활인구 통계">
            {loading ? (
              <SkeletonTable rows={10} cols={5} />
            ) : error ? (
              <div className="text-center py-8 text-red-600">
                {error}
              </div>
            ) : (
              <StatTable data={monthlyStats} />
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
