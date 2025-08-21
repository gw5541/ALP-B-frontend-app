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
import { apiClient } from '@/lib/apiClient';
import { getToday, getLastMonth, getErrorMessage, parseSearchParams } from '@/lib/utils';
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

  const loadFavoriteDistricts = () => {
    try {
      const saved = localStorage.getItem('favoriteDistricts');
      if (saved) {
        const parsed = JSON.parse(saved);
        setFavoriteDistricts(parsed);
      }
    } catch (err) {
      console.error('Failed to load favorite districts:', err);
    }
  };

  const loadMonthlyStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        period: 'MONTHLY' as const,
        from: filters.from || getLastMonth(),
        to: filters.to || getToday(),
        gender: filters.gender,
        ageBucket: filters.ageBucket
      };

      const stats = await apiClient.getPopulationStats(params);
      setMonthlyStats(stats);
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
          date: filters.date || getToday(),
          gender: filters.gender,
          ageBucket: filters.ageBucket
        };

        if (districtId) {
          const hourlyResponse = await apiClient.getHourlyTrends(params);
          setHourlyData([hourlyResponse]);
        } else {
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
        const params = {
          districtId: filters.districtId || 1,
          from: filters.from || getLastMonth(),
          to: filters.to || getToday()
        };

        const ageResponse = await apiClient.getAgeDistribution(params);
        setAgeDistribution(ageResponse);
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
