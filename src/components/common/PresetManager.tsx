'use client';

import { useState, useEffect } from 'react';
import { 
  PresetDto, 
  PresetCreateRequest, 
  PresetUpdateRequest,
  FilterParams 
} from '@/lib/types';
import { apiClient } from '@/lib/apiClient';
import { getStoredUserId, getErrorMessage } from '@/lib/utils';

interface PresetManagerProps {
  currentFilters: FilterParams;
  onApplyPreset: (filters: FilterParams) => void;
  className?: string;
}

const PresetManager = ({ currentFilters, onApplyPreset, className = '' }: PresetManagerProps) => {
  const [presets, setPresets] = useState<PresetDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const userId = getStoredUserId();
      const data = await apiClient.getUserPresets(userId);
      setPresets(data);
    } catch (err) {
      setError(getErrorMessage(err));
      console.error('Failed to load presets:', err);
    } finally {
      setLoading(false);
    }
  };

  const savePreset = async () => {
    if (!presetName.trim()) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const userId = getStoredUserId();
      const newPreset = await apiClient.createPreset(userId, {
        name: presetName.trim(),
        filters: currentFilters
      });
      
      setPresets([...presets, newPreset]);
      setPresetName('');
      setShowSaveModal(false);
    } catch (err) {
      setError(getErrorMessage(err));
      console.error('Failed to save preset:', err);
    } finally {
      setSaving(false);
    }
  };

  const deletePreset = async (presetId: number) => {
    if (!confirm('이 프리셋을 삭제하시겠습니까?')) return;
    
    try {
      setError(null);
      
      const userId = getStoredUserId();
      await apiClient.deletePreset(userId, presetId);
      
      setPresets(presets.filter(p => p.presetId !== presetId));
    } catch (err) {
      setError(getErrorMessage(err));
      console.error('Failed to delete preset:', err);
    }
  };

  const applyPreset = (preset: PresetDto) => {
    onApplyPreset(preset.filters as FilterParams);
  };

  if (loading && presets.length === 0) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="bg-gray-200 rounded-md h-32 w-full"></div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* 프리셋 목록 */}
      <div className="space-y-2 mb-4">
        {presets.length > 0 ? (
          presets.map((preset) => (
            <div key={preset.presetId} className="flex items-center justify-between p-3 bg-gray-50 rounded-md border">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-900">{preset.name}</h4>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(preset.createdAt).toLocaleDateString('ko-KR')} 생성
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => applyPreset(preset)}
                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                >
                  적용
                </button>
                <button
                  onClick={() => deletePreset(preset.presetId)}
                  className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                >
                  삭제
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <p className="text-sm">저장된 프리셋이 없습니다</p>
            <p className="text-xs text-gray-400 mt-1">자주 사용하는 필터 조합을 저장해보세요</p>
          </div>
        )}
      </div>

      {/* 프리셋 저장 버튼 */}
      <button
        onClick={() => setShowSaveModal(true)}
        className="w-full px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
      >
        현재 필터를 프리셋으로 저장
      </button>

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
                {currentFilters.districtId && <div>• 자치구: {currentFilters.districtId}</div>}
                {currentFilters.gender && <div>• 성별: {currentFilters.gender}</div>}
                {currentFilters.ageBucket && <div>• 연령대: {currentFilters.ageBucket}</div>}
                {currentFilters.period && <div>• 기간: {currentFilters.period}</div>}
                {currentFilters.date && <div>• 날짜: {currentFilters.date}</div>}
                {currentFilters.from && <div>• 시작일: {currentFilters.from}</div>}
                {currentFilters.to && <div>• 종료일: {currentFilters.to}</div>}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowSaveModal(false);
                  setPresetName('');
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

export default PresetManager;
