'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation'; // useRouter 추가
import Header from '@/components/common/Header';
import Card from '@/components/common/Card';
import FilterBar from '@/components/common/FilterBar';
import HourlyLine from '@/components/charts/HourlyLine';
import MonthlyLine from '@/components/charts/MonthlyLine';
import Pyramid from '@/components/charts/Pyramid';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { SkeletonChart } from '@/components/common/Skeleton';
import ErrorMessage from '@/components/common/ErrorMessage'; // 추가
import LoadingSpinner from '@/components/common/LoadingSpinner'; // 추가
import { 
  HourlyTrendDto,
  MonthlyTrendDto,
  PopulationAggDto,
  AgeDistributionDto,
  PopulationHighlights,
  District,
  TabType,
  NoteDto,
  NoteCreateRequest,
  NoteUpdateRequest,
  FilterParams,
  MonthlyPopulation,  // 🔧 추가
  MonthlyPopulationBackend,  // 🔧 추가
  AgeDistribution // 🔧 추가
} from '@/lib/types';
import { buildAgeDistributionFromBuckets } from '@/lib/charts/pyramid';
import { apiClient } from '@/lib/apiClient';
import { 
  getToday, 
  getTenDaysAgo,  // 🔧 기존
  getTwentyDaysAgo,  // 🔧 추가
  getLastMonth, 
  getErrorMessage, 
  formatPopulation, 
  parseSearchParams, 
  buildSearchParams, 
  getStoredUserId
  // 🔧 제거: formatWeekday, formatMonthDay (정의되지 않은 함수들)
} from '@/lib/utils';
import { DISTRICTS } from '@/components/common/SeoulMap'; // 🔧 추가

