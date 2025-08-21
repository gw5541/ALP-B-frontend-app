'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MonthlyPopulation } from '@/lib/types';
import { formatPopulation, getChartColors } from '@/lib/utils';

export interface MonthlyLineProps {
  data: MonthlyPopulation[];
  title?: string;
  height?: number;
  color?: string;
}

const MonthlyLine = ({ 
  data, 
  title = '월별 인구 현황', 
  height = 300,
  color 
}: MonthlyLineProps) => {
  const colors = getChartColors();
  const lineColor = color || colors.secondary;

  // 🔧 수정: 데이터 유효성 검사를 map() 호출 전으로 이동
  if (!data || data.length === 0) {
    return (
      <div className="w-full bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center" style={{ height }}>
        <p className="text-gray-500">데이터가 없습니다.</p>
      </div>
    );
  }

  // Format data for Recharts
  const chartData = data.map(item => ({
    month: item.month,
    monthLabel: new Date(item.month + '-01').toLocaleDateString('ko-KR', { 
      year: 'numeric', 
      month: 'short' 
    }),
    value: item.value
  }));

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
            dataKey="monthLabel"
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

export default MonthlyLine;
