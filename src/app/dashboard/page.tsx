'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/common/Header';
import Card from '@/components/common/Card';
import FavoriteDropdowns from '@/components/common/FavoriteDropdowns';
import SeoulMap, { DISTRICTS } from '@/components/common/SeoulMap';
import HourlyLine from '@/components/charts/HourlyLine';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { SkeletonChart } from '@/components/common/Skeleton';
// 새로운 타입들 import
import { HourlyTrendDto, MonthlyTrendDto } from '@/lib/types';
import { apiClient } from '@/lib/apiClient';
import { getToday, getLastMonth, getErrorMessage, formatPopulation } from '@/lib/utils';

const DashboardPage = () => {
  const searchParams = useSearchParams();
  const [hoveredDistrict, setHoveredDistrict] = useState<number | undefined>();
  const [selectedFavorites, setSelectedFavorites] = useState<(number | null)[]>([null, null, null]);
  // 새로운 타입 사용
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
      // 호버가 없을 때 데이터 초기화
      setHourlyData(null);
      setWeeklyAverage(null);
    }
  }, [hoveredDistrict]);

  const loadDistrictData = async (districtId: number) => {
    try {
      setLoading(true);
      setError(null);

      // 시간대별 인구 데이터 로드 (일간 평균) - 새로운 API 사용
      const hourlyResponse = await apiClient.getHourlyTrends({
        districtId,
        date: getToday()
      });

      // 주간 평균 계산을 위한 월별 데이터 로드 - 새로운 API 사용
      const monthlyResponse = await apiClient.getMonthlyTrends({
        districtId,
        months: 1 // 최근 1개월
      });

      setHourlyData(hourlyResponse);
      
      // 새로운 응답 구조에 맞게 수정
      if (monthlyResponse.monthlyData.length > 0) {
        // 최근 한 달 평균 계산
        const average = monthlyResponse.monthlyData.reduce((sum, item) => sum + item.value, 0) / monthlyResponse.monthlyData.length;
        setWeeklyAverage(average);
      }
    } catch (err) {
      setError(getErrorMessage(err));
      console.error('Failed to load district data:', err);
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
    // 자치구 상세 페이지로 이동
    window.open(`/districts/${districtId}`, '_blank');
  };

  const handleFavoriteChange = (favorites: (number | null)[]) => {
    setSelectedFavorites(favorites);
  };

  const currentDistrict = hoveredDistrict 
    ? DISTRICTS.find(d => d.id === hoveredDistrict)
    : null;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
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
                ) : hourlyData ? (
                  <HourlyLine 
                    series={hourlyData.hourlyData}
                    height={350}
                    color="#3b82f6"
                  />
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <p className="text-sm">지도에서 자치구에 마우스를 올려보세요</p>
                      <p className="text-xs text-gray-400 mt-1">해당 자치구의 시간대별 인구 변화를 확인할 수 있습니다</p>
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
                    <li>• 호버 시 주간 평균 인구수와 시간대별 변화를 확인할 수 있습니다</li>
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
      </div>
    </ErrorBoundary>
  );
};

export default DashboardPage;