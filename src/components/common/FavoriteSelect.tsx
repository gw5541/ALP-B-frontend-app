'use client';

import { useState, useEffect } from 'react';
import { UserFavorite } from '@/lib/types';
import { apiClient } from '@/lib/apiClient';
import { getStoredUserId, getErrorMessage } from '@/lib/utils';

interface FavoriteSelectProps {
  value?: number;
  onChange: (id: number) => void;
  className?: string;
}

const FavoriteSelect = ({ value, onChange, className = '' }: FavoriteSelectProps) => {
  const [favorites, setFavorites] = useState<UserFavorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const userId = getStoredUserId();
      const data = await apiClient.getUserFavorites(userId);
      
      // Limit to maximum 3 favorites for UI display
      setFavorites(data.slice(0, 3));
    } catch (err) {
      setError(getErrorMessage(err));
      console.error('Failed to load favorites:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="bg-gray-200 rounded-md h-10 w-48"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-sm text-red-600 ${className}`}>
        관심 지역을 불러올 수 없습니다
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>
        관심 지역이 없습니다
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <select
        value={value || ''}
        onChange={(e) => {
          const selectedId = parseInt(e.target.value);
          if (selectedId) {
            onChange(selectedId);
          }
        }}
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
      >
        <option value="">관심 지역 선택</option>
        {favorites.map((favorite) => (
          <option key={favorite.districtId} value={favorite.districtId}>
            {favorite.districtName || `자치구 ${favorite.districtId}`}
          </option>
        ))}
      </select>
      
      {/* Favorites count indicator */}
      <div className="mt-1 text-xs text-gray-500">
        {favorites.length}개의 관심 지역
      </div>
    </div>
  );
};

export default FavoriteSelect;
