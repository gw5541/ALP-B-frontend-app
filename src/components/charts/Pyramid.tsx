'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AgeDistribution } from '@/lib/types';
import { formatPopulation, getChartColors } from '@/lib/utils';

export interface PyramidProps {
  data: AgeDistribution[];
  title?: string;
  height?: number;
}

const Pyramid = ({ 
  data, 
  title = '연령대별 인구 분포', 
  height = 400 
}: PyramidProps) => {
  const colors = getChartColors();

  // Transform data for bidirectional bar chart
  const chartData = data.map(item => ({
    ageGroup: item.ageGroup,
    male: -item.male, // Negative for left side
    female: item.female, // Positive for right side
    maleAbs: item.male,
    femaleAbs: item.female
  }));

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

  // Custom tick formatter for Y-axis to show absolute values
  const formatYAxisTick = (value: number) => {
    return formatPopulation(Math.abs(value));
  };

  if (!data || data.length === 0) {
    return (
      <div className="w-full bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center" style={{ height }}>
        <p className="text-gray-500">데이터가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      )}
      
      {/* Legend */}
      <div className="flex justify-center mb-4 space-x-6">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span className="text-sm text-gray-700">남성</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span className="text-sm text-gray-700">여성</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={chartData}
          layout="horizontal"
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            type="number"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={{ stroke: '#d1d5db' }}
            tickFormatter={formatYAxisTick}
          />
          <YAxis 
            type="category"
            dataKey="ageGroup"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={{ stroke: '#d1d5db' }}
            width={50}
          />
          <Tooltip content={<CustomTooltip />} />
          
          {/* Male bars (left side, negative values) */}
          <Bar 
            dataKey="male" 
            fill={colors.male}
            name="남성"
          />
          
          {/* Female bars (right side, positive values) */}
          <Bar 
            dataKey="female" 
            fill={colors.female}
            name="여성"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default Pyramid;
