'use client';

import { useState, useEffect, useCallback } from 'react';
import { DISTRICTS } from './SeoulMap';
import { apiClient } from '@/lib/apiClient';
import { FavoriteDto } from '@/lib/types';
import { getStoredUserId, getErrorMessage, convertDbCodeToInternalId } from '@/lib/utils';

interface FavoriteDropdownsProps {
  onFavoriteChange?: (favorites: (number | null)[]) => void;
  className?: string;
}

const FavoriteDropdowns = ({ onFavoriteChange, className = '' }: FavoriteDropdownsProps) => {
  const [selectedFavorites, setSelectedFavorites] = useState<(number | null)[]>([null, null, null]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🔧 수정: 컴포넌트 마운트 시 백엔드에서 불러오기
  useEffect(() => {
    loadFavoritesFromBackend();
  }, []);

  // 🔧 수정: 백엔드에서 관심 지역 불러오기 + 코드 매핑
  const loadFavoritesFromBackend = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const userId = getStoredUserId();
      const favorites = await apiClient.getUserFavorites(userId);
      
      console.log('📍 FavoriteDropdowns: 백엔드에서 불러온 관심 지역:', favorites);
      console.log('📍 FavoriteDropdowns: 사용자 ID:', userId);
      
      // 🔧 수정: DB 코드(11xxx)를 내부 ID(1-25)로 변환
      const favoriteInternalIds = favorites.map(fav => {
        const internalId = convertDbCodeToInternalId(fav.districtId);
        console.log(`📍 FavoriteDropdowns: DB 코드 ${fav.districtId} -> 내부 ID ${internalId}`);
        return internalId;
      }).filter((id): id is number => id !== null);
      
      // 3개 슬롯에 맞게 변환 (부족한 부분은 null로 채우기)
      const paddedFavorites: (number | null)[] = [
        favoriteInternalIds[0] || null,
        favoriteInternalIds[1] || null,
        favoriteInternalIds[2] || null
      ];
      
      console.log('📍 FavoriteDropdowns: 변환된 관심 지역 배열:', paddedFavorites);
      
      setSelectedFavorites(paddedFavorites);
      setIsInitialized(true);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      console.error('❌ FavoriteDropdowns: 관심 지역 불러오기 실패:', err);
      
      // 🔧 수정: 에러 시에도 기본값 [null, null, null] 유지
      setSelectedFavorites([null, null, null]);
      setIsInitialized(true);
    } finally {
      setIsLoading(false);
    }
  };

  // 🔧 수정: 백엔드에 관심 지역 저장 (내부 ID 그대로 전달, apiClient에서 변환 처리)
  const saveFavoriteToBackend = async (internalDistrictId: number) => {
    try {
      const userId = getStoredUserId();
      await apiClient.addUserFavorite(userId, { districtId: internalDistrictId });
      console.log('✅ FavoriteDropdowns: 관심 지역 추가 성공:', `내부 ID ${internalDistrictId}`);
    } catch (err) {
      console.error('❌ FavoriteDropdowns: 관심 지역 추가 실패:', err);
      throw err;
    }
  };

  // 🔧 수정: 백엔드에서 관심 지역 삭제 (내부 ID 그대로 전달, apiClient에서 변환 처리)
  const removeFavoriteFromBackend = async (internalDistrictId: number) => {
    try {
      const userId = getStoredUserId();
      await apiClient.removeUserFavorite(userId, internalDistrictId);
      console.log('✅ FavoriteDropdowns: 관심 지역 삭제 성공:', `내부 ID ${internalDistrictId}`);
    } catch (err) {
      console.error('❌ FavoriteDropdowns: 관심 지역 삭제 실패:', err);
      throw err;
    }
  };

  // 초기화 완료 후 부모에게 알림
  useEffect(() => {
    if (isInitialized) {
      onFavoriteChange?.(selectedFavorites);
    }
  }, [isInitialized, selectedFavorites, onFavoriteChange]);

  const handleFavoriteChange = useCallback(async (index: number, value: string) => {
    const newDistrictId = value === '' ? null : parseInt(value);
    const oldDistrictId = selectedFavorites[index];
    
    try {
      setIsLoading(true);
      setError(null);

      // 🔧 수정: 백엔드 API 호출 (내부 ID 사용)
      if (oldDistrictId && oldDistrictId !== newDistrictId) {
        // 기존 관심 지역 삭제
        await removeFavoriteFromBackend(oldDistrictId);
      }

      if (newDistrictId && newDistrictId !== oldDistrictId) {
        // 새 관심 지역 추가
        await saveFavoriteToBackend(newDistrictId);
      }

      // 상태 업데이트
      const newFavorites = [...selectedFavorites];
      newFavorites[index] = newDistrictId;
      setSelectedFavorites(newFavorites);
      
      console.log('📍 FavoriteDropdowns: 업데이트된 관심 지역:', newFavorites);
      
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      console.error('FavoriteDropdowns: 관심 지역 변경 실패:', err);
      
      // 에러 시 변경 취소 - 상태는 이전 값 유지
    } finally {
      setIsLoading(false);
    }
  }, [selectedFavorites]);

  const getAvailableDistricts = useCallback((currentIndex: number) => {
    return DISTRICTS.filter(district => 
      !selectedFavorites.includes(district.id) || 
      selectedFavorites[currentIndex] === district.id
    );
  }, [selectedFavorites]);

  // 🔧 추가: 새로고침 버튼
  const handleRefresh = () => {
    loadFavoritesFromBackend();
  };

  return (
    <div className={`${className}`}>
      {/* 🔧 추가: 로딩/에러 상태 표시 */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex justify-between items-center">
            <p className="text-sm text-red-600">{error}</p>
            <button 
              onClick={handleRefresh}
              className="text-xs text-red-800 hover:text-red-900 underline"
            >
              다시 시도
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {selectedFavorites.map((favorite, index) => (
          <div key={index}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              관심 지역 {index + 1}
              {isLoading && (
                <span className="ml-2 text-xs text-blue-600">(처리 중...)</span>
              )}
            </label>
            <select
              value={favorite || ''}  // 🔧 null인 경우 빈 문자열로 표시 (즉, '--' 옵션 선택됨)
              onChange={(e) => handleFavoriteChange(index, e.target.value)}
              disabled={isLoading}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <option value="">--</option>  {/* 🔧 기본 옵션 (null 값에 해당) */}
              {getAvailableDistricts(index).map(district => (
                <option key={district.id} value={district.id}>
                  {district.name}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      
      {/* 선택된 관심 지역 표시 */}
      {selectedFavorites.some(f => f !== null) && (
        <div className="mt-4 p-3 bg-blue-50 rounded-md">
          <p className="text-sm text-blue-800 font-medium mb-1">선택된 관심 지역:</p>
          <div className="flex flex-wrap gap-2">
            {selectedFavorites
              .filter(f => f !== null)
              .map(f => DISTRICTS.find(d => d.id === f)?.name)
              .map((name, index) => (
                <span 
                  key={index}
                  className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                >
                  {name}
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FavoriteDropdowns;
