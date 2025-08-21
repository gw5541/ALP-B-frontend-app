'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/common/Header';
import Card from '@/components/common/Card';
import FavoriteDropdowns from '@/components/common/FavoriteDropdowns';
import SeoulMap, { DISTRICTS } from '@/components/common/SeoulMap';
import HourlyLine from '@/components/charts/HourlyLine';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { SkeletonChart } from '@/components/common/Skeleton';
import { HourlyTrendDto, MonthlyTrendDto } from '@/lib/types';
import { apiClient } from '@/lib/apiClient';
import { getTenDaysAgo, getLastMonth, getErrorMessage, formatPopulation } from '@/lib/utils';

// Dashboard 컴포넌트를 별도로 분리
const DashboardContent = () => {
  const searchParams = useSearchParams();
  const [hoveredDistrict, setHoveredDistrict] = useState<number | undefined>();
  const [selectedFavorites, setSelectedFavorites] = useState<(number | null)[]>([null, null, null]);
  const [hourlyData, setHourlyData] = useState<HourlyTrendDto | null>(null);
  const [weeklyAverage, setWeeklyAverage] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const districtId = searchParams.get('districtId');
    if (districtId) {
      setHoveredDistrict(parseInt(districtId));
    }
  }, [searchParams]);

  useEffect(() => {
    if (hoveredDistrict) {
      loadDistrictData(hoveredDistrict);
    } else {
      setHourlyData(null);
      setWeeklyAverage(null);
    }
  }, [hoveredDistrict]);

  const loadDistrictData = async (districtId: number) => {
    try {
      setLoading(true);
      setError(null);

      // 🔧 수정: API 호출을 병렬로 실행 (날짜를 10일 전으로 변경)
      const [hourlyResponse, monthlyResponse] = await Promise.all([
        apiClient.getHourlyTrends({
          districtId,
          date: getTenDaysAgo()  // 🔧 오늘 날짜 대신 10일 전 사용 (DB에 데이터가 있는 날짜)
        }),
        apiClient.getMonthlyTrends({
          districtId,
          months: 1
        })
      ]);

      // 🔧 디버깅: API 응답 로그 추가
      console.log('🔍 API Response Debug:');
      console.log('Date requested:', getTenDaysAgo());
      console.log('Hourly Response:', hourlyResponse);
      console.log('Monthly Response:', monthlyResponse);
      console.log('Monthly Data Length:', monthlyResponse?.monthlyData?.length);
      console.log('Monthly Data:', monthlyResponse?.monthlyData);

      setHourlyData(hourlyResponse);
      
      // 🔧 수정: 월별 데이터 처리 개선 (백엔드 구조에 맞게)
      if (monthlyResponse && monthlyResponse.monthlyData && monthlyResponse.monthlyData.length > 0) {
        // 최신 월의 데이터 사용 (배열의 마지막 항목)
        const latestMonthData = monthlyResponse.monthlyData[monthlyResponse.monthlyData.length - 1];
        console.log('Latest Month Data:', latestMonthData);
        
        // 🔧 수정: totalAvg 필드 사용
        if (latestMonthData && typeof latestMonthData.totalAvg === 'number') {
          setWeeklyAverage(latestMonthData.totalAvg);
          console.log('✅ Set Weekly Average:', latestMonthData.totalAvg);
        } else {
          console.warn('⚠️ Invalid month data totalAvg:', latestMonthData);
          setWeeklyAverage(0);
        }
      } else {
        console.warn('⚠️ No monthly data available');
        setWeeklyAverage(0);
      }
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      console.error('❌ Failed to load district data:', err);
      console.error('Error details:', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDistrictHover = (districtId: number) => {
    setHoveredDistrict(districtId);
  };

  const handleDistrictLeave = () => {
    setHoveredDistrict(undefined);
  };

  const handleDistrictClick = (districtId: number) => {
    window.open(`/districts/${districtId}`, '_blank');
  };

  const handleFavoriteChange = (favorites: (number | null)[]) => {
    setSelectedFavorites(favorites);
  };

  const currentDistrict = hoveredDistrict 
    ? DISTRICTS.find(d => d.id === hoveredDistrict)
    : null;

  return (
    <>
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">서울 생활인구 분석</h1>
          <p className="text-gray-600">서울시 자치구별 생활인구 현황을 확인하세요</p>
        </div>

        {/* 관심 지역 3개 드롭다운 */}
        <div className="mb-8">
          <Card title="관심 지역 설정 (최대 3개)">
            <FavoriteDropdowns 
              onFavoriteChange={handleFavoriteChange}
            />
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Seoul Map */}
          <div>
            <Card title="서울시 자치구별 생활인구">
              <SeoulMap
                onDistrictHover={handleDistrictHover}
                onDistrictLeave={handleDistrictLeave}
                onDistrictClick={handleDistrictClick}
                hoveredDistrict={hoveredDistrict}
                averagePopulation={weeklyAverage || 0}
                favoriteDistricts={selectedFavorites.filter(id => id !== null) as number[]}
              />
            </Card>
          </div>

          {/* Hourly Chart */}
          <div>
            <Card title={
              currentDistrict 
                ? `${currentDistrict.name} 일간 평균 인구 시간대별 변화` 
                : '시간대별 인구 변화'
            }>
              {loading ? (
                <SkeletonChart />
              ) : error ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-red-600 text-sm mb-2">{error}</p>
                    <button 
                      onClick={() => hoveredDistrict && loadDistrictData(hoveredDistrict)}
                      className="text-xs text-blue-600 hover:text-blue-700 underline"
                    >
                      다시 시도
                    </button>
                  </div>
                </div>
              ) : hourlyData && hourlyData.currentData && hourlyData.currentData.length > 0 ? (
                <HourlyLine 
                  series={hourlyData.currentData}
                  height={350}
                  color="#3b82f6"
                />
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    {/* 🔧 수정: SVG 아이콘을 더 간단한 형태로 변경 */}
                    <div className="mx-auto h-12 w-12 text-gray-400 mb-4 flex items-center justify-center">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <p className="text-sm">
                      {hourlyData && hourlyData.currentData && hourlyData.currentData.length === 0 
                        ? '해당 날짜의 시간별 데이터가 없습니다' 
                        : '지도에서 자치구에 마우스를 올려보세요'
                      }
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {hourlyData && hourlyData.currentData && hourlyData.currentData.length === 0
                        ? '다른 날짜의 데이터를 확인해보세요'
                        : '해당 자치구의 시간대별 인구 변화를 확인할 수 있습니다'
                      }
                    </p>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* 사용법 안내 */}
        <div className="mt-8">
          <Card title="사용법" className="bg-blue-50 border-blue-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-blue-900 mb-2">🗺️ 지도 인터랙션</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• 관심 지역으로 설정된 자치구는 연두색으로 표시됩니다</li>
                  <li>• 자치구에 마우스를 올리면 해당 지역이 빨간색으로 표시됩니다</li>
                  <li>• 호버 시 월 평균 인구수와 시간대별 변화를 확인할 수 있습니다</li>
                  <li>• 자치구를 클릭하면 상세 분석 페이지로 이동합니다</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-blue-900 mb-2">⭐ 관심 지역 설정</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• 최대 3개의 관심 지역을 선택할 수 있습니다</li>
                  <li>• 선택하지 않은 지역은 "--"로 표시됩니다</li>
                  <li>• 중복 선택은 불가능합니다</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </>
  );
};

// Loading fallback 컴포넌트
const DashboardLoading = () => (
  <div className="min-h-screen bg-gray-50">
    <Header />
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="h-8 bg-gray-200 rounded w-64 mb-2 animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded w-96 animate-pulse"></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="h-96 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-96 bg-gray-200 rounded animate-pulse"></div>
      </div>
    </main>
  </div>
);

// 메인 페이지 컴포넌트 - Suspense로 감싸기
const DashboardPage = () => {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <Suspense fallback={<DashboardLoading />}>
          <DashboardContent />
        </Suspense>
      </div>
    </ErrorBoundary>
  );
};

export default DashboardPage;