import { AgeDistribution } from '../types';

// 연령대 고정 순서 (어린 나이부터 나이 많은 순서)
export const AGE_BUCKETS = [
  'F0T9', 'F10T14', 'F15T19', 'F20T24', 'F25T29', 'F30T34',
  'F35T39', 'F40T44', 'F45T49', 'F50T54', 'F55T59', 'F60T64', 'F65T69', 'F70T74'
];

/**
 * 백엔드 maleBucketsAvg, femaleBucketsAvg를 피라미드 차트용 AgeDistribution 배열로 변환
 */
export function buildAgeDistributionFromBuckets(
  male: Record<string, number>,
  female: Record<string, number>
): AgeDistribution[] {
  return AGE_BUCKETS.map(bucket => {
    // 연령대 레이블 변환 (F0T9 -> "0-9")
    const ageGroup = formatAgeGroupLabel(bucket);
    
    // 데이터 안전성 확보 (음수/NaN 방지)
    const maleValue = Number(male[bucket] || 0);
    const femaleValue = Number(female[bucket] || 0);
    
    return {
      ageGroup,
      male: Math.max(0, maleValue), // 음수 방지
      female: Math.max(0, femaleValue) // 음수 방지
    };
  }).filter(item => item.male > 0 || item.female > 0); // 데이터가 있는 연령대만 포함
}

/**
 * 연령대 키를 사용자 친화적 레이블로 변환
 * F0T9 -> "0-9세", F10T14 -> "10-14세"
 */
export function formatAgeGroupLabel(bucket: string): string {
  const match = bucket.match(/F(\d+)T(\d+)/);
  if (match) {
    const startAge = match[1];
    const endAge = match[2];
    return `${startAge}-${endAge}세`;
  }
  
  // 매칭되지 않으면 원본 반환
  return bucket;
}

/**
 * 피라미드 차트 데이터를 Recharts용으로 변환
 * 남성은 음수(좌측), 여성은 양수(우측)
 */
export function transformToPyramidData(data: AgeDistribution[], ascending: boolean = true) {
  const transformedData = data.map(item => ({
    ageGroup: item.ageGroup,
    male: -item.male, // 좌측 표시를 위해 음수로 변환
    female: item.female, // 우측 표시를 위해 양수 유지
    maleAbs: item.male, // 툴팁용 절대값
    femaleAbs: item.female, // 툴팁용 절대값
    total: item.male + item.female // 총합
  }));

  // 정렬 옵션에 따라 순서 결정
  if (ascending) {
    // 어린 나이부터 (0-9세가 맨 위)
    return transformedData;
  } else {
    // 나이 많은 순부터 (70-74세가 맨 위)
    return transformedData.reverse();
  }
}

/**
 * X축 domain 계산 (좌우 대칭)
 */
export function calculateXAxisDomain(data: AgeDistribution[]): [number, number] {
  if (!data || data.length === 0) {
    return [-1000, 1000]; // 기본값
  }

  const maxValue = Math.max(
    ...data.map(item => Math.max(item.male, item.female))
  );

  const domainMax = Math.ceil(maxValue * 1.1); // 10% 여유 공간
  return [-domainMax, domainMax];
}
