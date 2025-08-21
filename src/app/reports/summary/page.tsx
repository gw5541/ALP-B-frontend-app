'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/common/Header';
import Card from '@/components/common/Card';
import FilterBar from '@/components/common/FilterBar';
import StatTable from '@/components/tables/StatTable';
import HourlyLine from '@/components/charts/HourlyLine';
import MonthlyLine from '@/components/charts/MonthlyLine';
import Pyramid from '@/components/charts/Pyramid';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { SkeletonChart, SkeletonTable } from '@/components/common/Skeleton';
import { 
  PopulationAggDto,
  AgeDistributionDto,
  HourlyTrendDto,
  WeeklyTrendDto,
  MonthlyTrendDto,
  MonthlyPopulation,
  District,
  NoteDto
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
  const [weeklyData, setWeeklyData] = useState<PopulationAggDto[]>([]);
  const [favoriteWeeklyData, setFavoriteWeeklyData] = useState<PopulationAggDto[][]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyPopulation[]>([]);
  const [favoriteMonthlyData, setFavoriteMonthlyData] = useState<MonthlyPopulation[][]>([]);
  const [ageDistribution, setAgeDistribution] = useState<AgeDistributionDto | null>(null);
  const [favoriteAgeDistributions, setFavoriteAgeDistributions] = useState<AgeDistributionDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 메모 관련 상태들
  const [memo, setMemo] = useState('');
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | null>(null);
  const [memoLoading, setMemoLoading] = useState(false);
  const [memoSaved, setMemoSaved] = useState(false);
  const [allNotes, setAllNotes] = useState<NoteDto[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState('');

  const filters = parseSearchParams(searchParams);

  useEffect(() => {
    loadDistricts();
    loadFavoriteDistricts();
  }, []); // 🔧 수정: 한 번만 로드

  // 관심 지역이 로드되면 첫 번째 지역을 기본 선택하고 메모 로드
  useEffect(() => {
    const validFavorites = favoriteDistricts.filter((id): id is number => id !== null);
    if (validFavorites.length > 0) {
      setSelectedDistrictId(validFavorites[0]);
      loadAllNotes();
    }
  }, [favoriteDistricts]);

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
    filters.ageBucket,
    favoriteDistricts
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
        const baseDate = getTwentyDaysAgo();

        // 각 state 초기화
        setHourlyData([]);
        setFavoriteHourlyData([]);
        setWeeklyData([]);
        setFavoriteWeeklyData([]);
        setMonthlyData([]);
        setFavoriteMonthlyData([]);

        if (timePeriod === 'daily') {
          // 일간: 시간대별 차트
        const params = {
          districtId,
            date: filters.date || baseDate,
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
            // 관심 지역별 시간대별 데이터
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
            }
          }
        } else if (timePeriod === 'monthly') {
          // 주간: 요일별 차트
          const weekRange = getWeekRange(baseDate);
          const params = {
            districtId,
            period: 'DAILY' as const,
            from: weekRange.start,
            to: weekRange.end,
            gender: filters.gender,
            ageBucket: filters.ageBucket
          };

          if (districtId) {
            const weeklyResponse = await apiClient.getPopulationStats(params);
            setWeeklyData(weeklyResponse);
          } else {
            // 관심 지역별 요일별 데이터
            const selectedDistricts = favoriteDistricts.filter((id): id is number => id !== null);
            if (selectedDistricts.length > 0) {
              const favoriteWeeklyPromises = selectedDistricts.map(internalDistrictId =>
                apiClient.getPopulationStats({
                  ...params,
                  districtId: internalDistrictId
                })
              );
              const favoriteWeeklyResponses = await Promise.all(favoriteWeeklyPromises);
              setFavoriteWeeklyData(favoriteWeeklyResponses);
            }
          }
        } else if (timePeriod === 'yearly') {
          // 연간: 주차별 차트
          if (districtId) {
            const monthlyResponse = await apiClient.getWeeklyTrends({
              districtId,
              weeks: 5,
              gender: filters.gender,
              ageBucket: filters.ageBucket
            });
            const convertedData = convertWeeklyToMonthlyPopulation(monthlyResponse);
            setMonthlyData(convertedData);
          } else {
            // 관심 지역별 주차별 데이터
            const selectedDistricts = favoriteDistricts.filter((id): id is number => id !== null);
            if (selectedDistricts.length > 0) {
              const favoriteMonthlyPromises = selectedDistricts.map(async (internalDistrictId) => {
                const monthlyResponse = await apiClient.getWeeklyTrends({
                  districtId: internalDistrictId,
                  weeks: 5,
                  gender: filters.gender,
                  ageBucket: filters.ageBucket
                });
                return convertWeeklyToMonthlyPopulation(monthlyResponse);
              });
              const favoriteMonthlyResponses = await Promise.all(favoriteMonthlyPromises);
              setFavoriteMonthlyData(favoriteMonthlyResponses);
            }
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

  // Districts 페이지에서 가져온 헬퍼 함수들
  const getWeekRange = (date: string) => {
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay();
    
    const mondayOfWeek = new Date(targetDate);
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    mondayOfWeek.setDate(targetDate.getDate() + daysToMonday);
    
    const sundayOfWeek = new Date(mondayOfWeek);
    sundayOfWeek.setDate(mondayOfWeek.getDate() + 6);
    
    return {
      start: mondayOfWeek.toISOString().split('T')[0],
      end: sundayOfWeek.toISOString().split('T')[0]
    };
  };

  const convertToWeeklyChartData = (dailyStats: PopulationAggDto[]) => {
    if (!dailyStats || dailyStats.length === 0) return [];
    
    const dayOfWeekMap: Record<number, { total: number; count: number; name: string }> = {
      0: { total: 0, count: 0, name: '일요일' },
      1: { total: 0, count: 0, name: '월요일' },
      2: { total: 0, count: 0, name: '화요일' },
      3: { total: 0, count: 0, name: '수요일' },
      4: { total: 0, count: 0, name: '목요일' },
      5: { total: 0, count: 0, name: '금요일' },
      6: { total: 0, count: 0, name: '토요일' }
    };
    
    dailyStats.forEach(stat => {
      const date = new Date(stat.periodStartDate);
      const dayOfWeek = date.getDay();
      
      if (dayOfWeekMap[dayOfWeek]) {
        dayOfWeekMap[dayOfWeek].total += stat.totalAvg;
        dayOfWeekMap[dayOfWeek].count += 1;
      }
    });
    
    const orderedDays = [1, 2, 3, 4, 5, 6, 0];
    
    return orderedDays.map((dayIndex, chartIndex) => {
      const dayData = dayOfWeekMap[dayIndex];
      const avgValue = dayData.count > 0 ? Math.round(dayData.total / dayData.count) : 0;
      
      return {
        hour: chartIndex,
        value: avgValue,
        hourLabel: dayData.name,
        date: dayData.name,
        dayOfWeek: dayIndex,
        dataCount: dayData.count
      };
    });
  };

  const convertWeeklyToMonthlyPopulation = (weeklyResponse: WeeklyTrendDto): MonthlyPopulation[] => {
    if (!weeklyResponse?.weeklyData || weeklyResponse.weeklyData.length === 0) {
      return [];
    }
    
    const sortedWeeklyData = weeklyResponse.weeklyData
      .map(item => {
        const weekMatch = item.weekPeriod.match(/W(\d+)/);
        const weekNumber = weekMatch ? parseInt(weekMatch[1]) : 0;
        return { ...item, weekNumber };
      })
      .sort((a, b) => a.weekNumber - b.weekNumber);
    
    return sortedWeeklyData.map((item, index) => ({
      month: `${index + 1}주차`,
      value: item.totalAvg,
      districtId: weeklyResponse.districtId
    }));
  };

  // 메모 관련 함수들
  const districtCodeMap: Record<number, number> = {
    1: 11680,   // 강남구
    2: 11740,   // 강동구  
    3: 11305,   // 강북구
    4: 11500,   // 강서구
    5: 11620,   // 관악구
    6: 11215,   // 광진구
    7: 11530,   // 구로구
    8: 11545,   // 금천구
    9: 11350,   // 노원구
    10: 11320,  // 도봉구
    11: 11230,  // 동대문구
    12: 11590,  // 동작구
    13: 11440,  // 마포구
    14: 11410,  // 서대문구
    15: 11650,  // 서초구
    16: 11200,  // 성동구
    17: 11290,  // 성북구
    18: 11710,  // 송파구
    19: 11470,  // 양천구
    20: 11560,  // 영등포구
    21: 11170,  // 용산구
    22: 11380,  // 은평구
    23: 11110,  // 종로구
    24: 11140,  // 중구
    25: 11260   // 중랑구
  };

  const saveMemo = async () => {
    if (!selectedDistrictId || !memo.trim()) return;

    try {
      setMemoLoading(true);
      const userId = getStoredUserId();
      const dbDistrictId = districtCodeMap[selectedDistrictId];
      
      console.log('📝 Summary saveMemo:', {
        selectedDistrictId,
        dbDistrictId,
        districtCodeMap: districtCodeMap[selectedDistrictId]
      });
      
      if (!dbDistrictId) {
        console.error('❌ Summary: Invalid districtId mapping', { selectedDistrictId, districtCodeMap });
        throw new Error(`자치구 코드를 찾을 수 없습니다: ${selectedDistrictId}`);
      }
      
      // createNote에 내부 ID를 전달 (createNote 함수에서 DB 코드로 변환)
      await apiClient.createNote(userId, {
        districtId: selectedDistrictId, // 내부 ID 전달
        content: memo.trim()
      });
      
      setMemo('');
      setMemoSaved(true);
      loadAllNotes();
      
      setTimeout(() => {
        setMemoSaved(false);
      }, 3000);
    } catch (err) {
      console.error('Failed to save memo:', err);
    } finally {
      setMemoLoading(false);
    }
  };

  const loadAllNotes = async () => {
    try {
      setNotesLoading(true);
      const userId = getStoredUserId();
      
      // 모든 관심 지역의 메모들을 로드
      const validFavorites = favoriteDistricts.filter((id): id is number => id !== null);
      if (validFavorites.length === 0) {
        setAllNotes([]);
        return;
      }

      const notePromises = validFavorites.map(async (internalId) => {
        console.log(`📝 Summary loadAllNotes: Loading notes for internal ID ${internalId}`);
        const notes = await apiClient.getUserNotes(userId, internalId); // 내부 ID 직접 전달
        return notes.map(note => ({
          ...note,
          internalDistrictId: internalId // 내부 ID도 함께 저장
        }));
      });

      const allNotesArrays = await Promise.all(notePromises);
      const allNotesFlat = allNotesArrays.flat();
      
      // 최신순으로 정렬
      const sortedNotes = allNotesFlat.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      setAllNotes(sortedNotes);
    } catch (err) {
      console.error('Failed to load all notes:', err);
    } finally {
      setNotesLoading(false);
    }
  };

  const startEditingNote = (note: NoteDto) => {
    setEditingNoteId(note.noteId);
    setEditingContent(note.content);
  };

  const cancelEditingNote = () => {
    setEditingNoteId(null);
    setEditingContent('');
  };

  const saveEditingNote = async () => {
    if (!editingNoteId || !editingContent.trim()) return;

    try {
      setNotesLoading(true);
      const userId = getStoredUserId();
      
      await apiClient.updateNote(userId, editingNoteId, {
        content: editingContent.trim()
      });

      setAllNotes(prev => prev.map(note => 
        note.noteId === editingNoteId 
          ? { ...note, content: editingContent.trim() } 
          : note
      ));
      
      setEditingNoteId(null);
      setEditingContent('');
    } catch (err) {
      console.error('Failed to update note:', err);
    } finally {
      setNotesLoading(false);
    }
  };

  const deleteNoteFromList = async (noteId: number) => {
    try {
      setNotesLoading(true);
      const userId = getStoredUserId();
      
      await apiClient.deleteNote(userId, noteId);
      setAllNotes(prev => prev.filter(note => note.noteId !== noteId));
    } catch (err) {
      console.error('Failed to delete note:', err);
    } finally {
      setNotesLoading(false);
    }
  };

  const renderChart = () => {
    if (chartLoading) {
      return <SkeletonChart />;
    }

    if (chartMode === 'hourly') {
      if (timePeriod === 'daily') {
        // 일간: 시간대별 차트
      if (hourlyData.length > 0) {
          return (
            <HourlyLine 
              series={hourlyData[0].currentData}
              title={`${hourlyData[0].districtName || '자치구'} 시간대별 인구`}
              height={350}
            />
          );
        }

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
      } else if (timePeriod === 'monthly') {
        // 주간: 요일별 차트
        if (weeklyData.length > 0) {
          const weeklyChartData = convertToWeeklyChartData(weeklyData);
          return (
            <HourlyLine 
              series={weeklyChartData}
              title="주간 인구 현황 (요일별 평균)"
              height={350}
              chartType="weekly"
            />
          );
        }

        if (favoriteWeeklyData.length > 0) {
          return (
            <div className="space-y-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">관심 지역별 요일별 인구 현황</h4>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {favoriteWeeklyData.map((data, index) => {
                  const weeklyChartData = convertToWeeklyChartData(data);
                  const districtName = data[0]?.districtName || `자치구 ${data[0]?.districtId}`;
                  return (
                    <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                      <HourlyLine 
                        series={weeklyChartData}
                        title={districtName}
                        height={280}
                        chartType="weekly"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }
      } else if (timePeriod === 'yearly') {
        // 연간: 주차별 차트
        if (monthlyData.length > 0) {
          return (
            <MonthlyLine 
              data={monthlyData}
              title="주차별 인구 현황"
              height={350}
              color="#ef4444"
            />
          );
        }

        if (favoriteMonthlyData.length > 0) {
          return (
            <div className="space-y-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">관심 지역별 주차별 인구 현황</h4>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {favoriteMonthlyData.map((data, index) => {
                  // 관심 지역 배열에서 해당 인덱스의 내부 ID 가져오기
                  const validFavorites = favoriteDistricts.filter((id): id is number => id !== null);
                  const internalId = validFavorites[index];
                  const district = DISTRICTS.find(d => d.id === internalId);
                  const districtName = district?.name || `지역 ${index + 1}`;
                  
                  return (
                    <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                      <MonthlyLine 
                        data={data}
                        title={districtName}
                        height={280}
                        color="#ef4444"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }
      }

      return (
        <div className="h-64 flex items-center justify-center text-gray-500">
          {timePeriod === 'daily' && '시간대별 데이터가 없습니다'}
          {timePeriod === 'monthly' && '요일별 데이터가 없습니다'}
          {timePeriod === 'yearly' && '주차별 데이터가 없습니다'}
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
        const periodLabel = '일간 평균'; // 연령대별 분포는 항상 일간 데이터 사용
        return (
          <div className="space-y-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">{periodLabel} 연령대별 인구 분포</h4>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {favoriteAgeDistributions.map((data, index) => (
                <div key={data.districtId || index} className="bg-white border border-gray-200 rounded-lg p-6">
                  <Pyramid 
                    data={data.ageDistribution}
                    title={`${data.districtName || `자치구 ${data.districtId}`}`}
                    height={320}
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

          {/* Filters (임시 비활성화) */}
          <div className="mb-6 relative">
            <FilterBar
              showDistrictFilter={true}
              showGenderFilter={true}
              showAgeBucketFilter={true}
              showDateFilter={chartMode === 'hourly'}
            showPresetManager={true}
              districts={districts}
            />
            {/* 필터 비활성화 오버레이 */}
            <div className="absolute inset-0 bg-gray-500 bg-opacity-30 rounded-lg flex items-center justify-center pointer-events-auto cursor-not-allowed">
              <div className="bg-white px-4 py-2 rounded-md shadow-md">
                <p className="text-sm text-gray-600 font-medium">필터 기능 개발 중...</p>
          </div>
              </div>
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

              {/* Chart Content */}
              {renderChart()}

              {/* Time Period Toggle - 하단으로 이동 */}
              {chartMode === 'hourly' && (
                <div className="flex items-center justify-center mt-6 pt-4 border-t border-gray-200">
                  <div className="flex bg-red-50 rounded-lg p-1">
                    <button
                      onClick={() => setTimePeriod('daily')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        timePeriod === 'daily'
                          ? 'bg-red-600 text-white shadow-sm'
                          : 'text-red-600 hover:text-red-700'
                      }`}
                    >
                      일간
                    </button>
                    <button
                      onClick={() => setTimePeriod('monthly')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        timePeriod === 'monthly'
                          ? 'bg-red-600 text-white shadow-sm'
                          : 'text-red-600 hover:text-red-700'
                      }`}
                    >
                      주간
                    </button>
                    <button
                      onClick={() => setTimePeriod('yearly')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        timePeriod === 'yearly'
                          ? 'bg-red-600 text-white shadow-sm'
                          : 'text-red-600 hover:text-red-700'
                      }`}
                    >
                      연간
                    </button>
                  </div>
                </div>
              )}
            </Card>
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

          {/* Memo Section */}
          <div className="mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 메모 작성 카드 */}
              <Card title="분석 메모 작성">
                <div className="space-y-4">
                  {/* 자치구 선택 드롭다운 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      자치구 선택
                    </label>
                    <select
                      value={selectedDistrictId || ''}
                      onChange={(e) => setSelectedDistrictId(Number(e.target.value) || null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">자치구를 선택하세요</option>
                      {favoriteDistricts
                        .filter((id): id is number => id !== null)
                        .map((districtId) => {
                          const district = DISTRICTS.find(d => d.id === districtId);
                          return (
                            <option key={districtId} value={districtId}>
                              {district?.name || `자치구 ${districtId}`}
                            </option>
                          );
                        })}
                    </select>
                  </div>

                  {/* 메모 입력 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      메모 내용
                    </label>
                    <textarea
                      value={memo}
                      onChange={(e) => setMemo(e.target.value)}
                      placeholder="분석 내용이나 중요한 인사이트를 기록하세요..."
                      className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* 저장 버튼 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {memoSaved && (
                        <span className="text-sm text-green-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          저장됨
                        </span>
                      )}
                    </div>
                    <button
                      onClick={saveMemo}
                      disabled={memoLoading || !selectedDistrictId || !memo.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {memoLoading ? '저장 중...' : '저장'}
                    </button>
                </div>
              </div>
            </Card>

              {/* 메모 목록 카드 */}
              <Card title="메모 목록">
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {notesLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-2 text-sm text-gray-500">메모를 불러오는 중...</p>
                    </div>
                  ) : allNotes.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>저장된 메모가 없습니다.</p>
                      <p className="text-sm mt-1">새로운 메모를 작성해보세요.</p>
                    </div>
                  ) : (
                    allNotes.map((note) => {
                      const district = DISTRICTS.find(d => d.id === (note as any).internalDistrictId);
                      const districtName = district?.name || `자치구 ${(note as any).internalDistrictId}`;
                      
                      return (
                        <div key={note.noteId} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                          {/* 자치구명과 날짜 */}
                          <div className="flex items-center justify-between mb-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {districtName}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(note.createdAt).toLocaleDateString('ko-KR')}
                            </span>
                          </div>

                          {/* 메모 내용 */}
                          {editingNoteId === note.noteId ? (
                            <div className="space-y-2">
                              <textarea
                                value={editingContent}
                                onChange={(e) => setEditingContent(e.target.value)}
                                className="w-full h-20 px-3 py-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <div className="flex justify-end space-x-2">
                                <button
                                  onClick={cancelEditingNote}
                                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                                >
                                  취소
                                </button>
                                <button
                                  onClick={saveEditingNote}
                                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                  저장
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <p className="text-sm text-gray-900 mb-2 whitespace-pre-wrap">
                                {note.content}
                              </p>
                              <div className="flex justify-end space-x-2">
                                <button
                                  onClick={() => startEditingNote(note)}
                                  className="text-xs text-blue-600 hover:text-blue-800"
                                >
                                  수정
                                </button>
                                <button
                                  onClick={() => deleteNoteFromList(note.noteId)}
                                  className="text-xs text-red-600 hover:text-red-800"
                                >
                                  삭제
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>
            </div>
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
