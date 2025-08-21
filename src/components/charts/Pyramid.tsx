'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AgeDistribution } from '@/lib/types';
import { formatPopulation, getChartColors } from '@/lib/utils';

export interface PyramidProps {
  data: AgeDistribution[] | undefined | null;  // undefined/null 허용
  title?: string;
  height?: number;
}

const Pyramid = ({ 
  data, 
  title = '연령대별 인구 분포', 
  height = 400 
}: PyramidProps) => {
  const colors = getChartColors();

  // 🔧 수정: data 유효성 검사를 맨 위로 이동
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="w-full bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center" style={{ height }}>
        <p className="text-gray-500">데이터가 없습니다.</p>
      </div>
    );
  }

  // 🔧 수정: 안전한 데이터 변환
  const chartData = data
    .filter(item => item && item.ageGroup && typeof item.male === 'number' && typeof item.female === 'number')
    .map(item => ({
      ageGroup: item.ageGroup,
      male: -item.male, // Negative for left side
      female: item.female, // Positive for right side
      maleAbs: item.male,
      femaleAbs: item.female
    }));

  // 🔧 추가: 변환된 데이터가 비어있는 경우 처리
  if (chartData.length === 0) {
    return (
      <div className="w-full bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center" style={{ height }}>
        <p className="text-gray-500">유효한 데이터가 없습니다.</p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900 mb-2">
            {label}
          </p>
          <div className="space-y-1">
            <p className="text-sm text-blue-600">
              남성: <span className="font-semibold">{formatPopulation(data.maleAbs)}명</span>
            </p>
            <p className="text-sm text-red-600">
              여성: <span className="font-semibold">{formatPopulation(data.femaleAbs)}명</span>
            </p>
            <p className="text-sm text-gray-600">
              총합: <span className="font-semibold">{formatPopulation(data.maleAbs + data.femaleAbs)}명</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Calculate the maximum value for symmetric X-axis
  const maxValue = Math.max(...chartData.map(d => Math.max(d.maleAbs, d.femaleAbs)));
  const domain = [-maxValue * 1.1, maxValue * 1.1];

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={chartData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
          layout="horizontal"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            type="number"
            domain={domain}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={{ stroke: '#d1d5db' }}
            tickFormatter={(value) => formatPopulation(Math.abs(value))}
          />
          <YAxis 
            type="category"
            dataKey="ageGroup"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={{ stroke: '#d1d5db' }}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="male" fill={colors.primary} />
          <Bar dataKey="female" fill={colors.accent} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default Pyramid;
