'use client';

import { useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { 
  FilterParams, 
  Gender, 
  AgeBucket,
  PresetDto,
  PresetCreateRequest 
} from '@/lib/types';
import { 
  parseSearchParams, 
  buildSearchParams, 
  getAgeBucketLabel, 
  getGenderLabel,
  getStoredUserId,
  getErrorMessage 
} from '@/lib/utils';
import { apiClient } from '@/lib/apiClient';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';

interface FilterBarProps {
  showDistrictFilter?: boolean;
  showGenderFilter?: boolean;
  showAgeBucketFilter?: boolean;
  showDateFilter?: boolean;
  showPeriodFilter?: boolean;
  showPresetManager?: boolean;  // 새로운 prop 추가
  districts?: { id: number; name: string }[];
  className?: string;
}

const FilterBar = ({
  showDistrictFilter = false,
  showGenderFilter = true,
  showAgeBucketFilter = true,
  showDateFilter = false,
  showPeriodFilter = false,
  showPresetManager = false,  // 기본값 false
  districts = [],
  className = ''
}: FilterBarProps) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // 프리셋 관리 state들
  const [presets, setPresets] = useState<PresetDto[]>([]);
  const [presetsLoaded, setPresetsLoaded] = useState(false);
  const [presetsLoading, setPresetsLoading] = useState(false);
  const [presetError, setPresetError] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [saving, setSaving] = useState(false);

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

  const applyFilters = (newFilters: FilterParams) => {
    const newSearchParams = buildSearchParams(newFilters);
    router.replace(`${pathname}?${newSearchParams.toString()}`);
  };

  // 프리셋 관리 함수들
  const loadPresets = async () => {
    if (presetsLoaded) return;
    
    try {
      setPresetsLoading(true);
      setPresetError(null);
      
      const userId = getStoredUserId();
      const data = await apiClient.getUserPresets(userId);
      setPresets(data);
      setPresetsLoaded(true);
    } catch (err) {
      setPresetError(getErrorMessage(err));
      console.error('Failed to load presets:', err);
    } finally {
      setPresetsLoading(false);
    }
  };

  const savePreset = async () => {
    if (!presetName.trim()) return;
    
    try {
      setSaving(true);
      setPresetError(null);
      
      const userId = getStoredUserId();
      const newPreset = await apiClient.createPreset(userId, {
        name: presetName.trim(),
        filters: filters
      });
      
      setPresets([...presets, newPreset]);
      setPresetName('');
      setShowSaveModal(false);
    } catch (err) {
      setPresetError(getErrorMessage(err));
      console.error('Failed to save preset:', err);
    } finally {
      setSaving(false);
    }
  };

  const deletePreset = async (presetId: number) => {
    if (!confirm('이 프리셋을 삭제하시겠습니까?')) return;
    
    try {
      setPresetError(null);
      
      const userId = getStoredUserId();
      await apiClient.deletePreset(userId, presetId);
      
      setPresets(presets.filter(p => p.presetId !== presetId));
    } catch (err) {
      setPresetError(getErrorMessage(err));
      console.error('Failed to delete preset:', err);
    }
  };

  const applyPreset = (preset: PresetDto) => {
    applyFilters(preset.filters as FilterParams);
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
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      {/* 메인 필터 영역 */}
      <div className="p-4">
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

          {/* 프리셋 관리 버튼 */}
          {showPresetManager && (
            <div className="flex items-center space-x-2 ml-auto">
              <button
                onClick={() => setShowSaveModal(true)}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
              >
                프리셋 저장
              </button>
              <button
                onClick={loadPresets}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
              >
                프리셋 관리
              </button>
            </div>
          )}
        </div>

        {/* Active filters display */}
        {Object.keys(filters).length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-gray-500">활성 필터:</span>
              {filters.districtId && (
                <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                  자치구: {districts.find(d => d.id === filters.districtId)?.name || filters.districtId}
                </span>
              )}
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

      {/* 프리셋 목록 영역 */}
      {showPresetManager && presetsLoaded && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700">저장된 프리셋</h4>
            {presets.length > 0 && (
              <span className="text-xs text-gray-500">{presets.length}개</span>
            )}
          </div>

          {/* 에러 메시지 */}
          {presetError && (
            <ErrorMessage 
              error={presetError}
              onRetry={loadPresets}
              className="mb-3"
            />
          )}

          {/* 프리셋 목록 */}
          {presetsLoading ? (
            <LoadingSpinner size="md" message="프리셋을 불러오는 중..." />
          ) : presets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {presets.map((preset) => (
                <div key={preset.presetId} className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                  <div className="flex-1 min-w-0">
                    <h5 className="text-sm font-medium text-gray-900 truncate">{preset.name}</h5>
                    <p className="text-xs text-gray-500">
                      {new Date(preset.createdAt).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1 ml-2">
                    <button
                      onClick={() => applyPreset(preset)}
                      className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                      title="프리셋 적용"
                    >
                      적용
                    </button>
                    <button
                      onClick={() => deletePreset(preset.presetId)}
                      className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                      title="프리셋 삭제"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              <p className="text-sm">저장된 프리셋이 없습니다</p>
              <p className="text-xs text-gray-400 mt-1">자주 사용하는 필터 조합을 저장해보세요</p>
            </div>
          )}
        </div>
      )}

      {/* 프리셋 저장 모달 */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-90vw">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">프리셋 저장</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                프리셋 이름
              </label>
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="예: 강남구 20대 주간 분석"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                maxLength={50}
              />
              <p className="text-xs text-gray-500 mt-1">{presetName.length}/50자</p>
            </div>

            {/* 현재 필터 미리보기 */}
            <div className="mb-4 p-3 bg-gray-50 rounded-md">
              <h4 className="text-sm font-medium text-gray-700 mb-2">저장될 필터</h4>
              <div className="text-xs text-gray-600 space-y-1">
                {Object.keys(filters).length === 0 ? (
                  <div>• 필터가 설정되지 않았습니다</div>
                ) : (
                  <>
                    {filters.districtId && <div>• 자치구: {districts.find(d => d.id === filters.districtId)?.name || filters.districtId}</div>}
                    {filters.gender && filters.gender !== 'all' && <div>• 성별: {getGenderLabel(filters.gender)}</div>}
                    {filters.ageBucket && filters.ageBucket !== 'all' && <div>• 연령대: {getAgeBucketLabel(filters.ageBucket)}</div>}
                    {filters.period && <div>• 기간: {filters.period}</div>}
                    {filters.date && <div>• 날짜: {filters.date}</div>}
                    {filters.from && <div>• 시작일: {filters.from}</div>}
                    {filters.to && <div>• 종료일: {filters.to}</div>}
                  </>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowSaveModal(false);
                  setPresetName('');
                  setPresetError(null);
                }}
                disabled={saving}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={savePreset}
                disabled={saving || !presetName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterBar;
