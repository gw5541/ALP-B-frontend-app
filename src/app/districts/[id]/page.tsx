'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Header from '@/components/common/Header';
import Card from '@/components/common/Card';
import FilterBar from '@/components/common/FilterBar';
import HourlyLine from '@/components/charts/HourlyLine';
import MonthlyLine from '@/components/charts/MonthlyLine';
import Pyramid from '@/components/charts/Pyramid';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { SkeletonChart } from '@/components/common/Skeleton';
import { 
  PopulationTrend, 
  MonthlyPopulation, 
  AgeDistribution, 
  PopulationStats,
  PopulationHighlights,
  District,
  TabType 
} from '@/lib/types';
import { apiClient } from '@/lib/apiClient';
import { getToday, getLastMonth, getErrorMessage, formatPopulation, parseSearchParams } from '@/lib/utils';

const DistrictDetailPage = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  const districtId = parseInt(params.id as string);
  
  const [activeTab, setActiveTab] = useState<TabType>('daily');
  const [district, setDistrict] = useState<District | null>(null);
  const [hourlyData, setHourlyData] = useState<PopulationTrend | null>(null);
  const [weeklyData, setWeeklyData] = useState<PopulationStats[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyPopulation[]>([]);
  const [ageDistribution, setAgeDistribution] = useState<AgeDistribution[]>([]);
  const [highlights, setHighlights] = useState<PopulationHighlights | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filters = parseSearchParams(searchParams);

  useEffect(() => {
    loadDistrictInfo();
  }, [districtId]);

  useEffect(() => {
    loadTabData();
  }, [activeTab, districtId, filters]);

  const loadDistrictInfo = async () => {
    try {
      const districts = await apiClient.getDistricts();
      const currentDistrict = districts.find(d => d.id === districtId);
      setDistrict(currentDistrict || { id: districtId, name: `자치구 ${districtId}` });

      // Load highlights
      const highlightsData = await apiClient.getPopulationHighlights(districtId);
      setHighlights(highlightsData[0] || null);
    } catch (err) {
      console.error('Failed to load district info:', err);
    }
  };

  const loadTabData = async () => {
    try {
      setLoading(true);
      setError(null);

      const apiParams = {
        districtId,
        gender: filters.gender,
        ageBucket: filters.ageBucket,
        date: filters.date || getToday(),
        from: filters.from || getLastMonth(),
        to: filters.to || getToday()
      };

      if (activeTab === 'daily') {
        const hourlyResponse = await apiClient.getHourlyTrends(apiParams);
        setHourlyData(hourlyResponse);
      } else if (activeTab === 'weekly') {
        const weeklyResponse = await apiClient.getPopulationStats({
          period: 'WEEKLY',
          ...apiParams
        });
        setWeeklyData(weeklyResponse);
      } else if (activeTab === 'monthly') {
        const monthlyResponse = await apiClient.getMonthlyTrends(apiParams);
        setMonthlyData(monthlyResponse);
      }

      // Load age distribution (always load for pyramid)
      const ageResponse = await apiClient.getAgeDistribution({
        districtId,
        from: apiParams.from,
        to: apiParams.to
      });
      setAgeDistribution(ageResponse);

    } catch (err) {
      setError(getErrorMessage(err));
      console.error('Failed to load tab data:', err);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'daily' as TabType, label: '일간', description: '시간대별 인구 현황' },
    { id: 'weekly' as TabType, label: '주간', description: '요일별 인구 현황' },
    { id: 'monthly' as TabType, label: '월간', description: '월별 인구 현황' }
  ];

  const renderTabContent = () => {
    if (loading) {
      return <SkeletonChart />;
    }

    if (error) {
      return (
        <div className="h-64 flex items-center justify-center text-red-600">
          {error}
        </div>
      );
    }

    switch (activeTab) {
      case 'daily':
        return hourlyData ? (
          <HourlyLine 
            series={hourlyData.hourlyData}
            title="시간대별 인구 현황"
            height={350}
          />
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500">
            데이터가 없습니다
          </div>
        );

      case 'weekly':
        // Convert weekly stats to chart format
        const weeklyChartData = weeklyData.map((stat, index) => ({
          hour: index,
          value: stat.total
        }));
        
        return weeklyChartData.length > 0 ? (
          <HourlyLine 
            series={weeklyChartData}
            title="요일별 인구 현황"
            height={350}
          />
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500">
            데이터가 없습니다
          </div>
        );

      case 'monthly':
        return monthlyData.length > 0 ? (
          <MonthlyLine 
            data={monthlyData}
            title="월별 인구 현황"
            height={350}
          />
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500">
            데이터가 없습니다
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex items-center space-x-4 mb-4">
              <button
                onClick={() => window.history.back()}
                className="p-2 text-gray-600 hover:text-gray-900 rounded-md hover:bg-gray-100"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-3xl font-bold text-gray-900">
                {district?.name || '자치구'} 상세 분석
              </h1>
            </div>
            <p className="text-gray-600">선택한 자치구의 생활인구 상세 현황을 확인하세요</p>
          </div>

          {/* KPI Cards */}
          {highlights && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Card padding="sm">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">일평균 인구</p>
                  <p className="text-2xl font-bold text-gray-900">{formatPopulation(highlights.avgDaily)}</p>
                </div>
              </Card>
              <Card padding="sm">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">최대 인구 시간</p>
                  <p className="text-lg font-semibold text-blue-600">{highlights.peakTime}</p>
                  <p className="text-sm text-gray-500">{formatPopulation(highlights.peakValue)}명</p>
                </div>
              </Card>
              <Card padding="sm">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">최소 인구 시간</p>
                  <p className="text-lg font-semibold text-green-600">{highlights.lowTime}</p>
                  <p className="text-sm text-gray-500">{formatPopulation(highlights.lowValue)}명</p>
                </div>
              </Card>
              <Card padding="sm">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">증감률</p>
                  <p className={`text-lg font-semibold ${highlights.growthRate >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                    {highlights.growthRate >= 0 ? '+' : ''}{highlights.growthRate.toFixed(1)}%
                  </p>
                </div>
              </Card>
            </div>
          )}

          {/* Filters */}
          <div className="mb-6">
            <FilterBar
              showGenderFilter={true}
              showAgeBucketFilter={true}
              showDateFilter={activeTab === 'daily'}
              className="mb-4"
            />
          </div>

          {/* Tabs */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-red-500 text-red-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div>
                      <div>{tab.label}</div>
                      <div className="text-xs text-gray-400 mt-1">{tab.description}</div>
                    </div>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Tab Content */}
            <div className="xl:col-span-2">
              <Card>
                {renderTabContent()}
              </Card>
            </div>

            {/* Age Distribution Pyramid */}
            <div>
              <Card title="연령대별 인구 분포">
                {ageDistribution.length > 0 ? (
                  <Pyramid data={ageDistribution} height={350} />
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    {loading ? '데이터를 불러오는 중...' : '데이터가 없습니다'}
                  </div>
                )}
              </Card>
            </div>
          </div>

          {/* Additional Actions */}
          <div className="mt-8">
            <Card title="추가 기능">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <a
                  href="/dashboard"
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <h4 className="font-semibold text-gray-900 mb-2">대시보드로 돌아가기</h4>
                  <p className="text-sm text-gray-600">전체 서울시 현황 확인</p>
                </a>
                
                <a
                  href="/reports/summary"
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <h4 className="font-semibold text-gray-900 mb-2">요약 보고서</h4>
                  <p className="text-sm text-gray-600">전체 자치구 비교 분석</p>
                </a>
              </div>
            </Card>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
};

export default DistrictDetailPage;
