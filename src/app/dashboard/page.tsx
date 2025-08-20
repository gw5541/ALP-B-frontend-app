'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Header from '@/components/common/Header';
import Card from '@/components/common/Card';
import FavoriteSelect from '@/components/common/FavoriteSelect';
import HourlyLine from '@/components/charts/HourlyLine';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { SkeletonChart, SkeletonCard } from '@/components/common/Skeleton';
import { PopulationTrend, PopulationHighlights } from '@/lib/types';
import { apiClient } from '@/lib/apiClient';
import { getToday, getErrorMessage, formatPopulation } from '@/lib/utils';

const DashboardPage = () => {
  const searchParams = useSearchParams();
  const [selectedDistrict, setSelectedDistrict] = useState<number | undefined>();
  const [hoveredDistrict, setHoveredDistrict] = useState<number | undefined>();
  const [hourlyData, setHourlyData] = useState<PopulationTrend | null>(null);
  const [monthlyAverage, setMonthlyAverage] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seoul districts coordinates (approximate positions for hover areas)
  const districts = [
    { id: 1, name: '강남구', x: 65, y: 70 },
    { id: 2, name: '강동구', x: 85, y: 60 },
    { id: 3, name: '강북구', x: 45, y: 20 },
    { id: 4, name: '강서구', x: 15, y: 50 },
    { id: 5, name: '관악구', x: 45, y: 85 },
    { id: 6, name: '광진구', x: 75, y: 45 },
    { id: 7, name: '구로구', x: 25, y: 75 },
    { id: 8, name: '금천구', x: 30, y: 80 },
    { id: 9, name: '노원구', x: 55, y: 10 },
    { id: 10, name: '도봉구', x: 50, y: 15 },
    { id: 11, name: '동대문구', x: 60, y: 35 },
    { id: 12, name: '동작구', x: 40, y: 75 },
    { id: 13, name: '마포구', x: 35, y: 40 },
    { id: 14, name: '서대문구', x: 40, y: 35 },
    { id: 15, name: '서초구', x: 55, y: 75 },
    { id: 16, name: '성동구', x: 65, y: 40 },
    { id: 17, name: '성북구', x: 50, y: 25 },
    { id: 18, name: '송파구', x: 75, y: 65 },
    { id: 19, name: '양천구', x: 20, y: 60 },
    { id: 20, name: '영등포구', x: 30, y: 65 },
    { id: 21, name: '용산구', x: 50, y: 50 },
    { id: 22, name: '은평구', x: 35, y: 25 },
    { id: 23, name: '종로구', x: 45, y: 40 },
    { id: 24, name: '중구', x: 55, y: 45 },
    { id: 25, name: '중랑구', x: 70, y: 25 }
  ];

  useEffect(() => {
    const districtId = searchParams.get('districtId');
    if (districtId) {
      setSelectedDistrict(parseInt(districtId));
    }
  }, [searchParams]);

  useEffect(() => {
    if (selectedDistrict || hoveredDistrict) {
      loadDistrictData(selectedDistrict || hoveredDistrict!);
    }
  }, [selectedDistrict, hoveredDistrict]);

  const loadDistrictData = async (districtId: number) => {
    try {
      setLoading(true);
      setError(null);

      // Load hourly data for today
      const hourlyResponse = await apiClient.getHourlyTrends({
        districtId,
        date: getToday()
      });

      // Load monthly average
      const monthlyResponse = await apiClient.getMonthlyTrends({
        districtId,
        from: getToday().substring(0, 7) + '-01'
      });

      setHourlyData(hourlyResponse);
      
      if (monthlyResponse.length > 0) {
        const average = monthlyResponse.reduce((sum, item) => sum + item.value, 0) / monthlyResponse.length;
        setMonthlyAverage(average);
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

  const handleFavoriteSelect = (districtId: number) => {
    setSelectedDistrict(districtId);
  };

  const currentDistrict = districts.find(d => d.id === (selectedDistrict || hoveredDistrict));

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">서울 생활인구 분석</h1>
            <p className="text-gray-600">실시간 서울시 자치구별 생활인구 현황을 확인하세요</p>
          </div>

          {/* Favorite Districts Selector */}
          <div className="mb-8">
            <Card title="관심 지역">
              <FavoriteSelect
                value={selectedDistrict}
                onChange={handleFavoriteSelect}
                className="max-w-xs"
              />
            </Card>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Seoul Map */}
            <div className="space-y-6">
              <Card title="서울시 자치구별 생활인구">
                <div className="relative">
                  <Image
                    src="/images/Seoul.svg"
                    alt="Seoul Map"
                    width={500}
                    height={400}
                    className="w-full h-auto"
                    priority
                  />
                  
                  {/* District hover areas */}
                  {districts.map((district) => (
                    <div
                      key={district.id}
                      className="absolute w-6 h-6 bg-red-500 rounded-full opacity-70 hover:opacity-100 hover:scale-125 transition-all duration-200 cursor-pointer"
                      style={{
                        left: `${district.x}%`,
                        top: `${district.y}%`,
                        transform: 'translate(-50%, -50%)'
                      }}
                      onMouseEnter={() => handleDistrictHover(district.id)}
                      onMouseLeave={handleDistrictLeave}
                      onClick={() => setSelectedDistrict(district.id)}
                      title={district.name}
                    />
                  ))}
                </div>
              </Card>

              {/* District Info Card */}
              {(hoveredDistrict || selectedDistrict) && currentDistrict && (
                <Card title={`${currentDistrict.name} 정보`}>
                  {loading ? (
                    <div className="animate-pulse space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ) : error ? (
                    <p className="text-red-600 text-sm">{error}</p>
                  ) : monthlyAverage ? (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">최근 1개월 평균 인구수</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatPopulation(monthlyAverage)}명
                      </p>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">데이터를 불러오는 중...</p>
                  )}
                </Card>
              )}
            </div>

            {/* Hourly Chart */}
            <div>
              <Card title={currentDistrict ? `${currentDistrict.name} 시간대별 인구` : '시간대별 인구'}>
                {loading ? (
                  <SkeletonChart />
                ) : error ? (
                  <div className="h-64 flex items-center justify-center text-red-600">
                    {error}
                  </div>
                ) : hourlyData ? (
                  <HourlyLine 
                    series={hourlyData.hourlyData}
                    height={300}
                  />
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    지도에서 자치구를 선택하세요
                  </div>
                )}
              </Card>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-8">
            <Card title="바로가기">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <a
                  href="/reports/summary"
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <h4 className="font-semibold text-gray-900 mb-2">요약 보고서</h4>
                  <p className="text-sm text-gray-600">전체 자치구 생활인구 현황을 한눈에 확인</p>
                </a>
                
                {selectedDistrict && (
                  <a
                    href={`/districts/${selectedDistrict}`}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <h4 className="font-semibold text-gray-900 mb-2">{currentDistrict?.name} 상세</h4>
                    <p className="text-sm text-gray-600">선택한 자치구의 상세 분석 정보</p>
                  </a>
                )}
                
                <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <h4 className="font-semibold text-gray-900 mb-2">관심 지역 보고서</h4>
                  <p className="text-sm text-gray-600">즐겨찾기한 지역들의 비교 분석</p>
                  <span className="text-xs text-gray-400">(준비 중)</span>
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
