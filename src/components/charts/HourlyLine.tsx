'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { HourPoint } from '@/lib/types';
import { formatPopulation, generateHourLabels, getChartColors } from '@/lib/utils';

export interface HourlyLineProps {
  series: HourPoint[] | undefined | null;  // undefined/null 허용
  title?: string;
  height?: number;
  color?: string;
}

const HourlyLine = ({ 
  series, 
  title = '시간대별 인구 현황', 
  height = 300,
  color 
}: HourlyLineProps) => {
  const colors = getChartColors();
  const lineColor = color || colors.primary;

  // 🔧 수정: series 유효성 검사를 맨 위로 이동
  if (!series || !Array.isArray(series) || series.length === 0) {
    return (
      <div className="w-full bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center" style={{ height }}>
        <p className="text-gray-500">데이터가 없습니다.</p>
      </div>
    );
  }

  // 🔧 수정: 안전한 데이터 변환
  const chartData = series
    .filter(point => point && typeof point.hour === 'number' && typeof point.value === 'number')
    .map(point => ({
      hour: point.hour,
      hourLabel: `${point.hour.toString().padStart(2, '0')}:00`,
      value: point.value
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
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900">
            {label}
          </p>
          <p className="text-sm text-gray-600">
            인구수: <span className="font-semibold">{formatPopulation(payload[0].value)}명</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={chartData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="hourLabel"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={{ stroke: '#d1d5db' }}
          />
          <YAxis 
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={{ stroke: '#d1d5db' }}
            tickFormatter={(value) => formatPopulation(value)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={lineColor}
            strokeWidth={2}
            dot={{ fill: lineColor, strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: lineColor, strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default HourlyLine;