const DistrictDetailPage = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter(); // 추가
  const districtId = parseInt(params.id as string);
  
  const [activeTab, setActiveTab] = useState<TabType>('daily');
  const [district, setDistrict] = useState<District | null>(null);
  const [hourlyData, setHourlyData] = useState<HourlyTrendDto | null>(null);
  const [weeklyData, setWeeklyData] = useState<PopulationAggDto[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyTrendDto | null>(null);
  const [ageDistribution, setAgeDistribution] = useState<AgeDistributionDto | null>(null);
  const [highlights, setHighlights] = useState<PopulationHighlights | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 메모 관련 state들
  const [memo, setMemo] = useState<string>('');
  const [memoSaved, setMemoSaved] = useState<boolean>(false);
  const [memoDate, setMemoDate] = useState<string>('');
  const [memoLoading, setMemoLoading] = useState<boolean>(false);
  const [memoError, setMemoError] = useState<string | null>(null);
  const [currentNote, setCurrentNote] = useState<NoteDto | null>(null);

  // 에러 처리 개선
  const [apiErrors, setApiErrors] = useState<{
    district?: string;
    tabData?: string;
    memo?: string;
    highlights?: string;  // 🔧 추가
  }>({});

  const filters = parseSearchParams(searchParams);

  useEffect(() => {
    loadDistrictInfo();
    loadMemo();
  }, [districtId]);

  // 🔧 수정: 탭 변경 시 highlights 업데이트
  useEffect(() => {
    if (district && activeTab) {
      loadHighlights(activeTab);
    }
  }, [district, activeTab]);

  // 🔧 추가: 탭 데이터 로딩 useEffect 추가 ⭐⭐⭐
  useEffect(() => {
    console.log('📍 useEffect[loadTabData] 트리거:', {
      district: !!district,
      districtId: district?.id,
      activeTab,
      filtersDate: filters.date,
      filtersFrom: filters.from,
      filtersTo: filters.to,
      filtersGender: filters.gender,
      filtersAgeBucket: filters.ageBucket
    });
    
    if (district) {
      console.log('✅ Calling loadTabData...');
    loadTabData();
    } else {
      console.log('❌ No district, skipping loadTabData');
    }
  }, [district, activeTab, filters.date, filters.from, filters.to, filters.gender, filters.ageBucket]);

  // 🔧 추가: highlights 로드 함수
  const loadHighlights = async (tab: TabType) => {
    try {
      setApiErrors(prev => ({ ...prev, highlights: undefined }));
      
      let period: 'DAILY' | 'WEEKLY' | 'MONTHLY';
      switch (tab) {
        case 'daily':
          period = 'DAILY';
          break;
        case 'weekly':
          period = 'WEEKLY';
          break;
        case 'monthly':
          period = 'MONTHLY';
          break;
        case 'age':  // 🔧 수정: 이제 'age'가 TabType에 포함됨
          // 연령대 탭에서는 highlights를 표시하지 않음
          setHighlights(null);
          return;
        default:
          return;
      }

      console.log(`📊 Loading highlights for ${period}`);
      const highlightsData = await apiClient.getPopulationHighlights(districtId, period);
      setHighlights(highlightsData[0] || null);
      
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setApiErrors(prev => ({ ...prev, highlights: errorMessage }));
      console.error('Failed to load highlights:', err);
    }
  };

  const loadDistrictInfo = async () => {
    try {
      setApiErrors(prev => ({ ...prev, district: undefined }));
      
      const districts = await apiClient.getDistricts();
      const currentDistrict = districts.find(d => d.id === districtId);
      
      // 🔧 수정: 대시보드 SeoulMap과 동일한 자치구 매핑 사용
      let districtName = currentDistrict?.name;
      
      if (!districtName) {
        // 🔧 수정: 대시보드 DISTRICTS 배열과 동일한 매핑
        const DISTRICT_NAME_MAP: Record<number, string> = {
          1: '강남구', 2: '강동구', 3: '강북구', 4: '강서구', 5: '관악구',
          6: '광진구', 7: '구로구', 8: '금천구', 9: '노원구', 10: '도봉구',
          11: '동대문구', 12: '동작구', 13: '마포구', 14: '서대문구', 15: '서초구',
          16: '성동구', 17: '성북구', 18: '송파구', 19: '양천구', 20: '영등포구',
          21: '용산구', 22: '은평구', 23: '종로구', 24: '중구', 25: '중랑구'
        };
        
        districtName = DISTRICT_NAME_MAP[districtId] || `자치구 ${districtId}`;
      }
      
      setDistrict(currentDistrict || { id: districtId, name: districtName });

      // 🔧 제거: 여기서는 highlights 로드하지 않음 (탭별로 로드)
      
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setApiErrors(prev => ({ ...prev, district: errorMessage }));
      console.error('Failed to load district info:', err);
    }
  };

  // 🔧 수정: 탭에 따른 연령대별 데이터 로딩
  const loadAgeDistributionFromStats = async (apiParams: any, currentTab: TabType = activeTab) => {
    console.log('🚀 loadAgeDistributionFromStats 시작:', { apiParams, currentTab });
    
    try {
      console.log('📊 Loading age distribution via stats API...');
      
      // 🔧 수정: 탭에 따른 period 설정
      let period: 'DAILY' | 'WEEKLY' | 'MONTHLY';
      let fromDate: string;
      let toDate: string;
      
      switch (currentTab) {
        case 'daily':
          period = 'DAILY';
          fromDate = apiParams.date || apiParams.from;
          toDate = apiParams.date || apiParams.to;
          break;
        case 'weekly':
          period = 'WEEKLY';
          fromDate = apiParams.from;
          toDate = apiParams.to;
          break;
        case 'monthly':
          period = 'MONTHLY';
          fromDate = apiParams.from;
          toDate = apiParams.to;
          break;
        default:
          period = 'DAILY';
          fromDate = apiParams.from;
          toDate = apiParams.to;
      }
      
      console.log('📅 Age distribution period settings:', {
        currentTab,
        period,
        fromDate,
        toDate
      });
      
      // stats API로 연령대별 데이터 가져오기
      const statsResponse = await apiClient.getPopulationStats({
        districtId,
        period, // 🔧 수정: 동적 period 사용
        from: fromDate,
        to: toDate,
        gender: apiParams.gender,
        ageBucket: apiParams.ageBucket
      });
      
      console.log('📊 Stats response for age distribution:', statsResponse);
      
      if (!statsResponse || statsResponse.length === 0) {
        console.log('❌ No stats data for age distribution');
        return null;
      }
      
      // 🔧 수정: 다중 데이터 처리 (WEEKLY, MONTHLY의 경우 여러 데이터가 올 수 있음)
      let combinedMaleBuckets: Record<string, number> = {};
      let combinedFemaleBuckets: Record<string, number> = {};
      let totalDataPoints = 0;
      
      // 모든 데이터를 합산하여 평균 계산
      statsResponse.forEach(ageStats => {
        if (ageStats.maleBucketsAvg && ageStats.femaleBucketsAvg) {
          totalDataPoints++;
          
          // 남성 데이터 누적
          Object.entries(ageStats.maleBucketsAvg).forEach(([bucket, value]) => {
            combinedMaleBuckets[bucket] = (combinedMaleBuckets[bucket] || 0) + value;
          });
          
          // 여성 데이터 누적
          Object.entries(ageStats.femaleBucketsAvg).forEach(([bucket, value]) => {
            combinedFemaleBuckets[bucket] = (combinedFemaleBuckets[bucket] || 0) + value;
          });
        }
      });
      
      if (totalDataPoints === 0) {
        console.log('❌ No valid bucket data found');
        return null;
      }
      
      // 평균 계산
      Object.keys(combinedMaleBuckets).forEach(bucket => {
        combinedMaleBuckets[bucket] = combinedMaleBuckets[bucket] / totalDataPoints;
      });
      
      Object.keys(combinedFemaleBuckets).forEach(bucket => {
        combinedFemaleBuckets[bucket] = combinedFemaleBuckets[bucket] / totalDataPoints;
      });
      
      console.log('📊 Combined bucket data:', {
        totalDataPoints,
        combinedMaleBuckets,
        combinedFemaleBuckets
      });
      
      // maleBucketsAvg와 femaleBucketsAvg를 AgeDistribution 배열로 변환
      console.log('🔄 Converting buckets to age distribution...');
      const ageDistributionArray = buildAgeDistributionFromBuckets(
        combinedMaleBuckets,
        combinedFemaleBuckets
      );

      console.log('📊 Converted age distribution array:', ageDistributionArray);
      console.log('📊 Converted array length:', ageDistributionArray.length);

      if (ageDistributionArray.length === 0) {
        console.log('❌ Converted age distribution array is empty');
        return null;
      }

      // AgeDistributionDto 형태로 구성
      const firstStats = statsResponse[0];
      const ageDistributionDto: AgeDistributionDto = {
        districtId: firstStats.districtId,
        districtName: firstStats.districtName,
        from: fromDate,
        to: toDate,
        ageDistribution: ageDistributionArray
      };

      console.log('✅ Final ageDistributionDto:', ageDistributionDto);
      return ageDistributionDto;

    } catch (error) {
      console.error('❌ Exception in loadAgeDistributionFromStats:', error);
      return null;
    }
  };

  // 🔧 임시: 간단한 테스트 함수
  const testStatsAPI = async () => {
    try {
      console.log('🧪 Testing stats API...');
      const testResponse = await apiClient.getPopulationStats({
        districtId: 11680, // 강남구로 테스트
        period: 'DAILY',
        from: '2025-08-01',
        to: '2025-08-11'
      });
      console.log('🧪 Test response:', testResponse);
    } catch (error) {
      console.error('🧪 Test failed:', error);
    }
  };

  // useEffect에서 테스트 호출
  useEffect(() => {
    if (district) {
      testStatsAPI(); // 임시 테스트
      loadTabData();
    }
  }, [district, activeTab, filters.date, filters.from, filters.to, filters.gender, filters.ageBucket]);


  const loadTabData = async () => {
    console.log('🚀 loadTabData 시작! activeTab:', activeTab, 'districtId:', districtId);
    
    try {
      setLoading(true);
      setApiErrors(prev => ({ ...prev, tabData: undefined }));

      // 🔧 수정: 날짜 기준을 20일 전으로 통일 (하이라이트와 동일하게)
      const baseDate = getTwentyDaysAgo(); // 🔧 수정: 20일 전 사용
      const lastMonthFromBase = (() => {
        const date = new Date(baseDate);
        date.setMonth(date.getMonth() - 1);
        return date.toISOString().split('T')[0];
      })();

      const apiParams = {
        districtId,
        gender: filters.gender,
        ageBucket: filters.ageBucket,
        date: filters.date || baseDate,
        from: filters.from || lastMonthFromBase,
        to: filters.to || baseDate
      };

      console.log('📅 API Params with corrected dates (20 days ago base):', {
        activeTab,
        baseDate,
        apiParams,
        filters
      });

      // 🔧 수정: 탭별 연령 분포 데이터 로드
      console.log('📊 Loading age distribution for tab:', activeTab);
      
      try {
        const ageDistributionData = await loadAgeDistributionFromStats(apiParams, activeTab); // 🔧 수정: activeTab 전달
        console.log('📊 Age distribution result:', ageDistributionData);
        setAgeDistribution(ageDistributionData);
        console.log('✅ Age distribution set to state:', ageDistributionData);
      } catch (ageError) {
        console.error('❌ Age distribution loading failed:', ageError);
        setAgeDistribution(null);
      }

      // 🔧 수정: 탭별 데이터 로딩 + 항상 일간 데이터도 로드
      if (activeTab === 'daily') {
        console.log('📊 Loading daily (hourly) data for date:', apiParams.date);
        try {
        const hourlyResponse = await apiClient.getHourlyTrends(apiParams);
        setHourlyData(hourlyResponse);
          console.log('✅ Hourly data loaded:', hourlyResponse);
        } catch (hourlyError) {
          console.error('❌ Hourly data loading failed:', hourlyError);
          setHourlyData(null);
        }
      } else {
        // 🔧 추가: 다른 탭에서도 기본 일간 데이터 로드 (피라미드 차트용)
        console.log('📊 Loading basic daily data for non-daily tab');
        try {
          const hourlyResponse = await apiClient.getHourlyTrends({
            districtId: apiParams.districtId,
            date: apiParams.date,
            gender: apiParams.gender,
            ageBucket: apiParams.ageBucket
          });
          setHourlyData(hourlyResponse);
          console.log('✅ Basic hourly data loaded for non-daily tab:', hourlyResponse);
        } catch (error) {
          console.error('❌ Basic hourly data loading failed:', error);
        }
      }

      if (activeTab === 'weekly') {
        console.log('📊 Loading weekly data (20 days ago base week)...');
        
        // 🔧 수정: 20일 전을 기준으로 해당 주차의 데이터 가져오기
        const weeklyBaseDate = getTwentyDaysAgo(); // 🔧 수정: 20일 전 사용
        const weekRange = getWeekRange(weeklyBaseDate);
        
        const weeklyParams = {
          districtId: apiParams.districtId,
          period: 'DAILY' as const,
          from: weekRange.start,
          to: weekRange.end,
          gender: apiParams.gender,
          ageBucket: apiParams.ageBucket
        };
        
        console.log('📊 Weekly API params (20 days ago base week):', {
          weeklyBaseDate,
          weekRange,
          weeklyParams
        });
        
        const weeklyResponse = await apiClient.getPopulationStats(weeklyParams);
        setWeeklyData(weeklyResponse);
        console.log('✅ Weekly data loaded (20 days ago base week):', weeklyResponse);
      } else if (activeTab === 'monthly') {
        console.log('📊 Loading monthly data (12 months)');
        const monthlyResponse = await apiClient.getMonthlyTrends({
          districtId: apiParams.districtId,
          months: 12,
          gender: apiParams.gender,
          ageBucket: apiParams.ageBucket
        });
        setMonthlyData(monthlyResponse);
        console.log('✅ Monthly data loaded:', monthlyResponse);
      }

    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setApiErrors(prev => ({ ...prev, tabData: errorMessage }));
      console.error('❌ Failed to load tab data:', err);
    } finally {
      setLoading(false);
      console.log('🏁 loadTabData 완료');
    }
  };

  const loadMemo = async () => {
    try {
      setMemoLoading(true);
      setApiErrors(prev => ({ ...prev, memo: undefined }));
      
      const userId = getStoredUserId();
      const notes = await apiClient.getUserNotes(userId, districtId);
      
      if (notes.length > 0) {
        const latestNote = notes.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];
        
        setCurrentNote(latestNote);
        setMemo(latestNote.content);
        setMemoDate(new Date(latestNote.createdAt).toLocaleDateString('ko-KR'));
      } else {
    const savedMemo = localStorage.getItem(`district-memo-${districtId}`);
    const savedDate = localStorage.getItem(`district-memo-date-${districtId}`);
    
    if (savedMemo) {
      setMemo(savedMemo);
          if (savedDate) {
            setMemoDate(savedDate);
          }
          await migrateLocalStorageMemo(savedMemo);
        }
      }
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setApiErrors(prev => ({ ...prev, memo: errorMessage }));
      console.error('Failed to load memo:', err);
      
      const savedMemo = localStorage.getItem(`district-memo-${districtId}`);
      const savedDate = localStorage.getItem(`district-memo-date-${districtId}`);
      
      if (savedMemo) {
        setMemo(savedMemo);
    if (savedDate) {
      setMemoDate(savedDate);
        }
      }
    } finally {
      setMemoLoading(false);
    }
  };

  const migrateLocalStorageMemo = async (content: string) => {
    try {
      const userId = getStoredUserId();
      const newNote = await apiClient.createNote(userId, {
        districtId,
        content
      });
      
      setCurrentNote(newNote);
      setMemoDate(new Date(newNote.createdAt).toLocaleDateString('ko-KR'));
      
      localStorage.removeItem(`district-memo-${districtId}`);
      localStorage.removeItem(`district-memo-date-${districtId}`);
    } catch (err) {
      console.error('Failed to migrate memo:', err);
    }
  };

  const saveMemo = async () => {
    try {
      setMemoLoading(true);
      setApiErrors(prev => ({ ...prev, memo: undefined }));
      
      const userId = getStoredUserId();
      
      if (memo.trim()) {
        let savedNote: NoteDto;
        
        if (currentNote) {
          savedNote = await apiClient.updateNote(userId, currentNote.noteId, {
            content: memo.trim()
          });
        } else {
          savedNote = await apiClient.createNote(userId, {
            districtId,
            content: memo.trim()
          });
        }
        
        setCurrentNote(savedNote);
        setMemoDate(new Date(savedNote.createdAt).toLocaleDateString('ko-KR'));
        setMemoSaved(true);
        
        setTimeout(() => {
          setMemoSaved(false);
        }, 3000);
      }
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setApiErrors(prev => ({ ...prev, memo: errorMessage }));
      console.error('Failed to save memo:', err);
      
    const currentDate = new Date().toLocaleDateString('ko-KR');
    localStorage.setItem(`district-memo-${districtId}`, memo);
    localStorage.setItem(`district-memo-date-${districtId}`, currentDate);
    setMemoDate(currentDate);
    setMemoSaved(true);
    
    setTimeout(() => {
      setMemoSaved(false);
    }, 3000);
    } finally {
      setMemoLoading(false);
    }
  };

  const deleteMemo = async () => {
    if (!currentNote) return;
    
    try {
      setMemoLoading(true);
      setApiErrors(prev => ({ ...prev, memo: undefined }));
      
      const userId = getStoredUserId();
      await apiClient.deleteNote(userId, currentNote.noteId);
      
      setCurrentNote(null);
      setMemo('');
      setMemoDate('');
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setApiErrors(prev => ({ ...prev, memo: errorMessage }));
      console.error('Failed to delete memo:', err);
    } finally {
      setMemoLoading(false);
    }
  };

  const handleMemoChange = (value: string) => {
    if (value.length <= 500) {
      setMemo(value);
      setMemoSaved(false);
    }
  };

  const tabs = [
    { id: 'daily' as TabType, label: '일간', description: '시간대별 인구 현황' },
    { id: 'weekly' as TabType, label: '주간', description: '요일별 인구 현황' },
    { id: 'monthly' as TabType, label: '월간', description: '월별 인구 현황' }
    // { id: 'age' as TabType, label: '연령', description: '연령대별 인구 분포' } // 🔧 삭제
  ];

  // 🔧 추가: 백엔드 데이터를 차트용 데이터로 변환하는 함수
  const convertToMonthlyPopulation = (backendData: MonthlyPopulationBackend[]): MonthlyPopulation[] => {
    return backendData.map(item => ({
      month: item.yearMonth,
      value: item.totalAvg,
      districtId: district?.id
    }));
  };

  // 🔧 수정: DAILY 데이터를 요일별 차트 데이터로 변환하는 함수
  const convertToWeeklyChartData = (dailyStats: PopulationAggDto[]) => {
    console.log('🔄 Converting daily stats to weekday chart data:', dailyStats);
    
    if (!dailyStats || dailyStats.length === 0) {
      console.log('❌ No daily stats data for weekly conversion');
      return [];
    }
    
    // 요일별 데이터 그룹화 및 평균 계산
    const dayOfWeekMap: Record<number, { total: number; count: number; name: string; dates: string[] }> = {
      0: { total: 0, count: 0, name: '일요일', dates: [] }, // Sunday
      1: { total: 0, count: 0, name: '월요일', dates: [] }, // Monday
      2: { total: 0, count: 0, name: '화요일', dates: [] }, // Tuesday
      3: { total: 0, count: 0, name: '수요일', dates: [] }, // Wednesday
      4: { total: 0, count: 0, name: '목요일', dates: [] }, // Thursday
      5: { total: 0, count: 0, name: '금요일', dates: [] }, // Friday
      6: { total: 0, count: 0, name: '토요일', dates: [] }  // Saturday
    };
    
    // 각 일간 데이터를 요일별로 그룹화
    dailyStats.forEach(stat => {
      const date = new Date(stat.periodStartDate);
      const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      
      console.log(`📅 Processing date: ${stat.periodStartDate}, dayOfWeek: ${dayOfWeek} (${dayOfWeekMap[dayOfWeek]?.name}), totalAvg: ${stat.totalAvg}`);
      
      if (dayOfWeekMap[dayOfWeek]) {
        dayOfWeekMap[dayOfWeek].total += stat.totalAvg;
        dayOfWeekMap[dayOfWeek].count += 1;
        dayOfWeekMap[dayOfWeek].dates.push(stat.periodStartDate);
      }
    });
    
    console.log('📊 Grouped data by weekday:', dayOfWeekMap);
    
    // 월요일부터 일요일 순서로 정렬 (1,2,3,4,5,6,0)
    const orderedDays = [1, 2, 3, 4, 5, 6, 0];
    
    const chartData = orderedDays.map((dayIndex, chartIndex) => {
      const dayData = dayOfWeekMap[dayIndex];
      const avgValue = dayData.count > 0 ? Math.round(dayData.total / dayData.count) : 0;
      
      return {
        hour: chartIndex, // 0~6 (월~일)
        value: avgValue,
        hourLabel: dayData.name,
        date: dayData.name,
        dayOfWeek: dayIndex,
        dataCount: dayData.count,
        sourceDates: dayData.dates
      };
    });
    
    console.log('✅ Converted weekly chart data (weekday averages):', chartData);
    return chartData;
  };

  // 🔧 수정: 연령 분포 데이터 검증 함수 (올바른 필드명 사용)
  const validateAgeDistribution = (ageData: AgeDistributionDto | null) => {
    if (!ageData) return false;
    
    // ageDistribution 배열이 있고 최소 하나의 데이터가 있는지 확인
    return ageData.ageDistribution && 
           Array.isArray(ageData.ageDistribution) && 
           ageData.ageDistribution.length > 0;
  };

  const renderTabContent = () => {
    if (loading) {
      return <LoadingSpinner size="lg" message="데이터를 불러오는 중..." />;
    }

    if (apiErrors.tabData) {
      return (
        <ErrorMessage 
          error={apiErrors.tabData}
          onRetry={() => loadTabData()}
        />
      );
    }

    switch (activeTab) {
      case 'daily':
        // 🔧 수정: 일간 데이터 검증 개선
        const hasHourlyData = hourlyData && 
          hourlyData.currentData && 
          Array.isArray(hourlyData.currentData) && 
          hourlyData.currentData.length > 0;

        console.log('📊 Daily data validation:', {
          hourlyData,
          hasCurrentData: !!hourlyData?.currentData,
          dataLength: hourlyData?.currentData?.length,
          hasHourlyData
        });

        return hasHourlyData ? (
          <HourlyLine 
            series={hourlyData.currentData}
            title="시간대별 인구 현황"
            height={350}
          />
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <p>해당 날짜의 시간별 데이터가 없습니다</p>
              <p className="text-sm mt-1">다른 날짜를 선택해보세요</p>
            </div>
          </div>
        );

      case 'weekly':
        // 🔧 수정: 주간 데이터 변환 로직 개선
        console.log('📊 Weekly data validation:', {
          weeklyData,
          dataLength: weeklyData?.length,
          sampleData: weeklyData?.[0]
        });

        const hasWeeklyData = weeklyData && Array.isArray(weeklyData) && weeklyData.length > 0;
        
        if (hasWeeklyData) {
          const weeklyChartData = convertToWeeklyChartData(weeklyData);
          console.log('✅ Converted weekly chart data:', weeklyChartData);
          
          // 유효한 데이터가 있는지 확인
          const hasValidWeeklyData = weeklyChartData.length > 0 && weeklyChartData.some(item => item.value > 0);
          
          if (hasValidWeeklyData) {
            return (
          <HourlyLine 
            series={weeklyChartData}
                title="주간 인구 현황 (요일별 평균)"
            height={350}
                chartType="weekly" // 🔧 추가: 주간 차트임을 명시
              />
            );
          } else {
            return (
              <div className="h-64 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <p>요일별 데이터를 처리할 수 없습니다</p>
                  <p className="text-sm mt-1">최근 7일간의 데이터가 부족합니다</p>
                </div>
              </div>
            );
          }
        } else {
          return (
          <div className="h-64 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <p>해당 기간의 주간 데이터가 없습니다</p>
                <p className="text-sm mt-1">다른 기간을 선택해보세요</p>
              </div>
          </div>
        );
        }

      case 'monthly':
        // 🔧 수정: 월간 데이터 검증 개선
        const hasMonthlyData = monthlyData && 
          monthlyData.monthlyData && 
          Array.isArray(monthlyData.monthlyData) && 
          monthlyData.monthlyData.length > 0;

        console.log('📊 Monthly data validation:', {
          monthlyData,
          hasMonthlyDataField: !!monthlyData?.monthlyData,
          dataLength: monthlyData?.monthlyData?.length,
          hasMonthlyData
        });

        if (hasMonthlyData) {
          const convertedData = convertToMonthlyPopulation(monthlyData.monthlyData);
          console.log('✅ Converted monthly data:', convertedData);
          
          return (
          <MonthlyLine 
              data={convertedData}
            title="월별 인구 현황"
              height={350}
            />
          );
        } else {
          return (
            <div className="h-64 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <p>월별 데이터가 없습니다</p>
                <p className="text-sm mt-1">데이터 수집 기간을 확인해보세요</p>
              </div>
            </div>
          );
        }

      case 'age':
        // 🔧 수정: 연령 분포 데이터 검증 및 전달 방식 개선
        const hasAgeData = validateAgeDistribution(ageDistribution);
        
        console.log('📊 Age data validation:', {
          ageDistribution,
          hasAgeDistribution: !!ageDistribution?.ageDistribution,
          ageDataLength: ageDistribution?.ageDistribution?.length,
          hasAgeData
        });

        // 🔧 수정: null-safe하게 데이터 추출
        const ageData = ageDistribution?.ageDistribution;

        return hasAgeData && ageData ? (
          <Pyramid 
            data={ageData}  // 🔧 수정: 안전하게 추출된 데이터 사용
            title="연령대별 인구 분포"
            height={350}
          />
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <p>해당 기간의 연령 분포 데이터가 없습니다</p>
              <p className="text-sm mt-1">다른 기간을 선택해보세요</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // 에러 3, 4, 5, 6 수정: 불필요한 함수들 제거 (FilterBar에서 처리)
  // updateFilter와 applyFilters 함수들을 제거

  // 🔧 추가: 브라우저 탭 제목 업데이트
  useEffect(() => {
    if (district?.name) {
      document.title = `${district.name} 상세 분석 - ALP-B`;
    }
  }, [district]);

  // 🔧 추가: 특정 날짜가 속한 주의 월요일~일요일 범위를 계산하는 함수
  const getWeekRange = (date: string) => {
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    
    // 해당 주의 월요일 계산 (ISO 8601 기준)
    const mondayOfWeek = new Date(targetDate);
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    mondayOfWeek.setDate(targetDate.getDate() + daysToMonday);
    
    // 해당 주의 일요일 계산
    const sundayOfWeek = new Date(mondayOfWeek);
    sundayOfWeek.setDate(mondayOfWeek.getDate() + 6);
    
    return {
      start: mondayOfWeek.toISOString().split('T')[0],
      end: sundayOfWeek.toISOString().split('T')[0],
      baseDate: date,
      baseDayOfWeek: dayOfWeek
    };
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 자치구 정보 로딩 에러 */}
          {apiErrors.district && (
            <ErrorMessage 
              error={apiErrors.district}
              onRetry={loadDistrictInfo}
              className="mb-6"
            />
          )}

          {/* Header Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {district?.name || '자치구'} 상세 분석
              </h1>
            <p className="text-gray-600">
              {district?.name ? `${district.name}의` : '선택한 자치구의'} 생활인구 상세 현황을 확인하세요
            </p>
          </div>

          {/* KPI Cards */}
          {highlights && activeTab !== 'age' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <Card padding="sm">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">
                    {activeTab === 'daily' && '일 평균 인구'}
                    {activeTab === 'weekly' && '주 평균 인구'}
                    {activeTab === 'monthly' && '월 평균 인구'}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">{formatPopulation(highlights.avgDaily)}</p>
                </div>
              </Card>
              <Card padding="sm">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">
                    {activeTab === 'daily' && '최대 인구 시간'}
                    {activeTab === 'weekly' && '최대 인구 요일'}
                    {activeTab === 'monthly' && '최대 인구 날짜'}
                  </p>
                  <p className="text-lg font-semibold text-blue-600">{highlights.peakTime}</p>
                  <p className="text-sm text-gray-500">{formatPopulation(highlights.peakValue)}명</p>
                </div>
              </Card>
              <Card padding="sm">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">
                    {activeTab === 'daily' && '최소 인구 시간'}
                    {activeTab === 'weekly' && '최소 인구 요일'}
                    {activeTab === 'monthly' && '최소 인구 날짜'}
                  </p>
                  <p className="text-lg font-semibold text-green-600">{highlights.lowTime}</p>
                  <p className="text-sm text-gray-500">{formatPopulation(highlights.lowValue)}명</p>
                </div>
              </Card>
              {/* 🔧 주석 처리: 증감률 카드 제거 */}
              {/* <Card padding="sm">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">증감률</p>
                  <p className={`text-lg font-semibold ${highlights.growthRate >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                    {highlights.growthRate >= 0 ? '+' : ''}{highlights.growthRate.toFixed(1)}%
                  </p>
                </div>
              </Card> */}
            </div>
          )}

          {/* 🔧 추가: highlights 에러 표시 */}
          {apiErrors.highlights && activeTab !== 'age' && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">통계 요약 로드 실패: {apiErrors.highlights}</p>
            </div>
          )}

          {/* Filters */}
          <div className="mb-6">
            <FilterBar
              showGenderFilter={true}
              showAgeBucketFilter={true}
              showDateFilter={activeTab === 'daily'}
              showPresetManager={true}
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
                {/* 🔧 수정: 조건 검사를 변수로 분리 */}
                {(() => {
                  const hasValidAgeData = ageDistribution && 
                    ageDistribution.ageDistribution && 
                    Array.isArray(ageDistribution.ageDistribution) && 
                    ageDistribution.ageDistribution.length > 0;

                  // 디버깅 로그
                  console.log('🏗️ Pyramid card rendering debug:', {
                    ageDistribution,
                    hasAgeDistribution: !!ageDistribution,
                    hasAgeArray: !!ageDistribution?.ageDistribution,
                    ageArrayLength: ageDistribution?.ageDistribution?.length || 0,
                    ageArrayType: typeof ageDistribution?.ageDistribution,
                    isAgeArrayArray: Array.isArray(ageDistribution?.ageDistribution),
                    loading,
                    hasValidAgeData
                  });

                  if (hasValidAgeData) {
                    console.log('🎯 About to render Pyramid with data:', ageDistribution.ageDistribution);
                    return <Pyramid data={ageDistribution.ageDistribution} height={350} />;
                  } else if (loading) {
                    console.log('🔄 Showing loading spinner for age data');
                    return <LoadingSpinner size="lg" message="연령대별 데이터 로딩 중..." />;
                  } else {
                    console.log('❌ Showing no data message for age data');
                    return (
                  <div className="h-64 flex items-center justify-center text-gray-500">
                        <div className="text-center">
                          <p>연령대별 데이터가 없습니다</p>
                          <p className="text-xs mt-1">
                            Debug: hasAge={String(!!ageDistribution)}, 
                            hasArray={String(!!ageDistribution?.ageDistribution)}, 
                            length={ageDistribution?.ageDistribution?.length || 0}
                          </p>
                        </div>
                  </div>
                    );
                  }
                })()}
              </Card>
            </div>

            {/* 하단 좌측: 분석 메모 */}
            <div>
              <Card title="분석 메모">
                <div className="space-y-4">
                  {/* 메모 관련 에러 */}
                  {apiErrors.memo && (
                    <ErrorMessage 
                      error={apiErrors.memo}
                      onRetry={loadMemo}
                    />
                  )}

                  {memoLoading && (
                    <div className="flex items-center justify-center p-4">
                      <LoadingSpinner size="sm" message="메모를 불러오는 중..." />
                    </div>
                  )}

                  {/* 이전 메모 표시 */}
                  {memo && (
                    <div className="bg-gray-50 p-3 rounded-md border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-700">
                          {currentNote ? '서버에 저장된 메모' : '로컬에 저장된 메모'}
                        </span>
                        <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">
                          {memoDate || new Date().toLocaleDateString('ko-KR')}
                        </span>
                          {currentNote && (
                            <button
                              onClick={deleteMemo}
                              disabled={memoLoading}
                              className="text-xs text-red-600 hover:text-red-700 disabled:opacity-50"
                            >
                              삭제
                            </button>
                          )}
                        </div>
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
                    disabled={memoLoading}
                    placeholder="이 자치구에 대한 분석 내용이나 특이사항을 메모해보세요..."
                    className="w-full h-32 p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm disabled:opacity-50 disabled:bg-gray-100"
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
                        disabled={memoLoading || !memo.trim()}
                        className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {memoLoading ? '저장 중...' : '저장'}
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-400 border-t pt-2">
                    💡 메모는 서버에 안전하게 저장되며, 어디서든 접근할 수 있습니다.
                    {apiErrors.memo && ' (현재 오류로 인해 로컬에 임시 저장됩니다.)'}
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
