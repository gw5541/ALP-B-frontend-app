'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { FilterParams, Gender, AgeBucket } from '@/lib/types';
import { parseSearchParams, buildSearchParams, getAgeBucketLabel, getGenderLabel } from '@/lib/utils';

interface FilterBarProps {
  showDistrictFilter?: boolean;
  showGenderFilter?: boolean;
  showAgeBucketFilter?: boolean;
  showDateFilter?: boolean;
  showPeriodFilter?: boolean;
  districts?: { id: number; name: string }[];
  className?: string;
}

const FilterBar = ({
  showDistrictFilter = false,
  showGenderFilter = true,
  showAgeBucketFilter = true,
  showDateFilter = false,
  showPeriodFilter = false,
  districts = [],
  className = ''
}: FilterBarProps) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters = parseSearchParams(searchParams);

  const updateFilter = (key: keyof FilterParams, value: string | number | undefined) => {
    const newFilters = { ...filters };
    
    if (value === undefined || value === '' || value === 'all') {
      delete newFilters[key];
    } else {
      newFilters[key] = value as any;
    }

    const newSearchParams = buildSearchParams(newFilters);
    router.replace(`${pathname}?${newSearchParams.toString()}`);
  };

  const genderOptions = [
    { value: 'all', label: '전체' },
    { value: 'male', label: '남성' },
    { value: 'female', label: '여성' }
  ];

  const ageBucketOptions = [
    { value: 'all', label: '전체' },
    { value: '10s', label: '10대' },
    { value: '20s', label: '20대' },
    { value: '30s', label: '30대' },
    { value: '40s', label: '40대' },
    { value: '50s', label: '50대' },
    { value: '60plus', label: '60대+' }
  ];

  const periodOptions = [
    { value: 'DAILY', label: '일간' },
    { value: 'WEEKLY', label: '주간' },
    { value: 'MONTHLY', label: '월간' }
  ];

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm p-4 ${className}`}>
      <div className="flex flex-wrap gap-4 items-center">
        <span className="text-sm font-medium text-gray-700">필터:</span>

        {showDistrictFilter && districts.length > 0 && (
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">자치구:</label>
            <select
              value={filters.districtId || ''}
              onChange={(e) => updateFilter('districtId', e.target.value ? parseInt(e.target.value) : undefined)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="">전체</option>
              {districts.map((district) => (
                <option key={district.id} value={district.id}>
                  {district.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {showGenderFilter && (
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">성별:</label>
            <select
              value={filters.gender || 'all'}
              onChange={(e) => updateFilter('gender', e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              {genderOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {showAgeBucketFilter && (
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">연령:</label>
            <select
              value={filters.ageBucket || 'all'}
              onChange={(e) => updateFilter('ageBucket', e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              {ageBucketOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {showDateFilter && (
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">날짜:</label>
            <input
              type="date"
              value={filters.date || ''}
              onChange={(e) => updateFilter('date', e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
        )}

        {showPeriodFilter && (
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">기간:</label>
            <select
              value={filters.period || 'DAILY'}
              onChange={(e) => updateFilter('period', e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              {periodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Clear filters button */}
        {Object.keys(filters).length > 0 && (
          <button
            onClick={() => router.replace(pathname)}
            className="text-sm text-red-600 hover:text-red-700 underline"
          >
            필터 초기화
          </button>
        )}
      </div>

      {/* Active filters display */}
      {Object.keys(filters).length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-gray-500">활성 필터:</span>
            {filters.gender && filters.gender !== 'all' && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                성별: {getGenderLabel(filters.gender)}
              </span>
            )}
            {filters.ageBucket && filters.ageBucket !== 'all' && (
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                연령: {getAgeBucketLabel(filters.ageBucket)}
              </span>
            )}
            {filters.date && (
              <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                날짜: {filters.date}
              </span>
            )}
            {filters.period && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                기간: {filters.period}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterBar;
