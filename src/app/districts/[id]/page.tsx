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
  const [memo, setMemo] = useState<string>('');
  const [memoSaved, setMemoSaved] = useState<boolean>(false);
  const [memoDate, setMemoDate] = useState<string>('');

  const filters = parseSearchParams(searchParams);

  useEffect(() => {
    loadDistrictInfo();
    loadMemo();
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

  const loadMemo = () => {
    // localStorage에서 메모와 날짜 불러오기
    const savedMemo = localStorage.getItem(`district-memo-${districtId}`);
    const savedDate = localStorage.getItem(`district-memo-date-${districtId}`);
    
    if (savedMemo) {
      setMemo(savedMemo);
    }
    if (savedDate) {
      setMemoDate(savedDate);
    }
  };

  const saveMemo = () => {
    // localStorage에 메모와 현재 날짜 저장
    const currentDate = new Date().toLocaleDateString('ko-KR');
    localStorage.setItem(`district-memo-${districtId}`, memo);
    localStorage.setItem(`district-memo-date-${districtId}`, currentDate);
    setMemoDate(currentDate);
    setMemoSaved(true);
    
    // 3초 후 저장 표시 제거
    setTimeout(() => {
      setMemoSaved(false);
    }, 3000);
  };

  const handleMemoChange = (value: string) => {
    // 500자 제한
    if (value.length <= 500) {
      setMemo(value);
      setMemoSaved(false);
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

          {/* Main Content Grid - 2x2 Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 상단 좌측: 인구 현황 */}
            <div>
              <Card>
                {renderTabContent()}
              </Card>
            </div>

            {/* 상단 우측: 연령대별 인구 분포 */}
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

            {/* 하단 좌측: 분석 메모 */}
            <div>
              <Card title="분석 메모">
                <div className="space-y-4">
                  {/* 이전 메모 표시 */}
                  {memo && (
                    <div className="bg-gray-50 p-3 rounded-md border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-700">저장된 메모</span>
                        <span className="text-xs text-gray-500">
                          {memoDate || new Date().toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                        {memo.length > 150 ? `${memo.substring(0, 150)}...` : memo}
                      </p>
                      {memo.length > 150 && (
                        <button 
                          onClick={() => {
                            const element = document.getElementById('memo-textarea');
                            element?.focus();
                          }}
                          className="text-xs text-blue-600 hover:text-blue-700 mt-2"
                        >
                          전체 보기/수정
                        </button>
                      )}
                    </div>
                  )}

                  <textarea
                    id="memo-textarea"
                    value={memo}
                    onChange={(e) => handleMemoChange(e.target.value)}
                    placeholder="이 자치구에 대한 분석 내용이나 특이사항을 메모해보세요..."
                    className="w-full h-32 p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                  />
                  
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      {memo.length}/500자
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {memoSaved && (
                        <span className="text-xs text-green-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          저장됨
                        </span>
                      )}
                      
                      <button
                        onClick={saveMemo}
                        className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                      >
                        저장
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-400 border-t pt-2">
                    💡 메모는 브라우저에 자동 저장되며, 각 자치구별로 개별 관리됩니다.
                  </div>
                </div>
              </Card>
            </div>

            {/* 하단 우측: 추가 기능 */}
            <div>
              <Card title="추가 기능">
                <div className="space-y-4">
                  <a
                    href="/dashboard"
                    className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <h4 className="font-semibold text-gray-900 mb-2">대시보드로 돌아가기</h4>
                    <p className="text-sm text-gray-600">전체 서울시 현황 확인</p>
                  </a>
                  
                  <a
                    href="/reports/summary"
                    className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <h4 className="font-semibold text-gray-900 mb-2">요약 보고서</h4>
                    <p className="text-sm text-gray-600">관심 자치구 비교 분석</p>
                  </a>

                  {/* 추가 액션들 */}
                  <div className="space-y-2 pt-2 border-t border-gray-200">
                    <button
                      onClick={() => window.print()}
                      className="w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        <span className="text-sm font-medium">페이지 인쇄</span>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        const url = window.location.href;
                        navigator.clipboard.writeText(url);
                        alert('페이지 링크가 복사되었습니다!');
                      }}
                      className="w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                        </svg>
                        <span className="text-sm font-medium">링크 공유</span>
                      </div>
                    </button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
};

export default DistrictDetailPage;
