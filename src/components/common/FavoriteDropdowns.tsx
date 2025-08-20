'use client';

import { useState, useEffect } from 'react';
import { DISTRICTS } from './SeoulMap';

interface FavoriteDropdownsProps {
  onFavoriteChange?: (favorites: (number | null)[]) => void;
  className?: string;
}

const FavoriteDropdowns = ({ onFavoriteChange, className = '' }: FavoriteDropdownsProps) => {
  const [selectedFavorites, setSelectedFavorites] = useState<(number | null)[]>([null, null, null]);

  // 컴포넌트 마운트 시 localStorage에서 불러오기
  useEffect(() => {
    const saved = localStorage.getItem('favoriteDistricts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSelectedFavorites(parsed);
        onFavoriteChange?.(parsed);
      } catch (err) {
        console.error('Failed to load favorites from localStorage:', err);
      }
    }
  }, [onFavoriteChange]);

  const handleFavoriteChange = (index: number, value: string) => {
    const newFavorites = [...selectedFavorites];
    newFavorites[index] = value === '' ? null : parseInt(value);
    setSelectedFavorites(newFavorites);
    
    // localStorage에 저장
    localStorage.setItem('favoriteDistricts', JSON.stringify(newFavorites));
    
    onFavoriteChange?.(newFavorites);
  };

  const getAvailableDistricts = (currentIndex: number) => {
    return DISTRICTS.filter(district => 
      !selectedFavorites.includes(district.id) || 
      selectedFavorites[currentIndex] === district.id
    );
  };

  return (
    <div className={`${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {selectedFavorites.map((favorite, index) => (
          <div key={index}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              관심 지역 {index + 1}
            </label>
            <select
              value={favorite || ''}
              onChange={(e) => handleFavoriteChange(index, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
            >
              <option value="">--</option>
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
