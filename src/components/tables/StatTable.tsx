'use client';

// 새로운 타입 import
import { PopulationAggDto } from '@/lib/types';
import { formatPopulation } from '@/lib/utils';

interface StatTableProps {
  // 새로운 타입 사용
  data: PopulationAggDto[];
  loading?: boolean;
  className?: string;
}

const StatTable = ({ data, loading = false, className = '' }: StatTableProps) => {
  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 shadow-md overflow-hidden ${className}`}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  자치구
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  총 생활인구 평균
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  성별 생활인구 평균
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  주간/야간 생활인구 평균
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  기간 정보
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Array.from({ length: 5 }).map((_, index) => (
                <tr key={index} className="animate-pulse">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 rounded w-28"></div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 shadow-md p-8 text-center ${className}`}>
        <p className="text-gray-500">표시할 데이터가 없습니다.</p>
      </div>
    );
  }

  // 성별 평균 계산 헬퍼 함수
  const calculateGenderAverage = (buckets: Record<string, number>) => {
    return Object.values(buckets).reduce((sum, val) => sum + val, 0);
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-md overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                자치구
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                총 생활인구 평균
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                성별 생활인구 평균
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                주간/야간 생활인구 평균
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                기간 정보
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((stat) => {
              // 새로운 구조에 맞게 성별 평균 계산
              const maleAvg = calculateGenderAverage(stat.maleBucketsAvg);
              const femaleAvg = calculateGenderAverage(stat.femaleBucketsAvg);

              return (
                <tr key={`${stat.districtId}-${stat.periodStartDate}`} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {stat.districtName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {/* 새로운 필드명 사용 */}
                      {formatPopulation(stat.totalAvg)}명
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <div className="flex space-x-4">
                        <span className="text-blue-600">
                          남: {formatPopulation(maleAvg)}
                        </span>
                        <span className="text-red-600">
                          여: {formatPopulation(femaleAvg)}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <div className="flex space-x-4">
                        <span className="text-yellow-600">
                          {/* 새로운 필드명 사용 */}
                          주간: {formatPopulation(stat.daytimeAvg)}
                        </span>
                        <span className="text-purple-600">
                          야간: {formatPopulation(stat.nighttimeAvg)}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-600">기간:</span>
                          <span className="font-medium">{stat.periodType}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-600">시작:</span>
                          <span className="text-xs text-gray-500">
                            {/* 새로운 필드명 사용 */}
                            {new Date(stat.periodStartDate).toLocaleDateString('ko-KR')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Table footer with summary */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          총 {data.length}개 자치구 표시
        </div>
      </div>
    </div>
  );
};

export default StatTable;
